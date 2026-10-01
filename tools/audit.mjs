// Honest completeness audit of the clone.
//  - walks the link graph from the home page, so it reports what a visitor can actually reach
//  - checks every image / stylesheet / script reference against the files on disk
//  - reports per-site coverage, unreachable pages, and missing media
//
//   node tools/audit.mjs [siteDir]
import fs from 'node:fs';
import path from 'node:path';

const CLONE = process.argv[2] || path.join(process.cwd(), 'pilotindia-clone');

const SITES = [
  { key: 'main (pilotindia)', root: '' },
  { key: 'spray-guns', root: 'spray-guns' },
  { key: 'airless', root: 'airless' },
  { key: 'welding', root: 'welding' },
  { key: 'office', root: 'office' },
];
const siteOf = (rel) => {
  const m = rel.match(/^(spray-guns|airless|welding|office)\//);
  return m ? m[1] : 'main (pilotindia)';
};

// every html file that exists on disk
const onDisk = [];
(function walk(d) {
  for (const f of fs.readdirSync(path.join(CLONE, d || '.'), { withFileTypes: true })) {
    const rel = d ? d + '/' + f.name : f.name;
    if (f.isDirectory()) { if (!/(^|\/)assets$/.test(rel)) walk(rel); }
    else if (f.name.endsWith('.html')) onDisk.push(rel);
  }
})('');
const diskSet = new Set(onDisk);

const HREF = /<a\b[^>]*?\bhref\s*=\s*(["'])([^"']+)\1/gi;
const IMG = /<img\b[^>]*?\bsrc\s*=\s*(["'])([^"']+)\1/gi;
const SRCSET = /\b(?:srcset|data-srcset)\s*=\s*(["'])([^"']+)\1/gi;
const CSSLINK = /<link\b[^>]*?\bhref\s*=\s*(["'])([^"']+)\1[^>]*>/gi;
const SCRIPT = /<script\b[^>]*?\bsrc\s*=\s*(["'])([^"']+)\1/gi;
const BGURL = /(?<![\w-])url\(\s*["']?([^"')]+)["']?\s*\)/gi;

const isLocal = (u) => u && !/^(https?:|data:|mailto:|tel:|javascript:|#|\/\/)/i.test(u.trim());
const clean = (u) => u.split('#')[0].split('?')[0].trim();

function resolve(fromRel, ref) {
  return path.normalize(path.join(path.dirname(fromRel), decodeURIComponent(ref)))
    .split(path.sep).join('/');
}

// ---- 1. link-graph walk from the home page ----
const reached = new Set(['index.html']);
const queue = ['index.html'];
const deadLinks = new Map();   // target -> count

while (queue.length) {
  const rel = queue.shift();
  let html;
  try { html = fs.readFileSync(path.join(CLONE, rel), 'utf8'); } catch { continue; }
  let m;
  HREF.lastIndex = 0;
  while ((m = HREF.exec(html))) {
    const raw = m[2];
    if (!isLocal(raw)) continue;
    const c = clean(raw);
    if (!c || !/\.html?$/i.test(c)) continue;
    const tgt = resolve(rel, c);
    if (diskSet.has(tgt)) {
      if (!reached.has(tgt)) { reached.add(tgt); queue.push(tgt); }
    } else {
      deadLinks.set(tgt, (deadLinks.get(tgt) || 0) + 1);
    }
  }
}

// ---- 2. media / asset references ----
const stats = {};
for (const s of SITES) stats[s.key] = { pages: 0, reached: 0, imgRefs: 0, imgMissing: 0, cssJsMissing: 0, missingList: new Map() };

for (const rel of onDisk) {
  const k = siteOf(rel);
  const st = stats[k];
  st.pages++;
  if (reached.has(rel)) st.reached++;
  const html = fs.readFileSync(path.join(CLONE, rel), 'utf8');

  const checkAsset = (raw, kind) => {
    if (!isLocal(raw)) return;
    const c = clean(raw);
    if (!c) return;
    const tgt = resolve(rel, c);
    if (kind === 'img') st.imgRefs++;
    if (!fs.existsSync(path.join(CLONE, tgt))) {
      if (kind === 'img') st.imgMissing++; else st.cssJsMissing++;
      st.missingList.set(tgt, (st.missingList.get(tgt) || 0) + 1);
    }
  };

  let m;
  IMG.lastIndex = 0; while ((m = IMG.exec(html))) checkAsset(m[2], 'img');
  SRCSET.lastIndex = 0;
  while ((m = SRCSET.exec(html))) for (const part of m[2].split(',')) checkAsset(part.trim().split(/\s+/)[0], 'img');
  CSSLINK.lastIndex = 0; while ((m = CSSLINK.exec(html))) if (/stylesheet/i.test(m[0])) checkAsset(m[2], 'css');
  SCRIPT.lastIndex = 0; while ((m = SCRIPT.exec(html))) checkAsset(m[2], 'js');
  BGURL.lastIndex = 0; while ((m = BGURL.exec(html))) {
    const v = m[1];
    if (/\.(jpe?g|png|gif|svg|webp|avif)$/i.test(clean(v))) checkAsset(v, 'img');
  }
}

// ---- report ----
console.log('PAGE COVERAGE  (reachable = you can click to it starting from the home page)\n');
console.log('site'.padEnd(20) + 'pages'.padStart(7) + 'reachable'.padStart(11) + 'orphaned'.padStart(10));
let tp = 0, tr = 0;
for (const s of SITES) {
  const st = stats[s.key];
  tp += st.pages; tr += st.reached;
  console.log(s.key.padEnd(20) + String(st.pages).padStart(7) + String(st.reached).padStart(11) + String(st.pages - st.reached).padStart(10));
}
console.log('-'.repeat(48));
console.log('TOTAL'.padEnd(20) + String(tp).padStart(7) + String(tr).padStart(11) + String(tp - tr).padStart(10));

console.log('\n\nIMAGES\n');
console.log('site'.padEnd(20) + 'img refs'.padStart(10) + 'missing'.padStart(9) + '   present');
for (const s of SITES) {
  const st = stats[s.key];
  const pct = st.imgRefs ? (100 * (st.imgRefs - st.imgMissing) / st.imgRefs).toFixed(1) : '100.0';
  console.log(s.key.padEnd(20) + String(st.imgRefs).padStart(10) + String(st.imgMissing).padStart(9) + '   ' + pct + '%');
}

console.log('\n\nBROKEN INTERNAL PAGE LINKS: ' + deadLinks.size + ' distinct');
[...deadLinks.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
  .forEach(([k, v]) => console.log('  ' + String(v).padStart(4) + '  ' + k));

console.log('\nTOP MISSING MEDIA (per site)');
for (const s of SITES) {
  const st = stats[s.key];
  if (!st.missingList.size) { console.log('  ' + s.key + ': none'); continue; }
  const top = [...st.missingList.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  console.log('  ' + s.key + ': ' + st.missingList.size + ' distinct');
  top.forEach(([k, v]) => console.log('      ' + String(v).padStart(4) + '  ' + k.replace(/^(spray-guns|airless|welding|office)\//, '')));
}
