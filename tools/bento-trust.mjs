// Rebuilds the "features / why trust Pilot" block (heading + five cards) on the product pages as a bento grid.
// Styles: assets/css/bento-trust.css (scoped to section.bento).
//
// Everything shown is read from the block it replaces: the heading, each card's icon, title and text. No label or
// sentence is added. Works from either the original pg-feat block or an earlier bento build, so re-running is safe.
//
//   node tools/bento-trust.mjs [page ...]      default: spray-guns/index.html welding/index.html office/index.html pages/power-tools.html
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(process.cwd(), 'pilotindia-clone');
const PAGES = process.argv.slice(2).length ? process.argv.slice(2)
  : ['spray-guns/index.html', 'airless/index.html', 'welding/index.html', 'office/index.html', 'pages/power-tools.html'];

function endOf(src, at) {
  const re = /<(\/?)div\b[^>]*>/g; re.lastIndex = at;
  let depth = 0, m;
  while ((m = re.exec(src))) { depth += m[1] ? -1 : 1; if (depth === 0) return re.lastIndex; }
  throw new Error('unbalanced markup after ' + at);
}
const CLASSES = ['a', 'b', 'c', 'd', 'e'];

for (const rel of PAGES) {
  const file = path.join(ROOT, rel);
  let html = fs.readFileSync(file, 'utf8');
  let from, to, heading, items;

  const bentoAt = html.indexOf('<section class="bento"');
  const featAt = html.indexOf('<div class="pg-feat" id="pg-feat">');
  if (bentoAt >= 0) {
    from = bentoAt;
    to = html.indexOf('<!-- /bento -->', bentoAt) + '<!-- /bento -->'.length;
    const seg = html.slice(from, to);
    heading = seg.match(/<h2 class="bento__h2"[^>]*>([\s\S]*?)<\/h2>/)[1];
    items = [...seg.matchAll(/<img src="([^"]+)"[^>]*>[\s\S]*?<h3 class="bento__t">([\s\S]*?)<\/h3>\s*<p class="bento__d">([\s\S]*?)<\/p>/g)].map(m => ({ icon: m[1], t: m[2], d: m[3] }));
  } else if (featAt >= 0) {
    from = featAt; to = endOf(html, featAt);
    const seg = html.slice(from, to);
    heading = seg.match(/<h[12][^>]*class="pg-feat__title"[^>]*>([\s\S]*?)<\/h[12]>/)[1];
    items = [...seg.matchAll(/<article class="pg-feat__item">\s*<span class="pg-feat__icon"><img src="([^"]+)"[^>]*>\s*<\/span>\s*<h3 class="pg-feat__t">([\s\S]*?)<\/h3>\s*<p class="pg-feat__d">([\s\S]*?)<\/p>\s*<\/article>/g)].map(m => ({ icon: m[1], t: m[2], d: m[3] }));
  } else if (html.includes('elementor-image-box-title')) {
    // Airless: the original Elementor build - a heading container followed by a container of five image-box cards
    const hAt = html.search(/<h2 class="elementor-heading-title[^"]*">\s*Achieve A Perfect Finish/);
    if (hAt < 0) { console.log(rel + ': heading not found, skipped'); continue; }
    const c1 = html.lastIndexOf('<div', html.lastIndexOf('e-parent', hAt));
    const e1 = endOf(html, c1);
    const c2 = html.indexOf('<div class="elementor-element', e1);
    const e2 = endOf(html, c2);
    if (html.slice(e1, c2).replace(/\s+/g, '') !== '') throw new Error(rel + ': unexpected markup between the heading and the cards');
    from = c1; to = e2;
    heading = html.slice(c1, e1).match(/<h2[^>]*>([\s\S]*?)<\/h2>/)[1].replace(/\s+/g, ' ').trim();
    const tidy = s => s.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    items = [...html.slice(c2, e2).matchAll(/<img[^>]*bv-data-src="([^"]+)"[\s\S]*?elementor-image-box-title">([\s\S]*?)<\/h3>[\s\S]*?<p>([\s\S]*?)<\/p>/g)].map(m => ({ icon: m[1], t: tidy(m[2]), d: tidy(m[3]) }));
  } else { console.log(rel + ': no features block found, skipped'); continue; }
  if (items.length !== 5) throw new Error(rel + ': expected 5 cards, found ' + items.length);

  const cards = items.map((it, k) => `<article class="bento__card bento__card--${CLASSES[k]}"><span class="bento__num">${String(k + 1).padStart(2, '0')}</span><span class="bento__icon"><img src="${it.icon}" alt="" width="44" height="44" loading="lazy" decoding="async"></span><h3 class="bento__t">${it.t}</h3><p class="bento__d">${it.d}</p></article>`).join('\n        ');
  const block = `<section class="bento" id="trust" aria-labelledby="bento-title">\n  <div class="bento__wrap">\n    <header class="bento__head"><h2 class="bento__h2" id="bento-title">${heading}</h2></header>\n    <div class="bento__grid">\n        ${cards}\n    </div>\n  </div>\n</section>\n<!-- /bento -->`;
  html = html.slice(0, from) + block + html.slice(to);

  const up = '../'.repeat(rel.split('/').length - 1);
  if (!html.includes('bento-trust.css')) html = html.replace('</head>', `<link rel="stylesheet" href="${up}assets/css/bento-trust.css?v=10" />\n</head>`);
  else html = html.replace(/bento-trust\.css\?v=\d+/, 'bento-trust.css?v=10');
  fs.writeFileSync(file, html, 'utf8');
  console.log(rel.padEnd(26) + 'bento built: ' + items.length + ' cards | ' + heading.replace(/\s+/g, ' ').slice(0, 60));
}
