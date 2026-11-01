// Auto-update + "About" helpers (main process).
// Flow: check GitHub Releases -> ask once ("Update now" / "Later") -> download -> silent install into the
// SAME folder as the current install -> NixPlayer starts again. The user never picks a location.
const {app,dialog,shell,ipcMain}=require('electron');
const path=require('path');
const PKG=require('./package.json');

const INFO=PKG.nixplayer||{};
const CHECK_EVERY=6*60*60*1000; // background check interval
const FIRST_CHECK=10*1000;      // first background check after start

let getWin=()=>null,au=null,busy=false,downloading=false,manual=false;
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
  autoUpdater.on('download-progress',p=>{const w=getWin();if(w&&!w.isDestroyed())w.setProgressBar(Math.max(0,Math.min(1,(p.percent||0)/100)))});
  autoUpdater.on('update-downloaded',()=>{
    const w=getWin();if(w&&!w.isDestroyed())w.setProgressBar(-1);
    done();
    // isSilent=true: no installer window, same install folder; isForceRunAfter=true: reopen NixPlayer
    setImmediate(()=>autoUpdater.quitAndInstall(true,true));
  });
  autoUpdater.on('error',err=>{
    const w=getWin();if(w&&!w.isDestroyed())w.setProgressBar(-1);
    const was=downloading||manual;done();
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

async function onAvailable(info){
  const v=info&&info.version;
  if(!manual&&asked.has(v)){done();return}     // do not nag again for the same version
  const w=getWin();
  const o={type:'info',title:'NixPlayer update',message:'NixPlayer '+v+' is available',
    detail:'You have '+app.getVersion()+'. Press "Update now": NixPlayer downloads the update, installs it in the same place and opens again by itself.',
    buttons:['Update now','Later'],defaultId:0,cancelId:1,noLink:true};
  const r=await (w&&!w.isDestroyed()?dialog.showMessageBox(w,o):dialog.showMessageBox(o));
  if(r.response!==0){asked.add(v);done();return}
  downloading=true;
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
