import fs from 'node:fs'; import path from 'node:path';
const OUT = process.argv[2];
const files = [];
(function w(d){for(const f of fs.readdirSync(path.join(OUT,d||'.'),{withFileTypes:true})){const r=d?d+'/'+f.name:f.name;
 if(f.isDirectory()){if(!r.startsWith('assets'))w(r);}else if(f.name.endsWith('.html'))files.push(r);}})('');
const missing=new Map(); let checked=0;
const RE=/\b(?:href|src|data-src|data-lazy-src|poster)\s*=\s*(["'])([^"']+)\1/gi;
const CSSRE=/url\(\s*["']?([^"')]+)["']?\s*\)/gi;
for(const f of files){
  const h=fs.readFileSync(path.join(OUT,f),'utf8');
  const cands=[];
  let m; RE.lastIndex=0; while((m=RE.exec(h))) cands.push(m[2]);
  CSSRE.lastIndex=0; while((m=CSSRE.exec(h))) cands.push(m[1]);
  for(let c of cands){
    c=c.trim();
    if(!c||/^(data:|#|https?:|\/\/|mailto:|tel:|javascript:)/i.test(c)) continue;
    c=c.split('#')[0].split('?')[0]; if(!c) continue;
    checked++;
    const tgt=path.normalize(path.join(path.dirname(path.join(OUT,f)),decodeURIComponent(c)));
    if(!fs.existsSync(tgt)) missing.set(c,(missing.get(c)||0)+1);
  }
}
// also check css files
const cssdir=path.join(OUT,'assets/css');
for(const cf of fs.readdirSync(cssdir)){ if(!cf.endsWith('.css'))continue;
  const t=fs.readFileSync(path.join(cssdir,cf),'utf8'); let m; const R=/url\(\s*["']?([^"')]+)["']?\s*\)/gi;
  while((m=R.exec(t))){ let c=m[1].trim(); if(!c||/^(data:|#|https?:|\/\/)/i.test(c))continue; c=c.split('#')[0].split('?')[0]; if(!c)continue; checked++;
    if(!fs.existsSync(path.normalize(path.join(cssdir,decodeURIComponent(c))))) missing.set('css:'+c,(missing.get('css:'+c)||0)+1); } }
console.log('html files',files.length,'refs checked',checked,'missing distinct',missing.size);
[...missing.entries()].sort((a,b)=>b[1]-a[1]).slice(0,25).forEach(([k,v])=>console.log(v+'  '+k));
