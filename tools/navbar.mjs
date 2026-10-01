// Replaces the Divi <header id="main-header"> block on every page with the
// redesigned Pilot India navbar, and links assets/css/pi-nav.css + assets/js/pi-nav.js.
// Redesign mode: preserve. Labels, hrefs and IA are carried over unchanged.
//   node tools/navbar.mjs [siteDir]
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.argv[2] || path.join(process.cwd(), 'pilotindia-clone');

// the mirrored satellite sites keep their own header/footer exactly as published
const MIRRORS = ['spray-guns', 'airless', 'welding', 'office'];

const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(path.join(ROOT, d || '.'), { withFileTypes: true })) {
    const rel = d ? d + '/' + f.name : f.name;
    if (f.isDirectory()) { if (!rel.startsWith('assets') && !MIRRORS.some(m => rel === m || rel.startsWith(m + '/'))) walk(rel); }
    else if (f.name.endsWith('.html')) files.push(rel);
  }
})('');

const CARET = '<svg class="pi-nav__caret" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.4 5.6 9l1.4-1.4 5 5 5-5L18.4 9z"/></svg>';
const PHONE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.4 0 .7-.2 1l-2.2 2.2z"/></svg>';
const BARS = '<svg class="pi-nav__bars" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18v2H3zM3 11h18v2H3zM3 16h18v2H3z"/></svg>';
const XMARK = '<svg class="pi-nav__x" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 10.6 5.3-5.3 1.4 1.4-5.3 5.3 5.3 5.3-1.4 1.4-5.3-5.3-5.3 5.3-1.4-1.4 5.3-5.3-5.3-5.3 1.4-1.4z"/></svg>';

function buildNav(p, rel) {
  // `p` is the prefix back to the site root; `rel` is this page's path, used to
  // mark the current section.
  const onAbout = rel === 'pages/about-us.html';
  const onContact = rel === 'pages/contact-us.html';
  const onProduct = rel === 'pages/power-tools.html';

  const products = [
    ['Pilot Group', p + 'index.html', false],
    ['Spray Guns', p + 'spray-guns/', false],
    ['Airless Spray Systems', p + 'airless/', false],
    ['Power Tools', p + 'pages/power-tools.html', false, 'NEW'],
    ['Welding Equipments', p + 'welding/', false],
    ['Office Products', p + 'office/', false],
  ];

  const sub = products.map(([label, href, ext, tag]) =>
    `<li><a href="${href}"${ext ? ' target="_blank" rel="noopener"' : ''}>${label}` +
    `${tag ? `<span class="pi-nav__tag">${tag}</span>` : ''}</a></li>`
  ).join('\n\t\t\t\t\t\t');

  return `<header class="pi-nav" id="pi-nav">
	<div class="pi-nav__inner">

		<a class="pi-nav__logo" href="${p}index.html" aria-label="Pilot India, home">
			<img src="${p}assets/img/pilot-logo-1-1.png" alt="Pilot India" width="178" height="42" />
		</a>

		<button class="pi-nav__burger" type="button" aria-label="Menu" aria-expanded="false" aria-controls="pi-nav-drawer">${BARS}${XMARK}</button>

		<div class="pi-nav__drawer" id="pi-nav-drawer">
			<nav aria-label="Main">
				<ul class="pi-nav__links">
					<li class="pi-nav__item">
						<a class="pi-nav__link${onAbout ? ' is-active' : ''}" href="${p}pages/about-us.html"${onAbout ? ' aria-current="page"' : ''}>About Us</a>
					</li>
					<li class="pi-nav__item pi-nav__item--menu">
						<button class="pi-nav__link${onProduct ? ' is-active' : ''}" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="pi-nav-products">Products ${CARET}</button>
						<ul class="pi-nav__menu" id="pi-nav-products">
						${sub}
						</ul>
					</li>
				</ul>
			</nav>

			<div class="pi-nav__end">
				<a class="pi-nav__phone" href="tel:+912266047000">${PHONE}<span>+91 22 6604 7000</span></a>
				<a class="pi-nav__cta" href="${p}pages/contact-us.html"${onContact ? ' aria-current="page"' : ''}>Connect with Pilot</a>
			</div>
		</div>

	</div>
</header>`;
}

let swapped = 0, css = 0, js = 0;
for (const rel of files) {
  const fp = path.join(ROOT, rel);
  let html = fs.readFileSync(fp, 'utf8');
  const prefix = '../'.repeat(rel.split('/').length - 1);

  const old = html.indexOf('<header id="main-header"');
  const mine = html.indexOf('<header class="pi-nav"');
  const s = old >= 0 ? old : mine;
  if (s >= 0) {
    const e = html.indexOf('</header>', s);
    if (e > s) {
      html = html.slice(0, s) + buildNav(prefix, rel) + html.slice(e + '</header>'.length);
      swapped++;
    }
  }

  if (!html.includes('assets/css/pi-nav.css')) {
    const head = html.indexOf('</head>');
    if (head > 0) {
      html = html.slice(0, head) + `<link rel="stylesheet" href="${prefix}assets/css/pi-nav.css" />\n` + html.slice(head);
      css++;
    }
  }
  if (!html.includes('assets/js/pi-nav.js')) {
    const body = html.lastIndexOf('</body>');
    if (body > 0) {
      html = html.slice(0, body) + `<script src="${prefix}assets/js/pi-nav.js" defer></script>\n` + html.slice(body);
      js++;
    }
  }

  fs.writeFileSync(fp, html, 'utf8');
}
console.log('navbars replaced: ' + swapped + '  css linked: ' + css + '  js linked: ' + js + '  of ' + files.length);
