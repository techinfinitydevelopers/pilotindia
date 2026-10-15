// About Us redesign: replaces the Divi <article> in pages/about-us.html with a hand-built page (hero + glance tray,
// story, product range, nationwide network + exports, vision/mission, facilities, goal).
// Every fact and sentence is taken from the original page (and the home page's "In-house CNC machining" caption);
// nothing is invented. Styles: assets/css/pi-about.css. Motion: assets/js/pi-about.js.
// Idempotent (replaces its own output).   node tools/about-us.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(process.cwd(), 'pilotindia-clone');
const file = path.join(ROOT, 'pages', 'about-us.html');
let html = fs.readFileSync(file, 'utf8');
const V = 21;

const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 5.3 19.9 12l-6.7 6.7-1.4-1.4 4.3-4.3H4v-2h12.1l-4.3-4.3z"/></svg>';
const COUNTRIES = ['Africa', 'Australia', 'Bangladesh', 'Cyprus', 'Israel', 'New Zealand', 'Philippines', 'South Africa', 'Srilanka', 'Turkey', 'United Arab Emirates'];
const RANGE = [
  ['Spray Guns', '../spray-guns/', 'pg-coll-evolution.jpg'],
  ['Airless Spray Systems', '../airless/', 'pg-coll-electric-airless.jpg'],
  ['Pressure Feed Tanks', '../pages/pressure-feed-tanks.html', 'pg-coll-tanks.jpg'],
  ['Gas Welding Equipments', '../welding/', 'pg-coll-torch-weld.jpg'],
  ['Office Products', '../office/', 'pg-coll-shredder.jpg'],
];
const pill = c => `<span class="pa-pill">${c}</span>`;

const block = `<!-- pi-about:start -->
<main class="pi-about" id="pi-about">

  <section class="pa-hero" id="pa-hero">
    <div class="pa-hero__bg" data-parallax="0.12" aria-hidden="true"></div>
    <div class="pa-hero__copy">
      <p class="pa-eyebrow">About Pilot</p>
      <h1 class="pa-hero__title"><span>Pioneering and dominating</span> <span>the Indian market for</span> <em>70 years.</em></h1>
      <p class="pa-hero__sub">PILOT is the largest manufacturer of Surface Coating &amp; Refinishing Equipments in India.</p>
      <div class="pa-hero__cta">
        <a class="pa-btn" href="#pa-range">Our product range${arrow}</a>
        <a class="pa-btn pa-btn--ghost" href="../pages/contact-us.html">Contact us</a>
      </div>
    </div>
    <div class="pa-tray">
      <p class="pa-tray__label">Pilot at a glance</p>
      <ul class="pa-tray__list">
        <li><b><span data-count="70">70</span></b><span>Years of brand trust</span></li>
        <li><b><span data-count="700">700</span></b><span>Dealers</span></li>
        <li><b><span data-count="7000">7,000</span></b><span>Sub dealers</span></li>
        <li><b><span data-count="12">12</span></b><span>Export countries</span></li>
      </ul>
    </div>
  </section>

  <section class="pa-story" id="pa-story">
    <div class="pa-wrap pa-story__grid">
      <div class="pa-story__head" data-reveal="left">
        <p class="pa-eyebrow pa-eyebrow--dark">Our story</p>
        <h2 class="pa-h2">Reliability, quality and performance, year after year.</h2>
        <span class="pa-rule" aria-hidden="true"></span>
      </div>
      <div class="pa-story__body">
        <p data-reveal>Our company has understood the domestic &amp; international markets, building relations with organisations that keep coming back to us for the reliability, quality and performance of our products.</p>
        <p data-reveal>PILOT’s product portfolio includes a complete range of: Spray Guns, Airless Spray Systems, Pressure Feed Tanks, Gas Welding Equipments and various Office Products. Our state of the art manufacturing facilities and a professional Research &amp; Development team gives us an edge above the rest.</p>
      </div>
    </div>
  </section>

  <section class="pa-range" id="pa-range">
    <div class="pa-wrap">
      <div class="pa-sechead" data-reveal>
        <p class="pa-eyebrow pa-eyebrow--dark">Product portfolio</p>
        <h2 class="pa-h2">A complete range.</h2>
      </div>
      <ul class="pa-range__grid">
${RANGE.map((r, i) => `        <li data-reveal style="--d:${i * 70}ms"><a class="pa-card" href="${r[1]}">
          <span class="pa-card__img"><img src="../assets/img/${r[2]}" alt="" width="240" height="240" loading="lazy"></span>
          <span class="pa-card__num">0${i + 1}</span>
          <span class="pa-card__name">${r[0]}</span>
          <span class="pa-card__go">${arrow}</span>
        </a></li>`).join('\n')}
      </ul>
    </div>
  </section>

  <section class="pa-net" id="pa-net">
    <div class="pa-wrap">
      <div class="pa-net__grid">
        <div data-reveal="left">
          <p class="pa-eyebrow">Reach</p>
          <h2 class="pa-h2 pa-h2--light">An extensive nationwide network.</h2>
        </div>
        <p class="pa-net__lead" data-reveal>An extensive nationwide network of 10 Regional Distributors, 700 Authorized Dealers and 7000 Sub-dealers throughout India helps us respond to our customer’s needs.</p>
      </div>
      <ul class="pa-facts" data-reveal>
        <li><b data-count="3">3</b><span>Business verticals</span></li>
        <li><b>Dominant</b><span>Market share</span></li>
        <li><img src="../assets/img/ce-icon.png" alt="CE" width="40" height="40" loading="lazy"><span>Certification</span></li>
      </ul>

      <div class="pa-reach">
        <div class="pa-export" data-reveal>
          <p class="pa-export__t"><b data-count="12">12</b> countries <span>across 5 continents</span></p>
          <p class="pa-export__d">International quality, competitive pricing, efficient marketing &amp; effective sales has led to the demand of our products in the international markets of Africa, Australia, Bangladesh, Cyprus, Israel, New Zealand, Philippines, South Africa, Srilanka, Turkey, United Arab Emirates.</p>
        </div>
        <div class="pa-globe" data-src="../assets/js/world-land-110m.json" role="img" aria-label="Globe centred on India with export routes to ${COUNTRIES.join(', ')}">
        <canvas></canvas>
        <div class="pa-globe__pills">${COUNTRIES.map(pill).join('')}</div>
      </div>
      </div>

    </div>
  </section>

  <section class="pa-vm" id="pa-vm">
    <div class="pa-wrap pa-vm__grid">
      <article class="pa-vm__card pa-vm__card--dark" data-reveal>
        <span class="pa-vm__ghost" aria-hidden="true">01</span>
        <h2 class="pa-vm__t">Vision</h2>
        <p>In keeping with our philosophy we plan to expand and diversify into disciplines consistent with our present line of operations. We also have plans to venture further into international markets at a consistent pace.</p>
      </article>
      <article class="pa-vm__card" data-reveal style="--d:110ms">
        <span class="pa-vm__ghost" aria-hidden="true">02</span>
        <h2 class="pa-vm__t">Mission</h2>
        <p>Our mission is to adapt to changes in technology at all times, and apply our skills &amp; expertise to produce excellent quality products and give our customers maximum value for money and satisfaction of use.</p>
      </article>
    </div>
  </section>

  <section class="pa-fac" id="pa-fac">
    <div class="pa-wrap">
      <div class="pa-sechead" data-reveal>
        <p class="pa-eyebrow pa-eyebrow--dark">Manufacturing</p>
        <h2 class="pa-h2">Where Pilot is made.</h2>
      </div>
      <div class="pa-fac__grid">
        <figure class="pa-shot pa-shot--a" data-reveal="clip"><img src="../assets/img/about-fac-1.jpg" alt="Manufacturing facility in Andheri, Mumbai" width="1200" height="831" loading="lazy" data-parallax-img><figcaption>Manufacturing facility in Andheri, Mumbai</figcaption></figure>
        <figure class="pa-shot pa-shot--b" data-reveal="clip" style="--d:100ms"><img src="../assets/img/about-fac-2.jpg" alt="Expansion of manufacturing facility at Khalapur near Mumbai" width="1200" height="782" loading="lazy" data-parallax-img><figcaption>Expansion of manufacturing facility at Khalapur near Mumbai</figcaption></figure>
        <figure class="pa-shot pa-shot--c" data-reveal="clip" style="--d:200ms"><img src="../assets/img/about-fac-3.jpg" alt="In-house CNC machining" width="1200" height="803" loading="lazy" data-parallax-img><figcaption>In-house CNC machining</figcaption></figure>
      </div>
    </div>
  </section>

  <section class="pa-goal" id="pa-goal">
    <div class="pa-wrap">
      <div class="pa-goal__card" data-reveal>
        <div>
          <p class="pa-eyebrow">Our goal</p>
          <h2 class="pa-h2 pa-h2--light">Quality and perfection, in every customer’s work.</h2>
          <a class="pa-btn" href="../pages/contact-us.html">Talk to our team${arrow}</a>
        </div>
        <div class="pa-goal__text">
          <p>Our goal has always been to provide high quality and cost effective solutions to all the businesses that depend on our products. With constant technological innovation, extensive global presence, strong team building skills and a dedicated workforce our value addition to businesses is unparalleled.</p>
          <p>We take pride over the fact that over such a long period of time every PILOT customer has been able to achieve quality and perfection in their work. This inspires us to keep introducing high quality products year on year.</p>
        </div>
      </div>
    </div>
  </section>

</main>
<!-- pi-about:end -->`;

if (html.includes('<!-- pi-about:start -->')) {
  const a = html.indexOf('<!-- pi-about:start -->'), b = html.indexOf('<!-- pi-about:end -->') + '<!-- pi-about:end -->'.length;
  html = html.slice(0, a) + block + html.slice(b);
} else {
  const a = html.indexOf('<article id="post-2281"');
  const b = html.indexOf('</article>', a) + '</article>'.length;
  if (a < 0 || b < a) throw new Error('original article not found');
  html = html.slice(0, a) + block + html.slice(b);
}

const link = `<link rel="stylesheet" href="../assets/css/pi-about.css?v=${V}" />`;
if (html.includes('pi-about.css')) html = html.replace(/<link rel="stylesheet" href="\.\.\/assets\/css\/pi-about\.css[^"]*" \/>/, link);
else html = html.replace('</head>', link + '\n</head>');
const script = `<script src="../assets/js/pi-about.js?v=${V}" defer></script>`;
if (html.includes('pi-about.js')) html = html.replace(/<script src="\.\.\/assets\/js\/pi-about\.js[^"]*" defer><\/script>/, script);
else html = html.replace('</body>', script + '\n</body>');
const gscript = `<script src="../assets/js/pi-globe.js?v=${V}" defer></script>`;
if (html.includes('pi-globe.js')) html = html.replace(/<script src="\.\.\/assets\/js\/pi-globe\.js[^"]*" defer><\/script>/, gscript);
else html = html.replace('</body>', gscript + '\n</body>');

fs.writeFileSync(file, html);
console.log('about-us rebuilt');
