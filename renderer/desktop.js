/* NixPlayer — desktop layer (Electron).
   Loaded after the main script in player.html. In a normal browser (no window.desk) it does
   nothing, so player.html still works as a plain web player. */
(()=>{
if(!window.desk){['prev','next','list','url','hist'].forEach(i=>bt[i]&&(bt[i].style.display='none'));[tb.min,tb.max,tb.close].forEach(b=>b.style.display='none');return}

/* ---------- helpers ---------- */
const el=(t,p,k)=>{const e=document.createElement(t);Object.assign(e,p||{});(k||[]).forEach(x=>e.append(x));return e};
const bn=p=>p.split(/[\\/]/).pop();
const toURL=p=>'media://local/'+encodeURIComponent(p);
const hexA=(h,a)=>{const n=parseInt(h.slice(1),16);return`rgba(${n>>16&255},${n>>8&255},${n&255},${a})`};
window.hexA=hexA;

/* ---------- settings defaults (merged into the S object of the main script) ---------- */
const D={hideMs:2500,accent:'#2f7bff',theme:'system',glassA:.28,history:true,onTop:false,awake:true,resume:true,autoNext:true,loop:'off',shuffle:false,
  autoFit:false,lockAspect:false,shotDir:'',recDir:'',shotFmt:'png',defSpeed:1,gest:false,autoHide:false,clickAct:'none',dblAct:'play',spdStep:.1,holdOn:true,wheel:true,
  aspect:'fit',con:1,sat:1,flip:false,maxVol:1,vol:1,remVol:true,loud:'medium',
  autoSub:true,sbo:0,sout:true,spos:5,sfont:'system-ui, sans-serif',sdelay:0,trOn:true,trLang:'bn',trHover:true,trSel:true,trPause:false,trDic:false,trLeft:'search',trRight:'pin',trEngine:'google',trUrl:'https://www.google.com/search?q={q}'};
for(const k in D)if(S[k]===undefined)S[k]=D[k];
/* m16: subtitle defaults (white text, black outline, no box, just above the bottom edge of the picture) */
/* m17: swipe gestures are off by default (turn them on in Settings → Controls → Gestures); also switched off once for existing installs */
if(!S.m17){S.gest=false;S.m17=1;save()}
if(!S.m16){S.sbo=0;S.sc='#ffffff';S.sb='#000000';S.sout=true;S.spos=5;S.m16=1;save()}
if(!S.m17){if((S.accent||'').toLowerCase()==='#ff8800')S.accent='#2f7bff';S.m17=1;save()} /* default accent now matches the logo theme */
S.keys=S.keys||{};

let PL=[],idx=-1,cur='',LV=1,actx=null,loud=null;
window.curId=()=>cur; /* the open video's path; player.html needs it to remember subtitles per video */

/* ---------- styles for settings dialog + playlist ---------- */
document.head.appendChild(el('style',{textContent:`
#dlg{position:absolute;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:20;-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px)}
#dlg .dw{display:flex;width:min(900px,96%);height:min(620px,92%);background:var(--bg1);border:1px solid var(--bd2);border-radius:10px;overflow:hidden;color:var(--fg);font-size:13px;box-shadow:0 14px 40px rgba(0,0,0,.55)}
#dlg .ic{width:17px;height:17px;flex:none}
#dlg .dn{width:200px;background:var(--bg0);display:flex;flex-direction:column;padding:10px 8px;flex:none;gap:2px;overflow:auto}
#dlg .dn .nt{font-size:15px;font-weight:700;padding:6px 10px 12px;display:flex;align-items:center;gap:9px;color:var(--fgh)}
#dlg .dn .nt .ic{color:var(--ac)}
#dlg .dn button{background:none;border:0;color:var(--fg2);text-align:left;padding:8px 10px;cursor:pointer;font:inherit;display:flex;align-items:center;gap:10px;border-radius:7px}
#dlg .dn button:hover{background:var(--bg2);color:var(--fgh)}
#dlg .dn button.on{color:var(--ac);background:var(--bg2);font-weight:600}
#dlg .dn .dx{margin-top:auto}
#dlg .dm{flex:1;display:flex;flex-direction:column;min-width:0}
#dlg .dh{display:flex;align-items:center;gap:12px;padding:12px 18px;border-bottom:1px solid var(--bd2)}
#dlg .dh h3{margin:0;font-size:16px;font-weight:700;display:flex;align-items:center;gap:9px;flex:1;color:var(--fgh)}
#dlg .dh h3 .ic{color:var(--ac);width:19px;height:19px}
#dlg .sr{display:flex;align-items:center;gap:7px;background:var(--inp);border:1px solid var(--bd2);border-radius:8px;padding:0 10px;width:230px}
#dlg .sr:focus-within{border-color:var(--ac)}
#dlg .sr .ic{width:15px;height:15px;color:var(--fg3)}
#dlg .sr input{background:none;border:0;outline:0;color:var(--fg);font:inherit;padding:7px 0;width:100%;min-width:0}
#dlg .dc{flex:1;overflow:auto;padding:6px 18px 18px}
#dlg .gh{margin:16px 0 0;font-size:14px;font-weight:700;color:var(--fgh);display:flex;align-items:center;gap:8px}
#dlg .gh .ic{color:var(--ac)}
#dlg .none{text-align:center;color:var(--fg3);padding:40px 0}
#dlg .card{background:var(--bg2);border:1px solid var(--bd2);border-radius:10px;margin:10px 0 14px;overflow:hidden}
#dlg .card>h4{margin:0;padding:10px 14px;font-size:11px;font-weight:700;color:var(--fg3);text-transform:uppercase;letter-spacing:.07em;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--bd2)}
#dlg .card>h4 .ic{width:15px;height:15px}
#dlg .row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px 14px;border-bottom:1px solid var(--bd2)}
#dlg .row:last-child{border-bottom:0}
#dlg label.row{cursor:pointer}#dlg label.row:hover{background:var(--bg3)}
#dlg .rt{min-width:0}
#dlg .rn{color:var(--fg)}#dlg .rn.li{display:flex;align-items:center;gap:10px}#dlg .rn.li .ic{color:var(--fg3)}
#dlg .rd{color:var(--fg3);font-size:12px;margin-top:2px;line-height:1.45;word-break:break-word}
#dlg .rc2{display:flex;align-items:center;gap:10px;flex:none}
#dlg .fx{color:var(--fg2);text-align:right}
#dlg pre.doc{margin:0;padding:12px 14px;max-height:260px;overflow:auto;white-space:pre-wrap;word-break:break-word;font:12px/1.55 Consolas,"Segoe UI",monospace;color:var(--fg2);background:var(--bg2);border-bottom:1px solid var(--bd2);user-select:text}
#dlg .note{display:flex;gap:10px;padding:10px 14px;color:var(--fg3);line-height:1.5;border-bottom:1px solid var(--bd2)}
#dlg .note:last-child{border-bottom:0}#dlg .note .ic{width:16px;height:16px;margin-top:2px}
#dlg .sw{position:relative;width:38px;height:22px;flex:none;display:block}
#dlg .sw input{position:absolute;inset:0;opacity:0;margin:0;cursor:pointer;width:100%;height:100%;z-index:1}
#dlg .sw i{position:absolute;inset:0;border-radius:11px;background:var(--trk);transition:background .15s}
#dlg .sw i::after{content:'';position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform .15s;box-shadow:0 1px 3px rgba(0,0,0,.4)}
#dlg .sw input:checked+i{background:var(--ac)}#dlg .sw input:checked+i::after{transform:translateX(16px)}
#dlg .sw input:focus-visible+i{outline:2px solid var(--ac);outline-offset:2px}
#dlg .seg{display:flex;background:var(--inp);border:1px solid var(--bd2);border-radius:8px;padding:2px;gap:2px}
#dlg .seg button{background:none;border:0;color:var(--fg2);padding:5px 12px;border-radius:6px;cursor:pointer;font:inherit}
#dlg .seg button:hover{color:var(--fgh)}#dlg .seg button.on{background:var(--ac);color:#111;font-weight:600}
#dlg .btn{background:var(--bg3);color:var(--fg);border:1px solid var(--bd2);border-radius:7px;padding:5px 12px;cursor:pointer;font:inherit;display:inline-flex;align-items:center;gap:6px}
#dlg .btn:hover{border-color:var(--ac);color:var(--fgh)}#dlg .btn.cap{color:var(--ac);border-color:var(--ac)}
#dlg .btn.danger{color:#ff6b5e}#dlg .btn.danger:hover{background:#e81123;color:#fff;border-color:#e81123}
#dlg .btn .ic{width:15px;height:15px}
#dlg .btn.key{font-family:ui-monospace,Consolas,monospace;min-width:104px;justify-content:center}
#dlg input[type=number],#dlg select{background:var(--inp);color:var(--fg);border:1px solid var(--bd2);border-radius:7px;padding:5px 8px;min-width:96px;font:inherit}
#dlg select{min-width:160px}
#dlg input[type=number]:focus,#dlg select:focus{outline:0;border-color:var(--ac)}
#dlg .rg{display:flex;align-items:center;gap:10px}
#dlg input[type=range]{accent-color:var(--ac);width:170px}
#dlg output{min-width:48px;text-align:right;color:var(--fg2);font-variant-numeric:tabular-nums}
#dlg input[type=color]{background:none;border:1px solid var(--bd2);border-radius:6px;width:40px;height:26px;padding:1px;cursor:pointer}
#dlg .sws{display:flex;gap:8px;align-items:center}
#dlg .sws b{width:22px;height:22px;border-radius:50%;cursor:pointer;border:2px solid transparent;box-shadow:inset 0 0 0 1px rgba(0,0,0,.35)}
#dlg .sws b.on{border-color:var(--fgh)}
@media(max-width:720px){#dlg .dn{width:52px}#dlg .dn span{display:none}#dlg .dn button,#dlg .dn .nt{justify-content:center;padding-left:0;padding-right:0}#dlg .sr{width:150px}#dlg .row{flex-wrap:wrap}}
.side{-webkit-app-region:no-drag;transition:top .18s,bottom .18s;position:absolute;top:0;right:0;bottom:0;width:340px;background:var(--pnl);border-left:1px solid var(--bd);display:none;flex-direction:column;z-index:10;color:var(--fg);font-size:13px}
.side .ph{display:flex;gap:6px;padding:8px;border-bottom:1px solid var(--bd);align-items:center}
.side .ph b{font-weight:600}.side .sp2{flex:1}
.side .ph button{background:var(--bg2);color:var(--fg);border:1px solid var(--bd2);border-radius:3px;padding:3px 9px;cursor:pointer;font:inherit}
.side .ph button:hover{background:var(--bg3)}
.side .ph button.on{color:var(--ac);border-color:var(--ac)}
.side .ph button{display:inline-flex;align-items:center;gap:6px}.side .ph .ic{width:15px;height:15px}.side .ph button.px{border:0;background:none;padding:4px 7px}
.side .ph button.px:hover{background:#e81123;color:#fff}
.side .pb{flex:1;overflow:auto;padding-bottom:8px}
.side .pi{padding:6px 8px;cursor:pointer;display:flex;align-items:center;gap:8px}
.side .pi .th{width:80px;height:45px;display:flex;align-items:center;justify-content:center;color:var(--fg3)}.side .pi .th .ic{width:22px;height:22px}
.side .pi .in{flex:1;min-width:0}
.side .pi .nm{overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;word-break:break-word}
.side .pi .du{color:var(--fg3);font-size:11px;margin-top:2px}
.side .pi .rm{color:var(--fg3);padding:4px;border-radius:4px;display:flex}.side .pi .rm .ic{width:15px;height:15px}.side .pi .rm:hover{color:var(--fgh);background:var(--bg3)}
.side .pi:hover{background:var(--bg2)}.side .pi.on{color:var(--ac)}
.side .pe{padding:16px;color:var(--fg3)}
#dlg .uw{display:block;height:auto;width:min(560px,94%);padding:16px;overflow:auto}
#dlg .uw h3{margin:0 0 10px;font-size:15px;font-weight:600}
#dlg .uw textarea{width:100%;background:var(--inp);color:var(--fg);border:1px solid var(--bd2);border-radius:3px;padding:8px;font:inherit;resize:vertical}
#dlg .uw .ub{display:flex;gap:8px;justify-content:flex-end;margin-top:10px}
#dlg .uw button{background:var(--bg2);color:var(--fg);border:1px solid var(--bd2);border-radius:3px;padding:5px 14px;cursor:pointer;font:inherit}
#dlg .uw button.go{color:var(--ac);border-color:var(--ac)}
#dlg .uw.sdw{width:min(780px,96%);height:min(640px,92%);padding:0;display:flex;flex-direction:column;gap:0;overflow:hidden}
#dlg .uw.sdw .sdh{display:flex;align-items:center;gap:12px;padding:14px 18px 10px}
#dlg .uw.sdw .sdh .ic{width:20px;height:20px;color:var(--ac);flex:none}
#dlg .uw.sdw .sdh h3{margin:0;font-size:16px;font-weight:700;color:var(--fgh)}#dlg .uw.sdw .sdh small{display:block;margin:2px 0 0;max-width:520px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#dlg .uw.sdw .sdh .px{margin-left:auto;background:none;border:0;color:var(--fg2);cursor:pointer;padding:6px;border-radius:8px;display:flex}#dlg .uw.sdw .sdh .px:hover{background:var(--bg3);color:var(--fgh)}
#dlg .uw.sdw .sdq{display:flex;gap:8px;padding:4px 18px 10px}
#dlg .uw.sdw .sdq .sf{flex:1;display:flex;align-items:center;gap:8px;background:var(--inp);border:1px solid var(--bd2);border-radius:10px;padding:0 12px}
#dlg .uw.sdw .sdq .sf:focus-within{border-color:var(--ac)}#dlg .uw.sdw .sdq .sf .ic{width:16px;height:16px;color:var(--fg3)}
#dlg .uw.sdw .sdq input{flex:1;min-width:0;background:none;border:0;outline:0;color:var(--fg);font:inherit;font-size:14px;padding:10px 0}
#dlg .uw.sdw .sdgo{background:var(--ac);color:#111;border:0;border-radius:10px;padding:0 18px;font:inherit;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:7px}#dlg .uw.sdw .sdgo:hover{filter:brightness(1.1)}#dlg .uw.sdw .sdgo .ic{width:15px;height:15px}
#dlg .uw.sdw .sdc{display:flex;gap:6px;flex-wrap:wrap;padding:0 18px 10px;min-height:14px}
#dlg .uw.sdw .sdc button{background:var(--bg2);color:var(--fg);border:1px solid var(--bd2);border-radius:999px;padding:4px 12px;font:inherit;font-size:12.5px;cursor:pointer}
#dlg .uw.sdw .sdc button b{color:var(--fg3);font-weight:600;margin-left:4px}
#dlg .uw.sdw .sdc button:hover{border-color:var(--ac)}#dlg .uw.sdw .sdc button.on{background:var(--ac);border-color:var(--ac);color:#111;font-weight:700}#dlg .uw.sdw .sdc button.on b{color:#111}
#dlg .uw.sdw .sdl{flex:1;overflow:auto;padding:0 12px 8px;border-top:1px solid var(--bd2)}
#dlg .uw.sdw .sdr{display:flex;align-items:center;gap:12px;padding:10px 8px;border-bottom:1px solid var(--bd2);border-radius:8px}
#dlg .uw.sdw .sdr:hover{background:var(--bg2)}
#dlg .uw.sdw .sdr input[type=checkbox]{accent-color:var(--ac);width:16px;height:16px;flex:none;cursor:pointer}
#dlg .uw.sdw .sdg{width:40px;height:30px;border-radius:7px;background:var(--bg3);color:var(--fgh);font-size:12px;font-weight:700;letter-spacing:.04em;display:flex;align-items:center;justify-content:center;flex:none}
#dlg .uw.sdw .sdi{flex:1;min-width:0}
#dlg .uw.sdw .sdn{color:var(--fgh);font-size:13px;line-height:1.35;word-break:break-word;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
#dlg .uw.sdw .sdd{color:var(--fg3);font-size:12px;margin-top:3px;display:flex;gap:8px;align-items:center}
#dlg .uw.sdw .sdd i{font-style:normal;background:rgba(80,200,120,.18);color:#4cc075;border-radius:999px;padding:1px 8px;font-weight:600;font-size:11px}
#dlg .uw.sdw .sda{display:flex;gap:6px;align-items:center;flex:none}
#dlg .uw.sdw .sda .go{background:var(--ac);color:#111;border:0;border-radius:8px;padding:6px 16px;font:inherit;font-weight:700;cursor:pointer;min-width:74px}#dlg .uw.sdw .sda .go:hover{filter:brightness(1.1)}#dlg .uw.sdw .sda .go:disabled{opacity:.6;cursor:default}
#dlg .uw.sdw .sda .sv{background:var(--bg3);color:var(--fg);border:1px solid var(--bd2);border-radius:8px;padding:5px 11px;font:inherit;cursor:pointer}#dlg .uw.sdw .sda .sv:hover{border-color:var(--ac)}
#dlg .uw.sdw .sda .px{background:none;border:0;color:var(--fg3);cursor:pointer;padding:6px;border-radius:8px;display:flex}#dlg .uw.sdw .sda .px:hover{background:var(--bg3);color:var(--fgh)}#dlg .uw.sdw .sda .px .ic{width:16px;height:16px}
#dlg .uw.sdw .sds{padding:46px 20px;text-align:center;color:var(--fg3);line-height:1.6}#dlg .uw.sdw .sds .ic{width:30px;height:30px;margin:0 auto 8px;display:block}#dlg .uw.sdw .sds b{display:block;color:var(--fg);font-size:14px}
#dlg .uw.sdw .sds button{margin-top:12px}
#dlg .uw.sdw .sdf{display:flex;align-items:center;gap:10px;padding:10px 18px;border-top:1px solid var(--bd2);background:var(--bg0)}
#dlg .uw.sdw .sdm{flex:1;color:var(--fg2);font-size:12.5px;display:flex;align-items:center;gap:8px}#dlg .uw.sdw .sdm .ic{width:15px;height:15px}
#dlg .uw.sdw .sdf button:disabled{opacity:.4;cursor:default}
.sdsp{animation:sdsp .9s linear infinite}@keyframes sdsp{to{transform:rotate(360deg)}}
#dlg .uw small{color:var(--fg3);display:block;margin-top:8px;line-height:1.5}
#dlg .uw .rc{padding:5px 6px;cursor:pointer;border-radius:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#dlg .uw .rc:hover{background:var(--bg3)}
.side .pg{height:3px;background:var(--bd2);margin-top:4px;border-radius:2px;overflow:hidden}
.side .pg i{display:block;height:100%;background:var(--ac)}
`}));

/* ---------- appearance: filters, aspect ratio, subtitles ---------- */
window.applyFx=()=>{v.style.filter=`brightness(${bright}) contrast(${S.con}) saturate(${S.sat})`;v.style.transform=S.flip?'scaleX(-1)':''};
function applyAspect(){
  const a=S.aspect;
  if(['fit','fill','stretch'].includes(a)){v.style.width=v.style.height='100%';v.style.margin='0';v.style.objectFit={fit:'contain',fill:'cover',stretch:'fill'}[a];return}
  const [x,y]=a.split(':').map(Number),W=st.clientWidth,H=st.clientHeight;
  let w=W,h=W*y/x;if(h>H){h=H;w=H*x/y}
  v.style.objectFit='fill';v.style.width=w+'px';v.style.height=h+'px';v.style.margin=((H-h)/2)+'px '+((W-w)/2)+'px';
}
function subTweak(){
  const t=v.textTracks&&v.textTracks[0];if(!t||!t.cues)return;
  for(const c of t.cues){
    if(c._s===undefined){c._s=c.startTime;c._e=c.endTime}
    c.startTime=Math.max(0,c._s+S.sdelay/1000);c.endTime=Math.max(c.startTime,c._e+S.sdelay/1000);
  }
}
window.subTweak=subTweak;
const subD=d=>{S.sdelay+=d;save();subTweak();hud('Subtitle delay '+(S.sdelay>0?'+':'')+S.sdelay+' ms','cc')};
function applyAll(){
  style();
  root.style.setProperty('--ac',S.accent);root.style.setProperty('--sf',S.sfont);
  applyTheme();applyFx();applyAspect();subTweak();window.subLayout&&subLayout();
  v.loop=S.loop==='one';if(LV>S.maxVol)deskVol(S.maxVol,true);applyLoud();
  window.syncAH&&syncAH();
  desk.setAspect(S.lockAspect&&v.videoHeight?v.videoWidth/v.videoHeight:0,barH());
}
function barH(){return document.body.classList.contains('ah')?0:($('#bar').offsetHeight||0)}
addEventListener('resize',applyAspect);window.applyAspect=applyAspect;
document.addEventListener('fullscreenchange',()=>setTimeout(applyAspect,50));

/* ---------- external audio element (used when the file's audio can not be played by Chromium itself) ---------- */
const aud=new Audio();aud.crossOrigin='anonymous';aud.preload='auto';
const syncAud=()=>{aud.muted=v.muted;aud.volume=Math.min(1,LV)};

/* ---------- volume (0–max, boost above 100% via Web Audio) ---------- */
function deskVol(x,quiet){
  LV=Math.min(S.maxVol,Math.max(0,x));v.muted=false;v.volume=Math.min(1,LV);
  applyLoud();
  syncAud();S.vol=LV;save();
  if(!quiet)hud(Math.round(LV*100)+'%',volIc(LV),LV/S.maxVol*100);
}
/* Loudness boost (Settings → Audio) + volume above 100%: both go through one Web Audio chain (see loudness.js).
   The chain is only created when it is needed, because a media element can be attached to Web Audio only once. */
function applyLoud(force){
  const mode=S.loud||'off';
  if(mode==='off'&&!(LV>1)&&!actx&&!force)return;
  if(!actx){
    actx=new AudioContext({latencyHint:'playback'});loud=NPLoud.build(actx);
    actx.createMediaElementSource(v).connect(loud.input);actx.createMediaElementSource(aud).connect(loud.input);
    loud.output.connect(actx.destination);
    actx.onstatechange=()=>{if(actx.state==='suspended')actx.resume().catch(()=>{})};
  }
  loud.set(mode,LV);
  if(actx.state==='suspended')actx.resume().catch(()=>{});
}
window.deskVol=deskVol;window.curVol=()=>LV;
/* Recording: the picture comes from the video element, but its sound is NOT in there when it goes another way: through the Web Audio
   chain (volume above 100%, loudness boost) or from the ffmpeg audio stream (AC3 / DTS / several audio tracks). So the sound for the
   recording is taken from the end of the Web Audio chain (made now when it is not there yet and the sound comes from ffmpeg). */
window.deskRecAudio=()=>{
  try{
    if(!actx&&audOn())applyLoud(true);
    if(actx&&loud){const d=actx.createMediaStreamDestination();loud.output.connect(d);return{tracks:d.stream.getAudioTracks(),done:()=>{try{loud.output.disconnect(d)}catch(_){}}}}
  }catch(_){}
  return null;
};

/* ---------- resume position ---------- */
const RK='np_resume';
const rs=()=>{try{return JSON.parse(localStorage.getItem(RK)||'{}')}catch(e){return{}}};
function saveResume(){
  histTouch();
  if(!cur||!S.resume||!v.duration||isNaN(v.duration))return;
  const m=rs();
  if(v.currentTime>10&&v.currentTime<v.duration-15)m[cur]=Math.floor(v.currentTime);else delete m[cur];
  const k=Object.keys(m);if(k.length>300)delete m[k[0]];
  try{localStorage.setItem(RK,JSON.stringify(m))}catch(e){}
}

/* ---------- opening files, playlist ---------- */
function fail(msg){const e=$('#empty');e.style.display='flex';e.querySelector('.em').textContent=msg;setTimeout(renderHome,0)}
const isWeb=p=>/^https?:\/\//i.test(p);
let STORE=false; // Microsoft Store edition (no self-update, no yt-dlp)
desk.appInfo().then(i=>{STORE=!!(i&&i.store)}).catch(()=>{});
const WEB=new Map();
const HLSL=new Map(); /* file -> local stream (H.264 + AAC) that ffmpeg makes while the file is watched */ // link -> {title,src}  (session only; yt-dlp links expire)
const label=p=>isWeb(p)?((WEB.get(p)||{}).title||p):bn(p);
let pendingSeek=null;

/* ---------- watch history ---------- */
const HK='np_hist';
let HC=[];try{HC=JSON.parse(localStorage.getItem(HK)||'[]')}catch(e){}
function histSave(){
  HC=HC.slice(0,100);
  setTimeout(renderHome,0);
  try{localStorage.setItem(HK,JSON.stringify(HC))}
  catch(e){HC.forEach(x=>delete x.img);try{localStorage.setItem(HK,JSON.stringify(HC))}catch(_){}}
}
function histAdd(){
  if(!S.history||!cur)return;
  const o=HC.find(x=>x.k===cur);
  HC=HC.filter(x=>x.k!==cur);
  HC.unshift({...(o||{}),k:cur,title:name,web:isWeb(cur),at:Date.now()});
  histSave();renderHist();
}
const HROW=new Map(); // history entry -> its row in the open panel
const histSub=e=>{const pc=e.dur?Math.min(100,Math.round(e.pos/e.dur*100)):0;return{pc,txt:(e.web?'Online · ':'')+when(e.at)+(e.dur?' · '+fmt(e.pos||0)+' / '+fmt(e.dur)+' ('+pc+'%)':'')}};
/* the open history panel follows the playing video live (also while dragging the timeline) */
function histLive(){
  const p=$('#hist');if(!p||p.style.display!=='flex'||!cur||!S.history)return;
  const e=HC.find(x=>x.k===cur);if(!e||!isFinite(v.duration)||!v.duration)return;
  e.pos=Math.floor(v.currentTime);e.dur=Math.floor(v.duration);
  const r=HROW.get(e);if(!r)return;const h=histSub(e);
  r.du.textContent=h.txt;if(r.pg)r.pg.firstChild.style.width=h.pc+'%';
}
['timeupdate','seeking','seeked','durationchange'].forEach(ev=>v.addEventListener(ev,histLive));
function histTouch(){
  if(!S.history||!cur||!isFinite(v.duration)||!v.duration)return;
  const e=HC.find(x=>x.k===cur);if(!e)return;
  e.pos=Math.floor(v.currentTime);e.dur=Math.floor(v.duration);e.at=Date.now();
  if(!e.img&&v.videoWidth&&v.currentTime>2){
    try{
      const c=document.createElement('canvas');c.width=160;c.height=90;const x=c.getContext('2d');x.fillStyle='#000';x.fillRect(0,0,160,90);
      const k=Math.min(160/v.videoWidth,90/v.videoHeight),w=v.videoWidth*k,h=v.videoHeight*k;x.drawImage(v,(160-w)/2,(90-h)/2,w,h);
      /* a black frame (fade-in, or a codec that cannot be shown) is not a thumbnail: skip it and try again later */
      const px=x.getImageData(0,0,160,90).data;let sum=0,n=0;for(let i=0;i<px.length;i+=16){sum+=px[i]+px[i+1]+px[i+2];n+=3}
      if(sum/n>14)e.img=c.toDataURL('image/jpeg',.6);
    }catch(_){}
  }
  histSave();
}


/* no thumbnail (audio file, black frame, online link): the NixPlayer logo with the file format beside it */
const fmtOf=e=>{if(e.web&&!/\.[a-z0-9]{2,4}($|\?)/i.test(e.k||''))return 'WEB';const m=String(e.k||e.title||'').split(/[?#]/)[0].match(/\.([a-z0-9]{2,4})$/i);return m?m[1].toUpperCase():'MEDIA'};
function noThumb(th,e){th.classList.add('npth');th.innerHTML='<img src="logo.png" alt=""><em>'+fmtOf(e)+'</em>'}
{const st=document.createElement('style');st.textContent='.npth{display:flex;align-items:center;justify-content:center;gap:6px;background:radial-gradient(circle at 25% 15%,rgba(37,184,214,.35),transparent 55%),linear-gradient(135deg,#2a6f8f,#1b1f5e)!important}.npth img{width:34%;max-width:46px;max-height:70%;object-fit:contain;filter:drop-shadow(0 0 8px rgba(60,200,255,.45))}.npth em{font:700 10px Inter,sans-serif;font-style:normal;color:#fff;background:rgba(8,10,52,.85);border:1px solid rgba(95,215,245,.8);border-radius:6px;padding:1px 5px;align-self:flex-end;margin-bottom:22%}.th.npth img{width:46%;max-width:none}.th.npth em{font-size:8.5px;padding:0 3px;border-radius:4px;margin-bottom:14%}';document.head.appendChild(st)}
{const st=document.createElement('style');st.textContent='#empty .cth.npth{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px}#empty .cth.npth img{width:auto;height:50px;max-width:none;max-height:none}#empty .cth.npth em{align-self:center;margin:0;font-size:11px;padding:1px 8px}';document.head.appendChild(st)}
/* history saved by older versions can hold black thumbnails: remove them once, they then get the logo placeholder */
setTimeout(()=>{
  let left=0,changed=false;
  const fin=()=>{if(--left===0&&changed){histSave();renderHome();renderHist()}};
  HC.forEach(e=>{
    if(!e||!e.img)return;left++;
    const im=new Image();
    im.onload=()=>{try{const c=document.createElement('canvas');c.width=16;c.height=9;const x=c.getContext('2d');x.drawImage(im,0,0,16,9);const d=x.getImageData(0,0,16,9).data;let t=0;for(let i=0;i<d.length;i+=4)t+=d[i]+d[i+1]+d[i+2];if(t/(d.length/4*3)<=14){delete e.img;changed=true}}catch(_){}fin()};
    im.onerror=fin;im.src=e.img;
  });
},0);
/* ---------- home screen: "Continue watching" (from the watch history) ---------- */
function renderHome(){
  const box=$('#eRec'),row=$('#eRow'),em=$('#empty');
  if(!box||!row||!em||em.style.display==='none')return;
  const list=(S.history?HC:[]).filter(e=>e&&e.k&&e.dur&&e.pos>10&&e.pos<e.dur-15).slice(0,4);
  row.innerHTML='';
  box.classList.toggle('on',list.length>0);
  list.forEach(e=>{
    const th=el('span',{className:'cth'},[el('s',{textContent:fmt(e.dur)}),el('i')]);
    th.lastChild.style.width=Math.min(100,Math.round(e.pos/e.dur*100))+'%';
    if(e.img)th.style.backgroundImage='url('+e.img+')';else noThumb(th,e);
    const c=el('div',{className:'cd',title:e.k},[th,el('p',{},[el('b',{textContent:e.title||e.k}),el('small',{textContent:fmt(e.dur-e.pos)+' left'+(e.web?' - online':'')})])]);
    c.onclick=()=>{pendingSeek=e.pos;openFiles([e.k])};
    row.appendChild(c);
  });
}
{const c=$('#eClr');if(c)c.onclick=()=>{if(HC.length&&confirm('Clear all watch history?')){HC=[];histSave();renderHome()}}}
renderHome();

let hlsI=null;
const hlsLoad=()=>new Promise(res=>{if(window.Hls)return res(true);const s=document.createElement('script');s.src='../node_modules/hls.js/dist/hls.min.js';s.onload=()=>res(!!window.Hls);s.onerror=()=>res(false);document.head.appendChild(s)});

/* ---------- audio tracks + embedded subtitles (ffmpeg, see av.js) ----------
   Files with AC3 / DTS audio, or with several audio tracks, get their audio from an ffmpeg stream that is
   played by a hidden audio element and kept in sync with the video. Subtitles inside the file are
   extracted to WebVTT on demand. */
let AVs=null,audTok=0,audStart=0,LAT=.5,lastFix=0,latCase=false;
const NATIVE_A=/^(aac|mp3|mp2|opus|vorbis|flac|pcm_|alac)/;
const audOn=()=>!!(AVs&&AVs.ext);
function langName(c){if(!c)return'';try{return new Intl.DisplayNames(['en'],{type:'language'}).of(c)||c}catch(_){return c}}
const aLabel=(a,i)=>(a.title||langName(a.lang)||'Track '+(i+1))+(a.lang&&a.title?' ('+langName(a.lang)+')':'')+' · '+a.codec.toUpperCase()+(a.ch?' '+a.ch:'');
const sLabel=(s,i)=>(s.title||langName(s.lang)||'Subtitle '+(i+1))+(s.lang&&s.title?' ('+langName(s.lang)+')':'')+(s.forced?' · forced':'')+' · '+s.codec;
/* after a seek the audio stream restarts (online: 1-2 s). The picture waits for it, so sound and picture start together */
let holdV=false,holdTm=0;
function holdVideo(){if(!v.paused&&!holdV){holdV=true;v.pause();clearTimeout(holdTm);holdTm=setTimeout(releaseV,7000)}}
function releaseV(){clearTimeout(holdTm);if(holdV){holdV=false;v.play().catch(()=>{})}}
function stopAud(){holdV=false;clearTimeout(holdTm);try{aud.pause();aud.removeAttribute('src');aud.load()}catch(_){}}
function mutePlayerAudio(){try{for(const t of v.audioTracks)t.enabled=false}catch(_){}}
async function startAud(t){
  if(!audOn())return;
  const tok=++audTok,a=AVs.audio[AVs.aIdx];
  if(!v.paused||holdV)holdVideo();
  latCase=false;
  const ss=Math.max(0,t);
  const url=await desk.audioUrl(AVs.p,a.idx,ss);
  if(tok!==audTok||!url){if(tok===audTok)releaseV();return}
  audStart=ss;aud.src=url;aud.playbackRate=v.playbackRate;syncAud();
  if((!v.paused||holdV)&&!v.seeking)aud.play().catch(()=>{});else if(holdV&&v.seeking)releaseV();
}
aud.addEventListener('playing',()=>{
  if(!audOn())return;
  const err=(audStart+aud.currentTime)-v.currentTime; // >0: audio ahead of the video
  if(latCase)LAT=Math.min(1.5,Math.max(0,LAT-err));
  if(Math.abs(err)>.12){try{const t=v.currentTime-audStart;for(let i=0;i<aud.buffered.length;i++)if(t>=aud.buffered.start(i)&&t<aud.buffered.end(i)-.2){aud.currentTime=t;break}}catch(_){}}
  releaseV();
});
aud.addEventListener('error',()=>{releaseV();if(audOn()&&aud.getAttribute('src'))hud('Audio stream error','warn')});
v.addEventListener('play',()=>{if(audOn()&&aud.getAttribute('src'))aud.play().catch(()=>{})});
v.addEventListener('playing',()=>{if(audOn()&&aud.getAttribute('src')&&aud.paused)aud.play().catch(()=>{})});
['pause','waiting','seeking'].forEach(e=>v.addEventListener(e,()=>{if(audOn()&&!(holdV&&e==='pause'))aud.pause()}));
v.addEventListener('seeked',()=>{if(audOn())startAud(v.currentTime)});
v.addEventListener('ratechange',()=>{if(audOn())aud.playbackRate=v.playbackRate});
v.addEventListener('volumechange',syncAud);
/* Keep playing when the window is minimized or covered: Chromium can pause a video it thinks nobody sees (mostly when the
   file's own sound is switched off because an external audio stream plays). A pause that NixPlayer did not ask for, while the page
   is hidden, is undone; a pause from the user (key, click, taskbar button, media key) is never undone. */
{
  let own=0,sys=false;
  const rawPause=v.pause.bind(v);
  v.pause=function(){own=Date.now();sys=false;return rawPause()};
  const resume=()=>v.play().catch(()=>{});
  v.addEventListener('pause',()=>{
    if(Date.now()-own<800||v.ended||holdV||!v.currentSrc)return;
    if(document.visibilityState==='hidden'){sys=true;resume()}
  });
  document.addEventListener('visibilitychange',()=>{if(sys&&document.visibilityState==='visible'){sys=false;if(v.paused)resume()}});
  try{ // media keys / headset buttons are the user's own pause: handle them here so they are not undone
    const ms=navigator.mediaSession;
    ms.setActionHandler('play',()=>{own=0;v.play().catch(()=>{})});
    ms.setActionHandler('pause',()=>v.pause());
  }catch(_){}
}
v.addEventListener('loadedmetadata',()=>{if(audOn())mutePlayerAudio()});
/* A recording made by an older NixPlayer (a WebM without a length) cannot be dragged on the timeline: ask for the end once, which makes the length known */
v.addEventListener('loadedmetadata',()=>{
  if(v.duration!==Infinity||!cur||isWeb(cur)||hlsI)return;
  const back=v.currentTime||0;
  const done=()=>{v.removeEventListener('timeupdate',done);try{v.currentTime=back}catch(_){}};
  v.addEventListener('timeupdate',done);
  try{v.currentTime=1e7}catch(_){}
});
v.addEventListener('timeupdate',()=>{
  if(!audOn()||v.paused||aud.paused||v.seeking||!aud.getAttribute('src'))return;
  const drift=(audStart+aud.currentTime)-v.currentTime;
  if(Math.abs(drift)>.4&&Date.now()-lastFix>3000){lastFix=Date.now();startAud(v.currentTime)}
});
function setAudio(i){
  if(!AVs||!AVs.audio[i])return;
  AVs.aIdx=i;S.aLang=AVs.audio[i].lang||'';save();
  hud('Audio: '+aLabel(AVs.audio[i],i),'aud');
  if(AVs.ext){mutePlayerAudio();startAud(v.currentTime)}
}
/* online file: the subtitle is read from the server in the background and shown as soon as the first lines arrive */
let liveSub=null,liveTm=0,liveAll=[],liveLast='';
function liveStop(){clearTimeout(liveTm);if(liveSub){desk.subStop(liveSub.id);liveSub=null}}
function liveReset(){liveStop();liveAll=[];liveLast=''}
async function liveStart(A,i,ss,fresh){ /* fresh: the user (or the automatic choice) picked this track, so its first lines switch subtitles ON */
  liveStop(); /* the part read so far stays in liveAll; only the reader is replaced */
  const s=A.subs[i],job={id:0,A,i,start:ss,upto:ss,done:false,stopped:false,text:'',fresh:!!fresh,ek:'emb:'+s.idx+'|'+(s.lang||'')};
  if(fresh)curSub={emb:1,ek:job.ek,pending:1}; /* marks the choice: a file / online subtitle picked meanwhile replaces it and the reader stops */
  if(liveAll.length&&(liveAll[0].A!==A||liveAll[0].i!==i)){liveAll=[];liveLast=''}
  liveAll.forEach(j=>{if(!j.done)j.stopped=true});
  liveAll.push(job);liveSub=job;
  const id=await desk.subLive(A.p,s.idx,ss);
  if(liveSub!==job){if(id)desk.subStop(id);return}
  job.id=id;
}
/* every reader's lines merged into one list, so a part that was read once stays available */
const vttSec=t=>{const m=/(?:(\d+):)?(\d+):(\d+)[.,](\d+)/.exec(t);return m?(+m[1]||0)*3600+ +m[2]*60+ +m[3]+ +('0.'+m[4]):0};
function liveMerge(){
  const map=new Map();
  for(const j of liveAll)for(const b of(j.text||'').replace(/\r/g,'').split(/\n\n+/)){
    const L=b.split('\n'),k=L.findIndex(x=>x.includes('-->'));if(k<0)continue;
    const st=vttSec(L[k].split('-->')[0]),txt=L.slice(k+1).join('\n').trim();if(!txt)continue;
    const key=Math.round(st*4)+'|'+txt;if(!map.has(key))map.set(key,{st,line:L.slice(k).join('\n')});
  }
  return'WEBVTT\n\n'+[...map.values()].sort((a,b)=>a.st-b.st).map(x=>x.line).join('\n\n')+'\n';
}
const liveCovered=t=>liveAll.some(j=>t>=j.start-1&&((j.done&&!j.stopped)||t<=j.upto+15));
const vttEnd=t=>{let e=0;const re=/-->\s*(?:(\d+):)?(\d+):(\d+)[.,]\d+/g;let m;while((m=re.exec(t)))e=(+m[1]||0)*3600+ +m[2]*60+ +m[3];return e};
desk.onSubChunk(m=>{
  const j=liveSub;if(!j||m.id!==j.id||AVs!==j.A)return;
  /* another subtitle was chosen (file / online search) or none: the background reader must not put the embedded one back */
  if(!curSub||!curSub.emb||curSub.ek!==j.ek){liveStop();return}
  if(m.done){j.done=true;if(!m.ok&&(!m.text||m.text.length<20)){hud('Could not read this subtitle','warn');return}}
  if(!m.text||m.text.length<20)return;
  j.text=m.text;j.upto=Math.max(j.start,vttEnd(m.text));
  const all=liveMerge();if(all===liveLast)return;liveLast=all;
  loadSub(new File([all],'embedded.vtt'),{emb:1,upd:!j.fresh,ek:j.ek});j.fresh=false;
});
/* jumped to a part the background reader has not reached yet (or before where it started): restart it there */
v.addEventListener('seeked',()=>{
  const j=liveSub;if(!j||AVs!==j.A)return;const t=v.currentTime;
  clearTimeout(liveTm);if(!curSub||!curSub.emb)return;
  if(!liveCovered(t))liveTm=setTimeout(()=>{if(liveSub===j&&!liveCovered(v.currentTime))liveStart(j.A,j.i,v.currentTime<30?0:v.currentTime-5)},250)
});
async function loadEmbSub(i,quiet){
  const A=AVs;if(!A||!A.subs[i])return;const s=A.subs[i];
  if(!s.text){hud('Picture-based subtitles ('+s.codec+') are not supported','warn');return}
  if(!quiet)hud('Loading subtitle…','cc');
  if(A.web){A.sIdx=i;S.sLang=s.lang||'';save();liveStart(A,i,v.currentTime<30?0:v.currentTime-5,true);return}
  const t=await desk.subExtract(A.p,s.idx);
  if(AVs!==A)return;
  if(!t){hud('Could not read this subtitle','warn');return}
  A.sIdx=i;S.sLang=s.lang||'';save();
  loadSub(new File([t],'embedded.vtt'),{emb:1,ek:'emb:'+s.idx+'|'+(s.lang||'')});
  setTimeout(()=>hud('Subtitle: '+sLabel(s,i),'cc'),60);
}
const sameLang=(a,b)=>!!a&&!!b&&a.slice(0,2).toLowerCase()===b.slice(0,2).toLowerCase();
async function setupAV(p,sidecar,memK,hasSub,ref){ /* ref: the address ffmpeg reads (an online file goes through the local proxy) */
  const r=await desk.probe(ref||p);
  if(cur!==p)return;
  const side=()=>{if(sidecar&&sidecar.length&&!hasSub)loadSubPath(sidecar[0],true)}; /* a subtitle file next to the video is only the fallback */
  if(!r||!r.ok){side();return}
  const A=r.audio,ext=!HLSL.has(p)&&(A.length>=2||(A.length===1&&!NATIVE_A.test(A[0].codec))); /* a playable copy already has its sound inside */
  AVs={p:ref||p,audio:A,subs:r.subs,ext,aIdx:0,sIdx:-1,web:!!ref};
  if(ext){
    let k=A.findIndex(a=>S.aLang&&sameLang(a.lang,S.aLang));if(k<0)k=A.findIndex(a=>a.def);if(k<0)k=0;
    AVs.aIdx=k;mutePlayerAudio();startAud(v.currentTime);
    if(A.length>1)hud('Audio: '+aLabel(A[k],k),'aud');
  }
  if(!hasSub){
    let k=-1;
    if(memK&&memK.startsWith('emb:')){ /* the embedded track you used last time */
      const [ix,lg]=memK.slice(4).split('|');
      k=r.subs.findIndex(x=>x.text&&String(x.idx)===ix);if(k<0&&lg)k=r.subs.findIndex(x=>x.text&&x.lang===lg)}
    if(k<0&&S.autoSub&&!(memK&&memK.startsWith('emb:'))){
      const T=r.subs;k=T.findIndex(s=>s.text&&S.sLang&&sameLang(s.lang,S.sLang));
      if(k<0)k=T.findIndex(s=>s.text&&sameLang(s.lang,'en')&&!s.forced);
      if(k<0&&T.length===1&&T[0].text)k=0;
      if(k<0)k=T.findIndex(s=>s.text&&!s.forced)}
    if(k>=0)loadEmbSub(k,true);else side();
  }
}
/* audio menu + subtitle menu: use the file's own tracks when there are any */
{
  const origAud=B.find(x=>x[0]==='aud')[3];
  bt.aud.onclick=e=>{e.stopPropagation();
    if(!AVs||!AVs.audio.length)return origAud();
    pop('aud',p=>{head(p,'Audio track');AVs.audio.forEach((a,i)=>row(p,aLabel(a,i),()=>setAudio(i),i===AVs.aIdx));
      if(!AVs.ext)p.append(el('div',{style:'color:var(--fg3);padding:6px 2px;font-size:12px',textContent:'Only one audio track in this file.'}))})};
  /* rows for the new subtitle menu (see subPanel in player.html) */
  window.subActive=()=>{if(curSub&&curSub.emb&&AVs&&AVs.subs[AVs.sIdx]){const s=AVs.subs[AVs.sIdx];return s.title||langName(s.lang)||'Subtitle '+(AVs.sIdx+1)}return(curSub&&curSub.label)||'Subtitle file'};
  window.subHasTracks=()=>!!(AVs&&AVs.subs.length);
  /* signature of the tracks found so far (the open Audio / Subtitles panel redraws when it changes) */
  window.panelSig=()=>JSON.stringify([AVs?[AVs.audio.length,AVs.aIdx,AVs.sIdx,AVs.subs.map(s=>(s.title||'')+(s.lang||'')+(s.text?1:0))]:null,v.audioTracks?v.audioTracks.length:0]);
  window.audRebuild=()=>{P.style.display='none';bt.aud.onclick({stopPropagation(){}})};
  window.subTracks=(trk,has)=>{
    extList.forEach(e=>trk(e.label,e.info,subOn&&!!curSub&&!!curSub.ext&&extKey(curSub)===e.k,()=>loadSub(e.file,{ext:1,label:e.label,info:e.info})));
    if(AVs)AVs.subs.forEach((s,i)=>{
      const name=s.title||langName(s.lang)||'Subtitle '+(i+1),info=[s.lang&&s.title?langName(s.lang):'',s.forced?'forced':'',s.codec].filter(Boolean).join(' · ');
      trk(name,info+(s.text?'':' · not supported'),subOn&&!!(curSub&&curSub.emb)&&i===AVs.sIdx,()=>loadEmbSub(i),!s.text);
    });
  };
}

async function playPath(p){
  saveResume();cur=p;AVs=null;audTok++;stopAud();liveReset();window.prevHook=null;if(hlsI){try{hlsI.destroy()}catch(_){}hlsI=null}
  try{const pc2=document.querySelector('#prev canvas'),x2=pc2.getContext('2d');x2.fillStyle='#000';x2.fillRect(0,0,pc2.width,pc2.height)}catch(_){}
  for(const k of [...HLSL.keys()])if(k!==p){desk.hlsStop(k);HLSL.delete(k)} /* the stream of the file that was open stops (a finished one stays for next time) */
  v.querySelectorAll('track').forEach(t=>t.remove());curSub=null;
  try{await window.subDbReady}catch(_){}
  if(cur!==p)return;
  extList=window.subRestore?subRestore(p):[];
  /* the subtitle you used last time with this video comes back by itself */
  const memK=window.subLast?subLast(p):null,memE=memK&&memK!=='emb'?extList.find(x=>x.k===memK):null;
  if(memE)loadSub(memE.file,{ext:1,label:memE.label,info:memE.info});
  v.defaultPlaybackRate=v.playbackRate=S.defSpeed;
  let src,viaHls=false;
  if(isWeb(p)){
    let r=WEB.get(p);
    if(!r||!r.src){
      v.pause();name=p;fail('Loading link…');renderPL();
      const x=await desk.resolve(p);
      if(cur!==p)return;
      if(!x||!x.ok){fail((x&&x.error)||'Cannot open this link');return}
      r={title:x.title||p,src:x.src,hls:!!x.hls};WEB.set(p,r);
    }
    name=r.title;src=r.src;pv.removeAttribute('src');viaHls=!!r.hls;
  }else if(HLSL.has(p)){name=bn(p);src=HLSL.get(p);pv.removeAttribute('src');viaHls=true}
  else{name=bn(p);src=toURL(p);pv.src=src}
  if(viaHls){
    if(!(await hlsLoad())||!Hls.isSupported()){fail('Cannot play this stream: the HLS player (hls.js) is missing. Run "npm install" in the NixPlayer folder.');return}
    if(cur!==p)return;
    hlsI=new Hls({maxBufferLength:40,enableWorker:true,...(HLSL.has(p)?{startPosition:0}:{})}); /* a stream that is still being made starts at its beginning, not at its live edge */
    hlsI.on(Hls.Events.ERROR,(_e,x)=>{if(!x.fatal)return;
      if(x.type===Hls.ErrorTypes.NETWORK_ERROR)hlsI.startLoad();else if(x.type===Hls.ErrorTypes.MEDIA_ERROR)hlsI.recoverMediaError();else fail('Stream error: '+x.details)});
    hlsI.loadSource(src);hlsI.attachMedia(v);
  }else v.src=src;
  $('#empty').style.display='none';document.title=name+' — NixPlayer';
  v.play().catch(()=>{});
  histAdd();renderPL();
  if(!isWeb(p)){let l=[];if(S.autoSub&&!memE)l=await desk.siblings(p);if(cur!==p)return;setupAV(p,l,memK,!!memE);if(HLSL.has(p))ffPreview(p,p)}
  else if(!WEB.get(p).hls){
    setupAV(p,[],memK,!!memE,src);
    ffPreview(p,src); /* timeline preview for online files: one frame per 5 s, cut by ffmpeg */
  } /* online file: audio tracks + embedded subtitles too (ffmpeg reads it through the proxy) */
}
/* Timeline preview made by ffmpeg: one frame per 5 s, cached. For online files, and for local files whose video this browser engine cannot decode
   (HEVC, or a file that plays as a stream), where the preview video of the player cannot show frames. ref = what ffmpeg reads. */
function ffPreview(p,ref){
  const TC=new Map(),cv=document.querySelector('#prev canvas'),cx=cv.getContext('2d');let want=-1,tm=0;
  const draw=url=>{const im=new Image();im.onload=()=>{cx.fillStyle='#000';cx.fillRect(0,0,cv.width,cv.height);const k=Math.min(cv.width/im.width,cv.height/im.height),w=im.width*k,h=im.height*k;cx.drawImage(im,(cv.width-w)/2,(cv.height-h)/2,w,h)};im.src=url};
  window.prevHook=t=>{
    const b=Math.round(t/5)*5;want=b;clearTimeout(tm);
    if(TC.has(b)){draw(TC.get(b));return}
    tm=setTimeout(async()=>{const r=await desk.thumb(ref,b);if(r){TC.set(b,r);if(TC.size>300)TC.delete(TC.keys().next().value);if(want===b&&cur===p)draw(r)}},180);
  };
}
/* the preview video of the player could not load this local file: use ffmpeg frames instead */
pv.addEventListener('error',()=>{if(cur&&!isWeb(cur)&&!window.prevHook)ffPreview(cur,cur)});
async function openFiles(files){
  files=(files||[]).filter(Boolean);
  const urls=files.filter(isWeb);files=files.filter(f=>!isWeb(f));
  if(urls.length){PL=urls;idx=0;await playPath(urls[0]);return}
  const subs=files.filter(f=>/\.(srt|vtt)$/i.test(f)),media=files.filter(f=>!/\.(srt|vtt)$/i.test(f));
  /* only a subtitle was opened (double-click on a .srt / .vtt): play the video with the same name from that folder */
  if(subs.length&&!media.length&&!cur){
    let m='';
    try{
      const sb=bn(subs[0]).replace(/\.[^.]+$/,'').toLowerCase(),L=await desk.folder(subs[0])||[];
      let best=-1;for(const f of L){const mb=bn(f).replace(/\.[^.]+$/,'').toLowerCase();if((sb===mb||sb.startsWith(mb+'.')||sb.startsWith(mb+' ')||sb.startsWith(mb+'_')||sb.startsWith(mb+'-'))&&mb.length>best){best=mb.length;m=f}}
    }catch(e){}
    if(m)media.push(m);else{hud('No video with this name was found in the folder. Open a video, then open the subtitle.','info');return}
  }
  if(media.length>1){PL=media;idx=0;await playPath(PL[0])}
  else if(media.length===1){
    const p=media[0];let l=[p];
    if(S.autoNext){try{l=await desk.folder(p)}catch(e){}if(!l.includes(p))l=[p]}
    PL=l;idx=PL.indexOf(p);await playPath(p);
  }
  if(subs.length)setTimeout(()=>loadSubPath(subs[0]),300);
}
async function loadSubPath(p,quiet){
  const t=await desk.readText(p);if(t==null)return;
  if(AVs)AVs.sIdx=-1;
  loadSub(new File([t],bn(p)),{ext:1,loc:1,label:bn(p)});
  if(!quiet)setTimeout(()=>hud('Subtitle: '+bn(p),'cc'),50);
}
async function openDlg(){const f=await desk.openFiles();if(f&&f.length)openFiles(f)}
async function addFiles(){
  const f=(await desk.openFiles()).filter(x=>!/\.(srt|vtt)$/i.test(x));if(!f.length)return;
  const first=!PL.length;PL=PL.concat(f);if(first){idx=0;playPath(PL[0])}renderPL();
}
function step(d){
  if(!PL.length)return;
  let i=idx+d;
  if(S.shuffle&&d>0&&PL.length>1){do{i=Math.floor(Math.random()*PL.length)}while(i===idx)}
  if(i>=PL.length){if(S.loop==='all')i=0;else return}
  if(i<0)i=S.loop==='all'?PL.length-1:0;
  idx=i;playPath(PL[i]);
}
window.openDlg=openDlg;
window.deskNext=()=>step(1);
window.deskPrev=()=>{if(v.currentTime>3)v.currentTime=0;else step(-1)};
window.deskDrop=e=>{
  const fl=[...e.dataTransfer.files];
  if(fl.length)return openFiles(fl.map(f=>desk.pathOf(f)));
  const t=(e.dataTransfer.getData('text/uri-list')||e.dataTransfer.getData('text')||'').trim().split(/\s+/).filter(isWeb);
  if(t.length)openFiles(t);
};
addEventListener('paste',e=>{
  if(/^(INPUT|TEXTAREA)$/.test(e.target.tagName))return;
  const t=((e.clipboardData&&e.clipboardData.getData('text'))||'').trim().split(/\s+/).filter(isWeb);
  if(t.length){e.preventDefault();hud('Opening pasted link','link');openFiles(t)}
});

let pio=null;
function renderPL(){
  const p=$('#plist');if(!p||p.style.display!=='flex')return;
  const b=p.querySelector('.pb');b.innerHTML='';
  if(pio)pio.disconnect();
  /* thumbnails are generated lazily, only for rows that scroll into view */
  pio=new IntersectionObserver(es=>es.forEach(en=>{
    if(!en.isIntersecting)return;
    const d=en.target;pio.unobserve(d);
    thumb(toURL(d._f),'auto',()=>d.isConnected).then(r=>{
      if(!r)return;
      if(r.img)d._th.style.backgroundImage='url('+r.img+')';else noThumb(d._th,{k:d._f});
      if(r.dur&&isFinite(r.dur))d._du.textContent=fmt(r.dur);
    });
  }),{root:b});
  p.querySelector('.pt').textContent='Playlist ('+PL.length+')';
  if(!PL.length)b.appendChild(el('div',{className:'pe',textContent:'Playlist is empty. Open files or drop them here.'}));
  PL.forEach((f,i)=>{
    const th=el('div',{className:'th'}),du=el('div',{className:'du'});
    const d=el('div',{className:'pi'+(i===idx?' on':''),title:f},[th,el('div',{className:'in'},[el('div',{className:'nm',textContent:label(f)}),du])]);
    const x=el('span',{className:'rm',innerHTML:ico('close'),title:'Remove'});
    x.onclick=e=>{e.stopPropagation();PL.splice(i,1);if(i<idx)idx--;else if(i===idx)idx=-1;renderPL()};
    d.onclick=()=>{idx=i;playPath(f)};d.appendChild(x);
    d._f=f;d._th=th;d._du=du;b.appendChild(d);if(isWeb(f)){th.innerHTML=ico('globe');du.textContent='Online'}else pio.observe(d);
  });
  p.querySelector('.sh').classList.toggle('on',!!S.shuffle);
  const c=b.querySelector('.pi.on');if(c)c.scrollIntoView({block:'nearest'});
}
function togglePL(){
  let p=$('#plist');
  if(!p){
    p=el('div',{id:'plist',className:'side'});
    const sh=el('button',{className:'sh',innerHTML:ico('shuffle')+'Shuffle',onclick:()=>{S.shuffle=!S.shuffle;save();renderPL()}});
    p.append(
      el('div',{className:'ph'},[el('b',{className:'pt',textContent:'Playlist'}),el('span',{className:'sp2'}),el('button',{className:'px',innerHTML:ico('close'),title:'Close playlist (Esc)',onclick:()=>togglePL()})]),
      el('div',{className:'ph'},[el('button',{innerHTML:ico('plus')+'Add',onclick:addFiles}),el('button',{innerHTML:ico('trash')+'Clear',onclick:()=>{PL=[];idx=-1;renderPL()}}),sh]),
      el('div',{className:'pb'}));
    st.appendChild(p);
  }
  const open=p.style.display!=='flex';closeSide();p.style.display=open?'flex':'none';renderPL();
}
/* ---------- logo (top left) = back to the home screen ---------- */
const EM0=($('#empty .em')||{}).textContent||'';
function goHome(){
  const e=$('#empty');if(!e||e.style.display!=='none')return; /* already on the home screen */
  saveResume();closeDlg();closeSide();
  cur='';AVs=null;audTok++;stopAud();liveReset();window.prevHook=null;
  if(hlsI){try{hlsI.destroy()}catch(_){}hlsI=null}
  try{v.pause()}catch(_){}
  v.querySelectorAll('track').forEach(t=>t.remove());curSub=null;
  v.removeAttribute('src');try{v.load()}catch(_){}
  try{pv.removeAttribute('src')}catch(_){}
  const sb=$('#subs');if(sb)sb.style.display='none';
  name='';document.title='NixPlayer';
  e.querySelector('.em').textContent=EM0;e.style.display='flex';
  renderPL();renderHome();
}
{const lg=document.querySelector('#tlogo img');if(lg){lg.style.cursor='pointer';lg.title='Home';lg.addEventListener('click',e=>{e.stopPropagation();goHome()})}}
function closeSide(){document.querySelectorAll('.side').forEach(x=>x.style.display='none')}
window.togglePL=togglePL;

/* ---------- history panel ---------- */
const when=t=>new Date(t).toLocaleString([],{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
function renderHist(){
  const p=$('#hist');if(!p||p.style.display!=='flex')return;
  const b=p.querySelector('.pb');b.innerHTML='';HROW.clear();
  p.querySelector('.pt').textContent='Watch history ('+HC.length+')';
  p.querySelector('.tg').textContent='History: '+(S.history?'ON':'OFF');p.querySelector('.tg').classList.toggle('on',!!S.history);
  if(!HC.length)b.appendChild(el('div',{className:'pe',textContent:S.history?'Nothing watched yet.':'History is turned off.'}));
  HC.forEach(e=>{
    const th=el('div',{className:'th'});
    if(e.img)th.style.backgroundImage='url('+e.img+')';else noThumb(th,e);
    const hs=histSub(e),pc=hs.pc,sub=hs.txt;
    const pg=el('div',{className:'pg'},[el('i')]);pg.firstChild.style.width=pc+'%';
    const du=el('div',{className:'du',textContent:sub});
    HROW.set(e,{du,pg:e.dur?pg:null});
    const d=el('div',{className:'pi'+(e.k===cur?' on':''),title:e.k},[th,el('div',{className:'in'},[el('div',{className:'nm',textContent:e.title||e.k}),du,e.dur?pg:''])]);
    const x=el('span',{className:'rm',innerHTML:ico('close'),title:'Remove from history'});
    x.onclick=ev=>{ev.stopPropagation();HC=HC.filter(y=>y!==e);histSave();renderHist()};
    d.onclick=()=>{pendingSeek=(e.pos>10&&e.dur&&e.pos<e.dur-15)?e.pos:null;openFiles([e.k])};
    d.appendChild(x);b.appendChild(d);
  });
}
function toggleHist(){
  let p=$('#hist');
  if(!p){
    p=el('div',{id:'hist',className:'side'});
    p.append(
      el('div',{className:'ph'},[el('b',{className:'pt',textContent:'Watch history'}),el('span',{className:'sp2'}),el('button',{className:'px',innerHTML:ico('close'),title:'Close (Esc)',onclick:()=>toggleHist()})]),
      el('div',{className:'ph'},[el('button',{className:'tg',onclick:()=>{S.history=!S.history;save();renderHist()}}),el('button',{textContent:'Clear all',onclick:()=>{if(HC.length&&confirm('Clear all watch history?')){HC=[];histSave();renderHist()}}})]),
      el('div',{className:'pb'}));
    st.appendChild(p);
  }
  const open=p.style.display!=='flex';closeSide();p.style.display=open?'flex':'none';renderHist();
}
window.toggleHist=toggleHist;

/* ---------- open link (online video) ---------- */
function urlDlg(){
  closeDlg();
  const d=el('div',{id:'dlg'});d.onclick=e=>{if(e.target===d)closeDlg()};
  const ta=el('textarea',{rows:3,placeholder:'https://…  (one link per line)'});
  const go=()=>{
    const l=ta.value.trim().split(/\s+/).filter(isWeb);
    if(!l.length){hud('Paste a link starting with http:// or https://');return}
    closeDlg();openFiles(l);
  };
  ta.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();go()}};
  const box=el('div',{className:'dw uw'},[
    el('h3',{textContent:'Open link'}),ta,
    el('small',{textContent:STORE?'Direct video / audio links (.mp4, .webm, .mp3, .m3u8 …) play right away. Enter = play.':'Direct video / audio links (.mp4, .webm, .mp3 …) play right away. YouTube and other sites need yt-dlp installed. Enter = play.'}),
    el('div',{className:'ub'},[el('button',{textContent:'Cancel',onclick:closeDlg}),el('button',{className:'go',textContent:'Play',onclick:go})])]);
  const rc=HC.filter(x=>x.web).slice(0,5);
  if(rc.length){box.appendChild(el('h4',{textContent:'Recent links',style:'margin:12px 0 4px;color:var(--fg3);font-size:12px'}));
    rc.forEach(x=>box.appendChild(el('div',{className:'rc',title:x.k,textContent:(x.title&&x.title!==x.k?x.title+' — ':'')+x.k,onclick:()=>{closeDlg();pendingSeek=(x.pos>10&&x.dur&&x.pos<x.dur-15)?x.pos:null;openFiles([x.k])}})))}
  d.appendChild(box);st.appendChild(d);setTimeout(()=>ta.focus(),30);
}
window.urlDlg=urlDlg;

/* ---------- screenshots (saved to a folder, native resolution) ---------- */
window.deskShot=async()=>{
  if(!v.videoWidth)return;
  const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;
  const g=c.getContext('2d');g.filter=v.style.filter||'none';g.drawImage(v,0,0,c.width,c.height);
  const jpg=S.shotFmt==='jpg';let data;
  try{data=c.toDataURL(jpg?'image/jpeg':'image/png',.95)}catch(e){return hud('Screenshot failed','warn')}
  const file=(name||'shot').replace(/\.[^.]+$/,'')+' '+fmt(v.currentTime).replace(/:/g,'-')+(jpg?'.jpg':'.png');
  const out=await desk.saveShot(data,S.shotDir,file);
  hud(out?'Saved: '+bn(out):'Screenshot failed',out?'shot':'warn');
};

/* ---------- recording save ---------- */
window.deskSaveRec=async(blob,file)=>{
  const out=await desk.saveRec(await blob.arrayBuffer(),S.recDir,file);
  hud(out?'Saved: '+bn(out):'Recording failed',out?'rec':'warn');
};

/* ---------- always on top, window sizing ---------- */
window.deskTop=async()=>{
  S.onTop=!S.onTop;save();
  const r=await desk.onTop(S.onTop);bt.top.classList.toggle('on',r);
  hud('Always on top: '+(r?'on':'off'),'top');
};
function fitWin(s){if(!v.videoWidth)return hud('Open a video first','warn');desk.setSize(Math.round(v.videoWidth*s),Math.round(v.videoHeight*s),barH())}
window.deskSizeRows=(p,r)=>{
  [[.5,'50%'],[1,'100% (original)'],[1.5,'150%'],[2,'200%']].forEach(([s,t])=>r(p,'Window = video '+t,()=>fitWin(s)));
  [[480,270,'Mini player 480×270'],[960,540,'960×540'],[1280,720,'1280×720'],[1920,1080,'1920×1080']].forEach(([w,h,t])=>r(p,t,()=>desk.setSize(w,h,barH())));
  r(p,'Lock aspect ratio: '+(S.lockAspect?'ON':'OFF'),()=>{S.lockAspect=!S.lockAspect;save();applyAll()});
};
window.deskAspectRows=(p,r)=>['fit','fill','stretch','16:9','4:3','21:9','1:1'].forEach(m=>
  r(p,{fit:'Fit',fill:'Fill (crop)',stretch:'Stretch'}[m]||m,()=>{S.aspect=m;save();applyAspect()},S.aspect===m));

/* ---------- playback helpers ---------- */
let lastRate=1;
const SPD=[.5,.75,1,1.25,1.5,1.75,2,3]; /* same list as the Speed menu */
const preset=d=>{const r=v.playbackRate,e=.001,n=d>0?SPD.find(x=>x>r+e):[...SPD].reverse().find(x=>x<r-e);v.playbackRate=n===undefined?(d>0?SPD[SPD.length-1]:SPD[0]):n;hud(v.playbackRate+'x','speed')};
const rate=d=>{v.playbackRate=Math.min(4,Math.max(.25,Math.round((v.playbackRate+d)*100)/100));hud(v.playbackRate+'x','speed')};
let fd=1/30,lm=0;
if(v.requestVideoFrameCallback){const rf=(n,m)=>{const d=m.mediaTime-lm;if(d>0&&d<.2)fd=d;lm=m.mediaTime;v.requestVideoFrameCallback(rf)};v.requestVideoFrameCallback(rf)}
const tcode=t=>{t=Math.max(0,t);const h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=Math.floor(t%60),ms=Math.round((t%1)*1000)%1000;return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')+'.'+String(ms).padStart(3,'0')};
/* frame step: shows the new time (hh:mm:ss.mmm), the frame number and the frame rate on the screen */
const frame=d=>{v.pause();const t=Math.max(0,v.currentTime+d*fd);v.currentTime=t;
  hud((d>0?'Next frame':'Previous frame')+'  ·  '+tcode(t)+'  ·  frame '+Math.round(t/fd)+'  ·  '+Math.round(1/fd)+' fps',d>0?'next':'prev')};

/* ---------- keyboard shortcuts (rebindable) ---------- */
const ACT={
  play:['Play / Pause','Space',toggle],
  fwd:['Skip forward','ArrowRight',()=>seek(S.skip)],
  back:['Skip back','ArrowLeft',()=>seek(-S.skip)],
  fwdL:['Skip forward (long)','Shift+ArrowRight',()=>seek(S.skipShift)],
  backL:['Skip back (long)','Shift+ArrowLeft',()=>seek(-S.skipShift)],
  volUp:['Volume up','ArrowUp',()=>deskVol(LV+S.vstep/100)],
  volDn:['Volume down','ArrowDown',()=>deskVol(LV-S.vstep/100)],
  mute:['Mute','m',mute],
  sub:['Subtitles on/off','y',subToggle],
  subM:['Subtitle delay −100 ms','d',()=>subD(-100)],
  subP:['Subtitle delay +100 ms','f',()=>subD(100)],
  subS:['Search subtitles online','Ctrl+j',()=>subSearch()],
  fs:['Fullscreen','Enter',fs],
  fs2:['Fullscreen (second key)','F11',fs],
  ah:['Auto-hide controls on / off','',()=>{S.autoHide=!S.autoHide;save();syncAH();hud('Auto-hide controls: '+(S.autoHide?'on':'off'),'video')}],
  pip:['Pop-up play (PiP)','p',popup],
  top:['Always on top','t',()=>deskTop()],
  bm:['Add bookmark','b',addBM],
  shot:['Screenshot','s',()=>deskShot()],
  rec:['Record video','r',()=>rec()],
  next:['Next file','PageDown',()=>step(1)],
  prev:['Previous file','PageUp',()=>deskPrev()],
  slow:['Decrease playback speed','x',()=>rate(-S.spdStep)],
  fast:['Increase playback speed','c',()=>rate(S.spdStep)],
  norm:['Reset playback speed to 1.0× (press again: back to the last speed)','z',()=>{const r=v.playbackRate;if(r!==1){lastRate=r;v.playbackRate=1;hud('1.0x','speed')}else if(lastRate!==1){v.playbackRate=lastRate;hud(lastRate+'x','speed')}}],
  slowF:['Slower','[',()=>preset(-1)],
  fastF:['Faster',']',()=>preset(1)],
  normF:['Normal speed','Backspace',()=>{v.playbackRate=1;hud('1x','speed')}],
  stepF:['Next frame','.',()=>frame(1)],
  stepB:['Previous frame',',',()=>frame(-1)],
  briU:['Brightness up','Alt+ArrowUp',()=>setB(bright+.05)],
  briD:['Brightness down','Alt+ArrowDown',()=>setB(bright-.05)],
  open:['Open file','Ctrl+o',openDlg],
  list:['Playlist','l',togglePL],
  url:['Open link (online video)','Ctrl+u',urlDlg],
  hist:['Watch history','h',toggleHist],
  set:['Settings','Ctrl+,',()=>openSettings()],
};
const keys=()=>{const m={};for(const a in ACT)m[a]=a in S.keys?S.keys[a]:ACT[a][1];return m};
function combo(e){
  let k=e.key;if(k===' ')k='Space';
  if(['Control','Shift','Alt','Meta'].includes(k))return'';
  const letter=k.length===1&&/[a-z]/i.test(k);if(letter)k=k.toLowerCase();
  return(e.ctrlKey?'Ctrl+':'')+(e.altKey?'Alt+':'')+(e.shiftKey&&(k.length>1||letter)?'Shift+':'')+k;
}
window.deskKey=e=>{
  if(e.key==='Escape'&&$('#dlg')){closeDlg();return}
  const sd=[...document.querySelectorAll('.side')].find(x=>x.style.display==='flex');if(e.key==='Escape'&&sd){sd.style.display='none';return}
  const t=e.target;if(t.closest&&t.closest('#dlg'))return;
  if(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)&&t.type!=='range'&&t.type!=='checkbox')return;
  const c=combo(e);if(!c)return;
  const hit=Object.entries(keys()).find(([,x])=>x===c);if(!hit)return;
  e.preventDefault();ACT[hit[0]][2]();
};
function capture(a,b){
  b.textContent='Press keys…';b.classList.add('cap');
  const h=e=>{
    e.preventDefault();e.stopPropagation();
    const c=combo(e);if(!c)return;
    removeEventListener('keydown',h,true);
    if(e.key!=='Escape'){const m=keys();for(const o in m)if(m[o]===c)S.keys[o]='';S.keys[a]=c;save()}
    openSettings('Shortcuts');
  };
  addEventListener('keydown',h,true);
}

/* ---------- settings dialog ---------- */
function closeDlg(){const d=$('#dlg');if(d)d.remove()}
/* ---------- built-in subtitle search (OpenSubtitles, via main.js) ---------- */
const SD_LANGS=[['all','All languages'],['eng','English'],['ben','Bengali'],['hin','Hindi'],['tam','Tamil'],['tel','Telugu'],['mal','Malayalam'],['kan','Kannada'],['urd','Urdu'],['ara','Arabic'],['spa','Spanish'],['fre','French'],['ger','German'],['por','Portuguese'],['rus','Russian'],['ind','Indonesian'],['may','Malay'],['tur','Turkish'],['chi','Chinese'],['jpn','Japanese'],['kor','Korean']];
const cleanTitle=n=>{let t=(n||'').replace(/\.[^.\/\\]{2,4}$/,'').replace(/[._]+/g,' ').replace(/\[[^\]]*\]|\([^)]*\)/g,' ');const m=/\b(19|20)\d\d\b|\b(480|576|720|1080|2160)p\b|\b(web-?dl|webrip|bluray|brrip|hdrip|dvdrip|hdtv|x26[45]|h26[45])\b/i.exec(t);if(m&&m.index>1)t=t.slice(0,m.index);return t.replace(/\s+/g,' ').trim()};
function subSearch(){
  closeDlg();
  const d=el('div',{id:'dlg'});d.onclick=e=>{if(e.target===d)closeDlg()};
  let items=[],lang=S.sdLang||'all',ver=0,state='idle',err='';
  const q=el('input',{type:'text',value:cleanTitle(name),placeholder:'Movie or series title'});
  const go=el('button',{className:'sdgo',innerHTML:ico('search')+'<span>Search</span>'});
  const chips=el('div',{className:'sdc'}),list=el('div',{className:'sdl'}),msg=el('div',{className:'sdm'});
  const saveSel=el('button',{className:'btn',textContent:'Save selected',disabled:true});
  const setBtn=el('button',{className:'btn',innerHTML:ico('settings')+'<span>Subtitle settings</span>',onclick:()=>{closeDlg();openSettings('Subtitles')}});
  const local=()=>!!cur&&!isWeb(cur);
  const baseName=()=>(local()?bn(cur):q.value||'subtitle').replace(/\.[^.]+$/,'');
  const view=()=>items.filter(x=>lang==='all'||x.lang===lang);
  const note=(t,ic,spin)=>{msg.innerHTML=(ic?ico(ic,spin?'sdsp':''):'')+'<span></span>';msg.querySelector('span').textContent=t};
  const fetchText=async it=>{const r=await desk.subFetch(it.link,it.enc);if(!r||!r.ok){hud((r&&r.error)||'Download failed','warn');return null}return r.text};
  const paintChips=()=>{
    chips.textContent='';if(!items.length)return;
    const cnt={};items.forEach(x=>{(cnt[x.lang]=cnt[x.lang]||{n:0,name:x.langName}).n++});
    const mk=(k,t,n)=>{const b=el('button',{className:k===lang?'on':'',innerHTML:'<span></span><b>'+n+'</b>'});b.querySelector('span').textContent=t;b.onclick=()=>{lang=k;S.sdLang=k;save();paint()};chips.append(b)};
    mk('all','All',items.length);Object.entries(cnt).sort((a,b)=>b[1].n-a[1].n).forEach(([k,v])=>mk(k,v.name,v.n));
  };
  const paint=()=>{
    paintChips();list.textContent='';
    const sel=()=>items.filter(x=>x.ck).length,upd=()=>{const n=sel();saveSel.disabled=!n;saveSel.textContent=n?'Save selected ('+n+')':'Save selected'};
    if(state==='load'){list.append(el('div',{className:'sds',innerHTML:ico('loader','sdsp')+'<b>Searching OpenSubtitles…</b>'}));note('Searching…','loader',true);upd();return}
    if(state==='err'){const b=el('button',{className:'btn',textContent:'Try again',onclick:search});list.append(el('div',{className:'sds',innerHTML:ico('warn')+'<b>Could not search</b><span></span>'}));list.lastChild.querySelector('span').textContent=err;list.lastChild.append(el('br'),b);note('Search failed','warn');upd();return}
    const v=view();
    if(state==='done'&&!v.length){list.append(el('div',{className:'sds',innerHTML:ico('search')+'<b>No subtitles found</b>Try a shorter title, for example only the movie name.'}));note('0 results');upd();return}
    if(state==='idle'){list.append(el('div',{className:'sds',innerHTML:ico('cc')+'<b>Type a title and press Search</b>'}));upd();return}
    v.forEach(it=>{
      const cb=el('input',{type:'checkbox',checked:!!it.ck,title:'Select to save several at once'});cb.onchange=()=>{it.ck=cb.checked;upd()};
      const use=el('button',{className:'go',textContent:'Use'});
      use.onclick=async()=>{use.disabled=true;use.textContent='Loading…';const t=await fetchText(it);if(t==null){use.disabled=false;use.textContent='Use';return}closeDlg();loadSub(new File([t],it.file),{ext:1,label:it.file||it.langName,info:it.langName+' (Online)'});hud('Subtitle loaded: '+it.langName,'cc')};
      const sv=el('button',{className:'sv',textContent:'Save…',title:'Save as a file',onclick:async()=>{const t=await fetchText(it);if(t==null)return;const p=await desk.subSave(t,{dir:local()?cur:'',name:baseName()+'.'+it.lang2+'.srt'});if(p)hud('Saved: '+bn(p),'cc')}});
      const wp=el('button',{className:'px',title:'Open the subtitle page in your browser',innerHTML:ico('globe'),onclick:()=>it.page&&window.open(it.page,'_blank')});if(!it.page)wp.style.visibility='hidden';
      const row=el('div',{className:'sdr'},[cb,el('span',{className:'sdg',textContent:(it.lang2||it.lang||'?').slice(0,3).toUpperCase()}),
        el('div',{className:'sdi'},[el('div',{className:'sdn',textContent:it.file,title:it.file}),el('div',{className:'sdd'},[el('span',{textContent:it.langName+' · '+it.format.toUpperCase()})].concat(it.exact?[el('i',{textContent:'Exact match for this video'})]:[]))]),
        el('div',{className:'sda'},[use,sv,wp])]);
      row.ondblclick=()=>use.click();list.append(row);
    });
    note(v.length+' subtitle'+(v.length>1?'s':'')+(lang!=='all'?' in '+v[0].langName:'')+' · double-click to use');upd();
  };
  async function search(){
    const my=++ver;state='load';items=[];paint();
    const r=await desk.subSearch({query:q.value.trim(),path:local()?cur:'',lang:'all'});
    if(my!==ver)return;
    if(!r||!r.ok){state='err';err=(r&&r.error)||'Could not reach the server.';paint();return}
    items=r.items;if(lang!=='all'&&!items.some(x=>x.lang===lang))lang='all';state='done';paint();
  }
  saveSel.onclick=async()=>{
    const l=items.filter(x=>x.ck);if(!l.length)return;
    let dir='';if(!local()){dir=await desk.pickFolder();if(!dir)return}
    let n=0;for(const it of l){note('Saving '+(n+1)+' of '+l.length+'…','loader',true);const t=await fetchText(it);if(t==null)continue;if(await desk.subWrite(t,{dir,ref:local()?cur:'',name:baseName()+'.'+it.lang2+'.srt'}))n++}
    note(n+' of '+l.length+' saved next to the video'+(local()?'':' (chosen folder)'),'check');hud(n+' subtitle'+(n===1?'':'s')+' saved','cc');
  };
  go.onclick=search;q.onkeydown=e=>{if(e.key==='Enter')search()};
  const sf=el('div',{className:'sf',innerHTML:ico('search')});sf.append(q);
  const x=el('button',{className:'px',title:'Close (Esc)',innerHTML:ico('close'),onclick:closeDlg});
  const hd=el('div',{className:'sdh',innerHTML:ico('cc')+'<div><h3>Find subtitles</h3><small></small></div>'});
  hd.querySelector('small').textContent=name?'For: '+name:'Search OpenSubtitles by title';hd.append(x);
  d.append(el('div',{className:'dw uw sdw'},[hd,el('div',{className:'sdq'},[sf,go]),chips,list,el('div',{className:'sdf'},[msg,setBtn,saveSel])]));
  document.body.append(d);q.focus();q.select();if(q.value.trim())search();else paint();
}
window.subSearch=subSearch;

/* a titled card; every setting row lives inside one */
const sec=(box,title,ic)=>{const c=el('div',{className:'card'});c.appendChild(el('h4',{innerHTML:(ic?ico(ic):'')+'<span></span>'}));c.querySelector('h4 span').textContent=title;box.appendChild(c);return c};
const note=(card,text)=>card.appendChild(el('div',{className:'note',innerHTML:ico('info')+'<span></span>'})).querySelector('span').textContent=text;
/* a read-only row (label on the left, text on the right) */
function fact(card,l,txt){
  const r=el('div',{className:'row'},[el('div',{className:'rt'},[el('div',{className:'rn',textContent:l})]),el('div',{className:'rc2'},[el('span',{className:'fx',textContent:txt})])]);
  r.dataset.s=(l+' '+txt).toLowerCase();card.appendChild(r);
}
/* one setting row. t: chk (switch) | sel | seg | num | rng | color | swatch | btn */
function ctl(card,o){
  const get=o.get||(()=>S[o.k]),set=o.set||(x=>{S[o.k]=x;save()});
  let c,tag='div';
  if(o.t==='chk'){
    tag='label';
    const i=el('input',{type:'checkbox',checked:!!get()});i.onchange=()=>{set(i.checked);applyAll()};
    c=el('span',{className:'sw'},[i,el('i')]);
  }else if(o.t==='sel'){
    c=el('select',{},o.opts.map(x=>el('option',{textContent:x[1]})));
    c.selectedIndex=Math.max(0,o.opts.findIndex(x=>x[0]==get()));
    c.onchange=()=>{set(o.opts[c.selectedIndex][0]);applyAll()};
  }else if(o.t==='seg'){
    c=el('div',{className:'seg'});
    const paint=()=>[...c.children].forEach((b,i)=>b.classList.toggle('on',o.opts[i][0]==get()));
    o.opts.forEach(x=>c.appendChild(el('button',{textContent:x[1],onclick:()=>{set(x[0]);applyAll();paint()}})));
    paint();
  }else if(o.t==='btn'){
    c=el('button',{className:'btn'+(o.danger?' danger':''),innerHTML:(o.ic?ico(o.ic):'')+'<span></span>',onclick:o.run});
    c.querySelector('span').textContent=o.text;
  }else if(o.t==='swatch'){
    c=el('div',{className:'sws'});
    const ci=el('input',{type:'color',value:get()});
    const paint=()=>[...c.querySelectorAll('b')].forEach(b=>b.classList.toggle('on',b.dataset.c===String(get()).toLowerCase()));
    ['#ff8800','#ff3b6b','#a35cff','#2f7bff','#17b8a6','#3ec65a'].forEach(col=>{
      const b=el('b',{title:col});b.style.background=col;b.dataset.c=col;
      b.onclick=()=>{set(col);ci.value=col;applyAll();paint()};c.appendChild(b);
    });
    ci.oninput=()=>{set(ci.value);applyAll();paint()};c.appendChild(ci);paint();
  }else if(o.t==='rng'){
    const i=el('input',{type:'range',min:o.min,max:o.max,step:o.step||1,value:get()});
    const out=el('output');const show=()=>out.textContent=o.fmt?o.fmt(+i.value):i.value;show();
    i.oninput=()=>{set(+i.value);applyAll();show()};
    c=el('span',{className:'rg'},[i,out]);
  }else if(o.t==='txt'){
    c=el('input',{type:'text',spellcheck:false,value:get()||'',style:'width:260px'});c.onchange=()=>{set(c.value.trim());applyAll()};
  }else{
    c=el('input',{type:o.t==='num'?'number':'color'});
    if(o.min!=null){c.min=o.min;c.max=o.max;c.step=o.step||1}
    c.value=get();
    c.onchange=()=>{set(o.t==='color'?c.value:+c.value);applyAll()};
    if(o.t==='color')c.oninput=c.onchange;
  }
  const rn=el('div',{className:'rn'+(o.li?' li':'')});
  if(o.li){rn.innerHTML=ico(o.li)+'<span></span>';rn.querySelector('span').textContent=o.l}else rn.textContent=o.l;
  const rt=el('div',{className:'rt'},[rn]);
  if(o.d)rt.appendChild(el('div',{className:'rd',textContent:o.d}));
  const row=el(tag,{className:'row'},[rt,el('div',{className:'rc2'},[c])]);
  row.dataset.s=(o.l+' '+(o.d||'')).toLowerCase();
  card.appendChild(row);return c;
}
/* what a click on a subtitle word does (see tr.js) */
const TR_ACTS=[['search','Search in browser'],['pin','Show meaning (stays in the player)'],['none','Do nothing']],
TR_ENGINES=[['google','Google','https://www.google.com/search?q={q}'],['gmean','Google: meaning of the word','https://www.google.com/search?q={q}+meaning'],['gtr','Google Translate','https://translate.google.com/?sl=auto&tl={lang}&text={q}&op=translate'],['bing','Bing','https://www.bing.com/search?q={q}'],['ddg','DuckDuckGo','https://duckduckgo.com/?q={q}'],['camb','Cambridge Dictionary','https://dictionary.cambridge.org/search/direct/?datasetsearch=english-bengali&q={q}'],['custom','Custom address','']];window.TR_ENGINES=TR_ENGINES;
const LOOPS=[['off','Off'],['one','Repeat one'],['all','Repeat all']];
const pct=x=>Math.round(x*100)+'%';
const TABS={
  General:{ic:'settings',f(box,tab){
    let c=sec(box,'Appearance','palette');
    ctl(c,{t:'seg',l:'Theme',d:'System follows your Windows light / dark mode.',k:'theme',opts:[['system','System'],['dark','Dark'],['light','Light'],['glass','Glass']]});
    ctl(c,{t:'rng',l:'Glass tint',d:'Glass theme only: how frosted the bars and panels are. Lower = more see-through. On Windows 11 the window itself becomes real acrylic glass.',k:'glassA',min:.05,max:.6,step:.01,fmt:x=>Math.round(x/.6*100)+'%'});
    ctl(c,{t:'swatch',l:'Accent color',d:'Used for the progress bar, highlights and switches.',k:'accent'});
    ctl(c,{t:'chk',l:'Auto-hide controls',d:'Off (default): the control bar always stays below the video and never covers it. On: it floats over the video and fades away when the mouse is still. In fullscreen the controls always hide and come back at the top / bottom edge.',k:'autoHide'});
    ctl(c,{t:'rng',l:'Hide controls after',d:'How long the control bar stays visible while the mouse is still (when auto-hide is on).',k:'hideMs',min:1000,max:10000,step:500,fmt:x=>(x/1000).toFixed(1)+' s'});
    c=sec(box,'Window','monitor');
    ctl(c,{t:'chk',l:'Always on top',get:()=>S.onTop,set:x=>{S.onTop=x;save();desk.onTop(x).then(r=>bt.top.classList.toggle('on',r))}});
    ctl(c,{t:'chk',l:'Fit window to the video when opening',k:'autoFit'});
    ctl(c,{t:'chk',l:'Lock window aspect ratio to the video',k:'lockAspect'});
    ctl(c,{t:'chk',l:'Keep the screen awake while playing',k:'awake'});
    c=sec(box,'Watch history','hist');
    ctl(c,{t:'chk',l:'Save watch history',d:'Thumbnail, date and progress of every video you open.',k:'history'});
    ctl(c,{t:'btn',l:'Watch history',d:HC.length+' item'+(HC.length==1?'':'s'),text:'Open',ic:'hist',run:()=>{closeDlg();toggleHist()}});
    ctl(c,{t:'btn',l:'Clear watch history',text:'Clear',ic:'trash',danger:true,run:()=>{if(confirm('Clear all watch history?')){HC=[];histSave();openSettings(tab)}}});
  }},
  Playback:{ic:'playback',f(box){
    let c=sec(box,'Speed','speed');
    ctl(c,{t:'num',l:'Speed step (Z / C keys)',d:'X slows down, C speeds up, Z resets to 1.0× and, pressed again, goes back to the previous speed. Slower / Faster ([ and ]) step through the Speed menu values (0.5x … 3x), Backspace = Normal speed. All rebindable in Shortcuts.',k:'spdStep',min:.05,max:1,step:.05});
    ctl(c,{t:'sel',l:'Default speed',d:'Every new video starts at this speed.',k:'defSpeed',opts:[.5,.75,1,1.25,1.5,2].map(x=>[x,x+'x'])});
    c=sec(box,'Resume','hist');
    ctl(c,{t:'chk',l:'Resume where I left off',d:'Continue a video from the position you stopped at.',k:'resume'});
    c=sec(box,'Playlist','list');
    ctl(c,{t:'chk',l:'Play the next file automatically',d:'Plays the next file of the folder / playlist when one ends.',k:'autoNext'});
    ctl(c,{t:'seg',l:'Repeat',k:'loop',opts:LOOPS});
    ctl(c,{t:'chk',l:'Shuffle',k:'shuffle'});
  }},
  Controls:{ic:'controls',f(box){
    let c=sec(box,'Gestures','swipe');
    ctl(c,{t:'chk',l:'Swipe up / down gestures',d:'Swipe up or down on the left side for brightness and on the right side for volume. Horizontal swipes do nothing.',k:'gest'});
    ctl(c,{t:'chk',l:'Mouse wheel changes volume',k:'wheel'});
    c=sec(box,'Hold to speed up','ffwd');
    ctl(c,{t:'chk',l:'Hold the mouse button to play faster',k:'holdOn'});
    ctl(c,{t:'num',l:'Hold speed (x)',k:'hold',min:1,max:8,step:.25});
    c=sec(box,'Skipping','timer');
    ctl(c,{t:'num',l:'Skip (seconds)',d:'Left / Right arrow keys.',k:'skip',min:1,max:300});
    ctl(c,{t:'num',l:'Long skip (seconds)',d:'Shift + Left / Right.',k:'skipShift',min:1,max:600});
  }},
  Video:{ic:'video',f(box,tab){
    let c=sec(box,'Picture','video');
    ctl(c,{t:'sel',l:'Aspect ratio',k:'aspect',opts:[['fit','Fit'],['fill','Fill (crop)'],['stretch','Stretch'],['16:9','16:9'],['4:3','4:3'],['21:9','21:9'],['1:1','1:1']]});
    ctl(c,{t:'rng',l:'Brightness',min:.3,max:2,step:.05,get:()=>bright,set:x=>setB(x),fmt:pct});
    ctl(c,{t:'rng',l:'Contrast',k:'con',min:.5,max:1.5,step:.05,fmt:pct});
    ctl(c,{t:'rng',l:'Saturation',k:'sat',min:0,max:2,step:.05,fmt:pct});
    ctl(c,{t:'chk',l:'Flip horizontally',k:'flip'});
    ctl(c,{t:'btn',l:'Reset picture adjustments',text:'Reset',ic:'reset',run:()=>{S.con=1;S.sat=1;S.flip=false;save();setB(1);applyAll();openSettings(tab)}});
  }},
  Audio:{ic:'audio',f(box){
    let c=sec(box,'Volume','vol');
    ctl(c,{t:'num',l:'Volume step (%)',d:'Change per arrow-key press or mouse-wheel notch.',k:'vstep',min:1,max:25});
    ctl(c,{t:'seg',l:'Maximum volume',d:'Above 100% the sound is amplified in software, which can distort or be very loud.',k:'maxVol',opts:[[1,'100%'],[1.25,'125%'],[1.5,'150%'],[2,'200%']]});
    ctl(c,{t:'seg',l:'Loudness boost',d:'Makes quiet movies and speech louder without distortion (a compressor with a peak limiter). Light is a gentle boost, Strong also evens out loud and quiet parts. Off = original sound.',k:'loud',opts:[['off','Off'],['light','Light'],['medium','Medium'],['strong','Strong']]});
    ctl(c,{t:'chk',l:'Remember volume',k:'remVol'});
    note(c,'Change the volume with the up / down keys, the mouse wheel or by swiping up / down on the right side. Press M to mute. Audio track: use the headphones button in the control bar.');
  }},
  Subtitles:{ic:'cc',f(box){
    let c=sec(box,'Files','sub');
    ctl(c,{t:'chk',l:'Auto-load a subtitle with the same file name',k:'autoSub'});
    ctl(c,{t:'btn',l:'Load a subtitle file',d:'.srt or .vtt',text:'Browse…',ic:'open',run:async()=>{const p=await desk.openSub();if(p)loadSubPath(p)}});
    ctl(c,{t:'btn',l:'Search subtitles online',d:'Built-in OpenSubtitles search. Shortcut: Ctrl+J',text:'Search…',ic:'globe',run:()=>subSearch()});
    c=sec(box,'Appearance','palette');
    ctl(c,{t:'sel',l:'Font',k:'sfont',opts:[['system-ui, sans-serif','System'],['Arial, sans-serif','Arial'],['Verdana, sans-serif','Verdana'],['Georgia, serif','Georgia'],['Consolas, monospace','Consolas'],['"Segoe UI", sans-serif','Segoe UI'],['"Nirmala UI", "Noto Sans Bengali", sans-serif','Bangla (Nirmala UI)']]});
    ctl(c,{t:'rng',l:'Font size',d:'Scales with the video height.',k:'ssz',min:12,max:60,fmt:x=>Math.round(x/24*100)+'%'});
    ctl(c,{t:'chk',l:'Black outline around the text',k:'sout'});
    ctl(c,{t:'color',l:'Text color',k:'sc'});
    ctl(c,{t:'color',l:'Background color',k:'sb'});
    ctl(c,{t:'rng',l:'Background opacity',k:'sbo',min:0,max:1,step:.05,fmt:pct});
    c=sec(box,'Word meaning','globe');
    ctl(c,{t:'chk',l:'Show the meaning of subtitle words',d:'Hover, click or right-click a word; click and drag to pick several words.',k:'trOn'});
    ctl(c,{t:'sel',l:'Show the meaning in',d:'Needs an internet connection.',k:'trLang',opts:window.TR_LANGS||[['bn','Bangla']]});
    ctl(c,{t:'chk',l:'Meaning of one word on hover',k:'trHover'});
    ctl(c,{t:'sel',l:'Left click on a word',d:'Click a word, or click and drag over several words.',k:'trLeft',opts:TR_ACTS});
    ctl(c,{t:'sel',l:'Right click on a word',d:'The meaning card stays open until you close it (X, Esc or click elsewhere).',k:'trRight',opts:TR_ACTS});
    ctl(c,{t:'sel',l:'Search with',d:'Opens in your default browser.',k:'trEngine',opts:TR_ENGINES.map(x=>[x[0],x[1]])});
    ctl(c,{t:'txt',l:'Custom search address',d:'Used when "Search with" is Custom. {q} = the word, {lang} = the meaning language.',k:'trUrl'});
    ctl(c,{t:'chk',l:'Meaning of a phrase when dragging over words',k:'trSel'});
    ctl(c,{t:'chk',l:'Dictionary: definitions, synonyms and antonyms',d:'The right-click card also lists the word\'s definitions, examples, synonyms and antonyms in its own language (English, Spanish, Bangla, …).',k:'trDic'});
    ctl(c,{t:'chk',l:'Pause the video while a meaning is shown',k:'trPause'});
    c=sec(box,'Position & timing','timer');
    ctl(c,{t:'rng',l:'Distance from the bottom of the picture',d:'Default 5%. The text is lifted above the control bar while it is visible.',k:'spos',min:0,max:40,fmt:x=>x+'%'});
    ctl(c,{t:'num',l:'Delay (ms)',d:'Positive = later, negative = earlier. Also D / F while playing.',k:'sdelay',min:-60000,max:60000,step:50});
  }},
  Capture:{ic:'capture',f(box,tab){
    let c=sec(box,'Screenshots','shot');
    ctl(c,{t:'btn',l:'Folder',d:S.shotDir||'Pictures / NixPlayer',text:'Choose…',ic:'folder',run:async()=>{const p=await desk.pickFolder();if(p){S.shotDir=p;save();openSettings(tab)}}});
    if(S.shotDir)ctl(c,{t:'btn',l:'Open the screenshot folder',text:'Open',ic:'open',run:()=>desk.reveal(S.shotDir)});
    ctl(c,{t:'seg',l:'Format',d:'Saved at the video’s native resolution.',k:'shotFmt',opts:[['png','PNG'],['jpg','JPG']]});
    c=sec(box,'Recording','rec');
    ctl(c,{t:'btn',l:'Folder',d:S.recDir||'Videos / NixPlayer',text:'Choose…',ic:'folder',run:async()=>{const p=await desk.pickFolder();if(p){S.recDir=p;save();openSettings(tab)}}});
    if(S.recDir)ctl(c,{t:'btn',l:'Open the recording folder',text:'Open',ic:'open',run:()=>desk.reveal(S.recDir)});
    note(c,'Recordings are saved as .webm (video + audio of the player). Start / stop with R.');
  }},
  Shortcuts:{ic:'keyboard',f(box){
    const m=keys();
    const KG=[['Playback','playback',['play','next','prev','slow','fast','norm','slowF','fastF','normF','stepF','stepB']],['Seeking','ffwd',['fwd','back','fwdL','backL']],['Audio & subtitles','audio',['volUp','volDn','mute','sub','subM','subP','subS']],['Picture','video',['briU','briD']],['Window & panels','monitor',['fs','fs2','ah','pip','top','list','hist','set']],['Files & capture','folder',['open','url','shot','rec','bm']]];
    const rest=Object.keys(ACT).filter(a=>!KG.some(g=>g[2].includes(a)));if(rest.length)KG.push(['Other','settings',rest]);
    KG.forEach(([t,ic,ids])=>{
      const c=sec(box,t,ic);
      ids.filter(a=>ACT[a]).forEach(a=>{
        const b=el('button',{className:'btn key',textContent:m[a]||'—'});b.onclick=()=>capture(a,b);
        const r=el('div',{className:'row'},[el('div',{className:'rt'},[el('div',{className:'rn',textContent:ACT[a][0]})]),el('div',{className:'rc2'},[b])]);
        r.dataset.s=(ACT[a][0]+' '+(m[a]||'')).toLowerCase();c.appendChild(r);
      });
    });
    let c=sec(box,'Mouse buttons','controls');
    const MA=[['none','None (nothing happens)'],['play','Play / pause'],['fs','Fullscreen'],['mute','Mute / unmute']];
    ctl(c,{t:'sel',l:'Left button: single click',d:'Default: None.',k:'clickAct',opts:MA});
    ctl(c,{t:'sel',l:'Left button: double click',d:'Default: Play / pause.',k:'dblAct',opts:MA});
    c=sec(box,'Gestures (fixed)','controls');
    fact(c,'Fast speed','Hold the left button');
    fact(c,'Brightness','Swipe up / down, left side');fact(c,'Volume','Swipe up / down, right side or mouse wheel');
    c=sec(box,'Reset','reset');
    note(c,'Click a shortcut, then press the new keys. Esc cancels.');
    ctl(c,{t:'btn',l:'Reset all shortcuts',text:'Reset',ic:'reset',danger:true,run:()=>{S.keys={};save();openSettings('Shortcuts')}});
  }},
  Buttons:{ic:'buttons',f(box){
    let c=sec(box,'Control bar','buttons');
    note(c,'Choose which buttons appear in the control bar. Volume: swipe, mouse wheel or up / down keys. Settings: NixPlayer menu or Ctrl+, . Hidden by default (turn them on below): Open file, Open link, Pop-up play, Window / fit size. The volume button + slider can be hidden too.');
    B.forEach(([id,ic,tt])=>ctl(c,{t:'chk',l:tt.replace(/ \(.*/,''),li:ic,get:()=>!S.hide[id],set:x=>{S.hide[id]=!x;save();vis()}}));
    ctl(c,{t:'chk',l:'Volume (mute button + slider)',li:'vol',get:()=>!S.hide.vol,set:x=>{S.hide.vol=!x;save();volVis()}});
    ctl(c,{t:'btn',l:'Show the default buttons',text:'Reset',ic:'reset',run:()=>{S.hide={size:true,pip:true,open:true,url:true};save();vis();openSettings('Buttons')}});
  }},
  About:{ic:'info',f(box){
    let c=sec(box,'NixPlayer','info');
    note(c,'A simple desktop video player. Drop files on the window, press Ctrl+O, or use “Open with”. Press Ctrl+, for these settings.');
    note(c,'Plays whatever Chromium can decode: MP4 / MKV / WebM with H.264, VP9, AV1 and AAC / MP3 / Opus / FLAC. AC3 / E-AC3 / DTS audio, files with several audio tracks and text subtitles inside MKV are handled with the bundled ffmpeg (audio is re-encoded live, nothing is written next to your file). Picture-based subtitles (PGS / VobSub) are not supported.');
    const cv=sec(box,'Version and updates','reset'),ch=sec(box,'Help and support','info'),cs=sec(box,'Support and legal','info');
    fact(cv,'Installed version','…');
    desk.appInfo().then(i=>{const x=cv.querySelector('.fx');if(x)x.textContent='NixPlayer '+i.version}).catch(()=>{});
    if(!STORE)ctl(cv,{t:'btn',l:'Check for updates',d:'NixPlayer also checks by itself. When an update is found, press “Update now”: it installs in the same place and opens again.',text:'Check now',ic:'reset',run:()=>desk.checkUpdate()});
    const legal=i=>{ // donate / downloads rows show only when their link is set in package.json ("nixplayer" block)
      if(i.donateUrl&&!i.store)ctl(cs,{t:'btn',l:'Support NixPlayer',d:'NixPlayer is free. A donation helps to keep it updated.',text:'Donate',ic:'link',run:()=>desk.openUrl(i.donateUrl)});
      if(i.homepage&&!i.store)ctl(cs,{t:'btn',l:'Downloads and release notes',text:'Open page',ic:'url',run:()=>desk.openUrl(i.homepage)});
      /* license / notices open right here in the page (no external file): the button shows / hides the text under its row */
      const doc=(l,d,n)=>{let pre=null;const b=ctl(cs,{t:'btn',l,d,text:'Show',ic:'info',run:async()=>{
        const row=b.closest('.row');
        if(pre){pre.remove();pre=null;b.lastChild.textContent='Show';return}
        pre=el('pre',{className:'doc',textContent:'Loading…'});row.after(pre);b.lastChild.textContent='Hide';
        let t='';try{t=await desk.docText(n)}catch(_){}
        pre.textContent=t||'The file could not be read.';
      }})};
      doc('License','Copyright © Nasimul Islam Nasim. Free to use.','license');
      doc('Third-party notices','Electron, ffmpeg, hls.js, Lucide icons and others.','notices');
      doc('FFmpeg license','FFmpeg is licensed under the GPL. The license text and where to get the source code.','ffmpeg');
    };
    desk.appInfo().then(legal).catch(()=>legal({}));
    /* Help and support: report a problem, copy diagnostic info, privacy policy, feedback. Nothing is sent automatically:
       the GitHub page opens in the browser with the details filled in, and the person presses Submit there. */
    const diag=i=>['NixPlayer '+i.version+(i.store?' (Microsoft Store edition)':' (installer edition)'),
      'Electron '+i.electron+' / Chromium '+i.chrome,'Windows '+i.os+' ('+i.arch+')','Language: '+i.locale].join('\n');
    const issue=(i,title,intro)=>{
      const body=intro+'\n\n\n---\n'+diag(i);
      return i.issuesUrl.replace(/\/+$/,'')+'/new?title='+encodeURIComponent(title)+'&body='+encodeURIComponent(body);
    };
    const help=i=>{
      if(i.issuesUrl)ctl(ch,{t:'btn',l:'Report a problem',d:'Opens a new issue on GitHub with your version and Windows details filled in. Nothing is sent until you press Submit there.',text:'Report',ic:'link',
        run:()=>desk.openUrl(issue(i,'Problem: ','**What happened?**\n\n\n**What did you expect?**\n\n\n**The file type or link (if it matters):**\n'))});
      if(i.privacyUrl)ctl(ch,{t:'btn',l:'Privacy policy',d:'What stays on your computer and what is sent when you use subtitle search, translation or a dictionary.',text:'Open',ic:'url',run:()=>desk.openUrl(i.privacyUrl)});
      if(i.issuesUrl)ctl(ch,{t:'btn',l:'Send feedback',d:'Tell us what you like or what could be better.',text:'Send',ic:'link',
        run:()=>desk.openUrl(issue(i,'Feedback: ','**What do you like, or what could be better?**\n'))});
    };
    desk.appInfo().then(help).catch(()=>{});
    c=sec(box,'Maintenance','reset');
    ctl(c,{t:'btn',l:'Reset all settings',d:'Watch history, bookmarks and resume positions are kept.',text:'Reset',ic:'reset',danger:true,run:async()=>{if(confirm('Reset all NixPlayer settings to their defaults?')){try{localStorage.removeItem('np')}catch(e){}try{window.subClearAll&&await subClearAll()}catch(e){}location.reload()}}});
  }},
};
function openSettings(tab){
  tab=tab&&TABS[tab]?tab:'General';closeDlg();
  const d=el('div',{id:'dlg'}),nav=el('div',{className:'dn'}),box=el('div',{className:'dc'});
  d.onclick=e=>{if(e.target===d)closeDlg()};
  nav.appendChild(el('div',{className:'nt',innerHTML:ico('settings')+'<span>Settings</span>'}));
  Object.keys(TABS).forEach(t=>nav.appendChild(el('button',{className:t===tab?'on':'',title:t,innerHTML:ico(TABS[t].ic)+'<span>'+t+'</span>',onclick:()=>openSettings(t)})));
  nav.appendChild(el('button',{className:'dx',title:'Close',innerHTML:ico('close')+'<span>Close</span>',onclick:closeDlg}));
  const si=el('input',{type:'text',placeholder:'Search all settings',spellcheck:false});
  const sr=el('label',{className:'sr',innerHTML:ico('search')},[si]);
  const title=el('h3',{innerHTML:ico(TABS[tab].ic)+'<span>'+tab+'</span>'});
  /* with a search word every tab is built, then the rows that do not match are hidden */
  const render=()=>{
    box.innerHTML='';box.scrollTop=0;
    const q=si.value.trim().toLowerCase();
    if(!q){TABS[tab].f(box,tab);return}
    let hit=0;
    Object.keys(TABS).forEach(t=>{
      const g=el('div',{className:'grp'});TABS[t].f(g,t);
      g.querySelectorAll('.row').forEach(r=>{const ok=(r.dataset.s||'').includes(q);r.style.display=ok?'':'none';if(ok)hit++});
      g.querySelectorAll('.card').forEach(k=>{if(![...k.querySelectorAll('.row')].some(r=>r.style.display!=='none'))k.style.display='none'});
      if([...g.querySelectorAll('.card')].some(k=>k.style.display!=='none')){g.prepend(el('div',{className:'gh',innerHTML:ico(TABS[t].ic)+'<span>'+t+'</span>'}));box.appendChild(g)}
    });
    if(!hit)box.appendChild(el('div',{className:'none',textContent:'No settings match “'+si.value.trim()+'”.'}));
  };
  si.oninput=render;
  si.onkeydown=e=>{if(e.key==='Escape'){e.stopPropagation();if(si.value){si.value='';render()}else closeDlg()}};
  d.appendChild(el('div',{className:'dw'},[nav,el('div',{className:'dm'},[el('div',{className:'dh'},[title,sr]),box])]));
  TABS[tab].f(box,tab);st.appendChild(d);
}
window.openSettings=openSettings;

/* ---------- wiring ---------- */
/* mouse wheel = volume: over the picture, the top bar and the control bar - but never over the playlist / history panels, menus or dialogs */
document.addEventListener('wheel',e=>{
  if(S.wheel===false||!e.target.closest)return;
  if(e.target.closest('#pop,#dlg,#plist,.side,#dmenu'))return;
  if(!e.target.closest('#stage,#top,#bar'))return;
  if(e.defaultPrevented)return;
  e.preventDefault();
  deskVol(LV+(e.deltaY<0?1:-1)*S.vstep/100);
},{passive:false});
document.addEventListener('click',e=>{const b=e.target.closest('button');if(b)b.blur()},true);
/* mouse wheel over the Speed / Brightness buttons: scroll up = more, scroll down = less */
bt.spd.addEventListener('wheel',e=>{e.preventDefault();e.stopPropagation();preset(e.deltaY<0?1:-1)},{passive:false});
bt.bri.addEventListener('wheel',e=>{e.preventDefault();e.stopPropagation();setB(bright+(e.deltaY<0?1:-1)*.05)},{passive:false});
bt.spd.title='Speed (scroll the mouse wheel here to change)';bt.bri.title='Brightness (scroll the mouse wheel here to change)';

v.addEventListener('loadedmetadata',()=>{
  applyAspect();applyFx();
  let m=pendingSeek;pendingSeek=null;if(m==null&&S.resume)m=rs()[cur];
  if(m&&m<v.duration-15){v.currentTime=m;hud('Resumed at '+fmt(m),'hist')}
  if(S.autoFit)fitWin(1);
  desk.setAspect(S.lockAspect&&v.videoHeight?v.videoWidth/v.videoHeight:0,barH());
});
v.addEventListener('error',()=>{if(!cur)return;const c=v.error&&v.error.code;
  /* online file and the connection broke: reconnect by itself and continue from the same second (up to 3 times in a row) */
  if(isWeb(cur)&&!hlsI&&c===2&&(window.__nr=(window.__nr||0)+1)<=3){const t=v.currentTime,src=v.currentSrc||v.src;pendingSeek=t>1?t:null;hud('Connection lost. Reconnecting…','globe');setTimeout(()=>{if(!cur||!isWeb(cur))return;v.src=src;v.play().catch(()=>{})},800*window.__nr);return}
  if(!isWeb(cur))return localFail();
  fail(isWeb(cur)?(c===4?'Cannot play this link: the server refused it, or the video/audio codec is not supported (for example HEVC / H.265 or AC3 / DTS audio).':c===2?'The connection to the server dropped. Press play again to retry.':'Cannot play this link (unsupported format, or the server refused it)'):'Cannot play this file — codec not supported')});
/* online videos: say so while the server is slow, and warn if nothing arrives */
{let wt=0,st0=0;
  const clr=()=>{clearTimeout(wt);clearTimeout(st0)};
  v.addEventListener('loadstart',()=>{clr();if(!cur||!isWeb(cur))return;hud('Connecting to the server…','globe');
    wt=setTimeout(()=>{if(v.readyState<2&&cur&&isWeb(cur))hud('Still waiting for the server… (slow link)','globe')},12000);
    st0=setTimeout(()=>{if(v.readyState<2&&cur&&isWeb(cur))hud('The server is not sending video. It may be busy; press play again to retry.','warn')},40000)});
  v.addEventListener('loadeddata',clr);v.addEventListener('playing',clr);
  v.addEventListener('waiting',()=>{if(cur&&isWeb(cur)&&v.readyState<3)hud('Buffering…','globe')});
}
v.addEventListener('playing',()=>{window.__nr=0});
/* local file: name the video format when the file cannot be played (or does not start at all) */
async function localFail(){
  const f=cur;let msg='Cannot play this file — codec not supported';
  fail(msg);
  let V=null,fmt='';
  try{
    const pr=await desk.probe(f);if(f!==cur)return;
    V=(pr&&pr.ok&&pr.video)||null;
    if(V)fmt=V.codec.toUpperCase()+(V.profile?' '+V.profile:'')+(V.w?', '+V.w+'×'+V.h:'');
  }catch(_){}
  if(HLSL.has(f)){HLSL.delete(f);desk.hlsStop(f);msg='The playable stream could not be played'+(fmt?' ('+fmt+')':'')+'.';fail(msg);hud(msg,'warn');return}
  if(!V){fail(msg);hud(msg,'warn');return}
  try{
    /* play it now: ffmpeg makes a stream (H.264 + AAC) while you watch, it starts in a few seconds */
    msg='This PC cannot decode this video format directly ('+fmt+'). Preparing a stream that plays…';
    if(/^(hevc|h265)$/i.test(V.codec))msg+=' (Installing "HEVC Video Extensions" from the Microsoft Store would let it play directly on a PC with a supported graphics card.)';
    fail(msg);hud('Preparing a playable stream…');
    const r=await desk.hlsStart(f).catch(e=>({ok:false,error:String(e)}));
    if(f!==cur)return;
    if(r&&r.ok&&r.url){HLSL.set(f,r.url);playPath(f);return}
    msg='Could not start a playable stream: '+((r&&r.error)||'unknown error');
    fail(msg);hud(msg,'warn');
  }catch(_){}
}
v.addEventListener('play',()=>desk.keepAwake(!!S.awake));
['pause','ended'].forEach(ev=>v.addEventListener(ev,()=>desk.keepAwake(false)));
v.addEventListener('pause',saveResume);
v.addEventListener('ended',()=>{saveResume();if(S.loop==='one')return;if(S.autoNext||S.loop==='all')step(1)});
setInterval(()=>{if(!v.paused)saveResume()},5000);
addEventListener('beforeunload',saveResume);

/* drag the window by the top bar (JS drag, so the mouse wheel still works over it) + double click = maximize / restore */
{const T=$('#top');let on=false,raf=0;
 T.addEventListener('pointerdown',async e=>{
  if(e.button||document.fullscreenElement||e.target.closest('button,#dmenu,#tlogo img'))return;
  if(!await desk.dragStart())return;
  on=true;try{T.setPointerCapture(e.pointerId)}catch(_){}});
 T.addEventListener('pointermove',e=>{if(!on||raf)return;raf=requestAnimationFrame(()=>{raf=0;if(on)desk.dragMove()})});
 const end=()=>{on=false};
 T.addEventListener('pointerup',end);T.addEventListener('pointercancel',end);T.addEventListener('lostpointercapture',end);
 T.addEventListener('dblclick',e=>{if(document.fullscreenElement||e.target.closest('button,#dmenu,#tlogo img'))return;desk.toggleMax()})}
/* double click on the title bar while in fullscreen: leave fullscreen and return to the last window size */
$('#top').addEventListener('dblclick',e=>{
  if(!document.fullscreenElement||e.target.closest('button,#dmenu,#tlogo img'))return;
  e.preventDefault();desk.leaveFull();document.exitFullscreen().catch(()=>{});
});
/* the control bar never wraps: tell the window how wide it must be at least so every visible button stays on one row */
{
  const bw=$('#btns'),bar=$('#bar');bt.spd.style.minWidth='46px';/* fits "0.75x" so the row does not change width with the speed */
  let ft=0;const fitMin=()=>{
    const k=[...bw.children].filter(x=>!x.classList.contains('sp')&&getComputedStyle(x).display!=='none');
    let w=0;k.forEach(x=>{const c=getComputedStyle(x);w+=x.offsetWidth+parseFloat(c.marginLeft)+parseFloat(c.marginRight)});
    const b=getComputedStyle(bar),g=parseFloat(getComputedStyle(bw).columnGap)||2;
    w+=g*Math.max(0,k.length-1)+parseFloat(b.paddingLeft)+parseFloat(b.paddingRight)+2;
    desk.setMinWidth(Math.ceil(w));
  };
  window.fitMin=()=>{clearTimeout(ft);ft=setTimeout(fitMin,60)};
  new MutationObserver(window.fitMin).observe(bw,{attributes:true,attributeFilter:['style'],subtree:true});
  window.fitMin();setTimeout(fitMin,600);document.fonts&&document.fonts.ready.then(window.fitMin);
}
/* top bar window buttons */
tb.min.onclick=e=>{e.stopPropagation();desk.minimize()};
tb.max.onclick=e=>{e.stopPropagation();desk.toggleMax()};
tb.close.onclick=e=>{e.stopPropagation();desk.closeWin()};
let fsStamp=0;document.addEventListener('fullscreenchange',()=>{fsStamp=Date.now()});
/* the page's fullscreen mode must follow the real window: if the window left fullscreen (maximize button, resize...) the hidden bars come back */
const setWin=s=>{tb.max.innerHTML=ico(s.max?'restore':'max');tb.max.title=s.max?'Restore':'Maximize';
  if(s.full===false&&document.fullscreenElement&&Date.now()-fsStamp>700)document.exitFullscreen().catch(()=>{})};
desk.winState().then(setWin);desk.onWinState(setWin);

applyAll();
/* ---------- volume button (mute / unmute) + slider, right of the timeline ---------- */
{
  const w=el('span',{className:'vw'}),b=el('button',{title:'Mute / Unmute (M)'}),r=el('input',{type:'range',min:0,max:100,step:1,title:'Volume'});
  b.onclick=e=>{e.stopPropagation();mute()};r.oninput=()=>deskVol(r.value/100);
  r.onclick=r.onpointerdown=e=>e.stopPropagation();
  w.append(b,r);$('#t2').after(w);window.volVis=()=>{w.style.display=S.hide.vol?'none':''};volVis();
  const sync=()=>{const x=v.muted?0:LV;b.innerHTML=ico(volIc(x));r.max=Math.round(S.maxVol*100);r.value=Math.round(x*100);r.style.setProperty('--p',(r.value/r.max*100)+'%')};
  v.addEventListener('volumechange',sync);sync();window.syncVol=sync;
  document.head.appendChild(el('style',{textContent:'.vw{display:inline-flex;align-items:center;gap:2px;margin-left:6px;flex:none}.vw button{background:none;border:0;color:var(--fg);padding:5px 6px;border-radius:4px;cursor:pointer;display:flex;align-items:center;justify-content:center}.vw button:hover{background:var(--bg3);color:var(--fgh)}.vw button .ic{width:18px;height:18px}.vw input{-webkit-appearance:none;appearance:none;width:72px;height:4px;border-radius:2px;margin:0 6px;cursor:pointer;outline:0;background:linear-gradient(to right,var(--ac) var(--p,100%),var(--trk) var(--p,100%))}.vw input::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;border-radius:50%;background:var(--ac)}'}));
}
deskVol(S.remVol?S.vol:1,true);
desk.onTop(!!S.onTop).then(r=>bt.top.classList.toggle('on',r));
desk.onOpen(openFiles);
/* ---------- audio files (and anything without a picture): logo + moving bars instead of a black screen ---------- */
{const st=document.createElement('style');st.textContent=`
#vis{position:absolute;inset:0;z-index:2;display:none;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;overflow:hidden;
 background:radial-gradient(ellipse 60% 50% at 50% 38%,rgba(106,79,224,.30),transparent 70%),radial-gradient(ellipse 50% 40% at 15% 90%,rgba(37,184,214,.20),transparent 70%),linear-gradient(160deg,#0d0e2e,#15106a 60%,#0a0c3c)}
#vis.on{display:flex}
body:has(#dlg) #vis{opacity:.12;filter:blur(6px)}
#vis .vl{width:min(22vh,160px);aspect-ratio:1;display:grid;place-items:center;position:relative;margin-bottom:2.4vh}
#vis .vl::before{content:'';position:absolute;inset:-18%;border-radius:50%;background:radial-gradient(circle,rgba(60,200,255,.35),rgba(138,90,232,.18) 55%,transparent 70%);transform:scale(var(--pulse,1));transition:transform .08s}
#vis .vl img{width:78%;position:relative;transform:scale(var(--pulse,1));transition:transform .08s;filter:drop-shadow(0 0 18px rgba(60,200,255,.5))}
#vis canvas{width:min(80%,760px);height:26vh;max-height:240px}
#vis .vt{margin-top:2vh;max-width:80%;font:600 15px Inter,sans-serif;color:#e8eaff;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#vis .vf{margin-top:8px;font:700 11px Inter,sans-serif;color:#fff;background:rgba(8,10,52,.85);border:1px solid rgba(95,215,245,.8);border-radius:6px;padding:2px 8px;letter-spacing:.08em}`;
document.head.appendChild(st);
const vis=document.createElement('div');vis.id='vis';
vis.innerHTML='<div class="vl"><img src="logo.png" alt=""></div><canvas width="760" height="240"></canvas><div class="vt"></div><div class="vf"></div>';
document.getElementById('stage').appendChild(vis);
const cv=vis.querySelector('canvas'),cx=cv.getContext('2d'),N=44;
let an=null,data=null,raf=0,level=0,t0=performance.now();
const audioOnly=()=>!!v.currentSrc&&v.readyState>=1&&!v.videoWidth;
function hook(){
  if(an||typeof actx==='undefined'||!actx||!loud)return;
  try{an=actx.createAnalyser();an.fftSize=256;an.smoothingTimeConstant=.78;loud.output.connect(an);data=new Uint8Array(an.frequencyBinCount)}catch(_){an=null}
}
function frame(){
  raf=0;if(!vis.classList.contains('on'))return;
  hook();
  const W=cv.width,H=cv.height,playing=!v.paused&&!v.ended,t=(performance.now()-t0)/1000;
  let real=false;
  if(an&&playing){an.getByteFrequencyData(data);let m=0;for(let i=0;i<data.length;i++)m=Math.max(m,data[i]);real=m>0}
  cx.clearRect(0,0,W,H);
  const g=cx.createLinearGradient(0,0,W,0);g.addColorStop(0,'#25b8d6');g.addColorStop(.6,'#6a4fe0');g.addColorStop(1,'#b04be8');cx.fillStyle=g;
  const bw=W/N,gap=bw*.38;let bass=0;
  for(let i=0;i<N;i++){
    const k=i<N/2?i:N-1-i,f=k/(N/2);let a;
    if(real)a=data[Math.min(data.length-1,Math.floor(Math.pow(f,1.4)*data.length*.7))]/255;
    else a=playing?(.35+.25*Math.sin(t*2.1+k*.55)+.2*Math.sin(t*3.3+k*1.3)+.15*Math.sin(t*1.1-k*.25))*(1-f*.55):0;
    a=Math.max(0,Math.min(1,a));if(k<4)bass+=a/4/ (N/2>0?1:1);
    const h=Math.max(6,a*H*.95),x=i*bw+gap/2,y=(H-h)/2,w=bw-gap;
    cx.beginPath();cx.roundRect(x,y,w,h,w/2);cx.fill();
  }
  level+=(((real?bass/ (N/2) *3.2:(playing?.5+.4*Math.sin(t*3.1):0)))-level)*.25;
  vis.style.setProperty('--pulse',(1+Math.max(0,Math.min(.14,level*.14))).toFixed(3));
  raf=requestAnimationFrame(frame);
}
function sync(){
  const on=audioOnly();
  if(on){vis.querySelector('.vt').textContent=bn(String(cur||'').split(/[?#]/)[0])||'';const m=String(cur||'').split(/[?#]/)[0].match(/\.([a-z0-9]{2,4})$/i);vis.querySelector('.vf').textContent=m?m[1].toUpperCase():'AUDIO'}
  vis.classList.toggle('on',on);
  if(on&&!raf)raf=requestAnimationFrame(frame);
}
['loadeddata','loadedmetadata','playing','emptied','pause','play'].forEach(ev=>v.addEventListener(ev,()=>setTimeout(sync,60)));
}

/* ---------- update progress screen: shown while an update downloads and installs ---------- */
{const st=document.createElement('style');st.textContent=`
#upd{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;background:rgba(6,8,30,.72);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
#upd.on{display:flex}
#upd .uc{width:420px;max-width:90vw;border-radius:22px;padding:30px 30px 26px;text-align:center;color:#e8eaff;background:linear-gradient(160deg,#171a52,#0d0e2e);box-shadow:0 24px 70px rgba(0,0,0,.6),0 0 0 1px rgba(150,160,255,.25)}
#upd .ul{position:relative;width:96px;height:96px;margin:0 auto 18px;display:grid;place-items:center}
#upd .ul img{width:58px;position:relative;z-index:1;animation:updBeat 1.6s ease-in-out infinite;filter:drop-shadow(0 0 12px rgba(60,200,255,.5))}
#upd .ul i{position:absolute;inset:0;border-radius:50%;border:3px solid rgba(150,160,255,.18);border-top-color:#25b8d6;border-right-color:#8a5ae8;animation:updSpin 1.1s linear infinite}
#upd h3{font-size:17px;font-weight:700;margin:0 0 6px}
#upd p{font-size:13px;color:#9ea2cf;margin:0;min-height:18px}
#upd .ub{height:8px;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden;margin:20px 0 10px;position:relative}
#upd .ub b{display:block;height:100%;width:0;border-radius:999px;background:linear-gradient(90deg,#25b8d6,#6a4fe0 70%,#b04be8);transition:width .25s}
#upd .ub b::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.45),transparent);transform:translateX(-100%);animation:updShine 1.4s linear infinite}
#upd.ins .ub b{width:40%!important;position:absolute;animation:updSlide 1.3s ease-in-out infinite}
#upd .us{font-size:12px;color:#7478ad;min-height:16px}
@keyframes updSpin{to{transform:rotate(360deg)}}@keyframes updBeat{50%{transform:scale(1.1)}}
@keyframes updShine{to{transform:translateX(100%)}}@keyframes updSlide{0%{left:-40%}100%{left:100%}}`;
document.head.appendChild(st);
const u=document.createElement('div');u.id='upd';u.innerHTML='<div class="uc"><div class="ul"><i></i><img src="logo.png" alt=""></div><h3></h3><p></p><div class="ub"><b></b></div><div class="us"></div></div>';document.body.appendChild(u);
const q=s=>u.querySelector(s),mb=n=>(n/1048576).toFixed(1);
desk.onUpdate(s=>{
  if(!s||s.stage==='error'){u.classList.remove('on','ins');return}
  u.classList.add('on');
  if(s.stage==='installing'){u.classList.add('ins');q('h3').textContent='Installing the update';q('p').textContent='NixPlayer will close and open again in a moment.';q('.us').textContent='Please do not turn off your computer.';return}
  u.classList.remove('ins');
  const pc=Math.max(0,Math.min(100,s.percent||0));
  q('h3').textContent='Downloading NixPlayer '+(s.version||'');
  q('p').textContent='Please wait, this takes a moment.';
  q('b').style.width=pc+'%';
  q('.us').textContent=s.total?Math.round(pc)+'%  ·  '+mb(s.transferred)+' / '+mb(s.total)+' MB'+(s.bps?'  ·  '+mb(s.bps)+' MB/s':''):'Starting the download…';
});}

/* taskbar thumbnail buttons: previous / play-pause / next */
{const ts=()=>desk.thumbState(v.paused,!!v.currentSrc);['play','pause','loadedmetadata','emptied','ended'].forEach(e=>v.addEventListener(e,ts));ts();
 /* progress along the taskbar button, updated at most twice a second */
 let lp=0;v.addEventListener('timeupdate',()=>{const n=Date.now();if(n-lp<500)return;lp=n;desk.thumbProgress(v.duration>0&&isFinite(v.duration)?v.currentTime/v.duration:-1)});
 v.addEventListener('emptied',()=>desk.thumbProgress(-1));
 desk.onThumb(c=>c=='play'?toggle():c=='next'?step(1):deskPrev())}
})();
