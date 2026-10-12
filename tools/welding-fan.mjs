// Welding page, Technical Excellence: swaps the carousel (the progress-bar / blurred-card "sc3d" block) for the "fan" gallery
// (assets/css/pg-fan.css, assets/js/pg-fan.js): the middle picture large, the others stepping down in size and fading to
// either side. The heading, the paragraph and the four capability cards of the section are not touched.
// The pictures and their names are the ones the page already used (their original alt text). Idempotent.
//
//   node tools/welding-fan.mjs
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'parse5';
import { buildCards } from './fan-cards.mjs';

const FILE = path.join(process.cwd(), 'pilotindia-clone', 'welding', 'index.html');
const SLIDES = [
  ['gas-torch-swage-1', 'Gas torch (Swage)'],
  ['gas-torch-detachable-1', 'Gas torch (Detachable)'],
  ['gas-torches', 'Gas torches'],
  ['gt-18', 'GT 18'],
  ['gas-regulator-oxygen-2', 'Gas regulator (oxygen) 2'],
  ['gas-torch-swage', 'Gas torch (Swage)'],
  ['gct', 'GCT'],
  ['gas-regulator-oxygen-1', 'Gas regulator (oxygen) 1'],
  ['gas-regulator-acetylene-1', 'Gas regulator (acetylene) 1'],
];
const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const block = `<div class="pg-fan" id="pg-fan" role="region" aria-roledescription="carousel" aria-label="Pilot Welding Equipment Showcase">
        <div class="pg-fan__stage" tabindex="0" aria-live="off">
          <p class="pg-fan__cap" aria-hidden="true">${esc(SLIDES[0][1])}</p>
          <span class="pg-fan__mark pg-fan__mark--l" aria-hidden="true"></span><span class="pg-fan__mark pg-fan__mark--r" aria-hidden="true"></span>
${SLIDES.map(([f, alt], i) => `          <button type="button" class="pg-fan__tile" data-name="${esc(alt)}" aria-label="${esc(alt)} (${i + 1} of ${SLIDES.length})"><img src="../assets/img/${f}.png" alt="${esc(alt)}" loading="lazy" decoding="async" draggable="false" /></button>`).join('\n')}
        </div>
      </div>`;

let html = fs.readFileSync(FILE, 'utf8');
const doc = parse(html, { sourceCodeLocationInfo: true });
let hit = null;
(function walk(n) {
  if (hit) return;
  if (n.tagName === 'div' && (n.attrs || []).some(a => a.name === 'id' && (a.value === 'sc3d' || a.value === 'pg-fan'))) { hit = n; return; }
  (n.childNodes || []).forEach(walk);
})(doc);
if (!hit) throw new Error('no sc3d / pg-fan block found in welding/index.html');
const { startOffset, endOffset } = hit.sourceCodeLocation;
html = html.slice(0, startOffset) + block + html.slice(endOffset);

// the four capability cards: the same card as on the other product pages, and the section carries the same class
{
  const doc2 = parse(html, { sourceCodeLocationInfo: true });
  const find = (n, pred, out = []) => { if (n.tagName && pred(n)) out.push(n); (n.childNodes || []).forEach(k => find(k, pred, out)); return out; };
  const cls = (n, c) => ((n.attrs || []).find(a => a.name === 'class') || { value: '' }).value.split(/\s+/).includes(c);
  const sec = find(doc2, n => n.tagName === 'section' && (n.attrs || []).some(a => a.name === 'id' && a.value === 'pg-tech'))[0];
  const cardEls = find(sec, n => cls(n, 'pg-tech__card'));
  const box = find(sec, n => cls(n, 'pg-tech__cards-bottom') || cls(n, 'pg-tech__cards'))[0];
  if (box && cardEls.length >= 2) html = html.slice(0, box.sourceCodeLocation.startOffset) + buildCards(cardEls) + html.slice(box.sourceCodeLocation.endOffset);
  if (!/class="pg-tech pg-tech--sc3d pg-tech--fan"/.test(html)) html = html.replace('class="pg-tech pg-tech--sc3d"', 'class="pg-tech pg-tech--sc3d pg-tech--fan"');
}

if (!html.includes('pg-fan.css')) html = html.replace(/<\/head>/i, () => '<link rel="stylesheet" href="../assets/css/pg-fan.css?v=5" />\n</head>');
if (!html.includes('pg-fan.js')) html = html.replace(/<\/body>/i, () => '<script src="../assets/js/pg-fan.js?v=5" defer></script>\n</body>');
fs.writeFileSync(FILE, html);
console.log('welding: carousel replaced by the fan gallery (' + SLIDES.length + ' pictures)');
