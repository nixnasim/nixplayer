/* Word & phrase meanings. Hover = quick meaning. Left click (or drag over several words) and right click do what is chosen in
   Settings → Subtitles → Word meaning: search in the default browser, or show the meaning in a card that stays until closed. */
(()=>{
const LANGS=[['en','English'],['bn','Bangla (বাংলা)'],['hi','Hindi (हिन्दी)'],['ur','Urdu (اردو)'],['ar','Arabic (العربية)'],['ta','Tamil (தமிழ்)'],['te','Telugu (తెలుగు)'],['ml','Malayalam (മലയാളം)'],['ne','Nepali (नेपाली)'],['es','Spanish'],['fr','French'],['de','German'],['it','Italian'],['pt','Portuguese'],['ru','Russian'],['tr','Turkish'],['id','Indonesian'],['ms','Malay'],['fa','Persian'],['zh-CN','Chinese (Simplified)'],['ja','Japanese'],['ko','Korean'],['th','Thai'],['vi','Vietnamese']];
window.TR_LANGS=LANGS;
const on=()=>S.trOn!==false,lang=()=>S.trLang||'bn',lname=c=>(LANGS.find(x=>x[0]===c)||[0,c])[1];
const tip=document.getElementById('trtip'),cache=new Map();
let words=[],drag=null,hoverT=0,hideT=0,tok=0,paused=false,pinned=false;

/* wrap every word of the visible subtitle in <nx-w> */
window.trWrap=root=>{
  trHide();
  if(!on())return;
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),list=[];
  while(w.nextNode())list.push(w.currentNode);
  const re=/[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N}'’\-]*/gu;
  for(const n of list){
    const s=n.nodeValue;let last=0,m;const f=document.createDocumentFragment();re.lastIndex=0;
    while((m=re.exec(s))){
      if(m.index>last)f.append(s.slice(last,m.index));
      const e=document.createElement('nx-w');e.textContent=m[0];f.append(e);last=m.index+m[0].length;
    }
    if(!last)continue;
    if(last<s.length)f.append(s.slice(last));
    n.replaceWith(f);
  }
  words=[...root.querySelectorAll('nx-w')];
};

/* ask the main process (Google Translate web endpoint) */
async function ask(text){
  const k=lang()+'|'+text;if(cache.has(k))return cache.get(k);
  const r=await desk.translate(text,lang());
  if(r&&r.ok){cache.set(k,r);if(cache.size>400)cache.delete(cache.keys().next().value)}
  return r;
}
function place(rect){
  const sr=st.getBoundingClientRect();tip.style.display='block';tip.style.maxWidth=Math.min(420,sr.width-24)+'px';
  const tw=tip.offsetWidth,th=tip.offsetHeight;
  let x=rect.left+rect.width/2-sr.left-tw/2,y=rect.top-sr.top-th-10;
  if(y<8)y=rect.bottom-sr.top+10;
  y=Math.max(8,Math.min(y,sr.height-th-8)); /* a tall card always stays inside the player */
  x=Math.max(8,Math.min(sr.width-tw-8,x));tip.style.left=x+'px';tip.style.top=y+'px';
}
function searchURL(q){
  const E=window.TR_ENGINES||[['google','','https://www.google.com/search?q={q}']],e=E.find(x=>x[0]===S.trEngine)||E[0];
  let u=e[0]==='custom'?(S.trUrl||'https://www.google.com/search?q={q}'):e[2];
  if(!/\{q\}/.test(u))u+=encodeURIComponent(q);
  return u.replace(/\{q\}/g,encodeURIComponent(q)).replace(/\{lang\}/g,encodeURIComponent(lang()));
}
const webSearch=q=>{q=String(q||'').trim();if(q)window.open(searchURL(q),'_blank')}; /* main.js hands http(s) links to the default browser */
const mk=(t,c,x,p)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;if(p)p.append(e);return e};
const chips=(words,cls,p)=>{const w=mk('div','chips',null,p);words.forEach(x=>mk('span','chip'+(cls?' '+cls:''),x,w));return w};
function copyText(t){try{navigator.clipboard.writeText(t).catch(()=>fb())}catch(_){fb()}
  function fb(){const a=document.createElement('textarea');a.value=t;a.style.cssText='position:fixed;left:-999px;top:0';document.body.append(a);a.select();try{document.execCommand('copy')}catch(_){}a.remove()}}
const shortPhrase=t=>t.trim().split(/\s+/).length<=3;
/* dictionary part of the card (any language): definitions, synonyms, antonyms of the word in its own language */
async function fillEn(box,src,sl,my,rect){
  mk('div','trh','Loading definitions…',box);
  let r=null;try{r=await desk.dictLookup(src,sl)}catch(_){}
  if(my!==tok)return;box.textContent='';
  if(!r||!r.ok){mk('div','trh',(r&&r.error)||'No dictionary entry found.',box);place(rect);return}
  if(r.phon)mk('div','ph',r.phon,box);
  r.meanings.forEach(m=>{
    const g=mk('div','trk',null,box);mk('div','pos',m.pos,g);
    m.defs.slice(0,2).forEach((d,i)=>{const e=mk('div','def',(m.defs.length>1?(i+1)+'. ':'')+d.d,g);if(d.ex)mk('i',null,'“'+d.ex+'”',e)});
    if(m.syn.length){mk('div','lab','Synonyms',g);chips(m.syn,'',g)}
    if(m.ant.length){mk('div','lab','Antonyms',g);chips(m.ant,'an',g)}
  });
  place(rect);
}
function paint(src,r,rect,single,pin){
  const my=tok;
  tip.textContent='';tip.classList.toggle('pin',!!pin);
  const add=(c,t,p)=>mk('div',c,t,p||tip);
  if(pin){const x=mk('button','trx','×');x.title='Close (Esc)';x.onclick=hideNow;tip.append(x)}
  const sl=r&&r.ok&&r.sl&&r.sl!=='auto'?r.sl:'en';
  const enEn=!!(r&&r.ok&&sl.split('-')[0]===lang().split('-')[0]); /* same language both sides: no translation, only the dictionary */
  const defOk=pin&&S.trDic===true&&shortPhrase(src)&&r&&r.ok;
  if(!r||!r.ok){add('trh','Meaning');add('tre',(r&&r.error)||'Could not translate. Check your internet connection.')}
  else{
    add('trs',src.length>140?src.slice(0,140)+'…':src);
    if(!(pin&&enEn&&defOk))add('trm',r.text||'—');
    else add('trm',src);
    if(pin&&!enEn&&r.dict2&&r.dict2.length&&single){
      /* translations with the English words they stand for, like Google Translate's dictionary */
      const g=add('trk','');
      r.dict2.slice(0,4).forEach(grp=>{add('pos',grp[0],g);
        grp[1].slice(0,5).forEach(en=>{const row=add('trt','',g);mk('b',null,en[0],row);if(en[1].length)chips(en[1].slice(0,6),'',row)})});
    }else{
      const rows=(single&&r.dict)?r.dict.slice(0,3):[];
      rows.forEach(d=>{const row=add('trd','');const b=mk('b',null,d[0]);row.append(b,' '+d[1].slice(0,5).join(', '))});
    }
    add('trh',enEn?lname(lang()).replace(/ \(.*/,'')+' → '+lname(lang()).replace(/ \(.*/,''):(r.sl&&r.sl!=='auto'&&r.sl!==lang()?lname(r.sl).replace(/ \(.*/,'')+' → ':'')+lname(lang()));
    if(defOk){add('trw',lname(sl).replace(/ \(.*/,'')+' dictionary');fillEn(add('trdf',''),src,sl,my,rect)}
  }
  if(pin){
    const a=add('tra','');
    const b1=mk('button',null,'Search in browser');b1.onclick=()=>webSearch(src);
    const b2=mk('button',null,'Copy');b2.onclick=()=>{copyText(src);b2.textContent='Copied ✓';setTimeout(()=>{b2.textContent='Copy'},1200)};
    a.append(b1,b2);
  }
  place(rect);
}
function hideNow(){pinned=false;tip.classList.remove('pin');clearTimeout(hoverT);clearTimeout(hideT);tok++;tip.style.display='none';
  words.forEach(w=>w.classList.remove('sel','hov'));
  if(paused){paused=false;v.play().catch(()=>{})}}
window.trHide=()=>{if(!pinned)hideNow()}; /* a card opened with a click stays while subtitles change */
async function show(src,els,single,pin){
  const my=++tok;
  const a=els[0].getBoundingClientRect(),b=els[els.length-1].getBoundingClientRect(),
    rect={left:Math.min(a.left,b.left),right:Math.max(a.right,b.right),top:Math.min(a.top,b.top),bottom:Math.max(a.bottom,b.bottom)};rect.width=rect.right-rect.left;
  pinned=!!pin;tip.classList.toggle('pin',!!pin);
  if(S.trPause&&!v.paused){v.pause();paused=true}
  if(!cache.has(lang()+'|'+src)){tip.textContent='';const d=document.createElement('div');d.className='trh';d.textContent='Translating…';tip.append(d);place(rect)}
  const r=await ask(src);if(my!==tok)return;paint(src,r,rect,single,pin);
}

['pointerdown','pointerup','mousedown','mouseup','click','dblclick','auxclick','contextmenu','wheel'].forEach(t=>tip.addEventListener(t,e=>{e.stopPropagation()}));
const wOf=e=>e.target.closest&&e.target.closest('nx-w');
/* hover → one word */
subEl.addEventListener('mouseover',e=>{
  const w=wOf(e);if(!w||drag||pinned||S.trHover===false)return;
  clearTimeout(hideT);clearTimeout(hoverT);
  hoverT=setTimeout(()=>{words.forEach(x=>x.classList.remove('hov'));w.classList.add('hov');show(w.textContent.replace(/^[-'’]+|[-'’]+$/g,''),[w],true)},S.trDelay??250);
});
subEl.addEventListener('mouseout',e=>{
  if(drag||pinned||!wOf(e))return;
  clearTimeout(hoverT);clearTimeout(hideT);hideT=setTimeout(()=>{if(!drag)hideNow()},120);
});
/* hold left or right button and drag → several words */
const sel=(a,b)=>{const i=Math.min(a,b),j=Math.max(a,b);words.forEach((w,k)=>w.classList.toggle('sel',k>=i&&k<=j));return[i,j]};
subEl.addEventListener('pointerdown',e=>{
  const w=wOf(e);if(!w)return;
  e.stopPropagation();if(e.button>2||e.button===1)return;
  e.preventDefault();clearTimeout(hoverT);if(pinned)hideNow();tok++;tip.style.display='none';words.forEach(x=>x.classList.remove('hov'));
  const i=words.indexOf(w);drag={a:i,b:i,btn:e.button};sel(i,i);
});
subEl.addEventListener('mouseover',e=>{const w=wOf(e);if(!drag||!w)return;drag.b=words.indexOf(w);sel(drag.a,drag.b)});
const end=e=>{
  if(!drag)return;const d=drag;drag=null;
  const w=e.target.closest&&e.target.closest('nx-w');if(w)d.b=words.indexOf(w);
  let [i,j]=sel(d.a,d.b);
  if(S.trSel===false&&i!==j){i=j=d.a;sel(i,i)}
  const els=words.slice(i,j+1);if(!els.length)return;
  const txt=els.map(x=>x.textContent).join(' ').replace(/\s+/g,' ').trim().replace(/^[-'’]+|[-'’]+$/g,'');
  const act=d.btn===2?(S.trRight||'pin'):(S.trLeft||'search');
  if(act==='search'){webSearch(txt);words.forEach(x=>x.classList.remove('sel'));return}
  if(act==='pin'){show(txt,els,els.length===1,true);return}
  words.forEach(x=>x.classList.remove('sel'));
};
document.addEventListener('pointerup',end,true);
['pointerup','mouseup','click','dblclick','auxclick','contextmenu'].forEach(t=>subEl.addEventListener(t,e=>{if(wOf(e)){e.stopPropagation();if(t==='contextmenu'||t==='auxclick')e.preventDefault()}}));
/* anything else closes the meaning */
document.addEventListener('pointerdown',e=>{if(!subEl.contains(e.target)&&!tip.contains(e.target))hideNow()},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&tip.style.display==='block'){hideNow();e.stopPropagation()}},true);
v.addEventListener('seeked',hideNow);
})();
