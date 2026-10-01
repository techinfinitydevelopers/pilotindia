// One-off repair for links damaged by the first crosslink run, which replaced the bare
// "https://pilotindia.com/" before the longer URLs that contain it and so left the tail
// of those URLs dangling, e.g.  href="../../../index.htmlpower-tools/".
//
// Also retargets the "/?page_id=N" home links that the satellite crawls filed away as
// extensionless assets (assets/media/file*.bin) back to that site's home page.
//
//   node tools/repair-links.mjs [siteDir]
import fs from 'node:fs';
import path from 'node:path';

const CLONE = process.argv[2] || path.join(process.cwd(), 'pilotindia-clone');
const slugify = (s) => s.replace(/[^a-z0-9-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase();
const has = (rel) => fs.existsSync(path.join(CLONE, rel));

// resolve a pilotindia.com pathname to a file relative to the clone root
function resolveMain(rest) {
  const p = decodeURIComponent(rest).replace(/^\/+|\/+$/g, '');
  const seg = p.split('/').filter(Boolean);
  if (!seg.length) return 'index.html';
  const cands = [];
  if (seg[0] === 'category') {
    const pg = (seg[2] === 'page' && seg[3]) ? '-page-' + seg[3] : '';
    cands.push('category/' + slugify(seg[1] || 'index') + pg + '.html');
  } else {
    const full = slugify(seg.join('-'));
    const last = slugify(seg[seg.length - 1]);
    cands.push('pages/' + full + '.html', 'blog/' + full + '.html',
               'pages/' + last + '.html', 'blog/' + last + '.html');
  }
  cands.push('index.html');
  return cands.find(has) || 'index.html';
}

const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(path.join(CLONE, d || '.'), { withFileTypes: true })) {
    const rel = d ? d + '/' + f.name : f.name;
    if (f.isDirectory()) { if (!/(^|\/)assets$/.test(rel)) walk(rel); }
    else if (f.name.endsWith('.html')) files.push(rel);
  }
})('');

// a real link ends at index.html; anything glued on after it is the damaged tail
const DANGLING = /((?:\.\.\/)*)index\.html([A-Za-z0-9][^"'\s<>)]*)/g;
const FILEBIN = /((?:\.\.\/)*)assets\/media\/file[^"'\s<>)]*\.bin/g;

let changed = 0, fixedTails = 0, fixedHome = 0;

for (const rel of files) {
  const fp = path.join(CLONE, rel);
  let html = fs.readFileSync(fp, 'utf8');
  const before = html;

  html = html.replace(DANGLING, (m, up, tail) => {
    const target = resolveMain(tail);
    fixedTails++;
    return up + target;
  });

  // site root for this file: sites/<slug> or the clone root
  const m = rel.match(/^sites\/([^/]+)\//);
  const siteRoot = m ? 'sites/' + m[1] : '';
  const homeRel = path.relative(path.dirname(rel), (siteRoot ? siteRoot + '/' : '') + 'index.html')
    .split(path.sep).join('/') || 'index.html';
  html = html.replace(FILEBIN, () => { fixedHome++; return homeRel; });

  if (html !== before) { fs.writeFileSync(fp, html, 'utf8'); changed++; }
}

console.log('files changed: ' + changed);
console.log('dangling tails repaired: ' + fixedTails);
console.log('home links retargeted: ' + fixedHome);
