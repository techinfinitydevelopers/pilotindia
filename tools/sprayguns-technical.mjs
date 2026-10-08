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
// The four product sites (spray-guns, airless, welding, office) all carry the same Elementor block, so
// the same rebuild runs on each; the block is found by its "Technical Excellence" heading.
//
//   node tools/sprayguns-technical.mjs [site folders...]     default: spray-guns airless welding office
import fs from 'node:fs';
import path from 'node:path';

const CLONE = path.join(process.cwd(), 'pilotindia-clone');
const SITES = process.argv.slice(2).length ? process.argv.slice(2) : ['spray-guns', 'airless', 'welding', 'office'];
for (const site of SITES) rebuild(site);

function rebuild(site) {
const FILE = path.join(CLONE, site, 'index.html');
let html = fs.readFileSync(FILE, 'utf8');

// the outer Elementor container (e-parent) that holds the "Technical Excellence" heading
function elementorBlockClass() {
  const t = html.search(/<h2[^>]*elementor-heading-title[^>]*>\s*Technical Excellence/i);
  if (t < 0) return null;
  const parent = html.lastIndexOf('e-parent', t);
  const open = parent < 0 ? -1 : html.lastIndexOf('<div class="elementor-element ', parent);
  const m = open < 0 ? null : html.slice(open, open + 120).match(/elementor-element-[0-9a-f]+/);
  return m ? m[0] : null;
}
const BLOCK_ID = elementorBlockClass() || 'elementor-element-none';

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

// a page that already has the section keeps it: the live markup was refined by hand after this tool
// first ran (three columns, focus carousel), so a rebuild would only throw those edits away
if (origStart < 0 && mineStart >= 0) { console.log(site + '/index.html: pg-tech already in place, left as is'); return; }
const blockStart = origStart >= 0 ? origStart : mineStart;
if (blockStart < 0) { console.error(site + ': neither the Elementor section nor a previous pg-tech block was found'); return; }

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

// the carousel's images, in order, from the Elementor widget (its own loop copies are added at runtime)
const seen = new Set();
const slides = [...carousel.matchAll(/<img\b[^>]*>/g)].map(m => {
  const tag = m[0];
  const a = k => (tag.match(new RegExp('\\s' + k + '="([^"]*)"')) || [])[1] || '';
  const src = a('bv-data-src') || (/^data:/.test(a('src')) ? '' : a('src'));
  return { src, alt: a('alt'), title: a('title') };
}).filter(s => s.src && !seen.has(s.src) && seen.add(s.src));
if (!slides.length) { console.error(site + ': no images in the carousel'); return; }

const SITE_NAME = { 'spray-guns': 'Spray Guns', airless: 'Airless Spray Systems', welding: 'Welding Equipment', office: 'Office Products' }[site] || site;
const n = slides.length;
const slideHtml = (s, i) => {
  const state = i === 0 ? ' is-active' : i === 1 ? ' is-next' : i === n - 1 ? ' is-prev' : '';
  return `
              <div class="focus-carousel__slide${state}" data-index="${i}" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${n}">
                <img src="${s.src}" decoding="async" alt="${s.alt}"${s.title ? ` title="${s.title}"` : ''}>
              </div>`;
};
const dotHtml = (s, i) => `
              <button class="focus-carousel__dot${i === 0 ? ' is-active' : ''}" data-index="${i}" role="tab" aria-selected="${i === 0}" aria-label="Slide ${i + 1}"></button>`;

// same layout as the hand-refined spray-guns section: two cards | focus carousel | two cards
const newBlock = `<section class="pg-tech" id="pg-tech" data-pg-src="${payload}">
  <div class="pg-tech__wrap">
    <div class="pg-tech__head">
      <span class="pg-tech__eyebrow">Built in house</span>
      <h2 class="pg-tech__h2">${heading}</h2>
      <p class="pg-tech__lead">${subhead}</p>
    </div>
    <div class="pg-tech__grid">
      <div class="pg-tech__col pg-tech__col--left">${cards.slice(0, 2).map(cardHtml).join('')}
      </div>
      <div class="pg-tech__col pg-tech__col--center">
        <div class="pg-tech__visual">
          <div class="focus-carousel" id="pg-focus-carousel" role="region" aria-roledescription="carousel" aria-label="Pilot ${SITE_NAME} Gallery">
            <div class="focus-carousel__track" id="pg-focus-track">${slides.map(slideHtml).join('')}
            </div>
            <div class="focus-carousel__dots" role="tablist" aria-label="Carousel pagination">${slides.map(dotHtml).join('')}
            </div>
          </div>
        </div>
      </div>
      <div class="pg-tech__col pg-tech__col--right">${cards.slice(2).map((c, i) => cardHtml(c, i + 2)).join('')}
      </div>
    </div>
  </div>
</section>
<!-- /pg-tech -->`;

html = html.slice(0, blockStart) + newBlock + html.slice(blockStart + block.length);

// ---- wire the shared stylesheet and script in, once (the sites live one folder down from assets/) ----
if (!html.includes('pg-tech.css')) html = html.replace('</head>', '<link rel="stylesheet" href="../assets/css/pg-tech.css?v=3" />\n</head>');
if (!html.includes('pg-tech.js')) html = html.replace(/<\/body>(?![\s\S]*<\/body>)/, '<script src="../assets/js/pg-tech.js?v=3" defer></script>\n</body>');

fs.writeFileSync(FILE, html, 'utf8');
console.log(site + '/index.html: Technical Excellence rebuilt as pg-tech (' + cards.length + ' cards)');
}
