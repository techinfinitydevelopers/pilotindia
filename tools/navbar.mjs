// Replaces the Divi <header id="main-header"> block on every page with the
// redesigned Pilot India navbar, and links assets/css/pi-nav.css + assets/js/pi-nav.js.
// Redesign mode: preserve. Labels, hrefs and IA are carried over unchanged.
//   node tools/navbar.mjs [siteDir]
import fs from 'node:fs';
import path from 'node:path';

//   node tools/navbar.mjs [siteDir]                  every page except the satellite sites
//   node tools/navbar.mjs --only=spray-guns,welding   just those folders, satellites included
const args = process.argv.slice(2);
const ONLY = (args.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const ROOT = args.find(a => !a.startsWith('--')) || path.join(process.cwd(), 'pilotindia-clone');

// By default the mirrored satellite sites keep their own header exactly as published.
// Setting skipMirrors = false ensures the navbar is applied across all pages site-wide.
const MIRRORS = ['spray-guns', 'airless', 'welding', 'office'];
const skipMirrors = false;

const files = [];
function walk(d) {
  for (const f of fs.readdirSync(path.join(ROOT, d || '.'), { withFileTypes: true })) {
    const rel = d ? d + '/' + f.name : f.name;
    if (f.isDirectory()) {
      const isAssets = /(^|\/)assets$/.test(rel);
      const isMirror = skipMirrors && MIRRORS.some(m => rel === m || rel.startsWith(m + '/'));
      if (!isAssets && !isMirror) walk(rel);
    } else if (f.name.endsWith('.html')) files.push(rel);
  }
}
(ONLY.length ? ONLY : ['']).forEach(walk);

const CARET = '<svg class="pi-nav__caret" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.4 5.6 9l1.4-1.4 5 5 5-5L18.4 9z"/></svg>';
const PHONE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.4 0 .7-.2 1l-2.2 2.2z"/></svg>';
const BARS = '<svg class="pi-nav__bars" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18v2H3zM3 11h18v2H3zM3 16h18v2H3z"/></svg>';
const XMARK = '<svg class="pi-nav__x" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 10.6 5.3-5.3 1.4 1.4-5.3 5.3 5.3 5.3-1.4 1.4-5.3-5.3-5.3 5.3-1.4-1.4 5.3-5.3-5.3-5.3 1.4-1.4z"/></svg>';

function buildNav(p, rel) {
  const onHome = rel === 'index.html' || rel === '';
  const onAbout = rel === 'pages/about-us.html';
  const onBlog = rel === 'pages/blogs.html' || rel.startsWith('blog/');
  const onContact = rel === 'pages/contact-us.html';
  const onProduct = rel === 'pages/power-tools.html' || rel.startsWith('spray-guns') || rel.startsWith('airless') || rel.startsWith('welding') || rel.startsWith('office');

  return `<header class="pi-nav framer-dyn-nav" id="pi-nav">
	<div class="framer-dyn-track">
		<div class="framer-dyn-pill" id="framer-dyn-pill" data-state="static">

			<a class="framer-dyn-logo" href="${p}index.html" aria-label="Pilot India">
				<img class="framer-dyn-pilot-logo" src="${p}assets/img/pilot-logo-1-1.png" alt="Pilot India" width="138" height="32" />
			</a>

			<nav class="framer-dyn-menu" aria-label="Main Navigation">
				<ul class="framer-dyn-links">
					<li class="framer-dyn-item">
						<a class="framer-dyn-link${onHome ? ' is-active' : ''}" href="${p}index.html">Home</a>
					</li>
					<li class="framer-dyn-item framer-dyn-dropdown-parent">
						<button class="framer-dyn-link${onProduct ? ' is-active' : ''}" type="button" aria-haspopup="true" aria-expanded="false">
							Products
							<svg class="framer-dyn-caret" viewBox="0 0 24 24"><path d="M12 15.4 5.6 9l1.4-1.4 5 5 5-5L18.4 9z"/></svg>
						</button>
						<div class="framer-dyn-dropdown">
							<ul class="framer-dyn-dropdown-list">
								<li><a href="${p}spray-guns/"><span class="framer-dyn-dd-title">Spray Guns</span><span class="framer-dyn-dd-desc">Evolution, HVLP & legacy series</span></a></li>
								<li><a href="${p}airless/"><span class="framer-dyn-dd-title">Airless Spray Systems</span><span class="framer-dyn-dd-desc">High-output hydraulic & electric</span></a></li>
								<li><a href="${p}pages/power-tools.html"><span class="framer-dyn-dd-title">Power Tools <span class="framer-dyn-tag">NEW</span></span><span class="framer-dyn-dd-desc">Drills, grinders & saws</span></a></li>
								<li><a href="${p}welding/"><span class="framer-dyn-dd-title">Welding Equipments</span><span class="framer-dyn-dd-desc">Industrial gas welding & regulators</span></a></li>
								<li><a href="${p}office/"><span class="framer-dyn-dd-title">Office Products</span><span class="framer-dyn-dd-desc">Currency counters & shredders</span></a></li>
							</ul>
						</div>
					</li>
					<li class="framer-dyn-item">
						<a class="framer-dyn-link${onAbout ? ' is-active' : ''}" href="${p}pages/about-us.html"${onAbout ? ' aria-current="page"' : ''}>About Us</a>
					</li>
					<li class="framer-dyn-item">
						<a class="framer-dyn-link${onBlog ? ' is-active' : ''}" href="${p}pages/blogs.html"${onBlog ? ' aria-current="page"' : ''}>Blog</a>
					</li>
					<li class="framer-dyn-item">
						<a class="framer-dyn-link${onContact ? ' is-active' : ''}" href="${p}pages/contact-us.html"${onContact ? ' aria-current="page"' : ''}>Contact</a>
					</li>
				</ul>
			</nav>

			<div class="framer-dyn-section" aria-live="polite">
				<span class="framer-dyn-dot"></span>
				<span class="framer-dyn-section-text" id="framer-dyn-section-text">Hero</span>
			</div>

			<div class="framer-dyn-actions">
				<button class="framer-dyn-burger" type="button" aria-label="Menu" aria-expanded="false" aria-controls="framer-dyn-mobile-drawer">
					<span class="framer-burger-line"></span>
					<span class="framer-burger-line"></span>
				</button>
			</div>

		</div>

		<div class="framer-dyn-mobile-drawer" id="framer-dyn-mobile-drawer">
			<div class="framer-dyn-mobile-content">
				<ul class="framer-dyn-mobile-links">
					<li><a href="${p}index.html">Home</a></li>
					<li class="framer-dyn-mobile-subgroup">
						<span class="framer-dyn-subgroup-label">Products</span>
						<div class="framer-dyn-subgroup-items">
							<a href="${p}spray-guns/">Spray Guns</a>
							<a href="${p}airless/">Airless Spray Systems</a>
							<a href="${p}pages/power-tools.html">Power Tools <span class="framer-dyn-tag">NEW</span></a>
							<a href="${p}welding/">Welding Equipments</a>
							<a href="${p}office/">Office Products</a>
						</div>
					</li>
					<li><a href="${p}pages/about-us.html">About Us</a></li>
					<li><a href="${p}pages/blogs.html">Blog</a></li>
					<li><a href="${p}pages/contact-us.html">Contact</a></li>
				</ul>
				<div class="framer-dyn-mobile-footer">
					<a class="framer-dyn-mobile-phone" href="tel:+912266047000">${PHONE} +91 22 6604 7000</a>
					<a class="framer-dyn-mobile-cta" href="${p}pages/contact-us.html">Connect with Pilot</a>
				</div>
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

  const s = html.search(/<header[^>]+(?:pi-nav|main-header)/);
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

  let written = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      fs.writeFileSync(fp, html, 'utf8');
      written = true;
      break;
    } catch (err) {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 150);
    }
  }
  if (!written) {
    console.warn('Could not write ' + fp + ' after retries');
  }
}
console.log('navbars replaced: ' + swapped + '  css linked: ' + css + '  js linked: ' + js + '  of ' + files.length);
