// Static server for the pilotindia-clone mirror.
//   node serve.mjs [port]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(REPO, 'pilotindia-clone');
const PORT = Number(process.env.PORT || process.argv[2] || 8080);

// Production (Railway): admin edits live in Postgres, see store.mjs. Must run before anything reads files.
import { initStore, dbMode } from './store.mjs';
import { authEnabled, isAuthed, handleAuth, sameOrigin, isBlocked, blockedPage } from './auth.mjs';
import { rateLimit, securityHeaders, forbiddenPath, hardenServer, SVG_HEADERS, admitBody } from './security.mjs';
await initStore(REPO);
// clean page URLs (/about-us, /blog/<post>): see slugs.mjs
import { initSlugs, resolveRequest, rewriteHtml, slugVersion, sitemapXml, cleanUrlOf } from './slugs.mjs';
initSlugs(ROOT, REPO);
// catalogue downloads need the short form first (leads.mjs)
import { initLeads, handleLeadPost, handleEnquiryPost, isCatalogue, hasAccess, gatePage } from './leads.mjs';
await initLeads(REPO, ROOT);
import { initVisits, trackVisit } from './visits.mjs';
await initVisits(REPO).catch(e => console.warn('visits: init failed: ' + e.message));
if (dbMode() && !authEnabled()) console.warn('admin disabled: set ADMIN_PASSWORD to use /admin in production');

// the admin dashboard (admin/server.mjs) - optional: the site still serves if it cannot load
let admin = null;
try {
  admin = await import("./admin/server.mjs");
  admin.initAdmin(ROOT, path.dirname(fileURLToPath(import.meta.url)));
} catch (err) {
  console.warn("admin dashboard unavailable (run \"npm install\"): " + err.message);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.avif': 'image/avif', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.eot': 'application/vnd.ms-fontobject', '.otf': 'font/otf',
  '.pdf': 'application/pdf', '.mp4': 'video/mp4', '.webm': 'video/webm', '.xml': 'application/xml',
};

// ---- static files: validators, compression, caching ----
// Text files are sent compressed (brotli or gzip); every file carries an ETag so a repeat visit is answered with a
// 304 and no body; images and fonts may be reused for a few minutes without asking at all. Stylesheets, scripts and
// pages are always revalidated, so an edit shows on the next refresh.
import zlib from 'node:zlib';
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.mjs', '.json', '.svg', '.xml', '.ttf', '.eot', '.otf']);
const REUSE = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico', '.woff', '.woff2', '.mp4', '.webm', '.pdf']);
const squeezed = new Map();     // path + mtime + encoding -> compressed bytes
// every page gets the catalogue-download form script (pi-lead), added here so no page file has to carry it
// It goes in <head> and runs async, so a click on a catalogue link is caught even while a long page is still loading.
// The inline stub is a click catcher only (~0.6 KB): a click on a catalogue link made before pi-lead.js has loaded is held,
// not followed to the PDF, and pi-lead.js opens the card for it as soon as it runs.
const LEAD_STUB = "<script>(function(){var d=document;d.addEventListener('click',function(e){if(window.__piLead)return;var a=e.target.closest&&e.target.closest('a[href]');if(!a)return;var h=a.getAttribute('href')||'';if(!/\\.pdf(\\?|#|$)/i.test(h)||!/catalog/i.test((a.textContent||'')+' '+(a.getAttribute('aria-label')||'')+' '+h)||/(?:^|;\\s*)pi_dl_ok=1/.test(d.cookie))return;e.preventDefault();e.stopImmediatePropagation();window.__piLeadQ=a.href},true)})()</script>\n";
const LEAD_TAGS = '<link rel="stylesheet" href="/assets/css/pi-lead.css?v=6" />\n' + LEAD_STUB + '<script src="/assets/js/pi-lead.js?v=6" async></script>\n';
// The two fonts the whole site uses (theme.css @font-face, font-display: swap). Without a preload the browser only finds them
// after theme.css is parsed and text has laid out, so headlines paint in the fallback face and reflow when the real one arrives.
const FONT_PRELOAD = '<link rel="preload" as="font" type="font/woff2" href="/assets/fonts/pi-dm-sans-italic-latin.woff2" crossorigin>\n<link rel="preload" as="font" type="font/woff2" href="/assets/fonts/pi-inter-latin.woff2" crossorigin>\n';
function withLeadGate(buf) {
  let html = buf.toString('utf8');
  if (html.includes('pi-lead.js')) return buf;
  const head = html.match(/<head[^>]*>/i);
  if (head) html = html.slice(0, head.index + head[0].length) + '\n' + FONT_PRELOAD + html.slice(head.index + head[0].length);
  const at = html.search(/<\/head>/i);
  return Buffer.from(at < 0 ? LEAD_TAGS + html : html.slice(0, at) + LEAD_TAGS + html.slice(at), 'utf8');
}

// error page: the site's two fonts (theme.css), not the browser default
function notFoundPage() {
  return '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found</title><link rel="stylesheet" href="/theme/theme.css"><style>body{margin:0;min-height:100vh;display:grid;place-content:center;gap:12px;text-align:center;background:#0a0a0a;color:#fff;font-family:var(--pi-font-body)}h1{margin:0;font-family:var(--pi-font-heading);font-style:italic;font-weight:600;font-size:clamp(64px,14vw,140px)}p{margin:0;color:rgba(255,255,255,.7)}a{color:#f58634}</style><h1>404</h1><p>This page could not be found. <a href="/">Back to home</a></p>';
}

// The canonical tag (and og:url) must be a full address to count for search engines. The pages store a relative one, so when it is
// relative it is served as origin + the page's clean URL. An absolute value (set per page in the admin's SEO tab) is left as it is.
function withAbsoluteUrls(html, origin, clean) {
  if (!clean) return html;
  const full = origin + clean;
  html = html.replace(/(<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=")([^"]*)"/i, (m, a, v) => /^https?:\/\//i.test(v) ? m : a + full + '"');
  html = html.replace(/(<meta\b[^>]*\bproperty="og:url"[^>]*\bcontent=")([^"]*)"/i, (m, a, v) => /^https?:\/\//i.test(v) ? m : a + full + '"');
  return html;
}

function serveFile(req, res, fp, extra = {}) {
  const ext = path.extname(fp).toLowerCase();
  const st = fs.statSync(fp);
  // "-l1": pages carry the injected form script, so their validator changes with it
  const etag = 'W/"' + st.size.toString(16) + '-' + Math.floor(st.mtimeMs).toString(16) + (ext === '.html' ? '-l5-u' + slugVersion() : '') + '"';
  const headers = {
    'Content-Type': TYPES[ext] || 'application/octet-stream',
    'ETag': etag,
    'Last-Modified': st.mtime.toUTCString(),
    // the form's own files are versioned in the URL (?v=N), so they can be kept for a year and never re-checked
    'Cache-Control': /[\\/]assets[\\/](js|css)[\\/]pi-lead\.(js|css)$/.test(fp) && /[?&]v=\d/.test(req.url) ? 'public, max-age=31536000, immutable' : REUSE.has(ext) ? 'public, max-age=300' : 'no-cache',
    'Vary': 'Accept-Encoding',
    ...(ext === '.svg' ? SVG_HEADERS : {}),
    ...extra,
  };
  if (req.headers['if-none-match'] === etag) { res.writeHead(304, headers).end(); return; }
  let body = fs.readFileSync(fp);
  const origin = process.env.SITE_URL ? process.env.SITE_URL.replace(/\/+$/, '') : (req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http') + '://' + req.headers.host;
  if (ext === '.html') {
    const rel = path.relative(ROOT, fp).split(path.sep).join('/');
    body = Buffer.from(withAbsoluteUrls(rewriteHtml(withLeadGate(body).toString('utf8'), rel), origin, cleanUrlOf(rel)), 'utf8');
  }
  if (COMPRESSIBLE.has(ext) && body.length > 1024) {
    const accept = String(req.headers['accept-encoding'] || '');
    const enc = /\bbr\b/.test(accept) ? 'br' : /\bgzip\b/.test(accept) ? 'gzip' : '';
    if (enc) {
      const key = fp + '|' + st.mtimeMs + '|' + enc + (ext === '.html' ? '|u' + slugVersion() + '|' + origin : '');
      let z = squeezed.get(key);
      if (!z) {
        z = enc === 'br'
          ? zlib.brotliCompressSync(body, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: body.length } })
          : zlib.gzipSync(body, { level: 6 });
        if (squeezed.size > 400) squeezed.clear();
        squeezed.set(key, z);
      }
      body = z; headers['Content-Encoding'] = enc;
    }
  }
  headers['Content-Length'] = body.length;
  res.writeHead(200, headers);
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  try { await handle(req, res); } catch (err) {
    console.error('request failed:', req.method, req.url, err);
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('server error');
  }
});
hardenServer(server);
process.on('unhandledRejection', err => console.error('unhandled rejection:', err));

async function handle(req, res) {
  securityHeaders(req, res);
  if (!['GET', 'HEAD', 'POST'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD, POST' }).end(); return; }
  const isAdmin = req.url.startsWith('/admin') || /[?&]__cms=1(&|$)/.test(req.url);
  if (!rateLimit(req, res, isAdmin ? 'admin' : 'site')) return;
  if (isAdmin && req.method === 'POST' && !req.url.startsWith('/admin/login') && !rateLimit(req, res, 'write')) return;
  // the two public forms: catalogue downloads and the Contact page enquiry (leads.mjs); they share the lead rate limits
  const formPost = !isAdmin && req.method === 'POST' && { '/api/leads': handleLeadPost, '/api/enquiry': handleEnquiryPost }[req.url.split('?')[0]];
  if (formPost) {
    if (!sameOrigin(req)) { res.writeHead(403).end('forbidden'); return; }
    if (!rateLimit(req, res, 'lead') || !rateLimit(req, res, 'lead*')) return;
    if (!admitBody(req, res, 8192)) return;
    await formPost(req, res);
    return;
  }
  if (!isAdmin && req.method === 'POST') { res.writeHead(405, { Allow: 'GET, HEAD' }).end(); return; }
  // admin: login when ADMIN_PASSWORD is set; never open in production without one
  const wantsAdmin = req.url.startsWith("/admin") || /[?&]__cms=1(&|$)/.test(req.url);
  if (wantsAdmin && dbMode() && !authEnabled()) {
    res.writeHead(503, { "Content-Type": "text/plain" }).end("admin disabled: ADMIN_PASSWORD is not set");
    return;
  }
  // IPs banned for failed sign-ins (blocklist.mjs) get nothing from the admin, session or not
  if (wantsAdmin && authEnabled() && isBlocked(req)) { req.resume(); blockedPage(req, res); return; }
  if (req.url.startsWith("/admin/login") || req.url.startsWith("/admin/logout")) { await handleAuth(req, res); return; }
  if (wantsAdmin && !isAuthed(req)) {
    if (req.url.startsWith("/admin/api/")) res.writeHead(401, { "Content-Type": "application/json" }).end('{"error":"signed out"}');
    else res.writeHead(302, { Location: "/admin/login" }).end();
    return;
  }
  if (wantsAdmin && req.method !== "GET" && !sameOrigin(req)) { res.writeHead(403).end("forbidden"); return; }
  if (req.url.startsWith("/admin")) {
    if (admin && await admin.handleAdmin(req, res)) return;
    res.writeHead(503, { "Content-Type": "text/plain" }).end("admin dashboard unavailable: run npm install");
    return;
  }
  // ---- clean page URLs (slugs.mjs). The visual editor (?__cms=1) keeps opening pages by file path.
  if (!/[?&]__cms=1(&|$)/.test(req.url)) {
    const bare = req.url.split('?')[0].split('#')[0];
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    const origin = (req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http') + '://' + req.headers.host;
    if (bare === '/sitemap.xml') { res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'no-cache' }).end(req.method === 'HEAD' ? '' : sitemapXml(origin)); return; }
    if (bare === '/robots.txt' && !fs.existsSync(path.join(ROOT, 'robots.txt'))) {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' }).end('User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ' + origin + '/sitemap.xml\n');
      return;
    }
    const r = resolveRequest(bare, qs);
    // no-cache: a URL changed in the admin (URLs screen) must take effect at once, not after a browser's cached redirect expires
    if (r && r.redirect) { res.writeHead(301, { Location: r.redirect, 'Cache-Control': 'no-cache' }).end(); return; }
    if (r && r.file) {
      // count the page view for the admin's User tracker (visits.mjs); it may set the visitor / session cookies
      const ck = /\.html$/i.test(r.file) ? trackVisit(req, bare) : [];
      serveFile(req, res, path.join(ROOT, r.file), ck.length ? { 'Set-Cookie': ck } : {});
      return;
    }
  }

  let p;
  try { p = decodeURIComponent(req.url.split('?')[0].split('#')[0]); } catch { res.writeHead(400).end('bad request'); return; }
  if (forbiddenPath(p)) { res.writeHead(404, { 'Content-Type': 'text/html' }).end(notFoundPage()); return; }
  if (p.endsWith('/')) p += 'index.html';
  let fp = path.join(ROOT, path.normalize(p).replace(/^([/\\])+/, ''));
  if (!fp.startsWith(ROOT)) { res.writeHead(403).end('forbidden'); return; }

  // /about-us            -> pages/about-us.html
  // /some-post           -> blog/some-post.html
  // /spray-guns          -> spray-guns/index.html
  // /spray-guns/legacy-series -> spray-guns/pages/legacy-series.html
  if (!fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
    const slug = p.replace(/^\/+|\/+$/g, '');
    const seg = slug.split('/');

    // A directory asked for without a trailing slash must redirect, not just serve
    // its index: without the slash the browser resolves every relative path in the
    // page one level too high, so /spray-guns would load /assets/... instead of
    // /spray-guns/assets/... and the page arrives with no CSS and no images.
    if (slug && !p.endsWith('/')) {
      const asDir = path.join(ROOT, slug);
      if (fs.existsSync(asDir) && fs.statSync(asDir).isDirectory() &&
          fs.existsSync(path.join(asDir, 'index.html'))) {
        res.writeHead(301, { Location: '/' + slug + '/' }).end();
        return;
      }
    }

    const alts = [fp + '.html', path.join(fp, 'index.html'),
      path.join(ROOT, 'pages', slug + '.html'), path.join(ROOT, 'blog', slug + '.html'),
      path.join(ROOT, 'category', slug + '.html')];
    if (seg.length > 1) {
      const site = seg[0], rest = seg.slice(1).join('-');
      alts.push(path.join(ROOT, site, 'pages', rest + '.html'),
                path.join(ROOT, site, 'blog', rest + '.html'),
                path.join(ROOT, site, 'category', rest + '.html'));
    }
    const hit = alts.find(a => fs.existsSync(a) && fs.statSync(a).isFile());
    if (!hit) { res.writeHead(404, { 'Content-Type': 'text/html' }).end(notFoundPage()); return; }
    fp = hit;
  }

  // the visual editor loads pages with ?__cms=1: same address (so relative links work), plus
  // element ids and the editor overlay
  if (admin && /[?&]__cms=1(&|$)/.test(req.url) && fp.endsWith(".html")) {
    const html = admin.instrument(fs.readFileSync(fp, "utf8"));
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    res.end(html);
    return;
  }
  // a catalogue PDF opened without having filled the form: show the form instead
  if (isCatalogue(p)) {
    if (!hasAccess(req)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' });
      res.end(req.method === 'HEAD' ? '' : gatePage(p));
      return;
    }
    serveFile(req, res, fp, { 'Cache-Control': 'private, no-store' });
    return;
  }
  serveFile(req, res, fp);
}
server.listen(PORT, () => console.log('pilotindia clone -> http://localhost:' + PORT + '/   admin -> http://localhost:' + PORT + '/admin/' + (dbMode() ? '   (edits stored in Postgres)' : '')));
