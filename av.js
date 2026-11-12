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
      const audio=[],subs=[];let video=null,cur=null,inMeta=false;
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
          else if(kind==='video'&&!video&&!/attached pic/i.test(rest)){ // first real video stream (not cover art): codec, profile, picture size, frame rate, bit rate
            const sz=/(?:^|[ ,])(\d{2,5})x(\d{2,5})(?=[ ,\[]|$)/.exec(rest),fps=/([\d.]+) fps/.exec(rest),br=/(\d+) kb\/s/.exec(rest),px=/,\s*(yuv[a-z0-9]+|gbr[a-z0-9]+|nv12|p010[a-z]*|rgb[a-z0-9]*)/.exec(rest);
            video={codec:o.codec,profile:m[5]||'',w:sz?+sz[1]:0,h:sz?+sz[2]:0,fps:fps?+fps[1]:0,kbps:br?+br[1]:0,pix:px?px[1]:''}
          }
          continue;
        }
        if(/^\s*Metadata:/.test(ln)){inMeta=!!cur;continue}
        if(cur&&inMeta){const t=/^\s+title\s*:\s*(.*)$/i.exec(ln);if(t)cur.title=t[1].trim()}
        if(/^\s*Stream #/.test(ln)){cur=null;inMeta=false}
      }
      const d=/Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/.exec(txt);
      res({ok:true,audio,subs,video,duration:d?(+d[1]*3600+ +d[2]*60+ +d[3]):0});
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
        const hm=/^\/h\/([0-9a-f]+)\/([0-9a-f]{16}\.hls)\/(index\.m3u8|seg\d{5}\.ts)$/.exec(u.pathname); // the stream made by hlsStart (token is in the path, so the pieces named inside the playlist keep it)
        if(hm){
          const f=hlsRoot&&path.join(hlsRoot,hm[2],hm[3]);
          if(hm[1]!==TOKEN||!f){rsp.writeHead(403);return rsp.end()}
          if(!fs.existsSync(f)){rsp.writeHead(404);return rsp.end()}
          rsp.writeHead(200,{'Content-Type':hm[3].endsWith('.m3u8')?'application/vnd.apple.mpegurl':'video/mp2t','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'});
          return fs.createReadStream(f).pipe(rsp);
        }
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

/* ---- "play it now": H.264 + AAC made while you watch, delivered as HLS ----
   For a file this PC cannot decode (see convert). ffmpeg writes 4-second pieces and a growing playlist into the converted folder; the player
   (hls.js) starts as soon as the first pieces exist. When ffmpeg has finished the playlist is final and is kept, so the next open is instant. */
let hlsRoot=null;const hlsJobs=new Map();
const hlsKey=file=>{const st=fs.statSync(file);return crypto.createHash('sha1').update(file+'|'+st.size+'|'+st.mtimeMs).digest('hex').slice(0,16)};
const hlsDone=pl=>{try{return /#EXT-X-ENDLIST/.test(fs.readFileSync(pl,'utf8'))}catch(_){return false}};
const hlsDrop=j=>{j.stopped=true;try{j.proc.kill()}catch(_){}if(!hlsDone(path.join(j.dir,'index.m3u8')))setTimeout(()=>{try{fs.rmSync(j.dir,{recursive:true,force:true})}catch(_){}},800)};
function hlsStop(file){try{const k=hlsKey(file),j=hlsJobs.get(k);if(j){hlsJobs.delete(k);hlsDrop(j)}}catch(_){}}
function hlsStopAll(){for(const j of hlsJobs.values())hlsDrop(j);hlsJobs.clear()}
async function hlsStart(file,info,baseDir){
  const port=await startServer();if(!port)return{ok:false,error:'The local stream server could not start'};
  hlsRoot=baseDir;
  const key=hlsKey(file),name=key+'.hls',dir=path.join(baseDir,name),pl=path.join(dir,'index.m3u8');
  const url=`http://127.0.0.1:${port}/h/${TOKEN}/${name}/index.m3u8`;
  if(hlsDone(pl)){try{const t=new Date();fs.utimesSync(dir,t,t)}catch(_){}return{ok:true,url,done:true}} // made before
  if(!hlsJobs.has(key)){
    fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true});
    const V=info&&info.video,copyV=!!V&&/^h264$/i.test(V.codec);
    const a=['-hide_banner','-loglevel','error','-nostdin','-y','-i',file,'-map','0:v:0','-map','0:a:0?',
      ...(copyV?['-c:v','copy']:['-c:v','libx264','-preset','veryfast','-crf','23','-pix_fmt','yuv420p','-vf','scale=trunc(iw/2)*2:trunc(ih/2)*2','-force_key_frames','expr:gte(t,n_forced*4)','-sc_threshold','0']),
      '-c:a','aac','-b:a','128k','-ar','48000',
      '-f','hls','-hls_time','4','-hls_list_size','0','-hls_playlist_type','event','-hls_flags','independent_segments','-hls_segment_filename',path.join(dir,'seg%05d.ts'),pl];
    const proc=spawn(ffPath(),a,{windowsHide:true,stdio:['ignore','ignore','pipe']});
    try{os.setPriority(proc.pid,os.constants.priority.PRIORITY_BELOW_NORMAL)}catch(_){} // keep the PC usable while it works
    const job={proc,dir,stopped:false,err:'',exit:null};
    proc.stderr.on('data',d=>{job.err=(job.err+d).slice(-1500)});
    proc.on('error',e=>{job.err=String(e.message);job.exit=-1});
    proc.on('close',c=>{job.exit=c;if(hlsJobs.get(key)===job&&c===0)hlsJobs.delete(key)});
    hlsJobs.set(key,job);
  }
  const job=hlsJobs.get(key),t0=Date.now();
  while(Date.now()-t0<90000){ // wait until a few pieces exist (or it has ended or failed)
    if(job&&job.stopped)return{ok:false,error:'cancelled'};
    let txt='';try{txt=fs.readFileSync(pl,'utf8')}catch(_){}
    const ended=/#EXT-X-ENDLIST/.test(txt);
    if((txt.match(/\.ts/g)||[]).length>=2||ended)return{ok:true,url,done:ended};
    if(job&&job.exit!=null&&job.exit!==0)return{ok:false,error:(job.err.trim().split('\n').pop()||('ffmpeg stopped with code '+job.exit)).slice(0,300)};
    await new Promise(r=>setTimeout(r,200));
  }
  return{ok:false,error:'The stream did not start in time'};
}

/* A recording made by the browser (MediaRecorder) is a WebM without a length and without a seek table, so the player cannot jump
   around in it. Copying it once through ffmpeg (no re-encoding) writes both. Returns true when the file was repaired. */
function fixWebm(file){
  return new Promise(res=>{
    const tmp=file+'.fixing.webm';
    execFile(ffPath(),['-hide_banner','-loglevel','error','-nostdin','-y','-i',file,'-c','copy',tmp],{timeout:180000,windowsHide:true},err=>{
      try{
        if(!err&&fs.existsSync(tmp)&&fs.statSync(tmp).size>1024){fs.renameSync(tmp,file);return res(true)}
        fs.rmSync(tmp,{force:true});
      }catch(_){}
      res(false);
    });
  });
}

module.exports={hlsStart,hlsStop,hlsStopAll,fixWebm,probe,extractSub,subLive,subStop,thumb,audioUrl,setCacheDir,ffPath,TEXT_SUB};
