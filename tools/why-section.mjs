// Rebuilds the Elementor "Why choose <Pilot ...>?" block of a product landing page as the pg-why section
// (heading + intro, four features as photo cards, "Why professionals trust Pilot" box full width underneath).
// Every sentence is read from the old markup, so the words stay the same. Styles: assets/css/pg-why.css.
// Which block: the e-parent container that holds an <h2> starting "Why choose". Its widgets are read in document
// order: h2, intro text, 4 x (icon-box title + text), trust heading, trust text, check list, button.
// Idempotent: a page without that block is skipped.
//   node tools/why-section.mjs [--dry] airless office welding power-tools      (2026-11-18)
// spray-guns/index.html was converted first by tools/why-spray-guns.mjs (same output).
import fs from 'node:fs';
import path from 'node:path';

const SITE = path.resolve('pilotindia-clone');
// per page: file, and the four photos [file, w, h, object-position, alt, fit?] in the order of the four features
const PAGES = {
  airless: { file: 'airless/index.html', photos: [
    ['airless-spray-systems-scaled.jpg', 2560, 1299, '40% 50%', 'A worker in protective clothing spraying a wall with a Pilot airless machine'],
    ['low-angle-worker-spraying-powder-paint-from-gun-scaled-1.jpg', 2560, 1707, '50% 50%', 'A fine mist of paint leaving a spray gun'],
    ['airless.jpg', 757, 440, '30% 50%', 'Pilot airless spray machines on trolleys'],
    ['man-spraying-powder-paint-full-shot-scaled-1.jpg', 2560, 1707, '50% 50%', 'A painter spraying a large surface in a workshop'],
  ] },
  office: { file: 'office/index.html', photos: [
    ['note-counting-machines-scaled.jpg', 2560, 1299, '78% 50%', 'A Pilot currency counting machine on a shop counter'],
    ['documents-confidence-pointing-paper-graphs-financial-scaled-2.webp', 2560, 1707, '50% 50%', 'Hands working over printed graphs and documents'],
    ['paper-shrdr-scaled.jpg', 2560, 1299, '88% 50%', 'A Pilot paper shredder standing in an office'],
    ['businessman-suit-putting-last-piece-pyramid-using-wooden-blocks-scaled-2.webp', 2560, 1707, '50% 50%', 'A hand placing the last block on a stepped pyramid of blocks'],
  ] },
  welding: { file: 'welding/index.html', photos: [
    ['plasma-laser-cnc-industrial-machine-cutting-iron-steel-metalwork-workshop-scaled.jpg', 2560, 1709, '50% 50%', 'A cutting machine throwing sparks on a steel plate'],
    ['2kkgf6sk3c-metal-brazing-fabrication-in-vietnam.jpg', 1500, 563, '40% 50%', 'A gas torch heating metal at a brazing joint'],
    ['dark-stithy-workshop-with-hammer-anvil-firs-plan-fire-stove-background-scaled.jpg', 2560, 1707, '50% 50%', 'A forge with glowing fire, hammer and anvil'],
    ['welding-equipments-scaled.jpg', 2560, 1299, '55% 50%', 'A welder in a helmet and goggles working on a pipe'],
  ] },
  'power-tools': { file: 'pages/power-tools.html', photos: [
    ['factory-workshop-interior-machines-glass-industry-background-process-production-scaled-1.jpg', 2560, 1707, '40% 50%', 'A factory hall with heavy machines'],
    ['hg-252.png', 400, 600, '50% 50%', 'A Pilot HG-25 heat gun', 'product'],
    ['dark-stithy-workshop-with-hammer-anvil-firs-plan-fire-stove-background-scaled.jpg', 2560, 1707, '50% 50%', 'A workshop with a glowing fire, hammer and anvil'],
    ['businessman-suit-putting-last-piece-pyramid-using-wooden-blocks-scaled-2.webp', 2560, 1707, '50% 50%', 'A hand placing the last block on a stepped pyramid of blocks'],
  ] },
};

const dry = process.argv.includes('--dry');
const want = process.argv.slice(2).filter(a => !a.startsWith('--'));
const CSS = '<link rel="stylesheet" href="../assets/css/pg-why.css?v=7" />';
const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#f58634"/><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#111" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const text = s => s.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

function divEnd(html, start) {
  let depth = 0; const re = /<\/?div\b[^>]*>/g; re.lastIndex = start;
  for (let m; (m = re.exec(html));) { if (m[0][1] === '/') { if (--depth === 0) return re.lastIndex; } else depth++; }
  throw new Error('unbalanced <div>');
}
// inner HTML of a widget's .elementor-widget-container
function widgetHtml(block, at) {
  const c = block.indexOf('elementor-widget-container', at);
  const open = block.indexOf('>', c) + 1;
  let d = 1; const r = /<\/?div\b[^>]*>/g; r.lastIndex = open;
  for (let m; (m = r.exec(block));) { if (m[0][1] === '/') { if (--d === 0) return block.slice(open, m.index); } else d++; }
  throw new Error('widget not closed');
}

function convert(name) {
  const cfg = PAGES[name];
  if (!cfg) throw new Error('unknown page ' + name);
  const file = path.join(SITE, cfg.file);
  let html = fs.readFileSync(file, 'utf8');
  const h2At = html.search(/<h2[^>]*>\s*Why choose/i);
  if (h2At < 0) { console.log(name + ': already converted'); return; }
  // the e-parent container around that h2
  let start = html.lastIndexOf('e-parent', h2At); start = html.lastIndexOf('<div', start);
  const end = divEnd(html, start);
  const block = html.slice(start, end);
  // widgets in document order
  const ws = [...block.matchAll(/<div class="elementor-element[^"]*\belementor-widget\b[^"]*\belementor-widget-(heading|text-editor|icon-box|icon-list|button)\b[^"]*"/g)]
    .map(m => ({ kind: m[1], at: m.index }));
  const kinds = ws.map(w => w.kind).join(',');
  const expect = 'heading,text-editor,icon-box,text-editor,icon-box,text-editor,icon-box,text-editor,icon-box,text-editor,heading,text-editor,icon-list,button';
  if (kinds !== expect) throw new Error(name + ': unexpected widgets: ' + kinds);
  const H = ws.map(w => widgetHtml(block, w.at));
  const h2 = H[0];
  // the heading as written: words in order, the accent words (the old orange span) marked; an accent that ends the
  // heading goes on its own line
  const h2Main = text(h2);
  const marked = text(h2.replace(/<span[^>]*>([\s\S]*?)<\/span>/g, (m, t) => ' \u0001' + text(t) + '\u0002 '));
  const h2Html = marked.replace(/\u0001([^\u0002]*)\u0002$/, '<span class="is-end">$1</span>').replace(/\u0001([^\u0002]*)\u0002/g, '<span>$1</span>');
  const lead = text(H[1]);
  const feats = [0, 1, 2, 3].map(i => ({ title: text((H[2 + i * 2].match(/<h3[\s\S]*?<\/h3>/) || [''])[0]), desc: text(H[3 + i * 2]), photo: cfg.photos[i] }));
  const tTitle = text(H[10]), tText = text(H[11]);
  const tItems = [...H[12].matchAll(/elementor-icon-list-text">([\s\S]*?)<\/span>/g)].map(m => text(m[1]));
  const bHref = (H[13].match(/href="([^"]+)"/) || [])[1];
  const bText = text((H[13].match(/elementor-button-text">([\s\S]*?)<\/span>/) || [])[1] || '');
  if (!h2Main || !lead || !tTitle || !tText || !bHref || !bText || tItems.length !== 4 || feats.some(f => !f.title || !f.desc)) throw new Error(name + ': incomplete extraction');
  for (const f of feats) if (!fs.existsSync(path.join(SITE, 'assets/img', f.photo[0]))) throw new Error('missing photo ' + f.photo[0]);

  const card = (f, i) => {
    const [img, w, h, pos, alt, kind] = f.photo;
    return `      <article class="pg-why__card${kind === 'product' ? ' pg-why__card--product' : ''}" tabindex="0">
        <img src="../assets/img/${img}" alt="${esc(alt)}" width="${w}" height="${h}" loading="lazy" decoding="async" style="object-position: ${pos}" />
        <span class="pg-why__n" aria-hidden="true">0${i + 1}</span>
        <div class="pg-why__body"><h3>${f.title}</h3><div class="pg-why__more"><p>${f.desc}</p></div></div>
      </article>`;
  };
  const out = `<section class="pg-why" aria-labelledby="pg-why-title">
  <div class="pg-why__wrap">
    <header class="pg-why__head">
      <h2 class="pg-why__h2" id="pg-why-title">${h2Html}</h2>
      <p class="pg-why__lead">${lead}</p>
    </header>
    <div class="pg-why__grid">
${feats.map(card).join('\n')}
    </div>
    <aside class="pg-why__trust">
      <div>
        <h3>${tTitle.replace(/\b(trust\b.*)$/i, '<span>$1</span>')}</h3>
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

  console.log(`${name}: ${h2Html}`);
  feats.forEach((f, i) => console.log('  ' + (i + 1), f.title, '-', f.desc.slice(0, 48) + '...  [' + f.photo[0].slice(0, 36) + ']'));
  console.log('  trust:', tTitle, '|', tItems.join(' / '), '|', bText, bHref);
  html = html.slice(0, start) + out + html.slice(end);
  if (!html.includes('pg-why.css')) {
    const a = html.indexOf('</head>');
    html = html.slice(0, a) + CSS + '\n' + html.slice(a);
  }
  if (!dry) { fs.writeFileSync(file, html); console.log('  written (' + block.length + ' -> ' + out.length + ' chars)'); }
}
for (const n of want.length ? want : Object.keys(PAGES)) convert(n);
