// Turns a product landing page's "bento" trust section (five cards with icon, heading and text) into the "lines" variant:
// five ruled lines with only the numbered headings, written letter by letter by the spray-gun mascot as you scroll
// (assets/js/pg-spray.js, assets/css/pg-spray.css, class bento--lines). Icons and card text are removed, as requested;
// the heading keeps its words, with the brand part wrapped in a <span> so it shows in the site's orange.
// Idempotent: a page that is already converted is skipped.
//   node tools/bento-lines.mjs [--dry] [airless office welding power-tools spray-guns]      (2026-11-19)
import fs from 'node:fs';
import path from 'node:path';

const SITE = path.resolve('pilotindia-clone');
const PAGES = {
  'spray-guns': { file: 'spray-guns/index.html', accent: 'Pilot Paint Spray Guns' },
  airless: { file: 'airless/index.html', accent: 'Pilot Airless Paint Spray Systems' },
  office: { file: 'office/index.html', accent: 'Pilot Office Products' },
  welding: { file: 'welding/index.html', accent: 'Pilot Welding Equipment' },
  'power-tools': { file: 'pages/power-tools.html', accent: 'Pilot Power Tools' },
};
const dry = process.argv.includes('--dry');
const want = process.argv.slice(2).filter(a => !a.startsWith('--'));

for (const name of want.length ? want : Object.keys(PAGES)) {
  const cfg = PAGES[name];
  if (!cfg) throw new Error('unknown page ' + name);
  const file = path.join(SITE, cfg.file);
  let html = fs.readFileSync(file, 'utf8');
  const a = html.indexOf('<section class="bento');
  const b = html.indexOf('</section>', a);
  if (a < 0 || b < 0) throw new Error(name + ': bento section not found');
  let sec = html.slice(a, b);
  if (/class="bento bento--lines"/.test(sec)) { console.log(name + ': already converted'); continue; }
  const before = sec.length;
  sec = sec.replace('<section class="bento"', '<section class="bento bento--lines"');
  sec = sec.replace(/<span class="bento__icon">[\s\S]*?<\/span>/g, '');
  sec = sec.replace(/<p class="bento__d">[\s\S]*?<\/p>/g, '');
  // brand part of the heading in its own span (orange)
  const h2 = sec.match(/(<h2 class="bento__h2"[^>]*>)([\s\S]*?)(<\/h2>)/);
  if (!h2 || !h2[2].includes(cfg.accent)) throw new Error(name + ': heading does not contain "' + cfg.accent + '": ' + (h2 && h2[2]));
  sec = sec.replace(h2[0], h2[1] + h2[2].replace(cfg.accent, '<span>' + cfg.accent + '</span>') + h2[3]);
  const titles = [...sec.matchAll(/<h3 class="bento__t">([\s\S]*?)<\/h3>/g)].map(m => m[1]);
  if (titles.length !== 5 || /bento__d|bento__icon/.test(sec)) throw new Error(name + ': unexpected result (' + titles.length + ' titles)');
  console.log(name + ': ' + before + ' -> ' + sec.length + ' chars | ' + titles.join(' | '));
  html = html.slice(0, a) + sec + html.slice(b);
  if (!dry) fs.writeFileSync(file, html);
}
