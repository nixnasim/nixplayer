/* NixPlayer — streaming proxy for online videos (main process).
   The <video> element, and ffmpeg (audio tracks / embedded subtitles), read an online file through
   http://127.0.0.1:<port>/s/<id>. The proxy talks to the real server the way PotPlayer / VLC do:
     - every seek / resume is a fresh ranged request; the old upstream connection is closed AT ONCE
       (servers that allow only 1-2 connections per user otherwise leave the new request waiting forever)
     - if the server drops the connection (idle while paused, timeout, network blip) it reconnects by itself
       from the exact byte where it stopped, so the player never notices
     - servers that ignore "Range" (answer 200 with the whole file) still seek: the proxy skips the bytes
     - redirects, basic-auth links, slow / busy servers (429, 503, 5xx) are handled with retries */
const http=require('http'),https=require('https'),crypto=require('crypto');

const SRC=new Map();
let server=null,PORT=0,CFG={ua:'',mime:()=>''};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const HEADER_TIMEOUT=30000,STALL_TIMEOUT=20000,MAX_TRIES=6;

function configure(o){CFG={...CFG,...o}}

/* opens ONE upstream request. Resolves {res,url} with the response (headers received), follows redirects. */
function open(src,range,signal){
  return new Promise((resolve,reject)=>{
    let hops=0,req=null,done=false;
    const fail=e=>{if(done)return;done=true;try{req&&req.destroy()}catch(_){}reject(e)};
    if(signal.aborted)return fail(new Error('aborted'));
    const onAbort=()=>fail(new Error('aborted'));
    signal.addEventListener('abort',onAbort,{once:true});
    const go=urlStr=>{
      let u;try{u=new URL(urlStr)}catch(e){return fail(e)}
      const lib=u.protocol==='https:'?https:http;
      const h={...src.headers};
      if(range)h['Range']=range;else delete h['Range'];
      const o={method:'GET',hostname:u.hostname,port:u.port||(u.protocol==='https:'?443:80),path:u.pathname+u.search,headers:h,agent:false};
      if(u.username)o.auth=decodeURIComponent(u.username)+':'+decodeURIComponent(u.password||'');
      if(u.hostname.startsWith('['))o.hostname=u.hostname.slice(1,-1);
      req=lib.request(o,res=>{
        if(done){res.destroy();return}
        if([301,302,303,307,308].includes(res.statusCode)&&res.headers.location&&hops++<6){
          res.resume();let nu;try{nu=new URL(res.headers.location,u).toString()}catch(e){return fail(e)}
          if(res.statusCode===301||res.statusCode===308||hops===1)src.finalUrl=nu; // remember the resolved address (saves one round trip per seek)
          return go(nu);
        }
        done=true;signal.removeEventListener('abort',onAbort);req.setTimeout(0);
        resolve({res,url:urlStr});
      });
      req.setTimeout(HEADER_TIMEOUT,()=>fail(new Error('timeout')));
      req.on('error',fail);
      req.end();
    };
    go(src.finalUrl||src.url);
  });
}

/* open with retries (busy / dropping servers). Returns {res} or {status,res} for a final HTTP answer. */
async function openRetry(src,range,signal){
  let last=null;
  for(let n=0;n<MAX_TRIES;n++){
    if(signal.aborted)throw new Error('aborted');
    try{
      const r=await open(src,range,signal);
      const s=r.res.statusCode;
      if(s===429||s===503||s>=500){r.res.resume();last=new Error('HTTP '+s);if(src.finalUrl){src.finalUrl=null}}
      else return r;
    }catch(e){
      if(signal.aborted)throw e;
      last=e;if(src.finalUrl&&n>=1)src.finalUrl=null; // the cached redirect may have expired: start again from the original link
    }
    await sleep(Math.min(3000,400*(n+1)));
  }
  throw last||new Error('unreachable');
}

const parseRange=h=>{const m=/^bytes=(\d*)-(\d*)$/.exec(String(h||'').trim());return m&&(m[1]!==''||m[2]!=='')?{a:m[1]===''?null:+m[1],b:m[2]===''?null:+m[2]}:null};
const parseCR=h=>{const m=/^bytes\s+(\d+)-(\d+)\/(\d+|\*)/i.exec(h||'');return m?{a:+m[1],b:+m[2],total:m[3]==='*'?0:+m[3]}:null};

async function handle(req,rsp){
  const ac=new AbortController();
  let upstream=null;
  const closeAll=()=>{ac.abort();try{upstream&&upstream.destroy()}catch(_){}};
  rsp.on('close',closeAll);req.on('aborted',closeAll);
  try{
    const u=new URL(req.url,'http://127.0.0.1');
    const m=/^\/s\/([\w-]+)$/.exec(u.pathname);
    const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'GET, HEAD, OPTIONS','Access-Control-Expose-Headers':'Content-Range, Content-Length, Accept-Ranges, Content-Type'};
    if(req.method==='OPTIONS'){rsp.writeHead(204,cors);return rsp.end()}
    const src=m&&SRC.get(m[1]);
    if(!src){rsp.writeHead(404,cors);return rsp.end('Gone')}
    let want=parseRange(req.headers.range);
    let range=want?'bytes='+(want.a===null?'-'+want.b:want.a+'-'+(want.b===null?'':want.b)):null;
    // first connection: we learn size / type / whether ranges work from its answer
    let r;
    try{r=await openRetry(src,range,ac.signal)}catch(e){if(!rsp.headersSent&&!ac.signal.aborted){rsp.writeHead(502,cors);rsp.end('Bad gateway')}return}
    upstream=r.res;const st=r.res.statusCode,uh=r.res.headers;
    if(st>=400&&st!==416){ // refused / missing: pass the real status on (the player shows its message)
      rsp.writeHead(st,cors);r.res.resume();return rsp.end();
    }
    if(st===416){
      const cr=/\/(\d+)\s*$/.exec(uh['content-range']||'');r.res.resume();
      rsp.writeHead(416,{...cors,'Content-Range':'bytes */'+(cr?cr[1]:src.size||0)});return rsp.end();
    }
    let ct=String(uh['content-type']||'').toLowerCase().split(';')[0].trim();
    if(!/^(video|audio)\//.test(ct))ct=CFG.mime(src.url,uh,r.url)||ct;
    let start=0,end=-1,total=src.size||0,skip=0;
    if(st===206){
      const cr=parseCR(uh['content-range']);
      if(cr){start=cr.a;end=cr.b;total=cr.total||total}
      else{start=want&&want.a!==null?want.a:0;end=uh['content-length']?start+(+uh['content-length'])-1:-1}
    }else{ // 200: the server ignored "Range" and sends the whole file
      total=uh['content-length']?+uh['content-length']:total;
      if(want&&total){
        let a=want.a,b=want.b;
        if(a===null){a=Math.max(0,total-b);b=total-1}
        if(b===null||b>=total)b=total-1;
        if(a>=total){r.res.resume();rsp.writeHead(416,{...cors,'Content-Range':'bytes */'+total});return rsp.end()}
        start=a;end=b;skip=a;src.noRange=true;
      }else{want=null;start=0;end=total?total-1:-1} // no length known: send everything from the start
    }
    if(total)src.size=total;
    const h={...cors,'Accept-Ranges':'bytes','Content-Type':ct||'application/octet-stream','Cache-Control':'no-store'};
    for(const k of['last-modified','etag']){if(uh[k])h[k]=uh[k]}
    if(end>=0)h['Content-Length']=String(end-start+1);
    if(want||st===206){rsp.statusCode=206;if(total&&end>=0)h['Content-Range']=`bytes ${start}-${end}/${total}`;else if(end>=0)h['Content-Range']=`bytes ${start}-${end}/*`}
    else rsp.statusCode=200;
    rsp.writeHead(rsp.statusCode,h);
    if(req.method==='HEAD'){r.res.resume();return rsp.end()}
    await pump(src,rsp,ac.signal,r.res,start,end,skip,v=>{upstream=v});
  }catch(e){try{rsp.destroy()}catch(_){}}
}

/* copies bytes [pos..end] of the file to the player; reconnects (from the exact byte) whenever the server drops us */
async function pump(src,rsp,signal,first,pos,end,skip,setUp){
  let cur=first,fails=0;
  while(!signal.aborted){
    if(end>=0&&pos>end)break;
    if(!cur){
      if(rsp.writableNeedDrain)await new Promise(r=>{const f=()=>r();rsp.once('drain',f);rsp.once('close',f)}); // player is paused: do not reconnect yet
      if(signal.aborted)return;
      let o;
      try{o=await openRetry(src,'bytes='+pos+'-'+(end>=0?end:''),signal)}catch(e){break}
      const s=o.res.statusCode;
      if(s!==206&&s!==200){o.res.resume();if(++fails>MAX_TRIES)break;await sleep(500*fails);continue}
      cur=o.res;skip=s===200?pos:0; // 200 again: ignore the first <pos> bytes
      if(s===206){const cr=parseCR(cur.headers['content-range']);if(cr&&cr.a!==pos){cur.destroy();cur=null;if(++fails>MAX_TRIES)break;continue}}
    }
    setUp(cur);
    const before=pos;
    await new Promise(done=>{
      let wd=null,fin=false;
      const stop=()=>{if(fin)return;fin=true;clearTimeout(wd);cur.removeAllListeners('data');done()};
      const arm=()=>{clearTimeout(wd);if(!rsp.writableNeedDrain)wd=setTimeout(()=>{try{cur.destroy()}catch(_){}stop()},STALL_TIMEOUT)};
      cur.on('data',c=>{
        if(skip>0){if(c.length<=skip){skip-=c.length;arm();return}c=c.subarray(skip);skip=0}
        if(end>=0&&pos+c.length>end+1)c=c.subarray(0,end+1-pos);
        pos+=c.length;
        if(!rsp.write(c)){cur.pause();clearTimeout(wd);rsp.once('drain',()=>{if(!fin){cur.resume();arm()}})}else arm();
        if(end>=0&&pos>end){try{cur.destroy()}catch(_){}stop()}
      });
      cur.on('end',stop);cur.on('close',stop);cur.on('error',stop);
      arm();
    });
    try{cur.destroy()}catch(_){}
    cur=null;
    if(pos>before)fails=0;else if(++fails>MAX_TRIES)break;
    if(end<0)break; // unknown length: the server ended the stream, so it really is the end
  }
  if(!signal.aborted){if(end<0||pos>end)rsp.end();else rsp.destroy()}
}

function start(){
  if(server)return Promise.resolve(PORT);
  return new Promise(res=>{
    server=http.createServer(handle);
    server.keepAliveTimeout=0;
    server.listen(0,'127.0.0.1',()=>{PORT=server.address().port;res(PORT)});
    server.on('error',()=>res(0));
  });
}
/* registers a link, returns the local address the player should use */
async function register(url,headers){
  const port=await start();if(!port)return null;
  const id=crypto.randomUUID();
  SRC.set(id,{url,headers:headers||{},size:0,finalUrl:null});
  if(SRC.size>200)SRC.delete(SRC.keys().next().value);
  return `http://127.0.0.1:${port}/s/${id}`;
}
const isProxy=u=>typeof u==='string'&&PORT>0&&u.startsWith(`http://127.0.0.1:${PORT}/s/`);

module.exports={configure,register,isProxy,start};
