// Product landing heroes (spray-guns, welding, office, airless): black stage + photo right + copy left, and the page's
// collections as image cards on a cut-out tray, in place of the scrolling text strip.
// Styles: assets/css/pg-hero-coll.css. Idempotent (replaces its own output).
//   node tools/product-hero.mjs            all pages
//   node tools/product-hero.mjs welding    one page
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(process.cwd(), 'pilotindia-clone');
const CSS_VERSION = 15;

const PAGES = {
  'spray-guns': {
    file: 'spray-guns/index.html', rel: '..', photo: 'pg-hero-sg.jpg',
    eyebrow: 'Pilot Spray Guns',
    title: ['Craftsmanship in your genes?', 'Stick to your guns.', 'And our spray guns.'],
    sub: 'Six collections, from HVLP spray guns to pressure feed tanks.',
    colls: [
      ['evolution-series', 'Evolution Series', 'HVLP &amp; HP spray guns', 'pg-coll-evolution.jpg'],
      ['legacy-series', 'Legacy Series', 'Conventional, high-pressure', 'pg-coll-legacy.jpg'],
      ['air-brush', 'Air Brush Series', 'Fine detail work', 'pg-coll-airbrush.jpg'],
      ['electric-spray-guns', 'Electric Spray Guns', 'No compressor needed', 'pg-coll-electric.jpg'],
      ['service-guns', 'Service Guns', 'Cleaning &amp; surface prep', 'pg-coll-service.jpg'],
      ['pressure-feed-tanks', 'Pressure Feed Tanks', 'Steady material feed', 'pg-coll-tanks.jpg'],
    ],
  },
  welding: {
    file: 'welding/index.html', rel: '..', photo: 'home-pg-gas-torches-gas-regulator-11.png',
    eyebrow: 'Pilot Welding Equipment',
    title: ['Out to build big things?', 'Go for superior', 'build quality.'],
    sub: 'Three collections: welding &amp; brazing torches, gas cutting torches and gas regulators.',
    colls: [
      ['gas-welding-brazing-torches', 'Gas Welding &amp; Brazing Torches', 'Welding and brazing', 'pg-coll-torch-weld.jpg'],
      ['gas-cutting-torches', 'Gas Cutting Torches', 'Cutting torches', 'pg-coll-torch-cut.jpg'],
      ['gas-regulators', 'Gas Regulators', 'Oxygen &amp; acetylene', 'pg-coll-regulator.jpg'],
    ],
  },
  office: {
    file: 'office/index.html', rel: '..', photo: 'home-pg-v2.png',
    eyebrow: 'Pilot Office Equipment',
    title: ['Like peace of mind?', 'Try a piece of these', 'high-performance office equipments.'],
    sub: 'Three collections: paper shredders, currency counters and currency sorters.',
    colls: [
      ['paper-shredders', 'Paper Shredders', 'Office shredders', 'pg-coll-shredder.jpg'],
      ['currency-counters', 'Currency Counters', 'Value &amp; bundle counters', 'pg-coll-counter.jpg'],
      ['currency-sorters', 'Currency Sorters', 'Currency sorting', 'pg-coll-sorter.jpg'],
    ],
  },
  airless: {
    file: 'airless/index.html', rel: '..', photo: 'home-pg.jpeg',
    eyebrow: 'Pilot Airless Spray Systems',
    title: ['Need a perfect finish ?', 'Start &amp; finish with the', 'right airless spray technology'],
    sub: 'Three series: electric, electro hydraulic and pneumatic.',
    colls: [
      ['electric-series', 'Electric Series', 'Stand &amp; trolley versions', 'pg-coll-electric-airless.jpg'],
      ['electro-hydraulic-series', 'Electro Hydraulic Series', 'Single phase models', 'pg-coll-hydraulic.jpg'],
      ['pneumatic-series', 'Pneumatic Series', 'Air-powered', 'pg-coll-pneumatic.jpg'],
    ],
  },
};

const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 5.3 19.9 12l-6.7 6.7-1.4-1.4 4.3-4.3H4v-2h12.1l-4.3-4.3z"/></svg>';

function endOf(src, at) {
  const re = /<(\/?)div\b[^>]*>/g; re.lastIndex = at;
  let depth = 0, m;
  while ((m = re.exec(src))) { depth += m[1] ? -1 : 1; if (depth === 0) return re.lastIndex; }
  throw new Error('unbalanced markup');
}

function build(p) {
  const n = p.colls.length;
  for (const c of p.colls) {
    if (!fs.existsSync(path.join(ROOT, 'assets', 'img', c[3]))) throw new Error('missing image ' + c[3]);
    if (!fs.existsSync(path.join(ROOT, 'pages', c[0] + '.html'))) throw new Error('missing page ' + c[0]);
  }
  const [t1, t2, t3] = p.title;
  return `<!-- pi-sg-hero:start -->
<div class="pi-sg-hero">
  <div class="pi-sg-hero__copy">
    <p class="pi-sg-hero__eyebrow">${p.eyebrow}</p>
    <h2 class="pi-sg-hero__title"><span>${t1}</span> <span>${t2}</span> <em>${t3}</em></h2>
    <p class="pi-sg-hero__sub">${p.sub}</p>
    <div class="pi-sg-hero__cta">
      <a class="pi-sg-hero__btn" href="#pi-coll">Explore collections${arrow}</a>
      <a class="pi-sg-hero__btn pi-sg-hero__btn--ghost" href="../pages/contact-us.html">Talk to our team</a>
    </div>
  </div>
  <nav class="pi-coll" id="pi-coll" style="--n:${n}" aria-label="Collections">
    <p class="pi-coll__label" data-n="0${n}">Select a collection</p>
    <ul class="pi-coll__list">
${p.colls.map((c, i) => `      <li><a class="pi-coll__card" href="../pages/${c[0]}.html">
        <span class="pi-coll__img"><img src="../assets/img/${c[3]}" alt="" width="120" height="120" loading="lazy"></span>
        <span class="pi-coll__txt"><span class="pi-coll__num">0${i + 1}</span><span class="pi-coll__name">${c[1]}</span><span class="pi-coll__note">${c[2]}</span></span>
        <span class="pi-coll__go">${arrow}</span>
      </a></li>`).join('\n')}
    </ul>
  </nav>
</div>
<!-- pi-sg-hero:end -->`;
}

function apply(key) {
  const p = PAGES[key];
  const file = path.join(ROOT, p.file);
  let html = fs.readFileSync(file, 'utf8');
  const block = build(p);

  const hero = html.indexOf('id="select-series-re"');
  if (hero < 0) throw new Error(key + ': hero container not found');
  const heroOpen = html.lastIndexOf('<div', hero);
  const heroTagEnd = html.indexOf('>', hero);

  if (html.includes('<!-- pi-sg-hero:start -->')) {
    const a = html.indexOf('<!-- pi-sg-hero:start -->'), b = html.indexOf('<!-- pi-sg-hero:end -->') + '<!-- pi-sg-hero:end -->'.length;
    html = html.slice(0, a) + block + html.slice(b);
  } else {
    const w = html.indexOf('<div class="elementor-element elementor-element-', heroTagEnd);
    if (w < 0 || !/elementor-widget-heading/.test(html.slice(w, w + 300))) throw new Error(key + ': heading widget not found');
    html = html.slice(0, w) + block + html.slice(endOf(html, w));
    const m0 = html.indexOf('<!-- ── Marquee: series bar', heroTagEnd);
    const sec = html.indexOf('<div class="pilot-marquee-section">', m0);
    if (m0 < 0 || sec < 0) throw new Error(key + ': marquee not found');
    html = html.slice(0, m0) + html.slice(endOf(html, sec));
  }

  // the page's own hero photo, as a custom property on the container (CSS falls back to the spray-guns photo)
  const open = html.slice(heroOpen, html.indexOf('>', html.indexOf('id="select-series-re"')) + 1);
  const styleAttr = ` style="--pi-hero:url('../img/${p.photo}')"`;
  const newOpen = open.replace(/ style="[^"]*"/, '').replace(/>$/, styleAttr + '>');
  html = html.replace(open, newOpen);

  const link = `<link rel="stylesheet" href="../assets/css/pg-hero-coll.css?v=${CSS_VERSION}" />`;
  if (html.includes('pg-hero-coll.css')) html = html.replace(/<link rel="stylesheet" href="\.\.\/assets\/css\/pg-hero-coll\.css[^"]*" \/>/, link);
  else if (/<link rel="stylesheet" href="\.\.\/assets\/css\/pg-hero-fit\.css[^"]*" \/>/.test(html))
    html = html.replace(/(<link rel="stylesheet" href="\.\.\/assets\/css\/pg-hero-fit\.css[^"]*" \/>)/, `$1\n${link}`);
  else html = html.replace('</head>', link + '\n</head>');

  fs.writeFileSync(file, html);
  console.log(key + ': hero updated');
}

const only = process.argv[2];
for (const k of Object.keys(PAGES)) if (!only || only === k) apply(k);
