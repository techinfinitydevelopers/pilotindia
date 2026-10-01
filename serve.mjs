// Static server for the pilotindia-clone mirror.
//   node serve.mjs [port]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'pilotindia-clone');
const PORT = Number(process.argv[2] || 8080);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.avif': 'image/avif', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.eot': 'application/vnd.ms-fontobject', '.otf': 'font/otf',
  '.pdf': 'application/pdf', '.mp4': 'video/mp4', '.webm': 'video/webm', '.xml': 'application/xml',
};

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
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
    if (!hit) { res.writeHead(404, { 'Content-Type': 'text/html' }).end('<h1>404</h1><p>' + p + '</p>'); return; }
    fp = hit;
  }

  const body = fs.readFileSync(fp);
  res.writeHead(200, {
    'Content-Type': TYPES[path.extname(fp).toLowerCase()] || 'application/octet-stream',
    'Content-Length': body.length,
    'Cache-Control': 'no-cache',
  });
  res.end(body);
}).listen(PORT, () => console.log('pilotindia clone -> http://localhost:' + PORT + '/'));
