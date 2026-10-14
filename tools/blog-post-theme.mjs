// Links the blog post theme (assets/css/pi-post.css + assets/js/pi-post.js) into every blog post page
// (blog/*.html whose <body> has the class "single-post"). Idempotent: an existing link is updated to VERSION.
// New posts made in the admin are copies of an existing post, so they carry the links too.
//   node tools/blog-post-theme.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';

const VERSION = 6;
const DIR = path.resolve(import.meta.dirname, '..', 'pilotindia-clone', 'blog');
const dry = process.argv.includes('--dry');
const TAGS = `<link rel="stylesheet" href="../assets/css/pi-post.css?v=${VERSION}" />\n<script src="../assets/js/pi-post.js?v=${VERSION}" defer></script>\n`;

let done = 0, skipped = 0;
for (const f of fs.readdirSync(DIR)) {
  if (!f.endsWith('.html')) continue;
  const p = path.join(DIR, f);
  let h = fs.readFileSync(p, 'utf8');
  if (!/<body[^>]*class="[^"]*\bsingle-post\b/.test(h)) { skipped++; continue; }
  const o = h;
  h = h.replace(/<link rel="stylesheet" href="\.\.\/assets\/css\/pi-post\.css[^"]*" \/>\n?/g, '').replace(/<script src="\.\.\/assets\/js\/pi-post\.js[^"]*" defer><\/script>\n?/g, '');
  const at = h.search(/<\/head>/i);
  if (at < 0) { skipped++; continue; }
  h = h.slice(0, at) + TAGS + h.slice(at);
  if (h !== o) { done++; if (!dry) fs.writeFileSync(p, h); }
}
console.log({ linked: done, skipped });
