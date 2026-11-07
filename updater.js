// Auto-update + "About" helpers (main process).
// Flow: check GitHub Releases -> ask once ("Update now" / "Later") -> download -> silent install into the
// SAME folder as the current install -> NixPlayer starts again. The user never picks a location.
const {app,dialog,shell,ipcMain}=require('electron');
const path=require('path'),fs=require('fs'),https=require('https');
const PKG=require('./package.json');

const INFO=PKG.nixplayer||{};
const CHECK_EVERY=6*60*60*1000; // background check interval
const FIRST_CHECK=10*1000;      // first background check after start

let getWin=()=>null,au=null,busy=false,downloading=false,manual=false,updVer='';
// tells the player window what the update is doing (it shows the progress screen)
const push=st=>{try{const w=getWin();if(w&&!w.isDestroyed())w.webContents.send('upd:state',Object.assign({version:updVer},st))}catch(_){}};
const asked=new Set();          // versions the user already answered "Later" to (this session)

// electron-updater is loaded lazily and only touched in the installed app
function updater(){
  if(au)return au;
  const {autoUpdater}=require('electron-updater');
  autoUpdater.autoDownload=false;          // we ask first
  autoUpdater.autoInstallOnAppQuit=true;   // safety net: a downloaded update installs when the app is closed
  autoUpdater.allowPrerelease=false;
  autoUpdater.on('update-available',onAvailable);
  autoUpdater.on('update-not-available',()=>{const m=manual;done();if(m)say('info',"You're up to date",'NixPlayer '+app.getVersion()+' is the newest version.')});
  autoUpdater.on('download-progress',p=>{const w=getWin();if(w&&!w.isDestroyed())w.setProgressBar(Math.max(0,Math.min(1,(p.percent||0)/100)));push({stage:'downloading',percent:p.percent||0,transferred:p.transferred||0,total:p.total||0,bps:p.bytesPerSecond||0})});
  autoUpdater.on('update-downloaded',()=>{
    const w=getWin();if(w&&!w.isDestroyed())w.setProgressBar(-1);
    done();
    push({stage:'installing'});
    // isSilent=true: no installer window, same install folder; isForceRunAfter=true: reopen NixPlayer
    // (a short pause so the "Installing" screen is seen before the window closes)
    setTimeout(()=>autoUpdater.quitAndInstall(true,true),2200);
  });
  autoUpdater.on('error',err=>{
    const w=getWin();if(w&&!w.isDestroyed())w.setProgressBar(-1);
    const was=downloading||manual;done();push({stage:'error'});
    if(was)say('warning','Update failed','NixPlayer could not update right now.\n\n'+String(err&&err.message||err).split('\n')[0]+'\n\nCheck your internet connection and try again later.');
  });
  return au=autoUpdater;
}

function done(){busy=false;manual=false;downloading=false}

function say(type,message,detail){
  const w=getWin();
  const o={type,title:'NixPlayer',message,detail:detail||'',buttons:['OK'],noLink:true};
  return w&&!w.isDestroyed()?dialog.showMessageBox(w,o):dialog.showMessageBox(o);
}

/* ---------- release notes ("what changed") ---------- */
// markdown / html -> short plain text for a message box
const plain=t=>String(t||'').replace(/<\/(p|li|h\d|ul|ol)>/gi,'\n').replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,'')
  .replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'")
  .replace(/^#{1,6}\s*(.+)$/gm,'$1:').replace(/\*\*(.+?)\*\*/g,'$1').replace(/`([^`]+)`/g,'$1').replace(/^\s*[-*]\s+/gm,'• ')
  .replace(/\n{3,}/g,'\n\n').trim();
const clip=(t,n)=>t.length>n?t.slice(0,n).replace(/\s+\S*$/,'')+' …':t;
// info.releaseNotes is a string or a list of {version,note}
const notesOf=info=>{const r=info&&info.releaseNotes;if(!r)return '';return plain(Array.isArray(r)?r.map(x=>x&&x.note||'').join('\n\n'):r)};
// the section of the bundled CHANGELOG.md for one version
function changelogOf(ver){
  try{
    const f=app.isPackaged?path.join(process.resourcesPath,'CHANGELOG.md'):path.join(__dirname,'CHANGELOG.md');
    const L=fs.readFileSync(f,'utf8').split(/\r?\n/);
    const s=L.findIndex(l=>new RegExp('^##\\s*\\[?'+String(ver).replace(/\./g,'\\.')+'\\]?(\\s|$)').test(l));
    if(s<0)return '';
    let e=L.findIndex((l,i)=>i>s&&/^##\s/.test(l));if(e<0)e=L.length;
    return plain(L.slice(s+1,e).join('\n'));
  }catch(_){return ''}
}
// fallback: the body of the GitHub Release (the update info does not always carry the notes)
function ghNotes(ver){
  return new Promise(res=>{
    try{
      const p=((PKG.build||{}).publish||[])[0]||{};if(!p.owner||!p.repo)return res('');
      const rq=https.get({host:'api.github.com',path:'/repos/'+p.owner+'/'+p.repo+'/releases/tags/v'+ver,headers:{'User-Agent':'NixPlayer','Accept':'application/vnd.github+json'},timeout:4000},r=>{
        let b='';r.on('data',c=>b+=c);r.on('end',()=>{try{res(r.statusCode===200?String(JSON.parse(b).body||''):'')}catch(_){res('')}})});
      rq.on('timeout',()=>{rq.destroy();res('')});rq.on('error',()=>res(''));
    }catch(_){res('')}
  });
}
/* ---------- "What's new" after an update: shown once, the first time the new version starts ---------- */
function whatsNew(){
  try{
    const f=path.join(app.getPath('userData'),'version.json'),cur=app.getVersion();
    let last=null;try{last=JSON.parse(fs.readFileSync(f,'utf8')).version}catch(_){}
    // old versions did not write version.json: window.json (written when a window closes) tells an existing install from a fresh one
    const existing=fs.existsSync(path.join(app.getPath('userData'),'window.json'));
    try{fs.writeFileSync(f,JSON.stringify({version:cur}))}catch(_){}
    if(last===cur||(!last&&!existing))return;
    const notes=changelogOf(cur);if(!notes)return;
    setTimeout(async()=>{
      const w=getWin(),o={type:'info',title:'NixPlayer',message:"What's new in NixPlayer "+cur,detail:clip(notes,1800),
        buttons:['OK',INFO.homepage?'All release notes':'Close'],defaultId:0,cancelId:0,noLink:true};
      const r=await (w&&!w.isDestroyed()?dialog.showMessageBox(w,o):dialog.showMessageBox(o));
      if(r.response===1&&INFO.homepage)shell.openExternal(INFO.homepage.replace(/\/+$/,'')+'/releases');
    },2500);
  }catch(_){}
}

async function onAvailable(info){
  const v=info&&info.version;
  if(!manual&&asked.has(v)){done();return}     // do not nag again for the same version
  const w=getWin();
  let notes=notesOf(info);if(!notes)notes=plain(await ghNotes(v));
  const o={type:'info',title:'NixPlayer update',message:'NixPlayer '+v+' is available',
    detail:(notes?"What's new:\n"+clip(notes,1400)+'\n\n':'')+'You have '+app.getVersion()+'. Press "Update now": NixPlayer downloads the update, installs it in the same place and opens again by itself.',
    buttons:['Update now','Later'],defaultId:0,cancelId:1,noLink:true};
  const r=await (w&&!w.isDestroyed()?dialog.showMessageBox(w,o):dialog.showMessageBox(o));
  if(r.response!==0){asked.add(v);done();return}
  downloading=true;updVer=v||'';push({stage:'downloading',percent:0,transferred:0,total:0,bps:0});
  try{await updater().downloadUpdate()}catch(_){/* 'error' event shows the message */}
}

// manual=true: the user pressed "Check for updates" (always answer); false: quiet background check
async function check(isManual){
  if(!app.isPackaged){
    if(isManual)say('info','Updates','Updates work in the installed NixPlayer (not when started with "npm start").');
    return{ok:false,reason:'dev'};
  }
  if(busy||downloading)return{ok:true,busy:true};
  busy=true;manual=!!isManual;
  try{await updater().checkForUpdates()}
  catch(err){done();if(isManual)say('warning','Could not check for updates','Check your internet connection and try again.\n\n'+String(err&&err.message||err).split('\n')[0])}
  return{ok:true};
}

function init(winGetter){
  getWin=winGetter||getWin;
  if(!app.isPackaged)return;
  whatsNew();
  setTimeout(()=>check(false),FIRST_CHECK);
  setInterval(()=>check(false),CHECK_EVERY).unref();
}

/* ---------- IPC used by Settings -> About ---------- */
ipcMain.handle('app:info',()=>({
  version:app.getVersion(),packaged:app.isPackaged,
  donateUrl:INFO.donateUrl||'',homepage:INFO.homepage||'',author:PKG.author||''
}));
ipcMain.handle('upd:check',()=>check(true));
const DOCS={license:'LICENSE.txt',notices:'THIRD-PARTY-NOTICES.md'};
const docPath=f=>app.isPackaged?path.join(process.resourcesPath,f):path.join(__dirname,f==='LICENSE.txt'?'LICENSE':f);
ipcMain.handle('app:doc',async(e,name)=>{
  const f=DOCS[name];if(!f)return false;
  return (await shell.openPath(docPath(f)))===''; // openPath returns '' on success
});
// the text of the license / notices, shown inside Settings -> About (no external file opens)
ipcMain.handle('app:docText',async(e,name)=>{
  const f=DOCS[name];if(!f)return '';
  try{return await require('fs').promises.readFile(docPath(f),'utf8')}catch(_){return ''}
});
ipcMain.handle('app:open',(e,url)=>{
  try{const u=new URL(url);if(u.protocol==='https:'){shell.openExternal(u.href);return true}}catch(_){}
  return false;
});

module.exports={init,check};
