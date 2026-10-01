// Rewrites every remaining absolute Pilot-domain URL, across the main clone and all
// mirrored satellite sites, to a relative path inside the clone. This is what stops
// "Spray Guns" (and every other cross-site link) from leaving localhost.
//
// Mapping inverts the mirror's own pageLocal() rule, so it is recomputed from the URL
// rather than stored: a path resolves to pages/<slug>.html, blog/<slug>.html,
// category/<slug>.html or index.html, whichever exists on disk; otherwise it falls back
// to that site's home page.
//
//   node tools/crosslink.mjs [siteDir]
import fs from 'node:fs';
import path from 'node:path';

const CLONE = process.argv[2] || path.join(process.cwd(), 'pilotindia-clone');

// host -> mirror root, relative to the clone root
const ROOTS = [
  { hosts: ['pilotindia.com', 'www.pilotindia.com'], root: '' },
  { hosts: ['pilotsprayguns.com', 'www.pilotsprayguns.com'], root: 'spray-guns' },
  { hosts: ['pilotairless.com', 'www.pilotairless.com'], root: 'airless' },
  { hosts: ['pilotwelding.com', 'www.pilotwelding.com'], root: 'welding' },
  { hosts: ['pilotofficeproducts.com', 'www.pilotofficeproducts.com'], root: 'office' },
];
const HOST_ROOT = new Map();
for (const r of ROOTS) for (const h of r.hosts) HOST_ROOT.set(h, r.root);

const slugify = (s) => s.replace(/[^a-z0-9-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase();
const joinRoot = (root, rel) => (root ? root + '/' : '') + rel;
const has = (rel) => fs.existsSync(path.join(CLONE, rel));

// original pathname on host -> local file in the clone (or null)
const resolveCache = new Map();
function resolveTarget(host, pathname) {
  const key = host + pathname;
  if (resolveCache.has(key)) return resolveCache.get(key);
  const root = HOST_ROOT.get(host);
  let out = null;
  if (root !== undefined) {
    const p = decodeURIComponent(pathname).replace(/^\/+|\/+$/g, '');
    const seg = p.split('/').filter(Boolean);
    const cands = [];
    if (seg.length === 0) {
      cands.push(joinRoot(root, 'index.html'));
    } else if (seg[0] === 'category') {
      const pg = (seg[2] === 'page' && seg[3]) ? '-page-' + seg[3] : '';
      cands.push(joinRoot(root, 'category/' + slugify(seg[1] || 'index') + pg + '.html'));
    } else if (seg[0] === 'author') {
      const pg = (seg[2] === 'page' && seg[3]) ? '-page-' + seg[3] : '';
      cands.push(joinRoot(root, 'pages/author-' + slugify(seg[1]) + pg + '.html'));
    } else {
      const s = slugify(seg.join('-'));
      cands.push(joinRoot(root, 'pages/' + s + '.html'), joinRoot(root, 'blog/' + s + '.html'));
    }
    // a satellite link we did not mirror still lands on that site's home page,
    // never back out to the public internet
    cands.push(joinRoot(root, 'index.html'));
    out = cands.find(has) || null;
  }
  resolveCache.set(key, out);
  return out;
}

const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(path.join(CLONE, d || '.'), { withFileTypes: true })) {
    const rel = d ? d + '/' + f.name : f.name;
    if (f.isDirectory()) { if (!/(^|\/)assets$/.test(rel)) walk(rel); }
    else if (f.name.endsWith('.html')) files.push(rel);
  }
})('');

const HOST_ALT = [...HOST_ROOT.keys()].map(h => h.replace(/\./g, '\\.')).join('|');
// matches https://host/... and the JSON-escaped https:\/\/host\/... form Airlift emits
const ABS_RE = new RegExp('(https?:(?:\\\\/\\\\/|//)(?:' + HOST_ALT + ')(?:(?:\\\\/|/)[^\\s"\'`<>)\\]}]*)?)', 'g');

let changedFiles = 0, rewrites = 0, skippedAssets = 0;

for (const rel of files) {
  const fp = path.join(CLONE, rel);
  let html = fs.readFileSync(fp, 'utf8');
  // longest first: a bare "https://pilotindia.com" must not be substituted inside
  // "https://pilotindia.com/power-tools/" and truncate it
  const hits = [...new Set(html.match(ABS_RE) || [])].sort((a, b) => b.length - a.length);
  if (!hits.length) continue;
  let n = 0;

  for (const hit of hits) {
    const escaped = hit.includes('\\/');
    const clean = hit.replace(/\\\//g, '/').replace(/&#0?38;/g, '&').replace(/&amp;/g, '&');
    let u; try { u = new URL(clean); } catch { continue; }
    if (!HOST_ROOT.has(u.hostname)) continue;

    // leave asset paths alone: those were localised during each site's own crawl,
    // and anything still absolute here is a file that site does not actually serve
    if (/^\/(wp-content|wp-includes|wp-admin|wp-json)/.test(u.pathname) ||
        /\.(jpe?g|png|gif|svg|webp|avif|ico|css|js|json|xml|zip|woff2?|ttf|eot|mp4|webm|mp3|php)$/i.test(u.pathname)) {
      skippedAssets++;
      continue;
    }
    if (u.search) continue;

    const target = resolveTarget(u.hostname, u.pathname);
    if (!target) continue;

    let out = path.relative(path.dirname(rel), target).split(path.sep).join('/') || './';
    if (escaped) out = out.replace(/\//g, '\\/');
    html = html.split(hit).join(out);
    n++;
  }

  if (n) { fs.writeFileSync(fp, html, 'utf8'); changedFiles++; rewrites += n; }
}

console.log('files scanned: ' + files.length);
console.log('files changed: ' + changedFiles + '  cross-site links rewritten: ' + rewrites);
console.log('absolute asset URLs left alone: ' + skippedAssets);
