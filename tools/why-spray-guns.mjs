// Rebuilds the "Why choose a Pilot spray gun for professional finishing?" block on spray-guns/index.html
// (Elementor container dc6c0dc) as the pg-why section: heading + intro, the four features as photo cards, and the
// "Why professionals trust Pilot" box full width underneath. Every sentence is read from the old markup, so the
// words stay the same. Styles: assets/css/pg-why.css. Idempotent: does nothing once the block is gone.
//   node tools/why-spray-guns.mjs [--dry]      (2026-11-18)
import fs from 'node:fs';
import path from 'node:path';

const FILE = path.resolve('pilotindia-clone/spray-guns/index.html');
const CSS = '<link rel="stylesheet" href="../assets/css/pg-why.css?v=2" />';
let html = fs.readFileSync(FILE, 'utf8');

const at = html.indexOf('elementor-element-dc6c0dc');
if (at < 0) { console.log('already converted'); process.exit(0); }
const start = html.lastIndexOf('<div', at);
let depth = 0, end = -1;
const re = /<\/?div\b[^>]*>/g; re.lastIndex = start;
for (let m; (m = re.exec(html));) { if (m[0][1] === '/') { if (--depth === 0) { end = re.lastIndex; break; } } else depth++; }
if (end < 0) throw new Error('end of the block not found');
const block = html.slice(start, end);

// the inner HTML of the widget with this data-id (its .elementor-widget-container)
function widget(id) {
  const i = block.indexOf('data-id="' + id + '"');
  if (i < 0) throw new Error('widget ' + id + ' not found');
  const c = block.indexOf('elementor-widget-container', i);
  const open = block.indexOf('>', c) + 1;
  let d = 1; const r = /<\/?div\b[^>]*>/g; r.lastIndex = open;
  for (let m; (m = r.exec(block));) { if (m[0][1] === '/') { if (--d === 0) return block.slice(open, m.index); } else d++; }
  throw new Error('widget ' + id + ' not closed');
}
const text = s => s.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

const h2 = widget('18fb6a3');
const h2Main = text(h2.replace(/<span[\s\S]*?<\/span>/, ''));
const h2Accent = text((h2.match(/<span[^>]*>([\s\S]*?)<\/span>/) || [])[1] || '');
const lead = text(widget('19648d4'));
const feats = [
  ['e03bdc7', '6eed349', 'built-for-professionals.jpg', 1127, 648, '52% 50%', 'A Pilot TYPE 59 spray gun releasing a fine, even mist'],
  ['eedaa60', '6398e89', 'closeup-shot-worker-protective-gloves-painting-wooden-details-scaled-1.jpg', 2560, 1707, '62% 45%', 'A gloved hand holding a spray gun with a relaxed grip while painting'],
  ['5d176ac', '96775b7', 'betterteam-spray-painter-job-description-2400x2400-20210126.webp', 2400, 1260, '36% 50%', 'A painter in protective gear spraying steel beams in a workshop'],
  ['44e5c42', '0434825', 'the-application-of-thermal-spray-coatings-on-vintage-cars-edited.jpg', 1000, 667, '62% 50%', 'A painter refinishing a car panel with a spray gun'],
].map(([t, d, img, w, h, pos, alt]) => ({ title: text((widget(t).match(/<h3[\s\S]*?<\/h3>/) || [''])[0]), desc: text(widget(d)), img, w, h, pos, alt }));
const tTitle = text(widget('ecb8b2d'));
const tText = text(widget('d126144'));
const tItems = [...widget('b2af2bd').matchAll(/elementor-icon-list-text">([\s\S]*?)<\/span>/g)].map(m => text(m[1]));
const btn = widget('86b744b');
const bHref = (btn.match(/href="([^"]+)"/) || [])[1];
const bText = text((btn.match(/elementor-button-text">([\s\S]*?)<\/span>/) || [])[1] || '');
for (const [k, v] of Object.entries({ h2Main, h2Accent, lead, tTitle, tText, bHref, bText })) if (!v) throw new Error('missing ' + k);
if (feats.some(f => !f.title || !f.desc) || tItems.length !== 4) throw new Error('features or list incomplete');

const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#f58634"/><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#111" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const out = `<section class="pg-why" aria-labelledby="pg-why-title">
  <div class="pg-why__wrap">
    <header class="pg-why__head">
      <h2 class="pg-why__h2" id="pg-why-title">${h2Main} <span>${h2Accent}</span></h2>
      <p class="pg-why__lead">${lead}</p>
    </header>
    <div class="pg-why__grid">
${feats.map((f, i) => `      <article class="pg-why__card" tabindex="0">
        <img src="../assets/img/${f.img}" alt="${f.alt}" width="${f.w}" height="${f.h}" loading="lazy" decoding="async" style="object-position: ${f.pos}" />
        <span class="pg-why__n" aria-hidden="true">0${i + 1}</span>
        <div class="pg-why__body"><h3>${f.title}</h3><div class="pg-why__more"><p>${f.desc}</p></div></div>
      </article>`).join('\n')}
    </div>
    <aside class="pg-why__trust">
      <div>
        <h3>${tTitle}</h3>
        <p>${tText}</p>
      </div>
      <div>
        <ul class="pg-why__list">
${tItems.map(t => `          <li>${CHECK}<span>${t}</span></li>`).join('\n')}
        </ul>
        <a class="pg-why__cta" href="${bHref}">${bText} ${ARROW}</a>
      </div>
    </aside>
  </div>
</section>`;

html = html.slice(0, start) + out + html.slice(end);
if (!html.includes('pg-why.css')) {
  const anchor = html.indexOf('<link rel="stylesheet" href="../assets/css/pg-spray.css');
  const at2 = anchor >= 0 ? anchor : html.indexOf('</head>');
  html = html.slice(0, at2) + CSS + '\n' + html.slice(at2);
}
console.log('heading:', h2Main, '|', h2Accent);
feats.forEach((f, i) => console.log('card', i + 1, f.title, '-', f.desc.slice(0, 50) + '...'));
console.log('trust:', tTitle, '| items:', tItems.join(' / '), '| button:', bText, bHref);
if (!process.argv.includes('--dry')) { fs.writeFileSync(FILE, html); console.log('written: replaced', block.length, 'chars with', out.length); }
