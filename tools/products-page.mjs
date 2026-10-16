// Builds pages/products.html (public URL /products): every product line, every series and every model
// on one page, read from the live series pages, so it always matches the catalogue. The navbar's
// "Products" item opens it. The admin rebuilds it after every product / series / category change.
//
//   node tools/products-page.mjs
//
// The page shell (head, navbar, footer, scripts) is taken from pages/contact-us.html; only the
// <article> is replaced. Styles: assets/css/pi-products.css.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// each product line's landing page and the short line the site's menu already uses for it
const LINE_INFO = {
  'Spray Guns': { href: '../spray-guns/', desc: 'Evolution, HVLP & legacy series' },
  'Airless Spray Systems': { href: '../airless/', desc: 'High-output hydraulic & electric' },
  'Welding Equipment': { href: '../welding/', desc: 'Industrial gas welding & regulators' },
  'Office Products': { href: '../office/', desc: 'Currency counters & shredders' },
  'Power Tools': { href: 'power-tools.html', desc: 'Drills, grinders & saws' },
};
// the clean cut-out photos used on the landing-page collection trays
const SERIES_IMG = {
  'evolution-series': 'pg-coll-evolution.jpg', 'legacy-series': 'pg-coll-legacy.jpg', 'air-brush': 'pg-coll-airbrush.jpg',
  'electric-spray-guns': 'pg-coll-electric.jpg', 'service-guns': 'pg-coll-service.jpg', 'pressure-feed-tanks': 'pg-coll-tanks.jpg',
  'electric-series': 'pg-coll-electric-airless.jpg', 'electro-hydraulic-series': 'pg-coll-hydraulic.jpg', 'pneumatic-series': 'pg-coll-pneumatic.jpg',
  'gas-welding-brazing-torches': 'pg-coll-torch-weld.jpg', 'gas-cutting-torches': 'pg-coll-torch-cut.jpg', 'gas-regulators': 'pg-coll-regulator.jpg',
  'paper-shredders': 'pg-coll-shredder.jpg', 'currency-counters': 'pg-coll-counter.jpg', 'currency-sorters': 'pg-coll-sorter.jpg',
};

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘' };
const decode = s => String(s).replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : (ENT[e.toLowerCase()] ?? m));
const text = h => decode(String(h).replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const titleCase = s => s.toLowerCase().replace(/(^|[\s(&/-])([a-z])/g, (m, a, b) => a + b.toUpperCase());

function blockEnd(src, at) {
  const re = /<(\/?)div\b[^>]*>/g; re.lastIndex = at; let d = 0, m;
  while ((m = re.exec(src))) { d += m[1] ? -1 : 1; if (d === 0) return re.lastIndex; }
  return src.length;
}

function readSeries(root, base) {
  const file = path.join(root, 'pages', base + '.html');
  if (!fs.existsSync(file)) return null;
  const html = fs.readFileSync(file, 'utf8');
  if (!/class="[^"]*\bpg-series\b/.test(html)) return null;
  // name: the current entry of the page's own series menu, else the banner title, else the file name
  const menu = html.match(/<li[^>]*current-menu-item[^>]*>\s*<a[^>]*>([^<]+)<\/a>/i);
  const heroAt = html.search(/class="[^"]*\bpg-hero\b/);
  const hero = heroAt > 0 ? html.slice(heroAt, blockEnd(html, html.lastIndexOf('<div', heroAt))) : '';
  const heroTitle = (hero.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/) || [])[1];
  const name = titleCase(text(menu ? menu[1] : heroTitle || base.replace(/-/g, ' ')));
  const intro = text((hero.match(/<p\b[^>]*>([\s\S]*?)<\/p>/) || [])[1] || '');
  const models = [];
  for (const m of html.matchAll(/<div class="[^"]*\bpg-prod--desk\b[^"]*" id="(model-[^"]+)"/g)) {
    const sec = html.slice(m.index, blockEnd(html, m.index));
    // its own first <h1>, plus an <h1> directly after it (CV-70 / UV/MG/IR) - never the headings of a
    // model nested inside it (broken markup would otherwise repeat names)
    const h1 = sec.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>(\s*<h1\b[^>]*>([\s\S]*?)<\/h1>)?/);
    const names = h1 ? [text(h1[1]), h1[3] ? text(h1[3]) : ''].filter(Boolean) : [];
    const bg = sec.match(/background-image:\s*url\(\s*["']?([^"')]+)["']?\s*\)/i);
    const img = sec.match(/<img\b[^>]*?(?:bv-data-src|data-src)="([^"]+)"/i) || sec.match(/<img\b[^>]*?\ssrc="(?!data:)([^"]+)"/i);
    models.push({ id: m[1], name: names.join(' ') || m[1].replace(/^model-/, '').toUpperCase(), img: (bg && bg[1]) || (img && img[1]) || '' });
  }
  const image = SERIES_IMG[base] ? '../assets/img/' + SERIES_IMG[base] : (models.find(x => x.img) || {}).img || '';
  return { base, name, intro, models, image };
}

export function buildProductsPage({ root, lines, partOf = {} }) {
  const shellFile = path.join(root, 'pages', 'contact-us.html');
  const shell = fs.readFileSync(shellFile, 'utf8');
  const a = shell.indexOf('<article'), b = shell.indexOf('</article>');
  if (a < 0 || b < 0) throw new Error('page shell: <article> not found in contact-us.html');

  // the lines, each with its series (a page that is part of another series follows its owner)
  const groups = [];
  for (const [line, bases] of lines) {
    const list = [];
    for (const base of bases) {
      const s = readSeries(root, base); if (s) list.push(s);
      for (const [part, owner] of Object.entries(partOf)) if (owner === base) { const p = readSeries(root, part); if (p) list.push(p); }
    }
    if (list.length) groups.push({ line, info: LINE_INFO[line] || {}, series: list });
  }
  const nSeries = groups.reduce((n, g) => n + g.series.length, 0);
  const nModels = groups.reduce((n, g) => n + g.series.reduce((k, s) => k + s.models.length, 0), 0);
  const slug = s => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
  const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 5.3 19.9 12l-6.7 6.7-1.4-1.4 4.3-4.3H4v-2h12.1l-4.3-4.3z"/></svg>';

  const card = (s, i) => {
    const shown = s.models.slice(0, 6), more = s.models.length - shown.length;
    return `
          <article class="pp-card" style="--i:${i}">
            <a class="pp-card__media" href="${esc(s.base)}.html" tabindex="-1" aria-hidden="true">${s.image ? `<img src="${esc(s.image)}" alt="" loading="lazy" decoding="async" />` : ''}</a>
            <div class="pp-card__body">
              <span class="pp-card__count">${s.models.length} model${s.models.length === 1 ? '' : 's'}</span>
              <h3 class="pp-card__t"><a href="${esc(s.base)}.html">${esc(s.name)}</a></h3>
              ${s.intro ? `<p class="pp-card__d">${esc(s.intro.length > 150 ? s.intro.slice(0, s.intro.lastIndexOf(' ', 146)) + '…' : s.intro)}</p>` : ''}
              ${shown.length > 1 ? `<ul class="pp-card__models">${shown.map(m => `<li><a href="${esc(s.base)}.html?model=${esc(m.id)}">${esc(m.name)}</a></li>`).join('')}${more > 0 ? `<li><a class="pp-more" href="${esc(s.base)}.html">+${more} more</a></li>` : ''}</ul>` : ''}
              <a class="pp-card__go" href="${esc(s.base)}.html">View series ${ARROW}</a>
            </div>
          </article>`;
  };

  const body = `<article id="pi-products" class="page type-page">
  <section class="pi-products">
    <header class="pp-hero">
      <div class="pp-wrap">
        <p class="pp-eyebrow">Pilot India · Products</p>
        <h1 class="pp-hero__t">Every Pilot product, <em>in one place.</em></h1>
        <p class="pp-hero__d">Spray guns, airless spray systems, gas welding equipment, office products and power tools: browse every series and open any model directly.</p>
        <ul class="pp-stats">
          <li><b>${groups.length}</b><span>Product lines</span></li>
          <li><b>${nSeries}</b><span>Series</span></li>
          <li><b>${nModels}</b><span>Models</span></li>
        </ul>
      </div>
    </header>

    <nav class="pp-filter" aria-label="Product lines">
      <div class="pp-wrap pp-filter__in">
${groups.map((g, i) => `        <a href="#${slug(g.line)}"${i === 0 ? ' class="is-on"' : ''}>${esc(g.line)} <span>${g.series.length}</span></a>`).join('\n')}
      </div>
    </nav>

    <div class="pp-wrap pp-lines">
${groups.map((g, gi) => `      <section class="pp-line" id="${slug(g.line)}">
        <header class="pp-line__head">
          <span class="pp-line__n">${String(gi + 1).padStart(2, '0')}</span>
          <div class="pp-line__title">
            <h2>${esc(g.line)}</h2>
            ${g.info.desc ? `<p>${esc(g.info.desc)}</p>` : ''}
          </div>
          ${g.info.href ? `<a class="pp-line__go" href="${esc(g.info.href)}">Explore ${esc(g.line)} ${ARROW}</a>` : ''}
        </header>
        <div class="pp-grid">${g.series.map(card).join('')}
        </div>
      </section>`).join('\n')}
    </div>

    <section class="pp-cta">
      <div class="pp-wrap pp-cta__in">
        <div>
          <p class="pp-eyebrow">Need help choosing?</p>
          <h2>Tell us the job. <em>We will suggest the tool.</em></h2>
        </div>
        <div class="pp-cta__btns">
          <a class="pp-btn pp-btn--fill" href="contact-us.html">Talk to our team ${ARROW}</a>
          <a class="pp-btn" href="tel:+912266047000">+91 22 6604 7000</a>
        </div>
      </div>
    </section>
  </section>
  <script>
  (function () {
    var pills = [].slice.call(document.querySelectorAll('.pp-filter a'));
    var lines = pills.map(function (a) { return document.querySelector(a.getAttribute('href')); });
    function onScroll() {
      var y = window.scrollY + window.innerHeight * 0.3, cur = 0;
      lines.forEach(function (s, i) { if (s && s.getBoundingClientRect().top + window.scrollY <= y) cur = i; });
      pills.forEach(function (a, i) { a.classList.toggle('is-on', i === cur); });
    }
    // the pill tucks away once the last product line has been passed (the call-to-action takes over)
    var bar = document.querySelector('.pp-filter'), end = document.querySelector('.pp-cta');
    function away() { if (bar && end) bar.classList.toggle('is-away', end.getBoundingClientRect().top < window.innerHeight * 0.85); }
    window.addEventListener('scroll', function () { onScroll(); away(); }, { passive: true }); onScroll(); away();
  })();
  </script>
</article>`;

  let html = shell.slice(0, a) + body + shell.slice(b + '</article>'.length);
  const title = 'Products | Pilot India';
  const desc = 'All Pilot India products: ' + groups.map(g => g.line).join(', ') + '. ' + nSeries + ' series, ' + nModels + ' models.';
  html = html
    .replace(/<title>[\s\S]*?<\/title>/, '<title>' + esc(title) + '</title>')
    .replace(/(<meta\b[^>]*\b(?:property|name)="(?:og:title|twitter:title)"[^>]*\bcontent=")[^"]*"/g, (m, p) => p + esc(title) + '"')
    .replace(/(<meta\b[^>]*\b(?:property|name)="(?:description|og:description|twitter:description)"[^>]*\bcontent=")[^"]*"/g, (m, p) => p + esc(desc) + '"')
    .replace(/(<meta\b[^>]*\bproperty="og:url"[^>]*\bcontent=")[^"]*"/, (m, p) => p + 'products.html"')
    .replace(/(<link rel="canonical" href=")[^"]*"/, (m, p) => p + 'products.html"')
    .replace(/<body class="/, '<body class="pi-products-page ')
    // the shell is the Contact page: Products, not Contact, is the current navbar item
    .replace(/(<a class="framer-dyn-link) is-active("[^>]*?) aria-current="page"/g, '$1$2')
    .replace(/<button class="framer-dyn-link" type="button"/, '<button class="framer-dyn-link is-active" type="button" aria-current="page"')
    // ...and the Contact page's own stylesheet, script and body class do not belong here (tools/contact-us.mjs)
    .replace(/<link rel="stylesheet" href="\.\.\/assets\/css\/pi-contact\.css[^"]*" \/>\r?\n?/, '')
    .replace(/<script src="\.\.\/assets\/js\/pi-contact\.js[^"]*" defer><\/script>\r?\n?/, '')
    .replace('<body class="pi-products-page pi-contact-page ', '<body class="pi-products-page ')
    .replace(/<!-- pi-contact:(start|end) -->\r?\n?/g, '');
  if (!html.includes('pi-products.css')) html = html.replace('</head>', '<link rel="stylesheet" href="../assets/css/pi-products.css?v=3" />\n</head>');
  fs.writeFileSync(path.join(root, 'pages', 'products.html'), html);
  return { lines: groups.length, series: nSeries, models: nModels };
}

// CLI: node tools/products-page.mjs
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
  const ROOT = path.join(REPO, 'pilotindia-clone');
  const admin = await import('../admin/server.mjs');
  admin.initAdmin(ROOT, REPO);
  const r = buildProductsPage({ root: ROOT, lines: admin.productLines(), partOf: admin.PART_OF });
  console.log(`pages/products.html: ${r.lines} lines, ${r.series} series, ${r.models} models`);
  process.exit(0);
}
