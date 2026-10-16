// Removes every "Download Manual" link (and its PDF icon) from the series pages; the product cards keep only
// "Download Catalogue" (2026-10-16). Two shapes exist: a table cell of its own (desktop card) and an inline
// icon + link inside the catalogue paragraph (phone card). Idempotent; prints what it removed per page.
//   node tools/remove-manuals.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.resolve('pilotindia-clone/pages');
const dry = process.argv.includes('--dry');
const CELL = /<td[^>]*>(?:(?!<\/?td\b)[\s\S])*?>\s*Download Manual\s*<\/a>(?:(?!<\/?td\b)[\s\S])*?<\/td>/gi;
const INLINE = /<img\b[^>]*\bpi-pdf-icon\b[^>]*>(?:\s|&nbsp;| )*<a\b[^>]*>\s*Download Manual\s*<\/a>/gi;

let total = 0;
for (const f of fs.readdirSync(DIR).filter(f => f.endsWith('.html'))) {
  const abs = path.join(DIR, f);
  const src = fs.readFileSync(abs, 'utf8');
  const before = (src.match(/Download Manual/gi) || []).length;
  if (!before) continue;
  let n = 0;
  const out = src.replace(CELL, () => (n++, '')).replace(INLINE, () => (n++, ''));
  const left = (out.match(/Download Manual/gi) || []).length;
  console.log(f.padEnd(28), 'removed', n, left ? 'LEFT ' + left : '');
  total += n;
  if (!dry && n) fs.writeFileSync(abs, out);
}
console.log('total removed', total);
