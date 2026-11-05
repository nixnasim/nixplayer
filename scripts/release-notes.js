// Writes release-notes.md = the CHANGELOG.md section of the version in package.json.
// Used by .github/workflows/release.yml, so the GitHub Release, the "update available" box and latest.yml carry the notes.
const fs=require('fs');
const ver=require('../package.json').version;
const md=fs.readFileSync(require('path').join(__dirname,'..','CHANGELOG.md'),'utf8');
const lines=md.split(/\r?\n/);
const start=lines.findIndex(l=>new RegExp('^##\\s*\\[?'+ver.replace(/\./g,'\\.')+'\\]?(\\s|$)').test(l));
let out='';
if(start>=0){
  let end=lines.findIndex((l,i)=>i>start&&/^##\s/.test(l));if(end<0)end=lines.length;
  out=lines.slice(start+1,end).join('\n').trim();
}
if(!out)out='NixPlayer '+ver;
fs.writeFileSync(require('path').join(__dirname,'..','release-notes.md'),out+'\n');
console.log('release-notes.md for '+ver+':\n'+out);
