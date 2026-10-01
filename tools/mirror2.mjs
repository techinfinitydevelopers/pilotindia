import fs from 'node:fs';
import path from 'node:path';

// Flat-layout mirror: index.html + pages/ + blog/ + category/ + assets/{css,js,img,fonts}
const OUT = process.argv[2];
const CACHE = process.argv[3] || '';   // previous deep mirror, used as a binary asset cache
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const HOSTS = new Set(['pilotindia.com', 'www.pilotindia.com']);
const ASSET_HOSTS = new Set(['use.fontawesome.com', 'fonts.googleapis.com', 'fonts.gstatic.com',
  'cdnjs.cloudflare.com', 'maxcdn.bootstrapcdn.com', 'code.jquery.com', 'cdn.jsdelivr.net']);

const sm = (f) => {
  try {
    return new Set(fs.readFileSync(f, 'utf8').split('>').join('>\n').split('\n')
      .map(s => (s.match(/https:\/\/pilotindia\.com[^<\s]*/) || [])[0]).filter(Boolean)
      .map(u => new URL(u).pathname));
  } catch { return new Set(); }
};
const PAGE_PATHS = sm('./page.xml');
const POST_PATHS = sm('./post.xml');

const pageQueue = [];
const pageSeen = new Set();
const assetSeen = new Map();   // origin+pathname -> local
const usedNames = new Set();
const assetQueue = [];
const failed = [];
let done = 0;

const norm = (u) => { try { const x = new URL(u); x.hash = ''; return x; } catch { return null; } };

function isPageUrl(u) {
  if (!HOSTS.has(u.hostname)) return false;
  const p = u.pathname;
  if (/^\/(wp-content|wp-includes|wp-admin|wp-json|tag|xmlrpc)/.test(p)) return false;
  if (/\.(jpe?g|png|gif|svg|webp|avif|ico|css|js|json|xml|pdf|zip|woff2?|ttf|eot|mp4|webm|mp3|php)$/i.test(p)) return false;
  if (/\/feed\/?$/.test(p) || /_wp_link_placeholder/.test(p) || /\/category\/images/.test(p)) return false;
  if (u.search) return false;
  return true;
}

const slugify = (s) => s.replace(/[^a-z0-9-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase();

// -------- page -> flat local path --------
function pageLocal(u) {
  const p = decodeURIComponent(u.pathname).replace(/^\/+|\/+$/g, '');
  if (p === '') return 'index.html';
  const seg = p.split('/');
  if (seg[0] === 'category') {
    // category/<slug>[/page/N]
    const slug = slugify(seg[1] || 'index');
    const pg = (seg[2] === 'page' && seg[3]) ? '-page-' + seg[3] : '';
    return 'category/' + slug + pg + '.html';
  }
  if (seg[0] === 'page' && seg[1]) return 'blog/index-page-' + seg[1] + '.html';
  if (seg[0] === 'author') {
    const pg = (seg[2] === 'page' && seg[3]) ? '-page-' + seg[3] : '';
    return 'pages/author-' + slugify(seg[1] || 'x') + pg + '.html';
  }
  const slug = slugify(seg.join('-'));
  const isPage = PAGE_PATHS.has(u.pathname) || PAGE_PATHS.has(u.pathname + '/');
  return (isPage ? 'pages/' : 'blog/') + slug + '.html';
}

// -------- asset -> flat local path --------
const EXT_DIR = {
  '.css': 'assets/css', '.js': 'assets/js',
  '.woff': 'assets/fonts', '.woff2': 'assets/fonts', '.ttf': 'assets/fonts', '.eot': 'assets/fonts', '.otf': 'assets/fonts',
};
function assetLocal(u) {
  const p = decodeURIComponent(u.pathname);
  let base = path.basename(p) || 'file';
  let ext = path.extname(base).toLowerCase();
  if (!ext) {
    // extensionless stylesheet endpoints, e.g. fonts.googleapis.com/css?family=Open+Sans
    if (u.hostname === 'fonts.googleapis.com' || /\/css2?$/.test(u.pathname)) {
      ext = '.css';
      const fam = (u.searchParams.get('family') || '').split(':')[0];
      base = (fam ? 'google-fonts-' + fam : base) + ext;
    } else { ext = '.bin'; base += ext; }
  }
  const dir = EXT_DIR[ext] || (/(\.jpe?g|\.png|\.gif|\.svg|\.webp|\.avif|\.ico|\.bmp)$/i.test(ext) ? 'assets/img' : 'assets/media');
  let stem = slugify(base.slice(0, base.length - ext.length)) || 'file';
  let name = stem + ext;
  let key = dir + '/' + name;
  if (usedNames.has(key)) {
    const parent = slugify(path.basename(path.dirname(p))) || 'x';
    name = stem + '-' + parent + ext;
    key = dir + '/' + name;
    let i = 2;
    while (usedNames.has(key)) { name = stem + '-' + parent + '-' + (i++) + ext; key = dir + '/' + name; }
  }
  usedNames.add(key);
  return key;
}

const relFrom = (from, to) => {
  const r = path.relative(path.dirname(from), to).split(path.sep).join('/');
  return r === '' ? './' : r;
};

async function fetchBuf(url, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*' }, redirect: 'follow' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return { buf: Buffer.from(await res.arrayBuffer()), type: res.headers.get('content-type') || '' };
    } catch (e) { last = e; if (i < tries - 1) await new Promise(r => setTimeout(r, 600 * (i + 1))); }
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

const save = (local, buf) => {
  const fp = path.join(OUT, local);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, buf);
};
const exists = (local) => fs.existsSync(path.join(OUT, local));

function queueAsset(absUrl) {
  const u = norm(absUrl);
  if (!u || !/^https?:$/.test(u.protocol)) return null;
  if (!HOSTS.has(u.hostname) && !ASSET_HOSTS.has(u.hostname)) return null;
  // extensionless endpoints (google fonts) are distinguished by query string
  const key = u.origin + u.pathname + (path.extname(u.pathname) ? '' : u.search);
  if (assetSeen.has(key)) return assetSeen.get(key);
  const local = assetLocal(u);
  assetSeen.set(key, local);
  assetQueue.push({ url: u.origin + u.pathname + u.search, local, u });
  return local;
}

// (?<![\w-]) so JS identifiers ending in "url(" are not mistaken for CSS url()
const CSS_URL_RE = /(?<![\w-])url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
const CSS_IMPORT_RE = /@import\s+(['"])([^'"]+)\1/gi;

function processCss(text, cssUrlAbs, cssLocal) {
  const rw = (raw) => {
    if (!raw || raw.startsWith('data:') || raw.startsWith('#')) return null;
    let abs; try { abs = new URL(raw, cssUrlAbs).href; } catch { return null; }
    const loc = queueAsset(abs);
    return loc ? relFrom(cssLocal, loc) : null;
  };
  return text
    .replace(CSS_URL_RE, (m, q, raw) => { const r = rw(raw.trim()); return r ? 'url("' + r + '")' : m; })
    .replace(CSS_IMPORT_RE, (m, q, raw) => { const r = rw(raw.trim()); return r ? '@import "' + r + '"' : m; });
}

async function downloadAssets() {
  while (assetQueue.length) {
    const batch = assetQueue.splice(0, 12);
    await Promise.all(batch.map(async ({ url, local, u }) => {
      if (exists(local)) return;
      const isCss = /\.css($|\?)/i.test(url);
      try {
        let buf = isCss ? null : cacheRead(u);
        if (!buf) buf = (await fetchBuf(url)).buf;
        save(local, isCss ? Buffer.from(processCss(buf.toString('utf8'), url, local), 'utf8') : buf);
        process.stdout.write('.');
      } catch (e) { failed.push([url, String(e.message)]); process.stdout.write('x'); }
    }));
  }
}

const ATTR_URL = /\b(href|src|data-src|data-lazy-src|data-large_image|data-thumb|data-bg|poster|content|data-background-image)\s*=\s*(["'])(.*?)\2/gis;
const SRCSET = /\b(srcset|data-srcset|imagesrcset|data-lazy-srcset)\s*=\s*(["'])(.*?)\2/gis;
const STYLE_ATTR = /\bstyle\s*=\s*(["'])(.*?)\1/gis;
const STYLE_TAG = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;

function resolveMaybe(raw, base) {
  if (!raw) return null;
  raw = raw.trim();
  if (!raw || raw.startsWith('data:') || raw.startsWith('#') || /^(mailto|tel|javascript|whatsapp|sms|skype):/i.test(raw)) return null;
  try { return new URL(raw, base).href; } catch { return null; }
}

// WP head cruft that only makes sense on the live server
const DROP_TAGS = [
  /<link[^>]*rel=["']dns-prefetch["'][^>]*>\s*/gi,
  /<link[^>]*rel=["']shortlink["'][^>]*>\s*/gi,
  /<link[^>]*rel=["']EditURI["'][^>]*>\s*/gi,
  /<link[^>]*rel=["']pingback["'][^>]*>\s*/gi,
  /<link[^>]*rel=["']wlwmanifest["'][^>]*>\s*/gi,
  /<link[^>]*oembed[^>]*>\s*/gi,
  /<link[^>]*rel=["']alternate["'][^>]*type=["']application\/json["'][^>]*>\s*/gi,
  /<link[^>]*type=["']application\/json["'][^>]*rel=["']alternate["'][^>]*>\s*/gi,
  /<link[^>]*rel=["']https:\/\/api\.w\.org\/["'][^>]*>\s*/gi,
  /<link[^>]*type=["']application\/(?:rss|atom)\+xml["'][^>]*>\s*/gi,
];

function rewriteHtml(html, pageUrl, self) {
  // returns rewritten html; `self` is this page's local path
  for (const re of DROP_TAGS) html = html.replace(re, '');
  const target = (abs) => {
    const u = norm(abs);
    if (!u) return null;
    if (!HOSTS.has(u.hostname) && !ASSET_HOSTS.has(u.hostname)) return null;
    if (isPageUrl(u)) {
      const loc = pageLocal(u);
      const key = u.origin + u.pathname;
      if (!pageSeen.has(key)) { pageSeen.add(key); pageQueue.push(key); }
      return relFrom(self, loc);
    }
    const loc = queueAsset(abs);
    return loc ? relFrom(self, loc) : null;
  };

  html = html.replace(STYLE_TAG, (m, css) =>
    /url\(|@import/i.test(css) ? m.replace(css, processCss(css, pageUrl, self)) : m);

  html = html.replace(STYLE_ATTR, (m, q, css) =>
    /url\(/i.test(css) ? 'style=' + q + processCss(css, pageUrl, self) + q : m);

  html = html.replace(SRCSET, (m, attr, q, val) => {
    const parts = val.split(',').map(s => {
      const seg = s.trim(); if (!seg) return null;
      const sp = seg.split(/\s+/);
      const abs = resolveMaybe(sp[0], pageUrl);
      const r = abs ? target(abs) : null;
      return (r || sp[0]) + (sp[1] ? ' ' + sp.slice(1).join(' ') : '');
    }).filter(Boolean);
    return attr + '=' + q + parts.join(', ') + q;
  });

  html = html.replace(ATTR_URL, (m, attr, q, val) => {
    const abs = resolveMaybe(val, pageUrl);
    if (!abs) return m;
    const u = norm(abs);
    if (!u || (!HOSTS.has(u.hostname) && !ASSET_HOSTS.has(u.hostname))) return m;
    if (attr.toLowerCase() === 'content') {
      if (!/^https?:\/\//i.test(val.trim()) || isPageUrl(u)) return m;
      const loc = queueAsset(abs);
      return loc ? attr + '=' + q + relFrom(self, loc) + q : m;
    }
    const r = target(abs);
    return r ? attr + '=' + q + r + q : m;
  });

  return html;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const seeds = fs.readFileSync('./allurls.txt', 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
  for (const s of seeds) {
    const u = norm(s);
    if (u && isPageUrl(u)) { pageSeen.add(u.origin + u.pathname); pageQueue.push(u.origin + u.pathname); }
  }

  while (pageQueue.length) {
    const url = pageQueue.shift();
    const u = norm(url);
    const local = pageLocal(u);
    if (exists(local)) continue;
    try {
      const { buf, type } = await fetchBuf(url);
      if (!/html/.test(type)) continue;
      save(local, Buffer.from(rewriteHtml(buf.toString('utf8'), url, local), 'utf8'));
      done++;
      console.log('[' + done + '] ' + local + '  (q ' + pageQueue.length + ')');
    } catch (e) { failed.push([url, String(e.message)]); console.log('FAIL ' + url + ' ' + e.message); }
    if (assetQueue.length > 100) await downloadAssets();
  }
  console.log('assets...');
  await downloadAssets();
  console.log('\nPages: ' + done + '  Assets: ' + assetSeen.size + '  Failed: ' + failed.length);
  fs.writeFileSync(path.join(OUT, 'assets', '_failed.json'), JSON.stringify(failed, null, 2));
}
main();
