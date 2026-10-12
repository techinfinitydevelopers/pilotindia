// The little PDF icon next to "Download Catalogue" on the product pages was a lazy-load placeholder: its real picture was only in
// bv-data-src (one page even pointed at a dead WordPress path), so the series-page styles - which look for img[src*="pdf"] -
// never matched it, the icon showed as a broken image with its alt text, and the button around it was drawn as a circle.
// This gives every such icon its real src (assets/img/pdf-*.png), drops the lazy-load attributes, and marks it decorative
// (the link next to it already says "Download Catalogue"). Idempotent.
//
//   node tools/fix-pdf-icons.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(process.cwd(), 'pilotindia-clone');
const files = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== 'assets') walk(p); } else if (e.name.endsWith('.html')) files.push(p); } })(ROOT);

let pages = 0, icons = 0;
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  const prefix = path.relative(path.dirname(f), path.join(ROOT, 'assets', 'img')).split(path.sep).join('/') + '/';
  const out = html.replace(/<img\b[^>]*>/gi, tag => {
    const real = (tag.match(/\bbv-data-src="([^"]*pdf[^"]*\.png)"/i) || tag.match(/\bsrc="([^"]*pdf[^"]*\.png)"/i) || [])[1];
    if (!real) return tag;
    const file = real.split('/').pop();
    if (!fs.existsSync(path.join(ROOT, 'assets', 'img', file))) return tag;
    const w = (tag.match(/\bwidth="(\d+)"/) || [])[1] || '42', h = (tag.match(/\bheight="(\d+)"/) || [])[1] || '40';
    const fixed = `<img src="${prefix}${file}" alt="" width="${w}" height="${h}" decoding="async" class="pi-pdf-icon" />`;
    if (fixed !== tag) icons++;
    return fixed;
  });
  if (out !== html) { fs.writeFileSync(f, out); pages++; }
}
console.log('fixed ' + icons + ' PDF icons on ' + pages + ' pages');
