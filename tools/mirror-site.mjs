// Mirrors one Pilot Group satellite site into pilotindia-clone/sites/<slug>/.
// Same flat layout as the main clone: index.html + pages/ + blog/ + category/ + assets/.
// Includes the Airlift recovery pass (script/style URLs hidden as JSON-escaped strings
// inside inline JS), because these sites run the same WordPress + Divi + Airlift stack.
//
//   node tools/mirror-site.mjs <slug> [siteDir]
import fs from 'node:fs';
import path from 'node:path';

const SITES = {
  'spray-guns': { host: 'pilotsprayguns.com', name: 'Pilot Spray Guns' },
  'airless': { host: 'pilotairless.com', name: 'Pilot Airless' },
  'welding': { host: 'pilotwelding.com', name: 'Pilot Welding' },
  'office': { host: 'pilotofficeproducts.com', name: 'Pilot Office Products' },
};

const SLUG = process.argv[2];
const CFG = SITES[SLUG];
if (!CFG) { console.error('usage: mirror-site.mjs <' + Object.keys(SITES).join('|') + '>'); process.exit(1); }

const CLONE = process.argv[3] || path.join(process.cwd(), 'pilotindia-clone');
const OUT = path.join(CLONE, 'sites', SLUG);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const HOSTS = new Set([CFG.host, 'www.' + CFG.host]);
const ASSET_HOSTS = new Set(['use.fontawesome.com', 'fonts.googleapis.com', 'fonts.gstatic.com',
  'cdnjs.cloudflare.com', 'maxcdn.bootstrapcdn.com', 'code.jquery.com', 'cdn.jsdelivr.net']);

// These slugs are injected SEO spam on the live sites (Polish casino / betting pages),
// not Pilot content. Excluded from the mirror.
const SPAM = /(kasyno|kasynie|polskie|pokies|sportsbook|bettors|free-spins|bankroll|rtp-in-new-zealand|mms-video-telegram|slot-releases|automaty)/i;

const pageQueue = [];
const pageSeen = new Set();
const assetSeen = new Map();
const assetQueue = [];
const usedNames = new Set();
const failed = [];
let done = 0;

const norm = (u) => { try { const x = new URL(u); x.hash = ''; return x; } catch { return null; } };

let PAGE_PATHS = new Set();

function isPageUrl(u) {
  if (!HOSTS.has(u.hostname)) return false;
  const p = u.pathname;
  if (/^\/(wp-content|wp-includes|wp-admin|wp-json|tag|xmlrpc)/.test(p)) return false;
  if (/\.(jpe?g|png|gif|svg|webp|avif|ico|css|js|json|xml|pdf|zip|woff2?|ttf|eot|mp4|webm|mp3|php)$/i.test(p)) return false;
  if (/\/feed\/?$/.test(p) || /_wp_link_placeholder/.test(p)) return false;
  if (SPAM.test(p)) return false;
  if (u.search) return false;
  return true;
}

const slugify = (s) => s.replace(/[^a-z0-9-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase();

function pageLocal(u) {
  const p = decodeURIComponent(u.pathname).replace(/^\/+|\/+$/g, '');
  if (p === '') return 'index.html';
  const seg = p.split('/');
  if (seg[0] === 'category') {
    const pg = (seg[2] === 'page' && seg[3]) ? '-page-' + seg[3] : '';
    return 'category/' + slugify(seg[1] || 'index') + pg + '.html';
  }
  if (seg[0] === 'page' && seg[1]) return 'blog/index-page-' + seg[1] + '.html';
  if (seg[0] === 'author') {
    const pg = (seg[2] === 'page' && seg[3]) ? '-page-' + seg[3] : '';
    return 'pages/author-' + slugify(seg[1] || 'x') + pg + '.html';
  }
  const isPage = PAGE_PATHS.has(u.pathname) || PAGE_PATHS.has(u.pathname + '/');
  return (isPage ? 'pages/' : 'blog/') + slugify(seg.join('-')) + '.html';
}

const EXT_DIR = { '.css': 'assets/css', '.js': 'assets/js', '.mjs': 'assets/js',
  '.woff': 'assets/fonts', '.woff2': 'assets/fonts', '.ttf': 'assets/fonts', '.eot': 'assets/fonts', '.otf': 'assets/fonts' };

function assetLocal(u) {
  const p = decodeURIComponent(u.pathname);
  let base = path.basename(p) || 'file';
  let ext = path.extname(base).toLowerCase();
  if (!ext) {
    if (u.hostname === 'fonts.googleapis.com' || /\/css2?$/.test(u.pathname)) {
      ext = '.css';
      const fam = (u.searchParams.get('family') || '').split(':')[0];
      base = (fam ? 'google-fonts-' + fam : base) + ext;
    } else { ext = '.bin'; base += ext; }
  }
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
  const key = u.origin + u.pathname + (path.extname(u.pathname) ? '' : u.search);
  if (assetSeen.has(key)) return assetSeen.get(key);
  const local = assetLocal(u);
  assetSeen.set(key, local);
  assetQueue.push({ url: u.origin + u.pathname + u.search, local });
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
    await Promise.all(batch.map(async ({ url, local }) => {
      if (exists(local)) return;
      const isCss = /\.css($|\?)/i.test(url);
      try {
        const { buf } = await fetchBuf(url);
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

function resolveMaybe(raw, base) {
  if (!raw) return null;
  raw = raw.trim();
  if (!raw || raw.startsWith('data:') || raw.startsWith('#') || /^(mailto|tel|javascript|whatsapp|sms|skype):/i.test(raw)) return null;
  try { return new URL(raw, base).href; } catch { return null; }
}

function rewriteHtml(html, pageUrl, self) {
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

// ---- Airlift pass: recover asset URLs hidden as JSON-escaped strings in inline JS ----
const ESCAPED_RE = new RegExp(
  '(https?:(?:\\\\/\\\\/|//)(?:www\\.)?(?:' +
  [...HOSTS, ...ASSET_HOSTS].map(h => h.replace(/\./g, '\\.')).join('|') +
  ')(?:\\\\/|/)[^\\s"\'`<>)\\]}]*)', 'g');

async function airliftPass(rel) {
  const fp = path.join(OUT, rel);
  let html = fs.readFileSync(fp, 'utf8');
  const hits = [...new Set(html.match(ESCAPED_RE) || [])];
  if (!hits.length) return 0;
  let n = 0;
  for (const hit of hits) {
    const escaped = hit.includes('\\/');
    const clean = hit.replace(/\\\//g, '/').replace(/&#0?38;/g, '&').replace(/&amp;/g, '&');
    let u; try { u = new URL(clean); } catch { continue; }
    if (!HOSTS.has(u.hostname) && !ASSET_HOSTS.has(u.hostname)) continue;
    const isAsset = /\.[a-z0-9]{2,5}(\?|$)/i.test(u.pathname) && !/\.php$/i.test(u.pathname);
    if (!isAsset) continue;
    const local = queueAsset(u.origin + u.pathname + u.search);
    if (!local) continue;
    let out = relFrom(rel, local);
    if (escaped) out = out.replace(/\//g, '\\/');
    html = html.split(hit).join(out);
    n++;
  }
  fs.writeFileSync(fp, html, 'utf8');
  return n;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  console.log('mirroring ' + CFG.host + ' -> sites/' + SLUG + '/');

  // sitemaps: page-sitemap tells us page-vs-post, the rest are seeds
  const grab = async (name) => {
    try {
      const { buf } = await fetchBuf('https://' + CFG.host + '/' + name);
      return buf.toString('utf8').split('>').join('>\n').split('\n')
        .map(s => (s.match(new RegExp('https://[^<\\s]*' + CFG.host.replace(/\./g, '\\.') + '[^<\\s]*')) || [])[0])
        .filter(Boolean);
    } catch { return []; }
  };
  const pageUrls = await grab('page-sitemap.xml');
  PAGE_PATHS = new Set(pageUrls.map(u => { try { return new URL(u).pathname; } catch { return null; } }).filter(Boolean));

  const seeds = ['https://' + CFG.host + '/'];
  for (const n of ['page-sitemap.xml', 'post-sitemap.xml', 'category-sitemap.xml']) seeds.push(...await grab(n));

  for (const s of seeds) {
    const u = norm(s);
    if (u && isPageUrl(u)) { pageSeen.add(u.origin + u.pathname); pageQueue.push(u.origin + u.pathname); }
  }
  console.log('seeded ' + pageQueue.length + ' pages');

  const writtenPages = [];
  while (pageQueue.length) {
    const url = pageQueue.shift();
    const u = norm(url);
    const local = pageLocal(u);
    if (exists(local)) continue;
    try {
      const { buf, type } = await fetchBuf(url);
      if (!/html/.test(type)) continue;
      save(local, Buffer.from(rewriteHtml(buf.toString('utf8'), url, local), 'utf8'));
      writtenPages.push(local);
      done++;
      if (done % 10 === 0) console.log('  [' + done + '] ' + local + ' (queue ' + pageQueue.length + ')');
    } catch (e) { failed.push([url, String(e.message)]); }
    if (assetQueue.length > 100) await downloadAssets();
  }

  console.log('\npages done: ' + done + ' — airlift pass...');
  let rw = 0;
  for (const rel of writtenPages) rw += await airliftPass(rel);
  console.log('airlift rewrites: ' + rw + ' — downloading assets...');
  await downloadAssets();

  console.log('\n' + SLUG + ': pages ' + done + '  assets ' + assetSeen.size + '  failed ' + failed.length);
  if (failed.length) console.log(JSON.stringify(failed.slice(0, 8)));
}

main();
