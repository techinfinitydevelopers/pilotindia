// Loading hints for the pages visitors land on. Changes how images are fetched and decoded, never the images themselves.
//   decoding="async"  on every image: the browser decodes off the main thread, so scrolling past a large photo no longer stalls
//   loading="lazy"    on every image except the first three on the page (logo, hero): below-the-fold images wait until near the screen
//   pg-warm.js        once the page is idle, fetches and decodes those lazy images in order, so a big photo is ready before it scrolls in
// Images that already say loading=, decoding= or fetchpriority= are left alone, so re-running changes nothing.
//
//   node tools/perf-hints.mjs [page ...]      (paths relative to pilotindia-clone)
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(process.cwd(), 'pilotindia-clone');
const PAGES = process.argv.slice(2).length ? process.argv.slice(2) : [
  'index.html', 'spray-guns/index.html', 'airless/index.html', 'welding/index.html', 'office/index.html',
  'pages/power-tools.html', 'pages/about-us.html', 'pages/contact-us.html',
  // the series / product pages
  ...['evolution-series', 'legacy-series', 'air-brush', 'electric-spray-guns', 'service-guns', 'pressure-feed-tanks', 'electric-series', 'electro-hydraulic-series', 'pneumatic-series',
    'gas-welding-brazing-torches', 'gas-cutting-torches', 'gas-regulators', 'currency-counters', 'currency-sorters', 'paper-shredders'].map(n => 'pages/' + n + '.html'),
];
const EAGER = 3;

for (const rel of PAGES) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) { console.log(rel + ': missing, skipped'); continue; }
  const html = fs.readFileSync(file, 'utf8');
  const body = html.indexOf('<body');
  let seen = 0, lazy = 0, dec = 0;
  const out = html.slice(0, body) + html.slice(body).replace(/<img\b[^>]*>/g, tag => {
    // a lazy-loader placeholder (data: src) is handled by the page's own script
    if (/\ssrc="data:/.test(tag) || !/\ssrc="/.test(tag)) return tag;
    seen++;
    let t = tag;
    const add = s => { t = t.replace(/\s*\/?>$/, m => ' ' + s + (/\/>$/.test(m) ? ' />' : '>')); };
    if (!/\sdecoding=/.test(t)) { add('decoding="async"'); dec++; }
    if (seen > EAGER && !/\sloading=/.test(t) && !/\sfetchpriority=/.test(t)) { add('loading="lazy"'); lazy++; }
    return t;
  });
  let final = out;
  const up = '../'.repeat(rel.split('/').length - 1);
  if (!final.includes('pg-warm.js')) {
    const at = final.lastIndexOf('</body>');
    if (at >= 0) final = final.slice(0, at) + '<script src="' + up + 'assets/js/pg-warm.js" defer></script>\n' + final.slice(at);
  }
  if (final !== html) fs.writeFileSync(file, final, 'utf8');
  console.log(rel.padEnd(30) + 'images ' + seen + ' | decoding=async added ' + dec + ' | loading=lazy added ' + lazy);
}
