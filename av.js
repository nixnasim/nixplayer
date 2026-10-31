/* NixPlayer — audio / subtitle helper (main process).
   Chromium cannot decode AC3 / E-AC3 / DTS audio, cannot switch between several audio tracks of an MKV
   and cannot read subtitles stored inside the file. This module uses ffmpeg to
     - list the streams of a file                (probe)
     - turn one audio track into a live AAC stream  (local http server, started at any position)
     - turn one embedded text subtitle into WebVTT  (extractSub) */
const {execFile,spawn}=require('child_process'),http=require('http'),crypto=require('crypto'),fs=require('fs'),path=require('path'),os=require('os');

let FF=null;
function ffPath(){
  if(FF)return FF;
  try{FF=require('ffmpeg-static');if(FF)FF=FF.replace('app.asar'+path.sep,'app.asar.unpacked'+path.sep).replace('app.asar/','app.asar.unpacked/')}catch(_){}
  if(!FF||!fs.existsSync(FF))FF='ffmpeg'; // fall back to one on PATH
  return FF;
}

const isUrl=f=>/^http:\/\/127\.0\.0\.1:\d+\/s\//.test(f); // an online file, read through NixPlayer's streaming proxy
const TEXT_SUB=/^(subrip|srt|ass|ssa|webvtt|mov_text|text|microdvd|subviewer|sami|jacosub)$/i;
const probeCache=new Map();

function probe(file){
  if(probeCache.has(file))return probeCache.get(file);
  const pr=new Promise(res=>{
    execFile(ffPath(),['-hide_banner','-i',file],{timeout:30000,maxBuffer:8*1024*1024,windowsHide:true},(err,out,se)=>{
      if(err&&err.code==='ENOENT')return res({ok:false,error:'ffmpeg missing'});
      const txt=String(se||'');const lines=txt.split(/\r?\n/);
      const audio=[],subs=[];let cur=null,inMeta=false;
      for(const ln of lines){
        const m=/^\s*Stream #0:(\d+)(?:\[0x[0-9a-f]+\])?(?:\(([^)]*)\))?: (Audio|Subtitle|Video|Data|Attachment): ([^,\n(]+?)(?:\s*\(([^)]*)\))?(?:,|$| \()(.*)$/i.exec(ln);
        if(m){
          const kind=m[3].toLowerCase(),rest=ln;
          cur=null;inMeta=false;
          const o={id:+m[1],lang:(m[2]&&m[2]!=='und')?m[2]:'',codec:m[4].trim().toLowerCase(),title:'',def:/\(default\)/.test(rest),forced:/\(forced\)/.test(rest)};
          if(kind==='audio'){
            const ch=/\b(mono|stereo|\d\.\d(?:\([^)]*\))?|\d+ channels)\b/i.exec(rest);o.ch=ch?ch[1].replace(/\(.*\)/,''):'';
            const hz=/(\d+) Hz/.exec(rest);o.hz=hz?+hz[1]:0;o.idx=audio.length;audio.push(o);cur=o;
          }else if(kind==='subtitle'){o.idx=subs.length;o.text=TEXT_SUB.test(o.codec);subs.push(o);cur=o}
          continue;
        }
        if(/^\s*Metadata:/.test(ln)){inMeta=!!cur;continue}
        if(cur&&inMeta){const t=/^\s+title\s*:\s*(.*)$/i.exec(ln);if(t)cur.title=t[1].trim()}
        if(/^\s*Stream #/.test(ln)){cur=null;inMeta=false}
      }
      const d=/Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/.exec(txt);
      res({ok:true,audio,subs,duration:d?(+d[1]*3600+ +d[2]*60+ +d[3]):0});
    });
  });
  probeCache.set(file,pr);if(probeCache.size>50)probeCache.delete(probeCache.keys().next().value);
  return pr;
}

/* ---- embedded subtitle -> WebVTT text (cached on disk) ---- */
let CACHE=path.join(os.tmpdir(),'nixplayer-subs');
function setCacheDir(d){CACHE=d}
function extractSub(file,idx){
  return new Promise(res=>{
    let key;try{if(isUrl(file))key=crypto.createHash('sha1').update(file+'|'+idx).digest('hex');else{const st=fs.statSync(file);key=crypto.createHash('sha1').update(file+'|'+st.size+'|'+st.mtimeMs+'|'+idx).digest('hex')}}catch(_){return res(null)}
    fs.mkdirSync(CACHE,{recursive:true});
    const out=path.join(CACHE,key+'.vtt');
    try{if(fs.statSync(out).size>10)return res(fs.readFileSync(out,'utf8'))}catch(_){}
    const tmp=out+'.part';
    execFile(ffPath(),['-hide_banner','-loglevel','error','-y','-i',file,'-map','0:s:'+idx,'-f','webvtt',tmp],{timeout:600000,windowsHide:true},err=>{
      try{
        if(err||!fs.existsSync(tmp))return res(null);
        fs.renameSync(tmp,out);res(fs.readFileSync(out,'utf8'));
      }catch(_){res(null)}
    });
  });
}

/* ---- live audio stream: http://127.0.0.1:port/a?...  (AAC / ADTS, starts at ss seconds) ---- */
let server=null,PORT=0,TOKEN=crypto.randomBytes(8).toString('hex');
const OK_FILE=/\.(mp4|m4v|mkv|webm|mov|avi|wmv|flv|ts|mpg|mpeg|3gp|ogv|mp3|flac|wav|ogg|opus|m4a|aac)$/i;
function startServer(){
  if(server)return Promise.resolve(PORT);
  return new Promise(res=>{
    server=http.createServer((req,rsp)=>{
      try{
        const u=new URL(req.url,'http://127.0.0.1');
        if(u.pathname!=='/a'||u.searchParams.get('k')!==TOKEN){rsp.writeHead(403);return rsp.end()}
        const f=u.searchParams.get('p'),t=Math.max(0,parseInt(u.searchParams.get('t')||'0',10)||0),ss=Math.max(0,parseFloat(u.searchParams.get('ss')||'0')||0);
        if(!f||!(isUrl(f)||(OK_FILE.test(f)&&fs.existsSync(f)))){rsp.writeHead(404);return rsp.end()}
        rsp.writeHead(200,{'Content-Type':'audio/aac','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'});
        const a=['-hide_banner','-loglevel','error','-nostdin'];
        if(isUrl(f))a.push('-probesize','1000000','-analyzeduration','1000000'); // online: do not spend seconds analysing before the first sound
        if(ss>0)a.push('-ss',ss.toFixed(3));
        a.push('-i',f,'-map','0:a:'+t,'-vn','-sn','-dn','-c:a','aac','-b:a','192k','-ac','2','-ar','48000','-f','adts','pipe:1');
        const p=spawn(ffPath(),a,{windowsHide:true,stdio:['ignore','pipe','ignore']});
        p.stdout.pipe(rsp);
        const kill=()=>{try{p.kill()}catch(_){}};
        rsp.on('close',kill);req.on('aborted',kill);p.on('error',()=>rsp.end());
      }catch(_){try{rsp.writeHead(500);rsp.end()}catch(__){}}
    });
    server.listen(0,'127.0.0.1',()=>{PORT=server.address().port;res(PORT)});
    server.on('error',()=>res(0));
  });
}
async function audioUrl(file,idx,ss){
  const port=await startServer();if(!port)return null;
  return `http://127.0.0.1:${port}/a?k=${TOKEN}&t=${idx}&ss=${(+ss||0).toFixed(3)}&p=${encodeURIComponent(file)}`;
}


/* ---- embedded subtitle of an ONLINE file, delivered while it is being read ----
   A subtitle track is spread over the whole MKV, so ffmpeg has to read the file. Instead of waiting for the end, the text
   found so far is sent to the player every couple of seconds ('sub:chunk'); a seek to a later part restarts the job there. */
const live=new Map();let liveN=0;
function subLive(file,idx,ss,send){
  const id=++liveN;let buf='',sent='',proc=null,stopped=false,tries=0;
  const timer=setInterval(()=>{if(buf!==sent){sent=buf;send({id,text:buf,done:false})}},600);
  const run=()=>{
    const a=['-hide_banner','-loglevel','error','-nostdin','-probesize','1000000','-analyzeduration','1000000','-readrate','8'];
    if(ss>0)a.push('-ss',ss.toFixed(3),'-copyts');
    a.push('-i',file,'-map','0:s:'+idx,'-flush_packets','1','-f','webvtt','pipe:1');
    proc=spawn(ffPath(),a,{windowsHide:true,stdio:['ignore','pipe','ignore']});
    let got=0;buf='';
    proc.stdout.setEncoding('utf8');proc.stdout.on('data',c=>{got+=c.length;buf+=c});
    proc.on('error',()=>{});
    proc.on('close',code=>{
      if(stopped)return;
      if(code!==0&&got<20&&++tries<=6){setTimeout(()=>{if(!stopped)run()},2500);return} // server busy (too many connections): try again
      clearInterval(timer);live.delete(id);send({id,text:buf,done:true,ok:code===0||got>=20});
    });
  };
  live.set(id,()=>{stopped=true;clearInterval(timer);try{proc&&proc.kill()}catch(_){}});
  run();return id;
}
function subStop(id){const k=live.get(id);if(k){k();live.delete(id)}return true}

/* ---- timeline preview picture of an ONLINE file (one frame, nearest keyframe, 160 px wide, JPEG data URL) ---- */
let thumbProc=null,thumbWait=null;
function thumb(file,t){
  if(thumbProc){try{thumbProc.kill()}catch(_){}thumbProc=null}
  if(thumbWait){thumbWait(null);thumbWait=null}
  return new Promise(res=>{
    thumbWait=res;
    const a=['-hide_banner','-loglevel','error','-nostdin','-probesize','1000000','-analyzeduration','1000000','-noaccurate_seek','-ss',Math.max(0,t).toFixed(2),'-i',file,
      '-map','0:v:0','-frames:v','1','-an','-sn','-dn','-vf','scale=160:-2','-q:v','6','-f','image2pipe','-c:v','mjpeg','pipe:1'];
    const p=spawn(ffPath(),a,{windowsHide:true,stdio:['ignore','pipe','ignore']});thumbProc=p;
    const chunks=[];p.stdout.on('data',c=>chunks.push(c));p.on('error',()=>{});
    const kt=setTimeout(()=>{try{p.kill()}catch(_){}},20000);
    p.on('close',()=>{clearTimeout(kt);if(thumbProc===p){thumbProc=null;thumbWait=null}const b=Buffer.concat(chunks);res(b.length>200?'data:image/jpeg;base64,'+b.toString('base64'):null)});
  });
}

module.exports={probe,extractSub,subLive,subStop,thumb,audioUrl,setCacheDir,ffPath,TEXT_SUB};
