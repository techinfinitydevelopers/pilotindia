import fs from 'node:fs';
import path from 'node:path';

// Second pass: catch URLs the Airlift optimizer hides inside inline JS (escaped "https:\/\/...")
// and any plain absolute URL the HTML pass missed. Download + rewrite to the flat assets/ tree.
const OUT = process.argv[2];
const CACHE = process.argv[3] || '';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const HOSTS = new Set(['pilotindia.com', 'www.pilotindia.com']);
const ASSET_HOSTS = new Set(['use.fontawesome.com', 'fonts.googleapis.com', 'fonts.gstatic.com',
  'cdnjs.cloudflare.com', 'maxcdn.bootstrapcdn.com', 'code.jquery.com', 'cdn.jsdelivr.net']);

// ---- rebuild the name registry from what is already on disk ----
const usedNames = new Set();
for (const d of ['assets/css', 'assets/js', 'assets/img', 'assets/fonts', 'assets/media']) {
  const dir = path.join(OUT, d);
  if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) usedNames.add(d + '/' + f);
}
// map original pathname -> existing local file (basename match), so we reuse pass-1 downloads
const byBase = new Map();
for (const k of usedNames) byBase.set(path.basename(k), k);

const slugify = (s) => s.replace(/[^a-z0-9-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase();
const EXT_DIR = { '.css': 'assets/css', '.js': 'assets/js', '.mjs': 'assets/js',
  '.woff': 'assets/fonts', '.woff2': 'assets/fonts', '.ttf': 'assets/fonts', '.eot': 'assets/fonts', '.otf': 'assets/fonts' };

function assetLocal(u) {
  const p = decodeURIComponent(u.pathname);
  let base = path.basename(p) || 'file';
  let ext = path.extname(base).toLowerCase();
  if (!ext) { ext = '.bin'; base += ext; }
  const dir = EXT_DIR[ext] || (/^(\.jpe?g|\.png|\.gif|\.svg|\.webp|\.avif|\.ico|\.bmp)$/i.test(ext) ? 'assets/img' : 'assets/media');
  const stem = slugify(base.slice(0, base.length - ext.length)) || 'file';
  let name = stem + ext, key = dir + '/' + name;
  if (usedNames.has(key)) {
    const parent = slugify(path.basename(path.dirname(p))) || 'x';
    name = stem + '-' + parent + ext; key = dir + '/' + name;
    let i = 2;
    while (usedNames.has(key)) { name = stem + '-' + parent + '-' + (i++) + ext; key = dir + '/' + name; }
  }
  usedNames.add(key);
  return key;
}

const resolved = new Map(); // origin+pathname -> local
const failed = [];
let fetched = 0, reused = 0;

async function fetchBuf(url, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*' }, redirect: 'follow' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) { last = e; if (i < tries - 1) await new Promise(r => setTimeout(r, 500 * (i + 1))); }
  }
  throw last;
}

function cacheRead(u) {
  if (!CACHE) return null;
  let rel = decodeURIComponent(u.pathname).replace(/^\/+/, '');
  if (!HOSTS.has(u.hostname)) rel = '_ext/' + u.hostname + '/' + rel;
  const fp = path.join(CACHE, rel.split('/').map(s => s.replace(/[<>:"|?*\\]/g, '_')).join(path.sep));
  try { return fs.statSync(fp).isFile() ? fs.readFileSync(fp) : null; } catch { return null; }
}

const CSS_URL_RE = /(?<![\w-])url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;

async function ensureAsset(absUrl) {
  const u = new URL(absUrl);
  u.hash = '';
  if (!HOSTS.has(u.hostname) && !ASSET_HOSTS.has(u.hostname)) return null;
  const key = u.origin.replace(/^http:/, 'https:') + u.pathname;
  if (resolved.has(key)) return resolved.get(key);

  // reuse a pass-1 file with the same basename when byte-identical name slot exists
  const base = path.basename(decodeURIComponent(u.pathname));
  const ext = path.extname(base).toLowerCase();
  const guessName = (slugify(base.slice(0, base.length - ext.length)) || 'file') + (ext || '.bin');
  const guessDir = EXT_DIR[ext] || (/^(\.jpe?g|\.png|\.gif|\.svg|\.webp|\.avif|\.ico|\.bmp)$/i.test(ext) ? 'assets/img' : 'assets/media');
  const guess = guessDir + '/' + guessName;
  if (fs.existsSync(path.join(OUT, guess))) { resolved.set(key, guess); reused++; return guess; }

  const local = assetLocal(u);
  try {
    let buf = /\.css$/i.test(u.pathname) ? null : cacheRead(u);
    if (!buf) { buf = await fetchBuf(u.origin + u.pathname + u.search); fetched++; }
    if (/\.css$/i.test(u.pathname)) {
      let css = buf.toString('utf8');
      const inner = [];
      css.replace(CSS_URL_RE, (m, q, raw) => { inner.push(raw.trim()); return m; });
      const map = new Map();
      for (const raw of inner) {
        if (!raw || raw.startsWith('data:') || raw.startsWith('#')) continue;
        let abs; try { abs = new URL(raw, u.href).href; } catch { continue; }
        const l = await ensureAsset(abs);
        if (l) map.set(raw, path.relative(path.dirname(local), l).split(path.sep).join('/'));
      }
      css = css.replace(CSS_URL_RE, (m, q, raw) => map.has(raw.trim()) ? 'url("' + map.get(raw.trim()) + '")' : m);
      buf = Buffer.from(css, 'utf8');
    }
    fs.mkdirSync(path.dirname(path.join(OUT, local)), { recursive: true });
    fs.writeFileSync(path.join(OUT, local), buf);
    resolved.set(key, local);
    return local;
  } catch (e) {
    failed.push([u.href, String(e.message)]);
    usedNames.delete(local);
    return null;
  }
}

// page path map, rebuilt from disk
const pageMap = new Map(); // "/slug/" -> local
function indexPages() {
  const walk = (d, pre) => {
    for (const f of fs.readdirSync(path.join(OUT, d), { withFileTypes: true })) {
      if (f.isDirectory()) continue;
      if (!f.name.endsWith('.html')) continue;
      pageMap.set(pre + f.name.replace(/\.html$/, ''), (d ? d + '/' : '') + f.name);
    }
  };
  walk('', '');
  for (const d of ['pages', 'blog', 'category']) if (fs.existsSync(path.join(OUT, d))) walk(d, '');
}

const HTML_FILES = [];
(function collect(d) {
  for (const f of fs.readdirSync(path.join(OUT, d || '.'), { withFileTypes: true })) {
    const rel = d ? d + '/' + f.name : f.name;
    if (f.isDirectory()) { if (!rel.startsWith('assets')) collect(rel); }
    else if (f.name.endsWith('.html')) HTML_FILES.push(rel);
  }
})('');

// matches https://host/... and https:\/\/host\/... (JSON-escaped)
const ABS_RE = /(https?:(?:\\\/\\\/|\/\/)(?:www\.)?(?:pilotindia\.com|use\.fontawesome\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)(?:\\\/|\/)[^\s"'`<>)\]}]*)/g;

function unescapeUrl(s) { return s.replace(/\\\//g, '/'); }

async function fixFile(rel) {
  let html = fs.readFileSync(path.join(OUT, rel), 'utf8');
  const hits = [...new Set(html.match(ABS_RE) || [])];
  if (!hits.length) return 0;
  let n = 0;
  for (const hit of hits) {
    const escaped = hit.includes('\\/');
    let clean = unescapeUrl(hit).replace(/&#0?38;/g, '&').replace(/&amp;/g, '&');
    let u; try { u = new URL(clean); } catch { continue; }
    if (!HOSTS.has(u.hostname) && !ASSET_HOSTS.has(u.hostname)) continue;
    // skip canonical/og page urls (no file extension, our host) -> map to local page if known
    const isAsset = /\.[a-z0-9]{2,5}(\?|$)/i.test(u.pathname) && !/\.php$/i.test(u.pathname);
    let localTarget = null;
    if (isAsset) {
      localTarget = await ensureAsset(u.origin + u.pathname + u.search);
    } else {
      const slug = u.pathname.replace(/^\/+|\/+$/g, '').split('/').join('-');
      if (slug === '') localTarget = 'index.html';
      else localTarget = pageMap.get(slug) || null;
    }
    if (!localTarget) continue;
    let out = path.relative(path.dirname(rel), localTarget).split(path.sep).join('/');
    if (escaped) out = out.replace(/\//g, '\\/');
    html = html.split(hit).join(out);
    n++;
  }
  fs.writeFileSync(path.join(OUT, rel), html, 'utf8');
  return n;
}

async function main() {
  indexPages();
  let total = 0;
  for (const f of HTML_FILES) {
    const n = await fixFile(f);
    total += n;
    if (n) console.log(n + '  ' + f);
  }
  console.log('\nrewrites: ' + total + '  fetched: ' + fetched + '  reused: ' + reused + '  failed: ' + failed.length);
  if (failed.length) console.log(JSON.stringify(failed.slice(0, 20), null, 1));
}
main();
