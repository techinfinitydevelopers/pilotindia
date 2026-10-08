// Builds the "applications" chain carousel (one large card, neighbouring slides peeking out as small square
// image pills) on the four product-site home pages: spray-guns, airless, welding, office.
// Styles: assets/css/pg-chain.css. Behaviour: assets/js/pg-chain.js.
//
// Where the content comes from, per page, in this order:
//   1. an existing section.pg-chain  -> rebuilt from its own base64 payload (data-pg-src), so re-runs are safe
//   2. the luboss sticky-scroll block (spray-guns, welding, office) plus the intro container above it
//   3. the original Elementor intro + three cards (airless)
// Everything shown (heading, intro, SELECT SERIES button, each slide's title, text, image and
// "Check out solutions" link) is read from the page; nothing is written by hand. The line under each quote is the
// series the card links to (from its "N°01 - SERIES" tag when it has one, else from the link target).
//
// The replaced markup is copied to admin-backups/pre-chain/<site>.html first (git-ignored).
//
//   node tools/product-chain.mjs [site folders...]     default: spray-guns airless welding office
import fs from 'node:fs';
import path from 'node:path';

const CLONE = path.join(process.cwd(), 'pilotindia-clone');
const SITES = process.argv.slice(2).length ? process.argv.slice(2) : ['spray-guns', 'airless', 'welding', 'office'];
const ROLE = { 'spray-guns': 'Pilot Spray Guns', airless: 'Pilot Airless', welding: 'Pilot Welding Equipment', office: 'Pilot Office Products' };
// how an image sits inside the large card: photos fill it, product shots on white are shown whole
const FIT = { 'spray-guns': 'cover', airless: 'contain', welding: 'contain', office: 'contain' };

const text = s => s.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const attr = (tag, k) => (tag.match(new RegExp('\\s' + k + '="([^"]*)"')) || [])[1] || '';
const titleCase = s => s.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase());
const seriesFrom = href => titleCase(path.basename(href, '.html').replace(/-/g, ' '));
const esc = s => String(s).replace(/&(?!(?:[a-z]+|#\d+);)/gi, '&amp;').replace(/"/g, '&quot;');
const pad = i => String(i + 1).padStart(2, '0');

function endOf(src, at) {
  const re = /<(\/?)div\b[^>]*>/g;
  re.lastIndex = at;
  let depth = 0, m;
  while ((m = re.exec(src))) { depth += m[1] ? -1 : 1; if (depth === 0) return re.lastIndex; }
  throw new Error('unbalanced markup after ' + at);
}
// "Proffessional <span style=...>Spray Gun</span> Applications" -> the coloured part becomes <em>
const headingOf = inner => inner.replace(/<span[^>]*>([\s\S]*?)<\/span>/, '<em>$1</em>').replace(/\s+/g, ' ').trim();

// the intro container: heading, paragraph and SELECT SERIES button
function readIntro(block) {
  const h2 = block.match(/<h2 class="elementor-heading-title[^"]*">([\s\S]*?)<\/h2>/);
  const intro = text((block.match(/elementor-widget-text-editor[\s\S]*?<p>([\s\S]*?)<\/p>/) || [])[1] || '');
  const sel = block.match(/<a class="elementor-button[^"]*" href="([^"]*)">[\s\S]*?elementor-button-text">([^<]*)</);
  return { heading: headingOf(h2[1]), intro, button: sel ? { href: sel[1], label: text(sel[2]) } : null };
}

function rebuild(site) {
  const FILE = path.join(CLONE, site, 'index.html');
  let html = fs.readFileSync(FILE, 'utf8');
  let from, to, data, keep = '';

  const mine = html.indexOf('<section class="pg-chain"');
  if (mine >= 0) {
    from = mine;
    to = html.indexOf('<!-- /pg-chain -->', mine) + '<!-- /pg-chain -->'.length;
    data = JSON.parse(Buffer.from(html.slice(from, to).match(/data-pg-src="([^"]*)"/)[1], 'base64').toString('utf8'));
  } else if (html.includes('<section class="luboss-scroll-section"')) {
    // ---- source 2: the sticky-scroll block ----
    const secAt = html.indexOf('<section class="luboss-scroll-section"');
    const secEnd = html.indexOf('</section>', secAt) + '</section>'.length;
    const styleAt = html.lastIndexOf('<style>', secAt);
    if (!/luboss/.test(html.slice(styleAt, secAt))) throw new Error(site + ': luboss style block not found');
    const scriptAt = html.indexOf('<script>', secEnd);
    const scriptEnd = html.indexOf('</script>', scriptAt) + '</script>'.length;
    if (!/luboss/.test(html.slice(scriptAt, scriptEnd))) throw new Error(site + ': luboss script not found');

    // the intro container sits just above the luboss comment: its nearest "boxed" ancestor starts the replaced range
    const gate = html.lastIndexOf('<!-- ', styleAt);
    const h2s = [...html.slice(0, styleAt).matchAll(/<h2 class="elementor-heading-title[^"]*">[\s\S]*?<\/h2>/g)];
    const h2 = h2s[h2s.length - 1];
    const boxedRe = /<div class="elementor-element [^"]*\be-con-boxed\b[^"]*"[^>]*>/g;
    let boxed = null, m;
    while ((m = boxedRe.exec(html)) && m.index < h2.index) if (endOf(html, m.index) > h2.index) boxed = m.index;
    if (boxed === null) throw new Error(site + ': intro container not found');
    const introEnd = endOf(html, boxed);
    // what lies between the intro and the luboss comment may only be closing tags of parent containers (they stay)
    keep = html.slice(introEnd, gate);
    if (keep.replace(/<\/div>|\s+/g, '') !== '') throw new Error(site + ': unexpected markup between the intro and the luboss block');
    from = boxed;
    to = scriptEnd;
    const intro = readIntro(html.slice(boxed, introEnd));

    const seg = html.slice(secAt, secEnd);
    const slides = [...seg.matchAll(/<div class="luboss-slide luboss-slide-\d+">([\s\S]*?)(?=<div class="luboss-slide luboss-slide-\d+">|<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/section>)/g)].map(sm => {
      const b = sm[1];
      const img = b.match(/<img\b[^>]*>/)[0];
      const link = b.match(/<a href="([^"]*)" class="luboss-link">/)[1];
      const tag = text((b.match(/class="luboss-tag">([\s\S]*?)<\/span>/) || [])[1] || '').replace(/^N°\s*\d+\s*[—-]\s*/, '');
      return {
        image: attr(img, 'src'), alt: attr(img, 'alt'),
        title: text(b.match(/class="luboss-title">([\s\S]*?)<\/h3>/)[1]).replace(/\.$/, ''),
        titleHref: '',
        quote: text(b.match(/class="luboss-desc">([\s\S]*?)<\/p>/)[1]),
        series: tag ? titleCase(tag) : seriesFrom(link),
        href: link,
        cta: text(b.match(/class="luboss-link">\s*<span>([\s\S]*?)<\/span>/)[1]),
      };
    });
    if (slides.length < 2) throw new Error(site + ': expected the luboss slides, found ' + slides.length);
    data = Object.assign(intro, { slides });
  } else {
    // ---- source 3: the original Elementor intro + cards ----
    const t = html.indexOf('Construction &amp; Architectural Finishes');
    if (t < 0) throw new Error(site + ': no applications block found');
    from = html.lastIndexOf('<div', html.lastIndexOf('e-parent', t));
    to = endOf(html, from);
    const block = html.slice(from, to);
    const intro = readIntro(block);
    const slides = [];
    const cardRe = /<img\b[^>]*>[\s\S]*?<h2 class="elementor-heading-title[^"]*">([\s\S]*?)<\/h2>[\s\S]*?elementor-widget-text-editor[\s\S]*?<p>([\s\S]*?)<\/p>[\s\S]*?<a class="elementor-button[^"]*" href="([^"]*)">[\s\S]*?elementor-button-text">([^<]*)</g;
    let m;
    while ((m = cardRe.exec(block))) {
      const img = m[0].match(/<img\b[^>]*>/)[0];
      const titleLink = m[1].match(/<a [^>]*href="([^"]*)"/);
      slides.push({
        image: attr(img, 'bv-data-src') || attr(img, 'src'), alt: attr(img, 'alt'),
        title: text(m[1]), titleHref: titleLink ? titleLink[1] : '',
        quote: text(m[2]), series: seriesFrom(m[3]), href: m[3], cta: text(m[4]),
      });
    }
    if (slides.length < 2) throw new Error(site + ': expected the series cards, found ' + slides.length);
    data = Object.assign(intro, { slides });
  }

  // keep what is being replaced, once
  if (mine < 0) {
    const dir = path.join(process.cwd(), 'admin-backups', 'pre-chain');
    fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(path.join(dir, site + '.html'))) fs.writeFileSync(path.join(dir, site + '.html'), html, 'utf8');
  }

  const N = data.slides.length;
  const fit = FIT[site] || 'contain';
  const role = ROLE[site] || '';
  const payload = Buffer.from(JSON.stringify(data), 'utf8').toString('base64');

  const card = (s, i) => `
      <article class="pg-chain__card${i === 0 ? ' is-active' : i === 1 ? ' is-next-1' : i === N - 1 ? ' is-prev-1' : ' is-hidden'}" data-index="${i}" tabindex="${i === 0 ? '-1' : '0'}" aria-roledescription="slide" aria-label="${i + 1} of ${N}: ${esc(s.title)}">
        <div class="pg-chain__body">
          <div class="pg-chain__text">
            <span class="pg-chain__num">${pad(i)}</span>
            <h3 class="pg-chain__title">${s.titleHref ? `<a href="${esc(s.titleHref)}" target="_blank" rel="noopener">${s.title}</a>` : s.title}</h3>
            <p class="pg-chain__quote">&ldquo;${s.quote}&rdquo;</p>
            <div class="pg-chain__by">
              <span class="pg-chain__name">${s.series}</span>
              ${role ? `<span class="pg-chain__role">${role}</span>` : ''}
            </div>
            <a class="pg-chain__cta" href="${esc(s.href)}">${s.cta}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 5.3 19.9 12l-6.7 6.7-1.4-1.4 4.3-4.3H4v-2h12.1l-4.3-4.3z"/></svg></a>
          </div>
          <div class="pg-chain__media" data-fit="${fit}"><img src="${esc(s.image)}" alt="${esc(s.alt || s.title)}" loading="lazy" decoding="async" draggable="false"></div>
        </div>
        <img class="pg-chain__pill" src="${esc(s.image)}" alt="" aria-hidden="true" loading="lazy" decoding="async" draggable="false">
      </article>`;

  const section = `<section class="pg-chain" id="pg-chain" data-pg-src="${payload}">
  <div class="pg-chain__intro">
    <span class="pg-chain__eyebrow">Applications</span>
    <h2 class="pg-chain__h2">${data.heading}</h2>
    ${data.intro ? `<p class="pg-chain__lead">${data.intro}</p>` : ''}
    ${data.button ? `<a class="pg-chain__ghost" href="${esc(data.button.href)}">${data.button.label}</a>` : ''}
  </div>
  <div class="pg-chain__stage" role="region" aria-roledescription="carousel" aria-label="${esc(text(data.heading))}">${data.slides.map(card).join('')}
  </div>
  <div class="pg-chain__dots" role="tablist" aria-label="Choose an application">${data.slides.map((s, i) => `
    <button class="pg-chain__dot${i === 0 ? ' is-active' : ''}" type="button" role="tab" aria-selected="${i === 0}" aria-label="${esc(s.title)}" data-index="${i}"><span class="pg-chain__fill"></span></button>`).join('')}
  </div>
</section>
<!-- /pg-chain -->`;

  html = html.slice(0, from) + keep + section + html.slice(to);

  // the section uses the theme's own fonts (Roboto headings, Open Sans text): no extra font is loaded
  if (!html.includes('pg-chain.css')) html = html.replace('</head>', '<link rel="stylesheet" href="../assets/css/pg-chain.css?v=6" />\n</head>');
  if (!html.includes('pg-chain.js')) html = html.replace(/<\/body>(?![\s\S]*<\/body>)/, '<script src="../assets/js/pg-chain.js?v=2" defer></script>\n</body>');

  fs.writeFileSync(FILE, html, 'utf8');
  console.log(site + '/index.html: applications block rebuilt as a chain carousel (' + N + ' slides)');
  for (const s of data.slides) console.log('  ' + s.title + ' | ' + s.series + ' | ' + s.image + ' | ' + s.href);
}

for (const site of SITES) rebuild(site);
