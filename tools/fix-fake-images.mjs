// The WordPress mirror saved some images as HTML error pages (the file starts with <!DOCTYPE html>), so they never
// show. This points every reference to such a file at a real copy of the same picture that the mirror did save
// (same photo, full size: never a smaller variant). It also lists the fake files that have no real copy.
//   node tools/fix-fake-images.mjs [--dry]
// Found by tools/ui-audit.mjs (2026-10-16).
import fs from 'node:fs';
import path from 'node:path';

const SITE = path.resolve('pilotindia-clone');
const dry = process.argv.includes('--dry');
const bv = (base, to) => ['', '-resized-desktop', '-resized-ipad', '-resized-mobile'].map(s => [base.replace('%', s), to(s)]);
const MAP = [
  ['businessman-suit-putting-last-piece-pyramid-using-wooden-blocks-scaled.webp', 'businessman-suit-putting-last-piece-pyramid-using-wooden-blocks-scaled-2.webp'],
  ...bv('factory-workshop-interior-machines-glass-production-background-1080x675-jpg-bv%-jpg-bv.webp'.replace('-jpg-bv%-jpg-bv', '-jpg-bv%-jpg-bv'), () => 'factory-workshop-interior-machines-glass-production-background-1080x675.jpg'),
  ...bv('home-pg-gas-torches-gas-regulator-png-bv%-png-bv.webp', s => 'home-pg-gas-torches-gas-regulator-png-bv' + s + (s ? '-png-bv' : '') + '-v2.webp'),
  ...bv('pilot-logo-1-png-bv%-png-bv-v3.webp', s => 'pilot-logo-1-png-bv' + s + (s ? '-png-bv' : '') + '-v2.webp'),
  ...bv('spray-guns1-scaled-jpg-bv%-jpg-bv.webp', () => 'spray-guns1-scaled.jpg'),
  ...bv('vish1346-scaled-jpg-bv%-jpg-bv.webp', () => 'vish1346-scaled.jpg'),
  ['welding-equipments-scaled-1.jpg', 'welding-equipments-scaled.jpg'],
  ['welding-equipments.jpg', 'welding-equipments-scaled.jpg'],
  ['u2011volume-environments-1024x576.jpeg', 'choosing-the-right-currency-counter-machine-for-high-volume-environments.jpeg'],
].map(([a, b]) => [a.replace('-jpg-bv-jpg-bv', '-jpg-bv').replace('-png-bv-png-bv', '-png-bv'), b]);

const IMG = path.join(SITE, 'assets/img');
const isFake = f => { try { const b = Buffer.alloc(16); const fd = fs.openSync(path.join(IMG, f), 'r'); fs.readSync(fd, b, 0, 16, 0); fs.closeSync(fd); return /^\s*<(!doctype|html)/i.test(b.toString('latin1')); } catch { return null; } };
for (let i = MAP.length - 1; i >= 0; i--) {
  const [from, to] = MAP[i];
  if (isFake(from) === null) { MAP.splice(i, 1); continue; }      // that size was never saved at all
  if (isFake(from) !== true) throw new Error('not a fake image: ' + from);
  if (isFake(to) !== false) throw new Error('replacement missing or fake: ' + to);
}

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) { if (!['img', 'media', 'fonts'].includes(e.name)) walk(f); }
    else if (/\.(html|css|js|json)$/i.test(e.name)) files.push(f);
  }
})(SITE);

let total = 0;
for (const f of files) {
  let s = fs.readFileSync(f, 'utf8'), n = 0;
  for (const [from, to] of MAP) {
    // only a whole file name right after a "/" (so "welding-equipments.jpg" never matches inside a longer name)
    const parts = s.split('/' + from);
    if (parts.length > 1) { n += parts.length - 1; s = parts.join('/' + to); }
  }
  if (n) { total += n; console.log(path.relative(SITE, f).padEnd(70), n); if (!dry) fs.writeFileSync(f, s); }
}
console.log('references fixed:', total);
