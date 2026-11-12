const {app,BrowserWindow,ipcMain,dialog,shell,protocol,screen,powerSaveBlocker,net,session}=require('electron');
const {execFile}=require('child_process'),crypto=require('crypto');
const AV=require('./av.js'),WP=require('./webproxy.js');
const path=require('path'),fs=require('fs'),os=require('os'),{Readable}=require('stream');

const TOPH=32; // height of the custom top bar (px)
const MEDIA=/\.(mp4|m4v|mkv|webm|mov|avi|wmv|flv|ts|mpg|mpeg|3gp|ogv|mp3|flac|wav|ogg|opus|m4a|aac)$/i;
const SUBS=/\.(srt|vtt)$/i;
const MIME={'.mp4':'video/mp4','.m4v':'video/mp4','.mkv':'video/x-matroska','.webm':'video/webm','.mov':'video/quicktime','.avi':'video/x-msvideo','.ogv':'video/ogg','.mp3':'audio/mpeg','.flac':'audio/flac','.wav':'audio/wav','.ogg':'audio/ogg','.opus':'audio/ogg','.m4a':'audio/mp4','.aac':'audio/aac'};
const EXT=MEDIA.source.match(/\((.*)\)/)[1].split('|');

// multiple audio tracks (audio track selector) + autoplay without a click
app.commandLine.appendSwitch('enable-blink-features','AudioVideoTracks');
app.commandLine.appendSwitch('enable-features','PlatformHEVCDecoderSupport'); // HEVC / H.265 on the graphics card, where the PC has one that can do it
app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
// keep playing when the window is minimized or covered by another window (Chromium otherwise treats it as "hidden" and may pause the video)
app.commandLine.appendSwitch('disable-features','CalculateNativeWinOcclusion,BackgroundVideoPauseOptimization,BackgroundVideoTrackOptimization');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

// media:// serves local files with Range support (seeking) and CORS headers (needed for screenshots + volume boost)
const PRIV={standard:true,secure:true,supportFetchAPI:true,stream:true,corsEnabled:true,bypassCSP:true};
// online videos go through a local streaming proxy (webproxy.js)
protocol.registerSchemesAsPrivileged([{scheme:'media',privileges:PRIV}]);

let win=null; // the window used last (focused): target of the auto-update progress
const blockers=new Map(); // power-save blocker per window (webContents id)
const wOf=e=>{const w=BrowserWindow.fromWebContents(e.sender);return w&&!w.isDestroyed()?w:null}; // the window an IPC call came from
const stateFile=()=>path.join(app.getPath('userData'),'window.json');
const readState=()=>{try{return JSON.parse(fs.readFileSync(stateFile(),'utf8'))}catch(e){return{}}};
// links: plain http(s) URLs, or nixplayer://open?url=<encoded link> (e.g. from a browser bookmarklet)
const toWeb=a=>{
  if(/^https?:\/\//i.test(a))return a;
  if(/^nixplayer:/i.test(a)){
    try{const q=new URL(a).searchParams.get('url');if(q&&/^https?:\/\//i.test(q))return q}catch(e){}
    try{const r=decodeURIComponent(a.replace(/^nixplayer:(\/\/)?(open\/?)?\??(url=)?/i,''));if(/^https?:\/\//i.test(r))return r}catch(e){}
  }
  return null;
};
const pickArgs=argv=>argv.slice(1).map(a=>toWeb(a)||a)
  .filter(a=>/^https?:\/\//i.test(a)||(!a.startsWith('-')&&(MEDIA.test(a)||SUBS.test(a))&&fs.existsSync(a)))
  .map(a=>/^https?:\/\//i.test(a)?a:path.resolve(a));

function sendFiles(w,files){if(w&&!w.isDestroyed()&&files.length)w.webContents.send('open-files',files)}

function createWindow(files){
  const s=readState();
  const others=BrowserWindow.getAllWindows().filter(w=>!w.isDestroyed());
  const opts={width:s.width||1000,height:s.height||600,minWidth:420,minHeight:260,backgroundColor:'#000000',icon:path.join(__dirname,'renderer','logo.png'),autoHideMenuBar:true,frame:false,title:'NixPlayer',
    webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}};
  if(Number.isFinite(s.x)&&Number.isFinite(s.y)){
    const ok=screen.getAllDisplays().some(d=>{const b=d.bounds;return s.x>=b.x-50&&s.x<b.x+b.width-100&&s.y>=b.y-10&&s.y<b.y+b.height-100});
    if(ok){opts.x=s.x;opts.y=s.y}
  }
  // an extra window opens a little down / right of the last one so it does not hide it
  if(others.length){const b=(others.find(w=>w.isFocused())||others[others.length-1]).getNormalBounds();opts.x=b.x+36;opts.y=b.y+36;opts.width=b.width;opts.height=b.height}
  const w=new BrowserWindow(opts);win=w;
  w.removeMenu();
  w.loadFile(path.join(__dirname,'renderer','player.html'));
  if(s.max&&!others.length)w.maximize();
  w.on('focus',()=>{win=w});
  w.on('close',()=>{try{fs.writeFileSync(stateFile(),JSON.stringify({...w.getNormalBounds(),max:w.isMaximized()}))}catch(e){}});
  const sendState=()=>{if(!w.isDestroyed())w.webContents.send('win:changed',{max:w.isMaximized(),top:w.isAlwaysOnTop(),full:w.isFullScreen()})};
  ['maximize','unmaximize','restore','enter-full-screen','leave-full-screen'].forEach(ev=>w.on(ev,sendState));
  const wid=w.webContents.id;
  w.on('closed',()=>{if(win===w)win=BrowserWindow.getAllWindows().find(x=>!x.isDestroyed())||null;const b=blockers.get(wid);if(b!==undefined){powerSaveBlocker.stop(b);blockers.delete(wid)}});
  w.webContents.on('did-finish-load',()=>sendFiles(w,files||[]));
  w.webContents.setWindowOpenHandler(({url})=>{if(/^https?:/i.test(url))shell.openExternal(url);return{action:'deny'}});
  if(process.env.NP_DEBUG)w.webContents.on('console-message',(e,...r)=>console.log('[renderer]',e.message??r[1],'@',e.sourceId??r[3],e.lineNumber??r[2]));
  return w;
}

if(!app.requestSingleInstanceLock()){app.quit()}
else{
  // opened from outside (Explorer, "Open with", a link, the app icon again): always a NEW window; opening things from inside a player window stays in that window
  app.on('second-instance',(e,argv)=>{createWindow(pickArgs(argv)).focus()});
  app.whenReady().then(()=>{
    convClean();
    protocol.handle('media',async req=>{
      try{
        const p=decodeURIComponent(new URL(req.url).pathname.slice(1));
        if(!MEDIA.test(p))return new Response('Forbidden',{status:403});
        const size=(await fs.promises.stat(p)).size;
        const h={'Accept-Ranges':'bytes','Content-Type':MIME[path.extname(p).toLowerCase()]||'application/octet-stream','Access-Control-Allow-Origin':'*'};
        const m=/bytes=(\d*)-(\d*)/.exec(req.headers.get('range')||'');
        if(!m){h['Content-Length']=String(size);return new Response(Readable.toWeb(fs.createReadStream(p)),{status:200,headers:h})}
        let a=0,b=size-1;
        if(m[1]===''){a=Math.max(0,size-parseInt(m[2],10))}else{a=parseInt(m[1],10);if(m[2]!=='')b=Math.min(parseInt(m[2],10),size-1)}
        if(a>b||a>=size)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
        h['Content-Range']=`bytes ${a}-${b}/${size}`;h['Content-Length']=String(b-a+1);
        return new Response(Readable.toWeb(fs.createReadStream(p,{start:a,end:b})),{status:206,headers:h});
      }catch(e){return new Response('Not found',{status:404})}
    });
    if(app.isPackaged)app.setAsDefaultProtocolClient('nixplayer');
    WP.configure({mime:(u,h,fin)=>{
      let ext='';try{ext=path.extname(new URL(fin||u).pathname).toLowerCase()}catch(_){}
      if(!MIME[ext]){try{ext=path.extname(new URL(u).pathname).toLowerCase()}catch(_){}}
      const cd=/filename\*?=(?:UTF-8'')?"?([^";]+)/i.exec(h['content-disposition']||'');
      if(!MIME[ext]&&cd){try{ext=path.extname(decodeURIComponent(cd[1])).toLowerCase()}catch(_){}}
      return MIME[ext]||'';
    }});
    AV.setCacheDir(path.join(app.getPath('userData'),'subs'));
    // HLS (.m3u8) is played with hls.js straight from the remote server: add the CORS headers it needs
    // and the Referer / User-Agent the site expects (only for the page's own xhr / media requests)
    const ses=session.defaultSession;
    ses.webRequest.onHeadersReceived((d,cb)=>{
      const h=d.responseHeaders||{};
      if(/^https?:/i.test(d.url)&&(d.resourceType==='xhr'||d.resourceType==='media')){
        for(const k of Object.keys(h))if(/^access-control-allow-(origin|headers|methods)$/i.test(k))delete h[k];
        h['Access-Control-Allow-Origin']=['*'];h['Access-Control-Allow-Headers']=['*'];h['Access-Control-Allow-Methods']=['GET, HEAD, OPTIONS'];
      }
      cb({responseHeaders:h,statusLine:d.statusLine});
    });
    ses.webRequest.onBeforeSendHeaders((d,cb)=>{
      const h=d.requestHeaders;
      if(HLSHDR&&/^https?:/i.test(d.url)&&d.resourceType==='xhr'){
        for(const k in HLSHDR){const ex=Object.keys(h).find(x=>x.toLowerCase()===k.toLowerCase());if(ex)delete h[ex];h[k]=HLSHDR[k]}
        if(HLSHDR.Referer){try{h['Origin']=new URL(HLSHDR.Referer).origin}catch(_){}}
      }
      cb({requestHeaders:h});
    });
    createWindow(pickArgs(process.argv));
    require('./updater.js').init(()=>win); // auto-update (installed app only) + About-page helpers
    app.on('activate',()=>{if(!BrowserWindow.getAllWindows().length)createWindow([])});
  });
}
app.on('window-all-closed',()=>app.quit());

/* ---------- online links ---------- */
const WEBSRC=new Map();
const CHROME_UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
// headers a browser would send: many movie / file servers refuse the default Electron user agent, or want a Referer from their own site
function webHdr(url,extra){
  const h={'User-Agent':CHROME_UA,'Accept':'*/*','Accept-Encoding':'identity','Accept-Language':'en-US,en;q=0.9','Connection':'keep-alive'};
  try{h['Referer']=new URL(url).origin+'/'}catch(_){}
  for(const k in (extra||{})){const ex=Object.keys(h).find(x=>x.toLowerCase()===k.toLowerCase());if(ex)delete h[ex];h[k]=extra[k]}
  return h;
}
const regWeb=(url,headers)=>WP.register(url,webHdr(url,headers)); // async: returns http://127.0.0.1:<port>/s/<id>
const {STORE}=require('./edition.js'); // Microsoft Store edition: no yt-dlp download / run, no self-update
const YT=process.platform==='win32'?'yt-dlp.exe':'yt-dlp';
let HLSHDR=null; // request headers for the stream that is playing through hls.js
// yt-dlp is looked up in NixPlayer's own folder (auto-downloaded), next to the app, in ./bin, then on PATH
const ytDir=()=>path.join(app.getPath('userData'),'bin');
const ytList=()=>[path.join(ytDir(),YT),path.join(path.dirname(process.execPath),YT),path.join(__dirname,'bin',YT),YT];
const YT_ASSET={win32:'yt-dlp.exe',darwin:'yt-dlp_macos',linux:process.arch==='arm64'?'yt-dlp_linux_aarch64':'yt-dlp_linux'}[process.platform]||'yt-dlp';
let ytUpdated=false,ytDl=null;
// downloads the latest yt-dlp into NixPlayer's own folder (first use, or when a site stopped working)
function getYt(){
  if(STORE)return Promise.resolve(false); // never download executable code in the Store edition
  if(ytDl)return ytDl;
  ytDl=(async()=>{
    try{
      const r=await net.fetch('https://github.com/yt-dlp/yt-dlp/releases/latest/download/'+YT_ASSET,{redirect:'follow',bypassCustomProtocolHandlers:true,signal:AbortSignal.timeout(120000)});
      if(!r.ok)return false;
      const buf=Buffer.from(await r.arrayBuffer());if(buf.length<1e6)return false;
      fs.mkdirSync(ytDir(),{recursive:true});
      const f=path.join(ytDir(),YT),t=f+'.new';fs.writeFileSync(t,buf,{mode:0o755});fs.renameSync(t,f);return true;
    }catch(_){return false}
  })().finally(()=>{ytDl=null});
  return ytDl;
}
const YTFMT='best[protocol^=http][protocol!*=m3u8][height>=480][height<=1080]/best[protocol*=m3u8][height<=1080]/best[protocol^=http][protocol!*=m3u8]/best[protocol*=m3u8]/best';
function runYtOnce(url){
  return new Promise(res=>{
    const args=['--no-playlist','--no-warnings','--no-call-home','--socket-timeout','15','--extractor-retries','1','-j','-f',YTFMT,url];
    const tryAt=i=>{
      const c=ytList();if(i>=c.length)return res({err:'missing'});
      execFile(c[i],args,{timeout:60000,maxBuffer:32*1024*1024,windowsHide:true},(err,out,se)=>{
        if(err&&err.code==='ENOENT')return tryAt(i+1);
        if(err)return res({err:String(se||err.message).trim().split('\n').pop()});
        try{res({json:JSON.parse(out.split('\n')[0])})}catch(e){res({err:'Could not read the yt-dlp result'})}
      });
    };
    tryAt(0);
  });
}
async function runYt(url){
  let r=await runYtOnce(url);
  if(r.err==='missing'){if(await getYt())r=await runYtOnce(url);else return{err:'missing'}}
  // a site changed: fetch the newest yt-dlp once and retry
  else if(r.err&&!ytUpdated&&/(HTTP Error (4\d\d)|Unable to extract|nsig|Sign in|player response|not a bot|Unsupported URL|unable to download)/i.test(r.err)){
    ytUpdated=true;if(await getYt()){const r2=await runYtOnce(url);if(!r2.err||r2.err!=='missing')r=r2}
  }
  return r;
}
const SITE=/(^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com|vimeo\.com|facebook\.com|fb\.watch|instagram\.com|twitter\.com|x\.com|tiktok\.com|dailymotion\.com|twitch\.tv|reddit\.com|bilibili\.com|streamable\.com|rumble\.com|odysee\.com|ok\.ru|vk\.com|soundcloud\.com)$/i;
const RES=new Map(); // resolved links are remembered for 20 minutes (replay / resume is instant)
ipcMain.handle('net:resolve',async(e,url)=>{
  const hit=RES.get(url);if(hit&&Date.now()-hit.t<20*60*1000){if(hit.r.hdr)HLSHDR=hit.r.hdr;return hit.r}
  const done=r=>{if(r.ok){RES.set(url,{t:Date.now(),r});if(RES.size>100)RES.delete(RES.keys().next().value)}return r};
  let u;try{u=new URL(url)}catch(_){return{ok:false,error:'That is not a valid link.'}}
  if(!/^https?:$/.test(u.protocol))return{ok:false,error:'Only http(s) links are supported.'};
  const nameOf=()=>{try{return decodeURIComponent(path.basename(u.pathname))||u.hostname}catch(_){return u.hostname}};
  let direct=MEDIA.test(u.pathname),hls=/\.m3u8$/i.test(u.pathname);
  if(!direct&&!hls&&!SITE.test(u.hostname)){ // ask the server what it is (1-byte ranged request)
    try{
      const r=await net.fetch(url,{headers:{Range:'bytes=0-0'},redirect:'follow',signal:AbortSignal.timeout(5000),bypassCustomProtocolHandlers:true});
      const ct=(r.headers.get('content-type')||'').toLowerCase();
      try{await r.body?.cancel()}catch(_){}
      direct=/^(video|audio)\//.test(ct)||ct==='application/ogg';
      hls=/mpegurl/.test(ct);
    }catch(_){}
  }
  if(hls){HLSHDR=null;return done({ok:true,hls:true,src:url,title:nameOf()})}
  if(direct){
    // quick check, so a refused / missing / not-a-video link says why instead of loading forever
    try{
      const r=await net.fetch(url,{headers:{...webHdr(url),Range:'bytes=0-0'},redirect:'follow',signal:AbortSignal.timeout(12000),bypassCustomProtocolHandlers:true});
      const ct=(r.headers.get('content-type')||'').toLowerCase();
      try{await r.body?.cancel()}catch(_){}
      if([401,403].includes(r.status))return{ok:false,error:'The server refused the link ('+r.status+'). It may need a login, a token that has expired, or it blocks players. Open the link in your browser to check.'};
      if([404,410].includes(r.status))return{ok:false,error:'The server says this file does not exist ('+r.status+'). The link may have expired.'};
      if(r.ok&&/text\/html|application\/json/.test(ct))return{ok:false,error:'The link opens a web page, not a video file. Use the direct video link.'};
    }catch(_){} // slow or unreachable: still try to play, the player retries
    return done({ok:true,src:await regWeb(url),title:nameOf()});
  }
  if(STORE)return{ok:false,error:'This link is not a direct video or audio file. This edition of NixPlayer plays direct links (.mp4, .webm, .mp3, .m3u8 …); pages of streaming sites are not supported.'};
  const y=await runYt(url);
  if(y.err==='missing')return{ok:false,error:'Could not download yt-dlp (needed for YouTube and other sites). Check your internet connection, or put yt-dlp.exe next to NixPlayer.exe, then try again.'};
  if(y.err)return{ok:false,error:'yt-dlp: '+y.err};
  const j=y.json||{};
  if(!j.url)return{ok:false,error:'No playable stream was found for this link.'};
  if(/^(http_dash|dash)/.test(j.protocol||'')||/\.mpd(\?|$)/i.test(j.url))return{ok:false,error:'This site only offers a DASH stream, which NixPlayer cannot play yet.'};
  if(/m3u8/.test(j.protocol||'')||/\.m3u8(\?|$)/i.test(j.url)){
    const hdr={};['User-Agent','Referer'].forEach(k=>{const v=(j.http_headers||{})[k];if(v)hdr[k]=v});
    HLSHDR=hdr;return done({ok:true,hls:true,hdr,src:j.url,title:j.title||nameOf()});
  }
  return done({ok:true,src:await regWeb(j.url,j.http_headers),title:j.title||nameOf()});
});

/* ---------- audio tracks / embedded subtitles (ffmpeg) ---------- */
const okMedia=p=>typeof p==='string'&&(WP.isProxy(p)||(MEDIA.test(p)&&fs.existsSync(p)));
ipcMain.handle('av:probe',(e,p)=>okMedia(p)?AV.probe(p):{ok:false});
ipcMain.handle('av:sub',(e,p,i)=>okMedia(p)?AV.extractSub(p,i|0):null);
ipcMain.handle('av:subLive',(e,p,i,ss)=>okMedia(p)?AV.subLive(p,i|0,+ss||0,m=>{if(!e.sender.isDestroyed())e.sender.send('sub:chunk',m)}):0);
ipcMain.handle('av:subStop',(e,id)=>AV.subStop(id));
ipcMain.handle('av:thumb',(e,p,t)=>okMedia(p)?AV.thumb(p,+t||0):null); // online files and local files (preview frames cut by ffmpeg)
ipcMain.handle('av:audio',(e,p,i,ss)=>okMedia(p)?AV.audioUrl(p,i|0,ss):null);


/* ---------- subtitle search (OpenSubtitles) ---------- */
const OS_UA='TemporaryUserAgent',OS_HOST=/(^|\.)opensubtitles\.(org|com)$/i;
const osHash=async p=>{ // OpenSubtitles "movie hash": file size + 64 KB from the start and the end
  let fd;try{
    fd=await fs.promises.open(p,'r');const size=(await fd.stat()).size;if(size<131072)return null;
    const buf=Buffer.alloc(131072);await fd.read(buf,0,65536,0);await fd.read(buf,65536,65536,size-65536);
    let h=BigInt(size);for(let i=0;i<buf.length;i+=8)h=(h+buf.readBigUInt64LE(i))&0xFFFFFFFFFFFFFFFFn;
    return{size,hash:h.toString(16).padStart(16,'0')};
  }catch(_){return null}finally{if(fd)await fd.close().catch(()=>{})}
};
const osGet=async path_=>{
  const r=await net.fetch('https://rest.opensubtitles.org/search/'+path_,{headers:{'User-Agent':OS_UA,'Accept':'application/json'},signal:AbortSignal.timeout(15000),bypassCustomProtocolHandlers:true});
  if(!r.ok)throw new Error('The subtitle server answered '+r.status);
  const j=await r.json();return Array.isArray(j)?j:[];
};
ipcMain.handle('subs:search',async(e,o)=>{
  try{
    o=o||{};const lang=/^[a-z]{3}$/.test(o.lang||'')?'/sublanguageid-'+o.lang:'';
    const jobs=[];
    if(o.path&&okMedia(o.path)){const h=await osHash(o.path);if(h)jobs.push(osGet('moviebytesize-'+h.size+'/moviehash-'+h.hash+lang).then(l=>l.map(x=>(x.hashMatch=1,x))))}
    const q=String(o.query||'').toLowerCase().replace(/[^\p{L}\p{N} ]+/gu,' ').replace(/\s+/g,' ').trim();
    if(q)jobs.push(osGet('query-'+encodeURIComponent(q).replace(/%20/g,'%20')+lang));
    if(!jobs.length)return{ok:true,items:[]};
    const res=await Promise.allSettled(jobs);
    if(res.every(r=>r.status==='rejected'))return{ok:false,error:'Could not reach OpenSubtitles ('+(res[0].reason&&res[0].reason.message||'offline')+')'};
    const seen=new Set(),out=[];
    for(const r of res)if(r.status==='fulfilled')for(const x of r.value){
      if(!/^(srt|vtt)$/i.test(x.SubFormat||'')||!x.SubDownloadLink||seen.has(x.IDSubtitleFile))continue;seen.add(x.IDSubtitleFile);
      out.push({id:x.IDSubtitleFile,lang:x.SubLanguageID,lang2:x.ISO639||String(x.SubLanguageID||'xx').slice(0,2),langName:x.LanguageName||x.SubLanguageID,provider:'OpenSubtitles',
        file:x.SubFileName||x.MovieReleaseName||x.MovieName,format:String(x.SubFormat).toLowerCase(),link:x.SubDownloadLink,enc:x.SubEncoding||'',page:x.SubtitlesLink||'',
        exact:x.hashMatch?1:0,dl:+x.SubDownloadsCnt||0});
    }
    out.sort((a,b)=>b.exact-a.exact||b.dl-a.dl);
    return{ok:true,items:out.slice(0,150).map(({dl,...r})=>({...r,exact:!!r.exact}))};
  }catch(err){return{ok:false,error:'Search failed: '+(err.message||err)}}
});
const decodeSub=(buf,enc)=>{
  if(buf[0]===0xFF&&buf[1]===0xFE)return new TextDecoder('utf-16le').decode(buf.subarray(2));
  try{return new TextDecoder('utf-8',{fatal:true}).decode(buf).replace(/^﻿/,'')}catch(_){}
  const m=/^cp(\d+)$/i.exec(enc||''),map={932:'shift_jis',936:'gbk',949:'euc-kr',950:'big5'};
  const label=m?(map[m[1]]||'windows-'+m[1]):(enc||'windows-1252');
  try{return new TextDecoder(label).decode(buf)}catch(_){return new TextDecoder('windows-1252').decode(buf)}
};
ipcMain.handle('subs:fetch',async(e,link,enc)=>{
  try{
    const u=new URL(link);if(u.protocol!=='https:'||!OS_HOST.test(u.hostname))return{ok:false,error:'Unsupported download address.'};
    const r=await net.fetch(link,{headers:{'User-Agent':OS_UA},signal:AbortSignal.timeout(20000),bypassCustomProtocolHandlers:true});
    if(!r.ok)return{ok:false,error:'Download failed ('+r.status+')'};
    let buf=Buffer.from(await r.arrayBuffer());
    if(buf[0]===0x1f&&buf[1]===0x8b)buf=require('zlib').gunzipSync(buf);
    return{ok:true,text:decodeSub(buf,enc)};
  }catch(err){return{ok:false,error:'Download failed: '+(err.message||err)}}
});
/* subtitles remembered per video are kept in a file in the app's data folder (survives restarts, no size limit of the browser storage) */
const subDbFile=()=>path.join(app.getPath('userData'),'subs-db.json');
ipcMain.handle('subdb:load',()=>{try{return JSON.parse(fs.readFileSync(subDbFile(),'utf8'))}catch(_){return null}});
ipcMain.handle('subdb:save',(e,db)=>{try{const f=subDbFile(),t=f+'.tmp';fs.writeFileSync(t,JSON.stringify(db||{}),'utf8');fs.renameSync(t,f);return true}catch(_){return false}});
/* Google's free translate endpoint answers "429 Too many requests" when it gets many calls quickly (hovering over several words).
   So: one request at a time, a short gap between them, a patient retry on 429/5xx, then a second service as a back-up. */
let trChain=Promise.resolve(),trLast=0,trBlockedUntil=0;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function trGoogle(text,tl){
  const hosts=['https://translate.googleapis.com/translate_a/single?client=gtx','https://clients5.google.com/translate_a/single?client=dict-chrome-ex'];
  let status=0;
  for(let attempt=0;attempt<3;attempt++){
    const host=hosts[attempt%2];
    const gap=Math.max(0,trLast+300-Date.now());if(gap)await sleep(gap);
    const wait=trBlockedUntil-Date.now();if(wait>0)await sleep(Math.min(wait,2500));
    trLast=Date.now();
    try{
      const r=await net.fetch(host+'&sl=auto&tl='+encodeURIComponent(tl)+'&dt=t&dt=bd&dj=0&q='+encodeURIComponent(text),{headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(8000),bypassCustomProtocolHandlers:true});
      status=r.status;
      if(r.ok)return{ok:true,j:await r.json()};
      if(r.status===429){trBlockedUntil=Date.now()+(attempt+1)*1500;continue}
      if(r.status>=500)continue;
      break;
    }catch(_){status=0}
  }
  return{ok:false,status};
}
/* back-up: MyMemory (translation only, no dictionary) */
async function trMyMemory(text,tl){
  try{
    const r=await net.fetch('https://api.mymemory.translated.net/get?q='+encodeURIComponent(text)+'&langpair='+encodeURIComponent('Autodetect|'+tl),{signal:AbortSignal.timeout(8000),bypassCustomProtocolHandlers:true});
    if(!r.ok)return null;const j=await r.json();const t=j&&j.responseData&&j.responseData.translatedText;
    return t&&!/MYMEMORY WARNING|INVALID/i.test(t)?t:null;
  }catch(_){return null}
}
ipcMain.handle('tr:go',(e,text,tl)=>{
  const job=trChain.then(async()=>{
    try{
      text=String(text||'').trim().slice(0,500);tl=String(tl||'bn');
      if(!text||!/^[A-Za-z]{2,3}(-[A-Za-z]{2,4})?$/.test(tl))return{ok:false,error:'Nothing to translate.'};
      const g=await trGoogle(text,tl);
      if(!g.ok){
        const t=await trMyMemory(text,tl);
        if(t)return{ok:true,text:t,dict:[],dict2:[],sl:'auto'};
        return{ok:false,error:g.status===429?'Too many requests to the translation service. Wait a few seconds and try again.':g.status?'Translation service error ('+g.status+').':'Could not translate. Check your internet connection.'};
      }
      const j=g.j;
      const out=(j[0]||[]).map(x=>x&&x[0]||'').join('').trim();
      const dict=(Array.isArray(j[1])?j[1]:[]).map(x=>[x[0],Array.isArray(x[1])?x[1]:[]]).filter(x=>x[1].length);
      /* like Google Translate's dictionary: every translation with the English words it can stand for */
      const dict2=(Array.isArray(j[1])?j[1]:[]).map(x=>[x[0],(Array.isArray(x[2])?x[2]:[]).map(y=>[y[0],Array.isArray(y[1])?y[1]:[]]).filter(y=>y[0])]).filter(x=>x[1].length);
      return{ok:true,text:out,dict,dict2,sl:j[2]||'auto'};
    }catch(err){return{ok:false,error:'Could not translate. Check your internet connection.'}}
  });
  trChain=job.catch(()=>{});return job;
});

/* English → English: definitions, examples, synonyms and antonyms of a word (dictionaryapi.dev, with Google's dictionary as a back-up) */
const uniq=a=>[...new Set((a||[]).filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim()))];
async function dictApi(w,lg){
  const r=await net.fetch('https://api.dictionaryapi.dev/api/v2/entries/'+(lg||'en')+'/'+encodeURIComponent(w.toLowerCase()),{signal:AbortSignal.timeout(7000),bypassCustomProtocolHandlers:true});
  if(!r.ok)return null;const j=await r.json();if(!Array.isArray(j)||!j.length)return null;
  const by=new Map();let phon='';
  for(const e of j){
    phon=phon||e.phonetic||((e.phonetics||[]).find(p=>p.text)||{}).text||'';
    for(const mn of e.meanings||[]){
      const o=by.get(mn.partOfSpeech)||{pos:mn.partOfSpeech,defs:[],syn:[],ant:[]};by.set(mn.partOfSpeech,o);
      o.syn.push(...(mn.synonyms||[]));o.ant.push(...(mn.antonyms||[]));
      for(const d of mn.definitions||[]){o.defs.push({d:d.definition,ex:d.example||''});o.syn.push(...(d.synonyms||[]));o.ant.push(...(d.antonyms||[]))}
    }
  }
  return{phon,meanings:[...by.values()].map(o=>({pos:o.pos,defs:o.defs.slice(0,4),syn:uniq(o.syn).slice(0,12),ant:uniq(o.ant).slice(0,10)}))};
}
async function dictGoogle(w){
  const u='https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=en&dt=t&dt=md&dt=ss&dt=ex&q='+encodeURIComponent(w);
  const r=await net.fetch(u,{headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(7000),bypassCustomProtocolHandlers:true});
  if(!r.ok)return null;const j=await r.json();const by=new Map();
  const get=p=>by.get(p)||(by.set(p,{pos:p,defs:[],syn:[],ant:[]}),by.get(p));
  for(const g of(Array.isArray(j[12])?j[12]:[]))for(const d of(g[1]||[]))if(typeof d[0]==='string')get(g[0]).defs.push({d:d[0],ex:typeof d[2]==='string'?d[2]:''});
  for(const g of(Array.isArray(j[11])?j[11]:[]))for(const s of(g[1]||[]))get(g[0]).syn.push(...(Array.isArray(s[0])?s[0]:[]));
  const list=[...by.values()].map(o=>({pos:o.pos,defs:o.defs.slice(0,4),syn:uniq(o.syn).slice(0,12),ant:[]})).filter(o=>o.defs.length||o.syn.length);
  return list.length?{phon:'',meanings:list}:null;
}
/* any other language: Wiktionary (definitions of the word in its own language) */
const DAPI=new Set(['en','hi','es','fr','ja','ru','de','it','ko','ar','tr']);
const stripHtml=h=>String(h||'').replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#0?39;/g,"'").replace(/\s+/g,' ').trim();
async function dictWikt(w,lg){
  const r=await net.fetch('https://en.wiktionary.org/api/rest_v1/page/definition/'+encodeURIComponent(w),{headers:{'User-Agent':'NixPlayer/1.0'},signal:AbortSignal.timeout(7000),bypassCustomProtocolHandlers:true});
  if(!r.ok)return null;const j=await r.json();
  const list=j[lg]||j[w.toLowerCase()]||[];if(!Array.isArray(list)||!list.length)return null;
  const ms=list.map(e=>({pos:e.partOfSpeech||'',defs:(e.definitions||[]).map(d=>({d:stripHtml(d.definition),ex:stripHtml((d.parsedExamples&&d.parsedExamples[0]&&d.parsedExamples[0].example)||(d.examples&&d.examples[0])||'')})).filter(d=>d.d).slice(0,4),syn:[],ant:[]})).filter(x=>x.defs.length);
  return ms.length?{phon:'',meanings:ms}:null;
}
ipcMain.handle('dict:go',async(e,w,sl)=>{
  w=String(w||'').trim().slice(0,60);if(!w)return{ok:false};
  let lg=String(sl||'en').split('-')[0].toLowerCase();if(lg==='auto')lg='en';lg=({iw:'he',jw:'jv'})[lg]||lg;
  let out=null;
  if(lg==='en'){
    const [a,b]=await Promise.all([dictApi(w,'en').catch(()=>null),dictGoogle(w).catch(()=>null)]);
    out=a||b;
    if(a&&b)for(const mn of a.meanings){const g=b.meanings.find(x=>x.pos===mn.pos);if(g){if(!mn.syn.length)mn.syn=g.syn;if(!mn.defs.length)mn.defs=g.defs}}
  }else{
    if(DAPI.has(lg))out=await dictApi(w,lg).catch(()=>null);
    if(!out)out=await dictWikt(w,lg).catch(()=>null);
    if(!out)out=await dictWikt(w.toLowerCase(),lg).catch(()=>null);
  }
  if(!out)return{ok:false,error:'No dictionary entry found for this word.'};
  return{ok:true,phon:out.phon,meanings:out.meanings};
});
const safeName=n=>String(n||'subtitle.srt').replace(/[\\/:*?"<>|\x00-\x1f]+/g,'_').slice(0,150);
ipcMain.handle('subs:save',async(e,text,o)=>{
  o=o||{};const def=path.join(o.dir?path.dirname(o.dir):app.getPath('documents'),safeName(o.name));
  const r=await dialog.showSaveDialog(wOf(e),{defaultPath:def,filters:[{name:'Subtitles',extensions:['srt']}]});
  if(r.canceled||!r.filePath)return null;
  try{fs.writeFileSync(r.filePath,String(text),'utf8');return r.filePath}catch(_){return null}
});
ipcMain.handle('subs:write',(e,text,o)=>{
  try{
    o=o||{};const dir=o.dir||(o.ref?path.dirname(o.ref):'');if(!dir||!fs.existsSync(dir))return null;
    const ext=path.extname(safeName(o.name)),base=path.basename(safeName(o.name),ext);let f=path.join(dir,base+ext),i=1;
    while(fs.existsSync(f))f=path.join(dir,base+'.'+(i++)+ext);
    fs.writeFileSync(f,String(text),'utf8');return f;
  }catch(_){return null}
});

/* ---------- IPC ---------- */
const mediaFilters=[{name:'Media',extensions:EXT},{name:'Subtitles',extensions:['srt','vtt']},{name:'All files',extensions:['*']}];
ipcMain.handle('dlg:files',async e=>{const r=await dialog.showOpenDialog(wOf(e),{properties:['openFile','multiSelections'],filters:mediaFilters});return r.canceled?[]:r.filePaths});
ipcMain.handle('dlg:sub',async e=>{const r=await dialog.showOpenDialog(wOf(e),{properties:['openFile'],filters:[{name:'Subtitles',extensions:['srt','vtt']}]});return r.canceled?null:r.filePaths[0]});
ipcMain.handle('dlg:folder',async e=>{const r=await dialog.showOpenDialog(wOf(e),{properties:['openDirectory','createDirectory']});return r.canceled?null:r.filePaths[0]});

ipcMain.handle('fs:text',(e,p)=>{
  try{
    if(!SUBS.test(p))return null;
    const b=fs.readFileSync(p);
    if(b[0]===0xFF&&b[1]===0xFE)return new TextDecoder('utf-16le').decode(b.subarray(2));
    let s;try{s=new TextDecoder('utf-8',{fatal:true}).decode(b)}catch(_){s=new TextDecoder('windows-1252').decode(b)}
    return s.replace(/^﻿/,'');
  }catch(_){return null}
});
ipcMain.handle('fs:siblings',(e,p)=>{
  try{
    const dir=path.dirname(p),base=path.basename(p,path.extname(p)).toLowerCase();
    return fs.readdirSync(dir).filter(f=>SUBS.test(f)&&f.toLowerCase().startsWith(base))
      .sort((a,b)=>a.length-b.length).map(f=>path.join(dir,f));
  }catch(_){return[]}
});
ipcMain.handle('fs:folder',(e,p)=>{
  try{
    const dir=path.dirname(p);
    return fs.readdirSync(dir).filter(f=>MEDIA.test(f)).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'})).map(f=>path.join(dir,f));
  }catch(_){return[p]}
});
function saveUnique(dir,name,buf){
  fs.mkdirSync(dir,{recursive:true});
  const safe=String(name).replace(/[\\/:*?"<>|]/g,'_');
  const ext=path.extname(safe),stem=path.basename(safe,ext);
  let out=path.join(dir,safe),n=1;
  while(fs.existsSync(out))out=path.join(dir,`${stem} (${n++})${ext}`);
  fs.writeFileSync(out,buf);
  return out;
}
ipcMain.handle('shot:save',(e,dataUrl,dir,name)=>{
  try{return saveUnique(dir||path.join(app.getPath('pictures'),'NixPlayer'),name||'shot.png',Buffer.from(dataUrl.split(',')[1],'base64'))}catch(_){return null}
});
/* playable copies of files this PC cannot decode (see av.js convert): kept in the app's data folder, reused next time, cleaned up after 14 days / above 4 GB */
const convDir=()=>path.join(app.getPath('userData'),'converted');
const dirSize=f=>{let t=0;try{const st=fs.statSync(f);if(!st.isDirectory())return st.size;for(const n of fs.readdirSync(f))t+=dirSize(path.join(f,n))}catch(_){}return t};
const readText=f=>{try{return fs.readFileSync(f,'utf8')}catch(_){return ''}};
const convClean=()=>{
  try{
    const d=convDir();if(!fs.existsSync(d))return;
    const now=Date.now(),rm=x=>{try{fs.rmSync(x.f,{recursive:true,force:true})}catch(_){}};
    let L=fs.readdirSync(d).map(n=>{const f=path.join(d,n),st=fs.statSync(f);return{f,n,t:st.mtimeMs,s:dirSize(f),hls:st.isDirectory()}});
    L=L.filter(x=>{ // unfinished pieces, and anything older than 14 days, go
      const bad=/\.part\.mp4$/.test(x.n)||now-x.t>14*864e5||(x.hls&&!/#EXT-X-ENDLIST/.test(readText(path.join(x.f,'index.m3u8'))));
      if(bad)rm(x);return !bad;
    });
    let tot=L.reduce((a,x)=>a+x.s,0);
    for(const x of L.sort((a,b)=>a.t-b.t)){if(tot<=4e9)break;rm(x);tot-=x.s}
  }catch(_){}
};
/* "play it now": a stream (H.264 + AAC) that ffmpeg makes while the file is watched */
ipcMain.handle('hls:start',async(e,p)=>{
  if(!okMedia(p)||WP.isProxy(p))return{ok:false,error:'Only files on this PC can be streamed'};
  try{fs.mkdirSync(convDir(),{recursive:true});const info=await AV.probe(p);return await AV.hlsStart(p,info,convDir())}
  catch(err){return{ok:false,error:String((err&&err.message)||err)}}
});
ipcMain.handle('hls:stop',(e,p)=>{try{if(okMedia(p))AV.hlsStop(p)}catch(_){}return true});
app.on('before-quit',()=>{try{AV.hlsStopAll()}catch(_){}});
ipcMain.handle('rec:save',async(e,buf,dir,name)=>{
  try{
    const out=saveUnique(dir||path.join(app.getPath('videos'),'NixPlayer'),name||'record.webm',Buffer.from(buf));
    if(out)await AV.fixWebm(out); // adds the length and the seek table, so the recording can be dragged on the timeline
    return out;
  }catch(_){return null}
});
ipcMain.handle('shell:reveal',(e,p)=>shell.showItemInFolder(p));

// Glass theme: on Windows 11 (build 22621+) the window background becomes real acrylic (the desktop shows through, blurred).
// Everywhere else the renderer draws its own glass look. Returns true when the native material is active.
ipcMain.handle('win:glass',(e,on)=>{
  const w=wOf(e);if(!w)return false;
  let native=false;
  try{
    const build=parseInt(String(os.release()).split('.')[2],10)||0;
    native=process.platform==='win32'&&build>=22621&&typeof w.setBackgroundMaterial==='function';
    if(native){w.setBackgroundMaterial(on?'acrylic':'none');w.setBackgroundColor(on?'#00000000':'#000000')}
  }catch(err){native=false}
  return !!on&&native;
});
ipcMain.handle('win:top',(e,on)=>{const win=wOf(e);if(!win)return false;win.setAlwaysOnTop(!!on,'floating');return win.isAlwaysOnTop()});
ipcMain.handle('win:size',(e,w,h,xh)=>{
  xh=Math.max(0,+xh||0);
  const win=wOf(e);if(!win)return;
  if(win.isFullScreen())win.setFullScreen(false);
  if(win.isMaximized())win.unmaximize();
  const wa=screen.getDisplayMatching(win.getBounds()).workArea;
  const k=Math.min(1,(wa.width-40)/w,(wa.height-80-TOPH-xh)/h);
  win.setContentSize(Math.round(w*k),Math.round(h*k)+TOPH+xh);
  win.center();
});
// leave fullscreen and go back to the window size / place it had before (double click on the title bar)
ipcMain.handle('win:leaveFull',e=>{const win=wOf(e);if(win&&win.isFullScreen())win.setFullScreen(false)});
// the control bar needs this much width to keep all its buttons on one row (measured in the page)
ipcMain.handle('win:minw',(e,w)=>{
  const win=wOf(e);if(!win||!Number.isFinite(+w))return;
  const wa=screen.getDisplayMatching(win.getBounds()).workArea;
  win.setMinimumSize(Math.round(Math.min(Math.max(420,+w),wa.width)),260);
});
ipcMain.handle('win:aspect',(e,r,xh)=>{const win=wOf(e);if(win)win.setAspectRatio(r||0,{width:0,height:TOPH+Math.max(0,+xh||0)})});
// taskbar thumbnail (hover the taskbar icon): previous / play-pause / next
const {nativeImage}=require('electron');
const tbIcon=n=>nativeImage.createFromPath(path.join(__dirname,'renderer','tb',n+'.png'));
function setThumb(win,paused){
  if(!win||win.isDestroyed()||process.platform!=='win32')return;
  const send=c=>()=>{if(!win.isDestroyed())win.webContents.send('thumb:cmd',c)};
  try{win.setThumbarButtons([
    {tooltip:'Previous',icon:tbIcon('prev'),click:send('prev')},
    {tooltip:paused?'Play':'Pause',icon:tbIcon(paused?'play':'pause'),click:send('play')},
    {tooltip:'Next',icon:tbIcon('next'),click:send('next')}
  ])}catch(_){}
}
// small play / pause badge on the taskbar icon + playback progress along the taskbar button (like PotPlayer)
const ovIcon=n=>nativeImage.createFromPath(path.join(__dirname,'renderer','tb',n+'.png'));
function setOverlay(win,paused,has){
  if(!win||win.isDestroyed()||process.platform!=='win32')return;
  try{
    if(!has){win.setOverlayIcon(null,'');win.setProgressBar(-1);return}
    win.setOverlayIcon(ovIcon(paused?'ov-pause':'ov-play'),paused?'Paused':'Playing');/* badge shows the current state (like PotPlayer): playing = play triangle, paused = pause bars */
  }catch(_){}
}
ipcMain.handle('thumb:state',(e,paused,has)=>{const w=wOf(e);setThumb(w,!!paused);setOverlay(w,!!paused,has!==false)});
ipcMain.handle('thumb:progress',(e,f)=>{
  const win=wOf(e);if(!win||win.isDestroyed()||process.platform!=='win32')return;
  const p=Number.isFinite(f)?Math.max(0,Math.min(1,f)):-1;
  win.__prog=p;
  try{win.setProgressBar(p,{mode:'normal'})}catch(_){}
});
// title bar dragging done from the page (a native drag region would swallow the mouse wheel)
ipcMain.handle('win:dragStart',e=>{const w=wOf(e);if(!w||w.isDestroyed()||w.isFullScreen()||w.isMaximized())return false;const c=screen.getCursorScreenPoint();w.__drag={c,b:w.getBounds()};return true});
ipcMain.handle('win:dragMove',e=>{const w=wOf(e);if(!w||w.isDestroyed()||!w.__drag)return;const c=screen.getCursorScreenPoint(),d=w.__drag;w.setBounds({x:d.b.x+c.x-d.c.x,y:d.b.y+c.y-d.c.y,width:d.b.width,height:d.b.height})});
ipcMain.handle('win:min',e=>{const win=wOf(e);if(win)win.minimize()});
ipcMain.handle('win:max',e=>{const win=wOf(e);if(!win)return;if(win.isFullScreen())win.setFullScreen(false);win.isMaximized()?win.unmaximize():win.maximize()});
ipcMain.handle('win:close',e=>{const win=wOf(e);if(win)win.close()});
ipcMain.handle('win:state',e=>{const win=wOf(e);return win?{max:win.isMaximized(),top:win.isAlwaysOnTop(),full:win.isFullScreen()}:{max:false,top:false,full:false}});
ipcMain.handle('power',(e,on)=>{
  const id=e.sender.id,b=blockers.get(id);
  if(on&&b===undefined)blockers.set(id,powerSaveBlocker.start('prevent-display-sleep'));
  if(!on&&b!==undefined){powerSaveBlocker.stop(b);blockers.delete(id)}
});
