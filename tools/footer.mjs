// Replaces the Divi <footer id="main-footer"> block on every page with the
// redesigned Pilot India footer, and links assets/css/pi-footer.css.
//   node tools/footer.mjs [siteDir]
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.argv[2] || path.join(process.cwd(), 'pilotindia-clone');
const YEAR = new Date().getFullYear();

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

const ICON = {
  facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8.5V6.9c0-.7.2-1.1 1.2-1.1H16.5V3.1A17 17 0 0 0 14.6 3C12.6 3 11.2 4.2 11.2 6.5v2H8.8V11.4h2.4V21H14v-9.6h2.4l.4-2.9H14z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.6c2.4 0 2.7 0 3.6.05.9.04 1.3.18 1.6.3.4.16.7.35 1 .65.3.3.5.6.65 1 .12.3.26.7.3 1.6.05.9.05 1.2.05 3.6s0 2.7-.05 3.6c-.04.9-.18 1.3-.3 1.6a2.7 2.7 0 0 1-.65 1c-.3.3-.6.5-1 .65-.3.12-.7.26-1.6.3-.9.05-1.2.05-3.6.05s-2.7 0-3.6-.05c-.9-.04-1.3-.18-1.6-.3a2.7 2.7 0 0 1-1-.65 2.7 2.7 0 0 1-.65-1c-.12-.3-.26-.7-.3-1.6C4.6 14.7 4.6 14.4 4.6 12s0-2.7.05-3.6c.04-.9.18-1.3.3-1.6.16-.4.35-.7.65-1 .3-.3.6-.5 1-.65.3-.12.7-.26 1.6-.3.9-.05 1.2-.05 3.6-.05M12 3c-2.44 0-2.75.01-3.7.06-.96.04-1.6.19-2.17.41-.6.23-1.1.54-1.6 1.04-.5.5-.81 1-1.04 1.6-.22.57-.37 1.21-.41 2.17C3.01 9.25 3 9.56 3 12s.01 2.75.06 3.7c.04.96.19 1.6.41 2.17.23.6.54 1.1 1.04 1.6.5.5 1 .81 1.6 1.04.57.22 1.21.37 2.17.41.95.05 1.26.06 3.7.06s2.75-.01 3.7-.06c.96-.04 1.6-.19 2.17-.41.6-.23 1.1-.54 1.6-1.04.5-.5.81-1 1.04-1.6.22-.57.37-1.21.41-2.17.05-.95.06-1.26.06-3.7s-.01-2.75-.06-3.7c-.04-.96-.19-1.6-.41-2.17a4.3 4.3 0 0 0-1.04-1.6c-.5-.5-1-.81-1.6-1.04-.57-.22-1.21-.37-2.17-.41C14.75 3.01 14.44 3 12 3z"/><path d="M12 7.38A4.62 4.62 0 1 0 12 16.62 4.62 4.62 0 0 0 12 7.38zm0 7.62a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/><circle cx="16.8" cy="7.2" r="1.08"/></svg>',
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.4 0 .7-.2 1l-2.2 2.2z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4.2-8 4.9-8-4.9V6l8 4.9L20 6v2.2z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>',
  download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v10.2l3.6-3.6 1.4 1.4-6 6-6-6 1.4-1.4L10 13.2V3h2zM4 19h16v2H4z"/></svg>',
};

function buildFooter(p) {
  // p = relative prefix from this page back to the site root ('' or '../')
  const products = [
    ['Pilot Group', p + 'index.html', false],
    ['Spray Guns', p + 'spray-guns/', false],
    ['Airless Spray Systems', p + 'airless/', false],
    ['Power Tools', p + 'pages/power-tools.html', false, 'NEW'],
    ['Welding Equipments', p + 'welding/', false],
    ['Office Products', p + 'office/', false],
  ];
  const company = [
    ['Home', p + 'index.html'],
    ['About Us', p + 'pages/about-us.html'],
    ['Blogs', p + 'pages/blogs.html'],
    ['Contact Us', p + 'pages/contact-us.html'],
  ];

  const li = ([label, href, ext, tag]) =>
    `<li><a href="${href}"${ext ? ' target="_blank" rel="noopener"' : ''}>${label}` +
    `${tag ? `<span class="pi-footer__new">${tag}</span>` : ''}</a></li>`;

  return `<footer class="pi-footer" id="pi-footer">
	<div class="pi-footer__inner">
		<div class="pi-footer__grid">

			<div class="pi-footer__brand">
				<img class="pi-footer__logo" src="${p}assets/img/pilot-logo-1-1.png" alt="Pilot India" width="178" height="42" loading="lazy" />
				<p class="pi-footer__tagline">Seventy years of surface coating and refinishing equipment, built in India for industry worldwide.</p>
				<address class="pi-footer__address">
					<strong>PILOT INDIA</strong>
					24, Sona Udyog, Parsi Panchayat Road,<br />Andheri East, Mumbai 400069<br />Maharashtra, India
				</address>
				<div class="pi-footer__social">
					<a href="https://www.facebook.com/pilotindiagroup" target="_blank" rel="noopener" aria-label="Pilot India on Facebook">${ICON.facebook}</a>
					<a href="https://www.instagram.com/pilotindiagroup/" target="_blank" rel="noopener" aria-label="Pilot India on Instagram">${ICON.instagram}</a>
				</div>
			</div>

			<nav class="pi-footer__col" aria-label="Products">
				<h2 class="pi-footer__heading">Products</h2>
				<ul class="pi-footer__list">
					${products.map(li).join('\n\t\t\t\t\t')}
				</ul>
			</nav>

			<nav class="pi-footer__col" aria-label="Company">
				<h2 class="pi-footer__heading">Company</h2>
				<ul class="pi-footer__list">
					${company.map(li).join('\n\t\t\t\t\t')}
				</ul>
			</nav>

			<div class="pi-footer__col">
				<h2 class="pi-footer__heading">Get in touch</h2>
				<ul class="pi-footer__contact">
					<li>
						<span class="pi-footer__icon">${ICON.phone}</span>
						<span><span class="pi-footer__contact-label">Phone</span><a href="tel:+912266047000">+91 22 6604 7000</a></span>
					</li>
					<li>
						<span class="pi-footer__icon">${ICON.mail}</span>
						<span><span class="pi-footer__contact-label">Email</span><a href="mailto:info@pilotindia.com">info@pilotindia.com</a></span>
					</li>
					<li>
						<span class="pi-footer__icon">${ICON.pin}</span>
						<span><span class="pi-footer__contact-label">Works</span>Andheri East &amp; Khalapur, Mumbai</span>
					</li>
				</ul>
				<a class="pi-footer__cta" href="${p}assets/media/pilot-india-catalog-2025-e-catalog-new.pdf" target="_blank" rel="noopener">${ICON.download} Download catalogue</a>
			</div>

		</div>
	</div>

	<div class="pi-footer__bottom">
		<div class="pi-footer__bottom-inner">
			<p class="pi-footer__copy">&copy; ${YEAR} <b>Pilot India</b>. All rights reserved.</p>
			<ul class="pi-footer__legal">
				<li><a href="${p}pages/privacy-policy.html">Privacy Policy</a></li>
				<li><a href="${p}pages/terms-and-conditions.html">Terms and Conditions</a></li>
			</ul>
		</div>
	</div>
</footer>`;
}

let swapped = 0, linked = 0;
for (const rel of files) {
  const fp = path.join(ROOT, rel);
  let html = fs.readFileSync(fp, 'utf8');
  const depth = rel.split('/').length - 1;
  const prefix = '../'.repeat(depth);

  const start = html.indexOf('<footer id="main-footer"');
  const startNew = html.indexOf('<footer class="pi-footer"');
  const s = start >= 0 ? start : startNew;
  if (s >= 0) {
    const e = html.indexOf('</footer>', s);
    if (e > s) {
      html = html.slice(0, s) + buildFooter(prefix) + html.slice(e + '</footer>'.length);
      swapped++;
    }
  }

  if (!html.includes('assets/css/pi-footer.css')) {
    const tag = `<link rel="stylesheet" href="${prefix}assets/css/pi-footer.css" />\n`;
    const head = html.indexOf('</head>');
    if (head > 0) { html = html.slice(0, head) + tag + html.slice(head); linked++; }
  }

  fs.writeFileSync(fp, html, 'utf8');
}
console.log('footers replaced: ' + swapped + '  stylesheet linked: ' + linked + '  of ' + files.length + ' pages');
