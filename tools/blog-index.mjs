// Builds the Blogs page (pages/blogs.html): every post of the Pilot sites, newest first, with a search box, a filter by
// site and "show more". Which posts exist, and on which domain, is tools/blog-sources.json (see tools/blog-sources.mjs);
// a post shared by several domains is listed once.
//
// Every title, date, picture and summary is read from the post's own file. Nothing is written by hand.
// Also writes blog/index.html (a redirect) so /blog/ lands on the Blogs page.
//
//   node tools/blog-index.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');   // not cwd: the admin also runs this in-process
const ROOT = path.join(REPO, 'pilotindia-clone');
const SOURCES = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'blog-sources.json'), 'utf8'));   // slug -> the Pilot domains it is on
const slugs = Object.keys(SOURCES);
const LABEL = { 'pilotindia.com': 'Pilot India', 'pilotsprayguns.com': 'Spray Guns', 'pilotairless.com': 'Airless', 'pilotwelding.com': 'Welding', 'pilotofficeproducts.com': 'Office' };
const decode = s => s.replace(/&#(\d+);/g, (m, d) => String.fromCharCode(+d)).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const posts = slugs.map(slug => {
  const h = fs.readFileSync(path.join(ROOT, 'blog', slug + '.html'), 'utf8');
  const pick = re => { const m = h.match(re); return m ? decode(m[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim() : ''; };
  const date = pick(/<span class="published">([^<]*)<\/span>/);
  return {
    slug,
    sources: SOURCES[slug],
    title: pick(/<h1[^>]*entry-title[^>]*>([\s\S]*?)<\/h1>/),
    date,
    time: Date.parse(date) || 0,
    image: pick(/<meta\s+property="og:image"\s+content="([^"]+)"/),
    summary: pick(/<meta\s+name="description"\s+content="([^"]*)"/),
  };
}).sort((a, b) => b.time - a.time || a.title.localeCompare(b.title));

const card = p => `<article class="pi-blogs__card" data-s="${p.sources.join(' ')}" data-q="${esc((p.title + ' ' + p.summary).toLowerCase())}">
  <a class="pi-blogs__link" href="../blog/${p.slug}.html">
    <span class="pi-blogs__pic"><img src="${esc(p.image)}" alt="" loading="lazy" decoding="async"></span>
    <span class="pi-blogs__meta">${esc(p.date)}</span>
    <h2 class="pi-blogs__title">${esc(p.title)}</h2>
    <p class="pi-blogs__sum">${esc(p.summary)}</p>
  </a>
</article>`;

const block = `<div class="pi-blogs" id="pi-blogs" data-count="${posts.length}">
  <div class="pi-blogs__bar">
    <label class="pi-blogs__search"><input type="search" placeholder="Search articles" aria-label="Search articles"></label>
    <span class="pi-blogs__count" aria-live="polite"></span>
  </div>
  <div class="pi-blogs__pills" role="group" aria-label="Filter by site">
    <button type="button" class="pi-blogs__pill is-on" data-s="">All (${posts.length})</button>
${Object.keys(LABEL).map(d => `    <button type="button" class="pi-blogs__pill" data-s="${d}">${LABEL[d]} (${posts.filter(p => p.sources.includes(d)).length})</button>`).join('\n')}
  </div>
  <div class="pi-blogs__grid">
${posts.map(card).join('\n')}
  </div>
  <p class="pi-blogs__none" hidden>No articles match.</p>
  <button class="pi-blogs__more" type="button" hidden>Show more</button>
</div>`;

// ---- pages/blogs.html: replace the empty entry content, keep the page's own header, title and footer ----
const file = path.join(ROOT, 'pages', 'blogs.html');
let html = fs.readFileSync(file, 'utf8');
const startMark = '<div class="entry-content">';
const at = html.indexOf(startMark);
if (at < 0) throw new Error('blogs page: entry-content not found');
let depth = 0, end = -1; const re = /<(\/?)div\b[^>]*>/g; re.lastIndex = at;
for (let m; (m = re.exec(html));) { depth += m[1] ? -1 : 1; if (depth === 0) { end = re.lastIndex; break; } }
html = html.slice(0, at) + '<div class="entry-content">\n' + block + '\n</div>' + html.slice(end);

// the page shows the list at full width, without the Divi sidebar
html = html.replace(/<body class="([^"]*)"/, (m, c) => /\bpi-blogs-page\b/.test(c) ? m : `<body class="${c} pi-blogs-page"`);
if (!html.includes('pi-blogs.css')) html = html.replace('</head>', '<link rel="stylesheet" href="../assets/css/pi-blogs.css?v=2" />\n</head>');
if (!html.includes('pi-blogs.js')) { const b = html.lastIndexOf('</body>'); html = html.slice(0, b) + '<script src="../assets/js/pi-blogs.js?v=2" defer></script>\n' + html.slice(b); }
fs.writeFileSync(file, html, 'utf8');

// ---- /blog/ -> the Blogs page ----
fs.writeFileSync(path.join(ROOT, 'blog', 'index.html'), `<!DOCTYPE html>
<html lang="en-US"><head><meta charset="utf-8"><title>Blogs - Pilot India</title>
<meta name="robots" content="noindex"><link rel="canonical" href="../pages/blogs.html">
<meta http-equiv="refresh" content="0; url=../pages/blogs.html">
<script>location.replace('../pages/blogs.html' + location.search + location.hash);</script></head>
<body><a href="../pages/blogs.html">Blogs</a></body></html>
`, 'utf8');
console.log('blogs page built: ' + posts.length + ' posts, newest ' + posts[0].date + ' (' + posts[0].title.slice(0, 50) + '), oldest ' + posts[posts.length - 1].date);
