// Rebuilds the Pilot India home page: new hero and sections assembled from the
// site's own copy and images, plus the variant-2 footer.
//
// Every image and every line of copy below is taken from the existing pages of the
// clone (home slider, About Us, the product mirrors and the blog). Nothing is invented.
//
// Idempotent: it replaces whatever currently sits between the nav and the footer.
//
//   node tools/home.mjs [siteDir]
import fs from 'node:fs';
import path from 'node:path';

const CLONE = process.argv[2] || path.join(process.cwd(), 'pilotindia-clone');
const FILE = path.join(CLONE, 'index.html');
const YEAR = new Date().getFullYear();

const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 5.4 11.8 6.8l4.2 4.2H4v2h12l-4.2 4.2 1.4 1.4L20 12z"/></svg>';
const DOWN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v10.2l3.6-3.6 1.4 1.4-6 6-6-6 1.4-1.4L10 13.2V3h2zM4 19h16v2H4z"/></svg>';
const FB = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8.5V6.9c0-.7.2-1.1 1.2-1.1H16.5V3.1A17 17 0 0 0 14.6 3C12.6 3 11.2 4.2 11.2 6.5v2H8.8V11.4h2.4V21H14v-9.6h2.4l.4-2.9H14z"/></svg>';
const IG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.6c2.4 0 2.7 0 3.6.05.9.04 1.3.18 1.6.3.4.16.7.35 1 .65.3.3.5.6.65 1 .12.3.26.7.3 1.6.05.9.05 1.2.05 3.6s0 2.7-.05 3.6c-.04.9-.18 1.3-.3 1.6a2.7 2.7 0 0 1-.65 1c-.3.3-.6.5-1 .65-.3.12-.7.26-1.6.3-.9.05-1.2.05-3.6.05s-2.7 0-3.6-.05c-.9-.04-1.3-.18-1.6-.3a2.7 2.7 0 0 1-1-.65 2.7 2.7 0 0 1-.65-1c-.12-.3-.26-.7-.3-1.6C4.6 14.7 4.6 14.4 4.6 12s0-2.7.05-3.6c.04-.9.18-1.3.3-1.6.16-.4.35-.7.65-1 .3-.3.6-.5 1-.65.3-.12.7-.26 1.6-.3.9-.05 1.2-.05 3.6-.05M12 3c-2.44 0-2.75.01-3.7.06-.96.04-1.6.19-2.17.41-.6.23-1.1.54-1.6 1.04-.5.5-.81 1-1.04 1.6-.22.57-.37 1.21-.41 2.17C3.01 9.25 3 9.56 3 12s.01 2.75.06 3.7c.04.96.19 1.6.41 2.17.23.6.54 1.1 1.04 1.6.5.5 1 .81 1.6 1.04.57.22 1.21.37 2.17.41.95.05 1.26.06 3.7.06s2.75-.01 3.7-.06c.96-.04 1.6-.19 2.17-.41.6-.23 1.1-.54 1.6-1.04.5-.5.81-1 1.04-1.6.22-.57.37-1.21.41-2.17.05-.95.06-1.26.06-3.7s-.01-2.75-.06-3.7c-.04-.96-.19-1.6-.41-2.17a4.3 4.3 0 0 0-1.04-1.6c-.5-.5-1-.81-1.6-1.04-.57-.22-1.21-.37-2.17-.41C14.75 3.01 14.44 3 12 3z"/><path d="M12 7.38A4.62 4.62 0 1 0 12 16.62 4.62 4.62 0 0 0 12 7.38zm0 7.62a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/><circle cx="16.8" cy="7.2" r="1.08"/></svg>';

const A = 'assets/img/';

/* image, excerpt and date for each post come from the post page itself (og:image, meta description, "published" date) */
const unesc = t => t.replace(/&amp;/g, '&').replace(/&#039;|&#8217;/g, '’').replace(/&quot;/g, '"');
const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
function postMeta(slug) {
  const h = fs.readFileSync(path.join(CLONE, 'blog', slug + '.html'), 'utf8');
  const g = re => (h.match(re) || [])[1] || '';
  return {
    img: g(/property="og:image" content="([^"]+)"/).replace(/^\.\.\//, ''),
    desc: unesc(g(/name="description" content="([^"]+)"/)),
    date: g(/class="[^"]*published[^"]*"[^>]*>([^<]+)</).trim(),
  };
}

/* ---- product range: the five categories already in the Products menu ---- */
const PRODUCTS = [
  { t: 'Spray Guns', img: 'spray-guns1-scaled.jpg', href: 'spray-guns/',
    d: 'Evolution, Legacy, HVLP and air brush series for automotive, industrial and fine finishing.' },
  { t: 'Airless Spray Systems', img: 'airless-spray-systems-scaled.jpg', href: 'airless/',
    d: 'Electric, pneumatic and electro hydraulic series for high volume coating work.' },
  { t: 'Welding Equipments', img: 'welding-equipments-scaled.jpg', href: 'welding/',
    d: 'Gas cutting torches, welding and brazing torches, and gas regulators.' },
  { t: 'Office Products', img: 'note-counting-machines-scaled.jpg', href: 'office/',
    d: 'Currency counters, currency sorters and paper shredders.' },
  { t: 'Power Tools', img: 'img-5657-scaled.jpeg', href: 'pages/power-tools.html', tag: 'NEW',
    d: 'Heat guns and workshop power tools.' },
];

/* ---- figures, straight from the About Us page ---- */
const STATS = [
  ['70', 'Years of brand trust'],
  ['700', 'Authorised dealers'],
  ['7000', 'Sub dealers'],
  ['12', 'Countries exported to'],
];

/* ---- hero figure deck: the four About Us figures, one card each. Supporting lines
   come from About Us / schema data (founded 1953, distribution network, export markets). */
const DECK = [
  { n: '700', l: 'Authorised dealers', d: 'Plus 7000 sub dealers and ten regional distributors across India.', faces: true },
  { n: '7000', l: 'Sub dealers', d: 'Served by ten regional distributors and 700 authorised dealers.', tag: 'Across India' },
  { n: '12', l: 'Countries exported to', d: 'Including Australia, New Zealand, South Africa, Turkey and the UAE.', tag: 'Exports' },
  { n: '70', l: 'Years of brand trust', d: 'Founded in 1953, building coating equipment for Indian industry.', tag: 'Est. 1953' },
];

const FRAMER_ARROW = '<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M 16.667 0 C 16.667 0.795 17.43 1.982 18.203 2.979 C 19.197 4.264 20.384 5.386 21.746 6.242 C 22.767 6.884 24.004 7.5 25 7.5 M 25 7.5 C 24.004 7.5 22.766 8.116 21.746 8.758 C 20.384 9.615 19.197 10.737 18.203 12.02 C 17.43 13.018 16.667 14.207 16.667 15 M 25 7.5 L 0 7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" transform="translate(7.5 12.5)"/></svg>';

/* ---- what the company says it does, from About Us ---- */
const CAPS = [
  ["001", "Manufacturing", "State of the art facilities in Andheri and at Khalapur near Mumbai, with in house CNC machining.", "pi-cap-manufacturing.svg"],
  ["002", "Research and development", "A professional research and development team keeps new products coming year on year.", "pi-cap-research.svg"],
  ["003", "Distribution", "Ten regional distributors, 700 authorised dealers and 7000 sub dealers across India.", "pi-cap-distribution.svg"],
  ["004", "Exports", "Africa, Australia, Bangladesh, Cyprus, Israel, New Zealand, Philippines, South Africa, Sri Lanka, Turkey and the United Arab Emirates.", "pi-cap-exports.svg"],
];

/* ---- application areas listed across the product sites ---- */
const INDUSTRIES = ['Automobiles', 'Foundries', 'Furniture', 'Textile', 'Railways', 'Ship building',
  'Construction equipment', 'Agricultural equipment', 'Pharmaceuticals', 'Machine shops', 'Marine',
  'Glass industry', 'Carpet industry', 'Plastic moulding', 'Electrical equipment', 'Handicrafts',
  'Sculpture finishing', 'Food decoration', 'Laboratories', 'Workshops'];

/* Three marquee bands. Dealt round-robin so each band gets a mix of short and long
   names rather than one band of only long ones; each is doubled in the markup so the
   track can loop on a -50% translate with no visible seam. */
const IND_BANDS = 3;
const IND_ROWS = Array.from({ length: IND_BANDS },
  (_, r) => INDUSTRIES.filter((_, i) => i % IND_BANDS === r));
const IND_SPEEDS = [44, 54, 38];

/* ---- real posts from the blog ---- */
const POSTS_RAW = [
  ['How Heat Guns Are Used in Automotive Car Wrapping', 'how-heat-guns-are-used-in-automotive-car-wrapping'],
  ['Why Every Workshop Needs High-Quality Power Tools from Pilot India', 'why-every-workshop-needs-high-quality-power-tools-from-pilot-india'],
  ['How Pilot India Supports Businesses with Innovative Industrial Solutions', 'how-pilot-india-supports-businesses-with-innovative-industrial-solutions'],
  ['Why Investing in Quality Industrial Equipment Saves Money in the Long Run', 'why-investing-in-quality-industrial-equipment-saves-money-in-the-long-run'],
  ['The Role of Quality Control in Industrial Equipment Performance', 'the-role-of-quality-control-in-industrial-equipment-performance'],
  ['Essential Industrial Equipment Every Manufacturing Unit Needs', 'essential-industrial-equipment-every-manufacturing-unit-needs'],
];
const POSTS = POSTS_RAW.map(([t, s]) => [t, s, postMeta(s)]);

// Expanding panel: compact vertical column that grows on hover, revealing the
// title, a line of copy and the link over full-bleed imagery with a dark scrim.
const card = (p) => `
        <a class="pi-exp__card" href="${p.href}">
          <img class="pi-exp__img" src="${A}${p.img}" alt="" loading="lazy" />
          ${p.tag ? `<span class="pi-exp__tag">${p.tag}</span>` : ''}
          <span class="pi-exp__rail">${p.t}</span>
          <span class="pi-exp__body">
            <span class="pi-exp__t">${p.t}</span>
            <span class="pi-exp__d">${p.d}</span>
            <span class="pi-exp__go">View range ${ARROW}</span>
          </span>
        </a>`;

const main = `
<main class="pi-home" id="pi-home">

  <!-- 1. hero: framed full-bleed photograph, display-serif headline, a floating
       white figure card on the right and two glass cards along the bottom edge.
       Layout modelled on an interior-studio hero comp; every word, number and image
       here is Pilot's own (product range, About Us figures, facility photo). -->
  <section class="pi-hero">
    <img class="pi-hero__media" src="${A}factory-workshop-interior-machines-glass-production-background-scaled.jpg" alt="" fetchpriority="high" />

    <div class="pi-hero__head">
      <h1 class="pi-hero__title">India's largest maker of <em>surface coating</em> equipment.</h1>
      <p class="pi-hero__sub">Spray guns, airless systems, gas welding and office equipment, trusted by 700 dealers across 12 countries.</p>
    </div>

    <div class="pi-deck" role="group" aria-roledescription="carousel" aria-label="Pilot in figures" tabindex="0">
      ${DECK.map((c, i) => `<div class="pi-deck__card" data-depth="${i}"${i ? ' aria-hidden="true"' : ''}>
        <span class="pi-deck__n">${c.n}<sup>+</sup></span>
        <span class="pi-deck__l">${c.l}</span>
        ${c.faces
          ? `<span class="pi-deck__faces" aria-hidden="true">${PRODUCTS.slice(0, 4).map(p => `<img src="${A}${p.img}" alt="" />`).join('')}</span>`
          : `<span class="pi-deck__tag">${c.tag}</span>`}
        <span class="pi-deck__d">${c.d}</span>
      </div>`).join('\n      ')}
    </div>

    <div class="pi-hero__cards">
      <div class="pi-hero__slot">
        <article class="pi-hero__card pi-hero__card--a">
          <img class="pi-hero__card-img" src="${A}spray-guns1-980x497.jpg" alt="" />
          <div class="pi-hero__card-body">
            <h2 class="pi-hero__card-t">${PRODUCTS[0].t}</h2>
            <p class="pi-hero__card-d">${PRODUCTS[0].d}</p>
            <a class="pi-hero__pill" href="#products">Explore products</a>
          </div>
        </article>
        <a class="pi-hero__go" href="${PRODUCTS[0].href}" aria-label="Open the ${PRODUCTS[0].t} range">${ARROW}</a>
      </div>

      <article class="pi-hero__card pi-hero__card--b">
        <div class="pi-hero__card-body">
          <h2 class="pi-hero__card-t">${CAPS[0][1]}</h2>
          <p class="pi-hero__card-d">${CAPS[0][2]}</p>
          <a class="pi-hero__pill" href="pages/about-us.html">About Pilot</a>
        </div>
        <img class="pi-hero__card-img" src="${A}manufacturing-facility-in-andheri-mumbai-980x678.png" alt="" />
      </article>
    </div>
  </section>

  <!-- 2. figures -->
  <section class="pi-stats">
    <div class="pi-stats__grid">
      ${STATS.map(([n, l], i) => `<div class="pi-stat pi-reveal" style="transition-delay:${i * 70}ms">
        <span class="pi-stat__n" data-count="${n}">${n}</span><span class="pi-stat__l">${l}</span>
      </div>`).join('\n      ')}
    </div>
  </section>

  <!-- 3. product range -->
  <section class="pi-sec" id="products">
    <div class="pi-home__wrap">
      <div class="pi-sec__head pi-reveal">
        <p class="pi-home__eyebrow">Product range</p>
        <h2 class="pi-home__h2">Five ranges, one manufacturer.</h2>
        <p class="pi-home__lead">A complete portfolio of spray guns, airless spray systems, pressure feed tanks, gas welding equipment and office products.</p>
      </div>
      <div class="pi-exp pi-reveal">${PRODUCTS.map(card).join('')}
      </div>
    </div>
  </section>

  <!-- 4. about -->
  <section class="pi-sec pi-about">
    <div class="pi-home__wrap">
      <div class="pi-about__grid">
        <div class="pi-about__copy pi-reveal">
          <h2 class="pi-home__h2">Seventy years in Indian industry.</h2>
          <p class="pi-home__lead">Pioneering and dominating the Indian market for the past 70 years, Pilot is the largest manufacturer of surface coating and refinishing equipment in India.</p>
          <p class="pi-home__lead">Our state of the art manufacturing facilities and a professional research and development team give us an edge above the rest. International quality, competitive pricing and effective sales have carried our products into markets across four continents.</p>
          <blockquote class="pi-about__quote">In keeping with our philosophy we plan to expand and diversify into disciplines consistent with our present line of operations.</blockquote>
          <p style="margin-top:26px"><a class="pi-btn" href="pages/about-us.html">Read about us ${ARROW}</a></p>
        </div>
        <div class="pi-about__media pi-reveal">
          <figure class="pi-about__shot">
            <figcaption>Manufacturing facility in Andheri, Mumbai</figcaption>
            <img src="${A}manufacturing-facility-in-andheri-mumbai-1280x886.png" alt="Manufacturing facility in Andheri, Mumbai" loading="lazy" />
          </figure>
          <figure class="pi-about__shot pi-about__shot--below">
            <img src="${A}expansion-of-manufacturing-facility-in-khopoli-1280x834.png" alt="Expansion of manufacturing facility at Khalapur" loading="lazy" />
            <figcaption>Expansion at Khalapur</figcaption>
          </figure>
          <figure class="pi-about__shot pi-about__shot--below">
            <img src="${A}cnc-1280x857.png" alt="CNC machining at Pilot India" loading="lazy" />
            <figcaption>In house CNC machining</figcaption>
          </figure>
        </div>
      </div>
    </div>
  </section>

  <!-- 5. capability: Expand OnHover List component (matches https://framer.com/m/Expand-OnHover-List-LByFXR.js@OBy0vsXNMeZtHbjUoVsi) -->
  <section class="pi-sec pi-cap-sec">
    <div class="pi-home__wrap">
      <div class="pi-sec__head pi-reveal">
        <h2 class="pi-home__h2">What sits behind the product.</h2>
      </div>
    </div>
    <div class="pi-cap__list" role="list">
      ${CAPS.map(([n, t, d, img], i) => `<div class="pi-cap" role="listitem" tabindex="0" data-index="${i}">
        <div class="pi-cap__line-top" aria-hidden="true"></div>
        <span class="pi-cap__no">${n}</span>
        <div class="pi-cap__content">
          <div class="pi-cap__main">
            <div class="pi-cap__text">
              <h3 class="pi-cap__t">${t}</h3>
              <div class="pi-cap__d"><p>${d}</p></div>
            </div>
            <div class="pi-cap__shot-wrap">
              <div class="pi-cap__shot"><img src="${A}${img}" alt="${t}" loading="lazy" /></div>
            </div>
          </div>
        </div>
        <div class="pi-cap__icon-wrap" aria-hidden="true">
          <div class="pi-cap__go">${FRAMER_ARROW}</div>
        </div>
        <div class="pi-cap__line-bottom" aria-hidden="true">
          <div class="pi-cap__line-indicator"></div>
        </div>
      </div>`).join("\n      ")}
    </div>
  </section>

  <!-- 6. industries -->
  <section class="pi-sec pi-ind" id="industries">
    <div class="pi-home__wrap">
      <div class="pi-ind__head pi-reveal">
        <div>
          <h2 class="pi-home__h2">Where Pilot equipment is used.</h2>
          <p class="pi-home__lead">Application areas our spray, welding and finishing equipment is specified for.</p>
        </div>
        <p class="pi-ind__count"><span class="pi-ind__num" data-count="${INDUSTRIES.length}" data-suffix="+">${INDUSTRIES.length}+</span> application areas</p>
      </div>
    </div>
    <!-- full-bleed: the bands run past the wrap on both sides -->
    <div class="pi-ind__stage pi-reveal">
      <div class="pi-ind__deck">
        ${IND_ROWS.map((row, r) => `<div class="pi-ind__row" style="--dur:${IND_SPEEDS[r]}s">
          <div class="pi-ind__track">${row.concat(row).concat(row).concat(row).map(w => `<span class="pi-ind__word">${w}</span>`).join('')}</div>
        </div>`).join('\n        ')}
      </div>
    </div>
  </section>

  <!-- 7. insights -->
  <section class="pi-sec pi-ins">
    <div class="pi-home__wrap">
      <div class="pi-ins__head pi-reveal">
        <div>
          <p class="pi-home__eyebrow">From the blog</p>
          <h2 class="pi-home__h2">Notes on equipment and finishing.</h2>
        </div>
        <a class="pi-ins__all" href="pages/blogs.html">All articles ${ARROW}</a>
      </div>
      <div class="pi-ins__grid">
        ${(() => { const [t, s, m] = POSTS[0]; return `<article class="pi-ins__feat pi-reveal">
          <a class="pi-ins__feat-link" href="blog/${s}.html">
            <span class="pi-ins__img"><img src="${m.img}" alt="${esc(t)}" loading="lazy" /><span class="pi-ins__chip">01</span></span>
            <span class="pi-ins__body">
              <span class="pi-ins__date">${m.date}</span>
              <h3 class="pi-ins__ft">${t}</h3>
              <span class="pi-ins__ex">${esc(m.desc)}</span>
              <span class="pi-ins__read">Read article ${ARROW}</span>
            </span>
          </a>
        </article>`; })()}
        <ol class="pi-ins__rail pi-reveal">
        ${POSTS.slice(1).map(([t, s, m], i) => `<li><a class="pi-ins__row" href="blog/${s}.html">
          <span class="pi-ins__n">${String(i + 2).padStart(2, '0')}</span>
          <span class="pi-ins__txt"><span class="pi-ins__date">${m.date}</span><h3 class="pi-ins__t">${t}</h3><span class="pi-ins__ex">${esc(m.desc)}</span></span>
          <svg class="pi-ins__go" viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 5.4 11.8 6.8l4.2 4.2H4v2h12l-4.2 4.2 1.4 1.4L20 12z"/></svg>
        </a></li>`).join('\n        ')}
        </ol>
      </div>
    </div>
  </section>

  <!-- 8. closing -->
  <section class="pi-close">
    <span class="pi-close__70" aria-hidden="true">70</span>
    <div class="pi-close__inner pi-reveal">
      <span class="pi-close__eyebrow">Est. 1953</span>
      <h2>Seventy years of equipment built for Indian industry.</h2>
      <p>The full 2025 range, with technical data for every series, in one catalogue.</p>
      <div class="pi-close__cta">
        <a class="pi-btn" href="assets/media/pilot-india-catalog-2025-e-catalog-new.pdf" target="_blank" rel="noopener">${DOWN} Download catalogue</a>
      </div>
    </div>
  </section>

</main>
`;

const footer2 = `<footer class="pi-f2" id="pi-footer">
  <div class="pi-f2__wrap">

    <div class="pi-f2__prow">
      <p class="pi-f2__say">Surface coating and refinishing equipment, <b>made in India</b>.</p>
      <div class="pi-f2__reach">
        <span>Speak to us</span>
        <a href="tel:+912266047000">+91 22 6604 7000</a>
        <a href="mailto:info@pilotindia.com">info@pilotindia.com</a>
      </div>
    </div>

    <div class="pi-f2__cols">
      <nav class="pi-f2__col" aria-label="Products">
        <h2 class="pi-f2__h">Products</h2>
        <ul class="pi-f2__list">
          <li><a href="spray-guns/">Spray Guns</a></li>
          <li><a href="airless/">Airless Spray Systems</a></li>
          <li><a href="welding/">Welding Equipments</a></li>
          <li><a href="office/">Office Products</a></li>
          <li><a href="pages/power-tools.html">Power Tools<span class="pi-f2__tag">NEW</span></a></li>
        </ul>
      </nav>

      <nav class="pi-f2__col" aria-label="Company">
        <h2 class="pi-f2__h">Company</h2>
        <ul class="pi-f2__list">
          <li><a href="index.html">Home</a></li>
          <li><a href="pages/about-us.html">About Us</a></li>
          <li><a href="pages/blogs.html">Blogs</a></li>
          <li><a href="pages/contact-us.html">Contact Us</a></li>
        </ul>
      </nav>

      <nav class="pi-f2__col" aria-label="Resources">
        <h2 class="pi-f2__h">Resources</h2>
        <ul class="pi-f2__list">
          <li><a href="assets/media/pilot-india-catalog-2025-e-catalog-new.pdf" target="_blank" rel="noopener">2025 catalogue</a></li>
          <li><a href="pages/privacy-policy.html">Privacy Policy</a></li>
          <li><a href="pages/terms-and-conditions.html">Terms and Conditions</a></li>
        </ul>
      </nav>

      <div class="pi-f2__col">
        <h2 class="pi-f2__h">Visit</h2>
        <address class="pi-f2__addr">
          24, Sona Udyog, Parsi Panchayat Road,<br />Andheri East, Mumbai 400069<br />Maharashtra, India
        </address>
      </div>
    </div>

    <div class="pi-f2__base">
      <div class="pi-f2__mark">
        <img src="${A}pilot-logo-1-1.png" alt="Pilot India" width="178" height="42" loading="lazy" />
        <p class="pi-f2__copy">&copy; ${YEAR} Pilot India. All rights reserved.</p>
      </div>
      <div class="pi-f2__ends">
        <ul class="pi-f2__legal">
          <li><a href="pages/privacy-policy.html">Privacy</a></li>
          <li><a href="pages/terms-and-conditions.html">Terms</a></li>
        </ul>
        <div class="pi-f2__social">
          <a href="https://www.facebook.com/pilotindiagroup" target="_blank" rel="noopener" aria-label="Pilot India on Facebook">${FB}</a>
          <a href="https://www.instagram.com/pilotindiagroup/" target="_blank" rel="noopener" aria-label="Pilot India on Instagram">${IG}</a>
        </div>
      </div>
    </div>

  </div>
</footer>`;

// ---------------------------------------------------------------- write
let html = fs.readFileSync(FILE, 'utf8');

const navEnd = html.indexOf('</header>');
if (navEnd < 0) throw new Error('nav not found in index.html');
const bodyStart = navEnd + '</header>'.length;

const footStart = html.search(/<footer[^>]*class="pi-f2"|<footer[^>]*class="pi-footer"/);
if (footStart < 0) throw new Error('footer not found in index.html');
const footEnd = html.indexOf('</footer>', footStart) + '</footer>'.length;

html = html.slice(0, bodyStart) + '\n' + main + '\n' + footer2 + html.slice(footEnd);

// fonts: headlines DM Sans Italic and body SF Pro are defined in theme/theme.css (self-hosted); no Google Fonts links

// stylesheets and the reveal script
for (const href of ['assets/css/pi-home.css', 'assets/css/pi-footer2.css']) {
  if (!html.includes(href)) {
    const at = html.indexOf('</head>');
    html = html.slice(0, at) + `<link rel="stylesheet" href="${href}" />\n` + html.slice(at);
  }
}
// Marks the document as scripted BEFORE first paint. The scroll-reveal start states
// are gated on [data-pi-js], so if scripting is unavailable nothing is ever hidden.
//
// This is a data attribute, NOT a class, on purpose: the Divi theme ships its own
// inline script that does `documentElement.className = 'js'`, a plain assignment
// that wipes any class added before it. A data attribute survives that.
html = html.replace(/\n?<script>document\.documentElement\.classList\.add\('pi-js'\);<\/script>\n?/g, '');
if (!html.includes('data-pi-js')) {
  const m = html.match(/<head[^>]*>/i);
  if (m) {
    const at = html.indexOf(m[0]) + m[0].length;
    html = html.slice(0, at) +
      "\n<script>document.documentElement.setAttribute('data-pi-js','');</script>\n" +
      html.slice(at);
  }
}

if (!html.includes('assets/js/pi-home.js')) {
  const at = html.lastIndexOf('</body>');
  html = html.slice(0, at) + '<script src="assets/js/pi-home.js?v=5" defer></script>\n' + html.slice(at);
}

fs.writeFileSync(FILE, html, 'utf8');
console.log('home page rebuilt: 8 sections + footer v2');
console.log('  products: ' + PRODUCTS.length + '  stats: ' + STATS.length +
            '  capabilities: ' + CAPS.length + '  industries: ' + INDUSTRIES.length +
            '  posts: ' + POSTS.length);
