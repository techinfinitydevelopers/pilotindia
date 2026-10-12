// Product pages (spray-guns, airless, office): the Technical Excellence section's small centre carousel becomes the "fan"
// gallery (assets/css/pg-fan.css, assets/js/pg-fan.js), full width under the heading, with the four capability cards in a row
// beneath it. The heading, the paragraph, the card text and icons, and the pictures are the page's own; the section keeps its
// data-pg-src attribute. Welding has its own build: tools/welding-fan.mjs. Idempotent.
//
//   node tools/product-fan.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'parse5';
import { buildCards } from './fan-cards.mjs';

const ROOT = path.join(process.cwd(), 'pilotindia-clone');
const PAGES = ['spray-guns/index.html', 'airless/index.html', 'office/index.html'];
const DRY = process.argv.includes('--dry');

const kids = n => n.childNodes || [];
const attr = (n, k) => ((n.attrs || []).find(a => a.name === k) || {}).value || '';
const hasClass = (n, c) => (' ' + attr(n, 'class') + ' ').includes(' ' + c + ' ');
const text = n => (n.nodeName === '#text' ? n.value : kids(n).map(text).join('')).replace(/\s+/g, ' ').trim();
const all = (n, out = []) => { out.push(n); kids(n).forEach(k => all(k, out)); return out; };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

for (const rel of PAGES) {
  const file = path.join(ROOT, rel);
  let html = fs.readFileSync(file, 'utf8');
  const doc = parse(html, { sourceCodeLocationInfo: true });
  const els = all(doc).filter(n => n.tagName);
  const sec = els.find(e => e.tagName === 'section' && attr(e, 'id') === 'pg-tech');
  if (!sec) { console.log(rel + ': no Technical Excellence section, skipped'); continue; }
  if (hasClass(sec, 'pg-tech--fan')) {
    // an already converted page: only the cards are rebuilt
    const done = all(sec).filter(n => n.tagName);
    const box = done.find(e => hasClass(e, 'pg-tech__cards'));
    const cs = done.filter(e => hasClass(e, 'pg-tech__card'));
    if (!box || cs.length < 2) { console.log(rel + ': already converted, cards not found'); continue; }
    html = html.slice(0, box.sourceCodeLocation.startOffset) + buildCards(cs) + html.slice(box.sourceCodeLocation.endOffset);
    if (!DRY) fs.writeFileSync(file, html);
    console.log(rel + ': cards rebuilt (' + cs.length + ')');
    continue;
  }

  const inside = all(sec).filter(n => n.tagName);
  const eyebrow = inside.find(e => hasClass(e, 'pg-tech__eyebrow'));
  const h2 = inside.find(e => hasClass(e, 'pg-tech__h2'));
  const lead = inside.find(e => hasClass(e, 'pg-tech__lead'));
  const cards = inside.filter(e => hasClass(e, 'pg-tech__card'));
  const slides = inside.filter(e => hasClass(e, 'focus-carousel__slide'));
  const pics = slides.map(s => {
    const im = inside.filter(e => e.tagName === 'img' && s.sourceCodeLocation.startOffset <= e.sourceCodeLocation.startOffset && e.sourceCodeLocation.endOffset <= s.sourceCodeLocation.endOffset)[0];
    return im ? { src: attr(im, 'src') || attr(im, 'bv-data-src'), alt: attr(im, 'alt') } : null;
  }).filter(Boolean);
  if (!h2 || !pics.length || cards.length < 2) { console.log(rel + ': unexpected structure (' + pics.length + ' pictures, ' + cards.length + ' cards), skipped'); continue; }

  // a caption is only shown where the picture has a real name (some pictures are only named "1", "2" ...)
  const name = alt => /[A-Za-z]{2,}/.test(alt || '') ? alt.replace(/\s+/g, ' ').trim() : '';
  const label = (alt, i) => (name(alt) || 'Picture ' + (i + 1)) + ' (' + (i + 1) + ' of ' + pics.length + ')';
  const gallery = `<div class="pg-fan" id="pg-fan" role="region" aria-roledescription="carousel" aria-label="${esc(text(h2))}">
        <div class="pg-fan__stage" tabindex="0" aria-live="off">
          <p class="pg-fan__cap" aria-hidden="true">${esc(name(pics[0].alt))}</p>
          <span class="pg-fan__mark pg-fan__mark--l" aria-hidden="true"></span><span class="pg-fan__mark pg-fan__mark--r" aria-hidden="true"></span>
${pics.map((p, i) => `          <button type="button" class="pg-fan__tile" data-name="${esc(name(p.alt))}" aria-label="${esc(label(p.alt, i))}"><img src="${esc(p.src)}" alt="${esc(name(p.alt))}" loading="lazy" decoding="async" draggable="false" /></button>`).join('\n')}
        </div>
      </div>`;

  const open = html.slice(sec.sourceCodeLocation.startTag.startOffset, sec.sourceCodeLocation.startTag.endOffset).replace('class="pg-tech"', 'class="pg-tech pg-tech--fan"');
  const section = `${open}
    <div class="pg-tech__wrap">
      <div class="pg-tech__head">
        ${eyebrow ? `<span class="pg-tech__eyebrow">${esc(text(eyebrow))}</span>\n        ` : ''}<h2 class="pg-tech__h2">${esc(text(h2))}</h2>
        ${lead ? `<p class="pg-tech__lead">${esc(text(lead))}</p>` : ''}
      </div>
      ${gallery}
      ${buildCards(cards)}
    </div>
  </section>`;
  html = html.slice(0, sec.sourceCodeLocation.startOffset) + section + html.slice(sec.sourceCodeLocation.endOffset);
  if (!html.includes('pg-fan.css')) html = html.replace(/<\/head>/i, () => '<link rel="stylesheet" href="../assets/css/pg-fan.css?v=5" />\n</head>');
  if (!html.includes('pg-fan.js')) html = html.replace(/<\/body>/i, () => '<script src="../assets/js/pg-fan.js?v=5" defer></script>\n</body>');
  if (!DRY) fs.writeFileSync(file, html);
  console.log(rel + ': ' + pics.length + ' pictures, ' + cards.length + ' cards' + (DRY ? ' (dry run)' : ''));
}
