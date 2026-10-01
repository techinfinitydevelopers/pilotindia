// Restyles the "Technical Excellence" block on the spray-guns mirror. This was
// the one section on the page still running stock Elementor icon-box widgets
// (white rounded-square icon tiles, default spacing) - everything around it
// (marquee / pg-feat / luboss) had already been converted; this brings the
// fourth into the same design language.
//
// New layout: the four capability cards move into a 2x2 grid on one side, the
// existing product-image carousel widget sits untouched in a themed panel on
// the other - same six images, same Elementor swiper markup and settings, so
// its own JS keeps driving the fade/autoplay exactly as before. Only the
// chrome around it is new.
//
// Pattern only. All copy, all four SVG icons and the carousel are Pilot's own,
// read straight out of the existing page - nothing invented or imported.
//
// Idempotent: reads either the original Elementor markup or its own previous
// output, so it is safe to re-run.
//
//   node tools/sprayguns-technical.mjs [siteDir]
import fs from 'node:fs';
import path from 'node:path';

const CLONE = process.argv[2] || path.join(process.cwd(), 'pilotindia-clone');
const FILE = path.join(CLONE, 'spray-guns', 'index.html');
const BLOCK_ID = 'elementor-element-a3a9452'; // outer container of the whole section

let html = fs.readFileSync(FILE, 'utf8');

function spanOf(src, startIdx) {
  const open = /<div\b/gi, close = /<\/div\s*>/gi;
  let depth = 0, i = startIdx;
  while (i < src.length) {
    open.lastIndex = i; close.lastIndex = i;
    const o = open.exec(src), c = close.exec(src);
    if (!c) return -1;
    if (o && o.index < c.index) { depth++; i = o.index + 4; }
    else { depth--; i = c.index + c[0].length; if (depth === 0) return i; }
  }
  return -1;
}

const clean = (s) => s
  .replace(/<br\s*\/?>/gi, ' ')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&#045;/g, '-')
  .replace(/&#8217;|&rsquo;/g, "'")
  .replace(/\s+/g, ' ')
  .trim();

// ---- locate whatever is currently there ------------------------------------
const origStart = html.indexOf('<div class="elementor-element ' + BLOCK_ID);
const mineStart = html.indexOf('<section class="pg-tech" id="pg-tech"');

const blockStart = origStart >= 0 ? origStart : mineStart;
if (blockStart < 0) { console.error('neither the Elementor section nor a previous pg-tech block was found'); process.exit(1); }

let block;
if (origStart >= 0) {
  const blockEnd = spanOf(html, blockStart);
  if (blockEnd < 0) { console.error('could not match closing tag on the Elementor block'); process.exit(1); }
  block = html.slice(blockStart, blockEnd);
} else {
  const endMarker = '<!-- /pg-tech -->';
  const markerAt = html.indexOf(endMarker, blockStart);
  if (markerAt < 0) { console.error('could not find the end marker of a previous pg-tech block'); process.exit(1); }
  block = html.slice(blockStart, markerAt + endMarker.length);
}

// ---- pull the source of truth out of whichever markup we found -------------
// Held either in data-pg-src="..." (our own re-run) or read live off the
// Elementor widgets (first run). Building the source payload once keeps the
// two paths - fresh crawl vs. re-run after this script already ran - identical.
let heading, subhead, cards, carousel;

if (origStart >= 0) {
  const h2 = block.match(/<h2[^>]*class="elementor-heading-title[^"]*"[^>]*>([\s\S]*?)<\/h2>/);
  heading = clean(h2[1]);
  const sub = block.match(/elementor-widget-text-editor[\s\S]*?<p>([\s\S]*?)<\/p>/);
  subhead = clean(sub[1]);

  const iconBoxRe = /<div class="elementor-element elementor-element-\w+ elementor-view-framed[\s\S]*?<span\s+class="elementor-icon">([\s\S]*?)<\/span>[\s\S]*?<h3 class="elementor-icon-box-title">\s*<span\s*>([\s\S]*?)<\/span>\s*<\/h3>[\s\S]*?<p class="elementor-icon-box-description">([\s\S]*?)<\/p>/g;
  cards = [];
  let m;
  while ((m = iconBoxRe.exec(block))) {
    cards.push({ svg: m[1].trim(), title: clean(m[2]), desc: clean(m[3]) });
  }
  if (cards.length !== 4) { console.error('expected 4 icon-box cards, found ' + cards.length); process.exit(1); }

  const carStart = block.search(/<div class="elementor-element elementor-element-\w+ elementor-arrows-position-outside elementor-widget elementor-widget-image-carousel"/);
  if (carStart < 0) { console.error('carousel widget not found'); process.exit(1); }
  const carEnd = spanOf(block, carStart);
  if (carEnd < 0) { console.error('could not match the carousel widget closing tag'); process.exit(1); }
  carousel = block.slice(carStart, carEnd);
} else {
  const src = block.match(/data-pg-src="([^"]*)"/);
  if (!src) { console.error('previous pg-tech block carries no data-pg-src payload'); process.exit(1); }
  const payload = JSON.parse(Buffer.from(src[1], 'base64').toString('utf8'));
  ({ heading, subhead, cards, carousel } = payload);
}

// keep the raw extraction around inside our own output, base64-encoded, so a
// second run never has to re-parse Elementor markup that no longer exists
const payload = Buffer.from(JSON.stringify({ heading, subhead, cards, carousel }), 'utf8').toString('base64');

const cardHtml = (c, i) => `
        <div class="pg-tech__card" tabindex="0" style="transition-delay:${i * 70}ms">
          <span class="pg-tech__icon">${c.svg}</span>
          <h3 class="pg-tech__title">${c.title}</h3>
          <p class="pg-tech__desc">${c.desc}</p>
        </div>`;

const newBlock = `<section class="pg-tech" id="pg-tech" data-pg-src="${payload}">
  <div class="pg-tech__wrap">
    <div class="pg-tech__head">
      <span class="pg-tech__eyebrow">Built in house</span>
      <h2 class="pg-tech__h2">${heading}</h2>
      <p class="pg-tech__lead">${subhead}</p>
    </div>
    <div class="pg-tech__grid">
      <div class="pg-tech__cards">${cards.map(cardHtml).join('')}
      </div>
      <div class="pg-tech__visual">
        ${carousel}
      </div>
    </div>
  </div>
</section>
<!-- /pg-tech -->`;

html = html.slice(0, blockStart) + newBlock + html.slice(blockStart + block.length);

// ---- wire the stylesheet in, once ----
if (!html.includes('pg-tech.css')) {
  html = html.replace('<link rel="stylesheet" href="assets/css/pg-features.css" />',
    '<link rel="stylesheet" href="assets/css/pg-features.css" />\n<link rel="stylesheet" href="assets/css/pg-tech.css" />');
}

fs.writeFileSync(FILE, html, 'utf8');
console.log('spray-guns/index.html: Technical Excellence rebuilt as pg-tech (' + cards.length + ' cards)');
