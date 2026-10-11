// Rebuilds the About Us page body (pages/about-us.html) as the `pi-about` layout:
//   intro (heading + text), figure cards, vision / mission, and an auto-scrolling carousel of the
//   facility photos with their captions. Styles: assets/css/pi-about.css.
//
// Every word, number, icon and photo is read from the original Divi section; nothing is added or
// reworded. The extracted content is stored base64-encoded in data-pi-src, so re-running rebuilds from
// that payload instead of re-parsing (idempotent).
//
//   node tools/about-page.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(REPO, 'pilotindia-clone', 'pages', 'about-us.html');
const CSS = '<link rel="stylesheet" href="../assets/css/pi-about.css?v=1" />';
let html = fs.readFileSync(FILE, 'utf8');

function blockEnd(src, at) {
  const re = /<(\/?)(div|section)\b[^>]*>/g; re.lastIndex = at; let d = 0, m;
  while ((m = re.exec(src))) { d += m[1] ? -1 : 1; if (d === 0) return re.lastIndex; }
  throw new Error('unbalanced markup');
}
const inner = cls => {
  const i = html.indexOf(`et_pb_text ${cls} `);
  if (i < 0) throw new Error('missing ' + cls);
  const a = html.indexOf('<div class="et_pb_text_inner">', i) + '<div class="et_pb_text_inner">'.length;
  return html.slice(a, blockEnd(html, html.lastIndexOf('<div', a - 1)) - '</div>'.length).trim();
};
const attr = (tag, name) => { const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`)); return m ? m[1] : ''; };
const textOf = h => h.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

let data, from, to;
const built = html.indexOf('<section class="pi-about"');
if (built >= 0) {
  data = JSON.parse(Buffer.from(attr(html.slice(built, html.indexOf('>', built)), 'data-pi-src'), 'base64').toString('utf8'));
  from = built; to = blockEnd(html, built);
} else {
  from = html.indexOf('<div class="et_pb_section et_pb_section_0');
  if (from < 0) throw new Error('About Us section not found');
  to = blockEnd(html, from);

  // figures: walk the three stat modules in order. A <p> before a number is its small top label,
  // a <p> after it is the label, an image is the icon, text after a lone icon is that icon's label.
  const stats = [];
  for (const cls of ['et_pb_text_2', 'et_pb_text_3', 'et_pb_text_4']) {
    const src = inner(cls);
    const tokens = [...src.matchAll(/<h1>([\s\S]*?)<\/h1>|<p>([\s\S]*?)<\/p>|<img\b[^>]*>|<\/div>\s*<div>\s*([^<\s][^<]*)/g)];
    let cur = null, pre = null;
    for (const t of tokens) {
      if (t[1] !== undefined) { cur = { pre, num: textOf(t[1]) }; pre = null; stats.push(cur); continue; }
      const piece = t[2] !== undefined ? t[2] : t[0];
      const img = piece.match(/<img\b[^>]*>/);
      const words = textOf(piece.replace(/<img\b[^>]*>/g, ''));
      if (t[2] !== undefined && !img && !cur) { pre = words; continue; }
      if (img) {
        const icon = { src: attr(img[0], 'bv-data-src') || attr(img[0], 'src'), alt: attr(img[0], 'alt') };
        if (cur && !cur.icon) { if (words && !cur.label) cur.label = words; cur.icon = icon; }
        else { cur = { icon }; stats.push(cur); }
        if (words && !cur.label) cur.label = words;
        cur = cur.label ? null : cur;
        continue;
      }
      if (t[2] !== undefined && pre === null && cur && !cur.label) { cur.label = words; continue; }
      if (t[2] !== undefined) { pre = words; continue; }
    }
    // trailing caption after a lone icon ("Certification")
    const tail = [...src.matchAll(/<img\b[^>]*>\s*(?:<br\s*\/?>)?\s*([A-Za-z][^<]*)<\/div>/g)].pop();
    const last = stats[stats.length - 1];
    if (tail && last && !last.label) last.label = textOf(tail[1]);
  }

  const shots = ['et_pb_image_0', 'et_pb_image_1', 'et_pb_image_2'].map((cls, i) => {
    const at = html.indexOf(`et_pb_image ${cls}"`);
    const img = html.slice(at).match(/<img\b[^>]*>/)[0];
    return {
      src: attr(img, 'bv-data-src') || attr(img, 'src'),
      srcset: attr(img, 'bv-data-srcset') || attr(img, 'srcset'),
      width: attr(img, 'width'), height: attr(img, 'height'), alt: attr(img, 'alt'),
      caption: textOf(inner(['et_pb_text_9', 'et_pb_text_10', 'et_pb_text_11'][i])),
    };
  });

  data = {
    heading: textOf(inner('et_pb_text_0')),
    paras: [...inner('et_pb_text_1').matchAll(/<p>([\s\S]*?)<\/p>/g)].map(m => m[1].trim()),
    stats,
    vision: { title: textOf(inner('et_pb_text_5')), text: inner('et_pb_text_6').replace(/^<p>|<\/p>$/g, '').trim() },
    mission: { title: textOf(inner('et_pb_text_7')), text: inner('et_pb_text_8').replace(/^<p>|<\/p>$/g, '').trim() },
    shots,
  };
}

// sanity: everything the page showed must be here
if (data.paras.length !== 6 || data.stats.length !== 8 || data.shots.length !== 3 || data.stats.some(s => !s.label)) {
  console.error(JSON.stringify(data.stats, null, 1));
  throw new Error('extraction incomplete');
}

const esc = s => String(s).replace(/&(?!#?\w+;)/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const stat = (s, i) => `
        <article class="pi-about__stat" style="--i:${i}">
          ${s.icon ? `<img class="pi-about__icon" src="${esc(s.icon.src)}" alt="${esc(s.icon.alt)}" loading="lazy" decoding="async" />` : ''}
          ${s.pre ? `<span class="pi-about__pre">${s.pre}</span>` : ''}
          ${s.num ? `<strong class="pi-about__num">${s.num}</strong>` : ''}
          <span class="pi-about__label">${s.label}</span>
        </article>`;
const shot = (s, hidden) => `
          <figure class="pi-about__shot"${hidden ? ' aria-hidden="true"' : ''}>
            <div class="pi-about__frame"><img src="${esc(s.src)}" srcset="${esc(s.srcset)}" sizes="(max-width: 640px) 320px, 560px" width="${s.width}" height="${s.height}" alt="${hidden ? '' : esc(s.alt)}" loading="lazy" decoding="async" draggable="false" /></div>
            <figcaption>${s.caption}</figcaption>
          </figure>`;

const out = `<section class="pi-about" data-pi-src="${Buffer.from(JSON.stringify(data)).toString('base64')}">
  <div class="pi-about__wrap">
    <header class="pi-about__intro">
      <div class="pi-about__lead">
        <h1 class="pi-about__h1">${data.heading}</h1>
        <p class="pi-about__first">${data.paras[0]}</p>
      </div>
      <div class="pi-about__body">
${data.paras.slice(1).map(p => `        <p>${p}</p>`).join('\n')}
      </div>
    </header>

    <div class="pi-about__stats">${data.stats.map(stat).join('')}
    </div>

    <div class="pi-about__vm">
      <article class="pi-about__card"><h2>${data.vision.title}</h2><p>${data.vision.text}</p></article>
      <article class="pi-about__card"><h2>${data.mission.title}</h2><p>${data.mission.text}</p></article>
    </div>
  </div>

  <div class="pi-about__reel" aria-label="${esc(data.shots.map(s => s.caption).join(' / '))}">
    <div class="pi-about__track">${data.shots.map(s => shot(s, false)).join('')}${[0, 1, 2].map(() => data.shots.map(s => shot(s, true)).join('')).join('')}
    </div>
  </div>
</section>`;

html = html.slice(0, from) + out + html.slice(to);
if (!html.includes('pi-about.css')) html = html.replace('</head>', CSS + '\n</head>');
fs.writeFileSync(FILE, html);
console.log(`about-us: ${data.paras.length} paragraphs, ${data.stats.length} figures, ${data.shots.length} photos in the carousel`);
console.log(data.stats.map(s => [s.pre, s.num, s.label].filter(Boolean).join(' | ')).join('\n'));
