// Clean, SEO-friendly page URLs, handled entirely by the server.
//
//   pages/about-us.html                      ->  /about-us
//   blog/10-ways-cash-counting-....html      ->  /blog/ten-ways-cash-counting-...
//   category/airless-spray-systems-page-2    ->  /category/airless-spray-systems-page-two
//   spray-guns/index.html                    ->  /spray-guns/
//
// Rules for a default URL: lowercase letters and hyphens only; numbers are written as words
// (10 -> ten), except a number that is part of a product code (AB-15, GT-18, HG-25), which keeps
// its digits. No ".html", no "/pages/" folder.
//
// The files and the links inside them are not changed. The server
//   - serves each clean URL from its file,
//   - answers every old URL (.html, /pages/..., a slug changed in the admin) with a 301 to the clean one,
//   - rewrites the links in each HTML page it sends: page links become clean URLs and every other
//     relative reference (css, js, images) becomes root-absolute, because a page in pages/ is now
//     served one folder higher than its file.
// Slugs changed in the admin live in tools/url-slugs.json (overrides + redirects); in production that
// file is kept in Postgres like every other admin edit (store.mjs), so a change is live at once.
import fs from 'node:fs';
import path from 'node:path';

let ROOT = '', REPO = '';
const MAP_FILE = () => path.join(REPO, 'tools', 'url-slugs.json');
// first URL segments that belong to real folders or the server, never to a page slug
const RESERVED = new Set(['assets', 'admin', 'api', 'theme', 'pages', 'blog', 'category', 'data', 'tools', 'sitemap', 'robots']);

export function initSlugs(siteRoot, repoRoot) { ROOT = siteRoot; REPO = repoRoot; }

// ---------------------------------------------------------------- number words
const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
function words(n) {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
  if (n < 1000) return ONES[Math.floor(n / 100)] + '-hundred' + (n % 100 ? '-' + words(n % 100) : '');
  if (n < 10000) return words(Math.floor(n / 1000)) + '-thousand' + (n % 1000 ? '-' + words(n % 1000) : '');
  return String(n).split('').map(d => ONES[+d]).join('-');
}

// product codes found on the series pages (model-ab-15-pro -> "ab-15"), so their digits are kept
let codes = new Set(['pilot', 'type']);   // prefixes; "ab", "hp", "gct" ... are added from the pages
function looksLikeCode(prefix, num) {
  return codes.has(prefix) && num.length >= 2 || (codes.has(prefix + '-' + num));
}

export function toSlug(text) {
  const parts = String(text).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').split('-').filter(Boolean);
  const out = [];
  for (let i = 0; i < parts.length; i++) {
    const t = parts[i];
    if (i > 0 && /^\d+[a-z]+$/.test(t) && codes.has(parts[i - 1])) { out.push(t); continue; }   // BL-26VS
    if (!/^\d+$/.test(t)) { out.push(t.replace(/\d+/g, d => '-' + words(+d) + '-').replace(/^-|-$/g, '')); continue; }
    if (i > 0 && looksLikeCode(parts[i - 1], t)) { out.push(t); continue; }   // product code: keep the digits
    out.push(words(+t));
  }
  return out.join('-').replace(/-+/g, '-');
}

// ---------------------------------------------------------------- the index of pages
let idx = null;   // { byFile: Map(rel -> clean), byClean: Map(clean -> rel), redirects: Map(old -> rel), version }
let version = 0;

function readMap() {
  try { const j = JSON.parse(fs.readFileSync(MAP_FILE(), 'utf8')); return { urls: j.urls || {}, redirects: j.redirects || {} }; }
  catch (e) { return { urls: {}, redirects: {} }; }
}
function writeMap(m) {
  fs.mkdirSync(path.dirname(MAP_FILE()), { recursive: true });
  fs.writeFileSync(MAP_FILE(), JSON.stringify({ urls: m.urls, redirects: m.redirects }, null, 1) + '\n');
}

function htmlFiles() {
  const out = [];
  (function walk(d) {
    let list; try { list = fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }); } catch (e) { return; }
    for (const f of list) {
      const rel = d ? d + '/' + f.name : f.name;
      if (f.isDirectory()) { if (rel !== 'assets' && rel !== 'theme') walk(rel); }
      else if (f.name.endsWith('.html')) out.push(rel);
    }
  })('');
  return out.sort();
}

function learnCodes(files) {
  for (const rel of files) {
    if (!rel.startsWith('pages/')) continue;
    let html; try { html = fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch (e) { continue; }
    for (const m of html.matchAll(/\bid="model-([a-z]+)-(\d+)/g)) codes.add(m[1]);
  }
}

export function defaultClean(rel) {
  if (rel === 'index.html') return '';
  const dir = path.posix.dirname(rel), base = path.posix.basename(rel, '.html');
  if (base === 'index') return dir.split('/').map(toSlug).join('/') + '/';
  const slug = toSlug(base) || 'page';
  if (dir === 'pages') return RESERVED.has(slug) ? slug + '-page' : slug;
  return dir.split('/').map(toSlug).join('/') + '/' + slug;
}

function build() {
  const files = htmlFiles();
  learnCodes(files);
  const map = readMap();
  const byFile = new Map(), byClean = new Map(), redirects = new Map();
  for (const rel of files) {
    if (/\.(bak|old)\.html$/.test(rel)) continue;
    let clean = map.urls[rel] != null ? map.urls[rel] : defaultClean(rel);
    // two files wanting the same URL: the later one gets a letter suffix
    while (byClean.has(clean)) clean = clean.replace(/\/?$/, m => '-more' + m);
    byFile.set(rel, clean); byClean.set(clean, rel);
  }
  for (const [old, rel] of Object.entries(map.redirects)) if (byFile.has(rel) && !byClean.has(old)) redirects.set(old, rel);
  idx = { byFile, byClean, redirects, version: ++version };
  return idx;
}
const index = () => idx || build();
export function invalidateSlugs() { idx = null; }
export const slugVersion = () => index().version;
export const cleanOf = rel => index().byFile.get(rel);

// ---------------------------------------------------------------- product model pages
// A series page holds one card per model (id="model-<model>"). Does that page have this model?
function modelExists(rel, model) {
  try { return fs.readFileSync(path.join(ROOT, rel), 'utf8').includes('id="model-' + model + '"'); } catch (e) { return false; }
}

// ---------------------------------------------------------------- requests
// What to do with a request path. Returns { file } to serve, { redirect } for a 301, or null (not a page URL).
export function resolveRequest(pathname, search) {
  let p; try { p = decodeURIComponent(pathname); } catch (e) { return null; }
  const key = p.replace(/^\/+/, '');
  const q = search || '';
  let ix = index();
  const go = rel => {
    const mm = q.match(/^\?model=model-([a-z0-9]+(?:-[a-z0-9]+)*)$/), clean = ix.byFile.get(rel);
    if (mm && !clean.endsWith('/') && modelExists(rel, mm[1])) return { redirect: '/' + clean + '/' + mm[1] };   // old model link: one hop
    return { redirect: '/' + clean + q };
  };

  // an old model address, "/evolution-series?model=model-hvlp-03", becomes "/evolution-series/hvlp-03"
  const oldModel = q.match(/^\?model=model-([a-z0-9]+(?:-[a-z0-9]+)*)$/);
  if (oldModel && ix.byClean.has(key) && modelExists(ix.byClean.get(key), oldModel[1])) return { redirect: '/' + key.replace(/\/$/, '') + '/' + oldModel[1] };
  if (ix.byClean.has(key)) return { file: ix.byClean.get(key) };
  // a model page: "/<series>/<model>" is the series page, which then shows only that model
  const cut = key.replace(/\/$/, '').lastIndexOf('/');
  if (cut > 0) {
    const series = key.slice(0, cut), model = key.slice(cut + 1).replace(/\/$/, '');
    if (ix.byClean.has(series) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(model) && modelExists(ix.byClean.get(series), model)) {
      return key.endsWith('/') ? { redirect: '/' + series + '/' + model + q } : { file: ix.byClean.get(series) };
    }
  }
  // a clean URL with or without its trailing slash
  if (key.endsWith('/') && ix.byClean.has(key.slice(0, -1))) return go(ix.byClean.get(key.slice(0, -1)));
  if (!key.endsWith('/') && ix.byClean.has(key + '/')) return go(ix.byClean.get(key + '/'));
  // an old URL: the file path itself, the file path without .html, a slug changed in the admin
  const asFile = key === '' ? 'index.html' : key.endsWith('/') ? key + 'index.html' : key;
  for (const cand of [asFile, asFile + '.html']) if (ix.byFile.has(cand)) return go(cand);
  const old = key.replace(/\/$/, '');
  if (ix.redirects.has(old) || ix.redirects.has(key)) return go(ix.redirects.get(old) || ix.redirects.get(key));
  // the previous server mapped /<slug> to pages/, blog/ or category/; keep those working
  for (const dir of ['pages/', 'blog/', 'category/']) if (ix.byFile.has(dir + old + '.html')) return go(dir + old + '.html');
  // a page added since the index was built (new blog post, new series)
  if (/\.html$/.test(key) && fs.existsSync(path.join(ROOT, key)) && idx === ix) { invalidateSlugs(); ix = index(); if (ix.byFile.has(key)) return go(key); }
  return null;
}

// ---------------------------------------------------------------- outgoing HTML
const SKIP = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\/|\{|<|\$)/i;
// Rewrites the references in a page served from file `rel`: links to pages become clean URLs; other
// relative references that point at a real file become root-absolute.
export function rewriteHtml(html, rel) {
  const ix = index();
  const dir = path.posix.dirname(rel);
  const exists = new Map();
  const isFile = t => { if (!exists.has(t)) { let ok = false; try { ok = fs.statSync(path.join(ROOT, t)).isFile(); } catch (e) { /* missing */ } exists.set(t, ok); } return exists.get(t); };
  function fix(ref) {
    const raw = ref.trim();
    if (!raw || SKIP.test(raw)) {
      // root-absolute links to old page URLs (/pages/x.html) also become clean
      if (/^\/[^/]/.test(raw)) {
        const m = raw.match(/^\/([^?#]*)([\s\S]*)$/);
        const f = m[1] === '' ? null : m[1].endsWith('/') ? m[1] + 'index.html' : m[1];
        if (f && ix.byFile.has(f)) return '/' + ix.byFile.get(f) + m[2];
      }
      return null;
    }
    const m = raw.match(/^([^?#]*)([\s\S]*)$/);
    let p; try { p = decodeURIComponent(m[1]); } catch (e) { return null; }
    if (p === '') return null;   // "?model=x": stays relative to the page's own (clean) URL
    let t = path.posix.normalize(path.posix.join(dir, p));
    if (t.startsWith('..')) t = t.replace(/^(\.\.\/)+/, '');
    if (t === '.') t = '';
    const page = t === '' ? 'index.html' : (p.endsWith('/') || t.endsWith('/')) ? t.replace(/\/?$/, '/') + 'index.html' : t;
    if (ix.byFile.has(page)) {
      // a link to one model of a series ("evolution-series.html?model=model-hvlp-03") becomes /evolution-series/hvlp-03
      const mm = m[2].match(/^\?model=model-([a-z0-9]+(?:-[a-z0-9]+)*)$/);
      if (mm && !ix.byFile.get(page).endsWith('/')) return '/' + ix.byFile.get(page) + '/' + mm[1];
      return '/' + ix.byFile.get(page) + m[2];
    }
    if (t && isFile(t)) return '/' + t.split('/').map(encodeURIComponent).join('/') + m[2];
    return null;
  }
  html = html.replace(/(\s(?:href|src|data-src|bv-data-src|poster|action)\s*=\s*)(["'])([^"']*)\2/gi, (all, a, qt, v) => {
    const f = fix(v); return f == null ? all : a + qt + f + qt;
  });
  html = html.replace(/(\s(?:srcset|data-srcset|bv-data-srcset)\s*=\s*)(["'])([^"']*)\2/gi, (all, a, qt, v) =>
    a + qt + v.split(',').map(part => { const s = part.trim().split(/\s+/); const f = fix(s[0] || ''); if (f != null) s[0] = f; return (part.match(/^\s*/)[0]) + s.join(' '); }).join(',') + qt);
  // url(...) in style attributes and <style> blocks: only references that resolve to a real file
  html = html.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/g, (all, qt, v) => { const f = /^data:/.test(v) ? null : fix(v); return f == null ? all : 'url(' + qt + f + qt + ')'; });
  // canonical / og:url carry the clean URL too
  html = html.replace(/(<meta\b[^>]*\bproperty="og:url"[^>]*\bcontent=")([^"]*)"/i, (all, a, v) => { const f = fix(v); return f == null ? all : a + f + '"'; });
  return html;
}

// ---------------------------------------------------------------- admin
export function listUrls() {
  const ix = index(), map = readMap();
  const olds = new Map();
  for (const [o, r] of ix.redirects) { if (!olds.has(r)) olds.set(r, []); olds.get(r).push('/' + o); }
  return [...ix.byFile].map(([rel, clean]) => ({ file: rel, url: '/' + clean, custom: map.urls[rel] != null, default: '/' + defaultClean(rel), old: olds.get(rel) || [] }));
}

// Sets the URL of one page. `slug` is the last part of the path (letters, digits for product codes, hyphens).
export function setSlug(rel, slug, reset) {
  const ix = index();
  if (!ix.byFile.has(rel)) throw new Error('unknown page: ' + rel);
  if (rel === 'index.html') throw new Error('the home page is always /');
  const cur = ix.byFile.get(rel);
  const isDir = cur.endsWith('/');
  const prefix = cur.replace(/\/$/, '').split('/').slice(0, -1).join('/');
  let next;
  if (reset) next = defaultClean(rel);
  else {
    const s = String(slug || '').trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)) throw new Error('use lowercase letters, product-code digits and single hyphens only (e.g. legacy-series)');
    if (s.length > 90) throw new Error('keep the URL under 90 characters');
    if (!prefix && RESERVED.has(s)) throw new Error('"' + s + '" is reserved by the site');
    next = (prefix ? prefix + '/' : '') + s + (isDir ? '/' : '');
  }
  if (next === cur) return { url: '/' + cur, changed: false };
  if (ix.byClean.has(next) && ix.byClean.get(next) !== rel) throw new Error('/' + next + ' is already the URL of ' + ix.byClean.get(next));
  const map = readMap();
  if (reset) delete map.urls[rel]; else map.urls[rel] = next;
  // the old URL keeps working (301); a redirect that pointed elsewhere and is now this page's URL goes
  map.redirects[cur.replace(/\/$/, '')] = rel;
  delete map.redirects[next.replace(/\/$/, '')];
  writeMap(map);
  invalidateSlugs();
  return { url: '/' + next, changed: true };
}

// ---------------------------------------------------------------- sitemap
// the clean URL ("/welding/") of a page file ("welding/index.html"), or null
export const cleanUrlOf = rel => { const c = index().byFile.get(rel); return c == null ? null : "/" + c; };
export function sitemapXml(origin) {
  const ix = index();
  const urls = [...ix.byFile].filter(([rel]) => !/^pages\/author-|\/hello\.html$/.test(rel)).map(([, c]) => origin + '/' + c);
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(u => '  <url><loc>' + u.replace(/&/g, '&amp;') + '</loc></url>').join('\n') + '\n</urlset>\n';
}
