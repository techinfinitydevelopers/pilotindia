// Contact Us redesign: replaces the Divi <article> in pages/contact-us.html with a hand-built page (hero with quick
// actions, enquiry form + department directory, visit us with map, follow strip).
// Every address, number, email and social link is taken from the original page; nothing is invented.
// The form posts to /api/enquiry (leads.mjs): enquiries land in the admin's Leads screen next to catalogue leads.
// Styles: assets/css/pi-contact.css. Behaviour: assets/js/pi-contact.js.
// The block stays wrapped in one <article>, because tools/products-page.mjs uses this page as its shell.
// Idempotent (replaces its own output).   node tools/contact-us.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(process.cwd(), 'pilotindia-clone');
const file = path.join(ROOT, 'pages', 'contact-us.html');
let html = fs.readFileSync(file, 'utf8');
const V = 12;

const PHONE = '+91 22 6604 7000', TEL = '+912266047000';
const WA = 'https://wa.me/919930347000';
const ADDR = ['24, Sona Udyog, Parsi Panchayat Road,', 'Andheri East, Mumbai 400069', 'Maharashtra, India'];
const MAP_Q = encodeURIComponent('Pilot India, 24 Sona Udyog, Parsi Panchayat Road, Andheri East, Mumbai 400069');
const MAP_EMBED = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d235.70546864195526!2d72.85239236887227!3d19.126647175749557!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7c82ac4c00001%3A0xaded1e41bebcffc4!2sPilot%20India%20Office%20Products!5e0!3m2!1sen!2sin!4v1784095635572!5m2!1sen!2sin';

// department directory: [label, email, what it covers]
const DEPTS = [
  ['Product enquiries', 'info@pilotindia.com', 'Spray Guns, Airless Spray Systems, Power Tools, Welding Equipments'],
  ['Office products', 'sales@pilotindia.com', 'Paper shredders, currency counters and sorters'],
  ['Customer service', 'csd@pilotindia.com', 'After-sales help for Pilot products'],
  ['Exports', 'export@pilotindia.com', 'Enquiries from outside India'],
];
// form topics (must match TOPICS in leads.mjs)
const TOPICS = ['Spray Guns', 'Airless Spray Systems', 'Power Tools', 'Welding Equipments', 'Office Products', 'Customer service', 'Exports', 'Something else'];
const COUNTRIES = ['India', 'United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Oman', 'Kuwait', 'Bahrain', 'Nepal', 'Bangladesh', 'Sri Lanka',
  'Bhutan', 'Maldives', 'Singapore', 'Malaysia', 'Indonesia', 'Thailand', 'Vietnam', 'Philippines', 'China', 'Japan', 'South Korea',
  'Australia', 'New Zealand', 'United Kingdom', 'Ireland', 'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Switzerland',
  'Sweden', 'Poland', 'Turkey', 'Cyprus', 'Israel', 'Russia', 'United States', 'Canada', 'Mexico', 'Brazil', 'South Africa', 'Nigeria',
  'Kenya', 'Egypt', 'Tanzania', 'Uganda', 'Ethiopia', 'Ghana', 'Iran', 'Iraq', 'Other'];
const SOCIAL = [
  ['Facebook', 'https://www.facebook.com/pilotindiagroup', '<path d="M13.5 21v-7.5H16l.4-3H13.5V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4V10.5H8v3h2.4V21z"/>'],
  ['Instagram', 'https://www.instagram.com/pilotindiagroup/', '<path d="M12 7.3a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4zm0 7.7a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm4.9-8.9a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2zM12 4.6c2.4 0 2.7 0 3.6.1 2.4.1 3.6 1.3 3.7 3.7.1 1 .1 1.2.1 3.6s0 2.7-.1 3.6c-.1 2.4-1.3 3.6-3.7 3.7-1 .1-1.2.1-3.6.1s-2.7 0-3.6-.1c-2.4-.1-3.6-1.3-3.7-3.7-.1-1-.1-1.2-.1-3.6s0-2.7.1-3.6C4.8 6 6 4.8 8.4 4.7c.9-.1 1.2-.1 3.6-.1zM12 3c-2.4 0-2.8 0-3.7.1C5 3.2 3.2 5 3.1 8.3 3 9.2 3 9.6 3 12s0 2.8.1 3.7c.1 3.3 1.9 5.1 5.2 5.2.9.1 1.3.1 3.7.1s2.8 0 3.7-.1c3.3-.1 5.1-1.9 5.2-5.2.1-.9.1-1.3.1-3.7s0-2.8-.1-3.7C20.8 5 19 3.2 15.7 3.1 14.8 3 14.4 3 12 3z"/>'],
  ['WhatsApp', WA, '<path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3zm0 16.4c-1.4 0-2.7-.4-3.9-1.1l-.3-.2-2.7.7.7-2.6-.2-.3A7.4 7.4 0 1 1 12 19.4zm4.1-5.5c-.2-.1-1.3-.7-1.5-.7-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1-.7-.3-1.4-.7-2-1.3-.5-.5-1-1.1-1.3-1.7-.1-.2 0-.4.1-.5l.4-.4.2-.4v-.4l-.7-1.6c-.2-.4-.4-.4-.5-.4h-.4c-.2 0-.4.1-.6.3-.6.6-.9 1.4-.8 2.2.1.9.5 1.8 1 2.5 1 1.5 2.3 2.7 3.9 3.4.5.2.9.3 1.3.4.5.1 1 .1 1.5 0 .5-.1 1.1-.5 1.3-1 .1-.3.1-.7.1-1-.1 0-.2-.1-.3-.1z"/>'],
];

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 5.3 19.9 12l-6.7 6.7-1.4-1.4 4.3-4.3H4v-2h12.1l-4.3-4.3z"/></svg>';
const ICON = {
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
  mail: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  chev: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>',
};
const social = (s, cls) => `<a class="${cls}" href="${s[1]}" target="_blank" rel="noopener" aria-label="${s[0]}"><svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">${s[2]}</svg><span>${s[0]}</span></a>`;
const field = (name, label, control, extra = '') => `<div class="pc-field${extra}" data-f="${name}"><label for="pc-${name}">${label}</label>${control}<em class="pc-err" id="pc-${name}-err"></em></div>`;

const block = `<!-- pi-contact:start -->
<article id="pi-contact" class="pi-contact page type-page">

  <section class="pc-hero" id="pc-hero">
    <div class="pc-hero__copy" data-reveal>
      <p class="pc-eyebrow">Contact Pilot</p>
      <h1 class="pc-hero__title">Talk to the people <em>who make it.</em></h1>
      <p class="pc-hero__sub">Questions about a product, a dealer near you, service or exports - write to us or call, and the right team picks it up.</p>
    </div>
    <ul class="pc-quick">
      <li data-reveal style="--d:60ms"><a class="pc-q" href="tel:${TEL}"><span class="pc-q__ic">${ICON.phone}</span><span class="pc-q__k">Call us</span><span class="pc-q__v">${PHONE}</span><span class="pc-q__go">${arrow}</span></a></li>
      <li data-reveal style="--d:120ms"><a class="pc-q" href="mailto:info@pilotindia.com"><span class="pc-q__ic">${ICON.mail}</span><span class="pc-q__k">Email us</span><span class="pc-q__v">info@pilotindia.com</span><span class="pc-q__go">${arrow}</span></a></li>
      <li data-reveal style="--d:180ms"><a class="pc-q" href="${WA}" target="_blank" rel="noopener"><span class="pc-q__ic"><svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">${SOCIAL[2][2]}</svg></span><span class="pc-q__k">WhatsApp</span><span class="pc-q__v">Chat with us</span><span class="pc-q__go">${arrow}</span></a></li>
      <li data-reveal style="--d:240ms"><a class="pc-q" href="#pc-visit"><span class="pc-q__ic">${ICON.pin}</span><span class="pc-q__k">Visit us</span><span class="pc-q__v">Andheri East, Mumbai</span><span class="pc-q__go">${arrow}</span></a></li>
    </ul>
  </section>

  <section class="pc-main" id="pc-enquiry">
    <div class="pc-wrap pc-main__grid">

      <div class="pc-formcard" data-reveal>
        <div class="pc-formcard__head">
          <p class="pc-eyebrow pc-eyebrow--dark">Send an enquiry</p>
          <h2 class="pc-h2">Tell us what you need.</h2>
          <p class="pc-muted">Fields marked * are required.</p>
        </div>
        <form class="pc-form" id="pc-form" novalidate>
          <div class="pc-topics" role="radiogroup" aria-label="Enquiry about">
            <p class="pc-topics__k">Enquiry about *</p>
            <div class="pc-topics__list">
${TOPICS.map((t, i) => `              <label class="pc-chip"><input type="radio" name="topic" value="${esc(t)}"${i === 0 ? ' checked' : ''}><span>${esc(t)}</span></label>`).join('\n')}
            </div>
          </div>
          <div class="pc-row">
            ${field('name', 'Full name *', '<input id="pc-name" name="name" type="text" autocomplete="name" maxlength="80" required>')}
            ${field('company', 'Company', '<input id="pc-company" name="company" type="text" autocomplete="organization" maxlength="120">')}
          </div>
          <div class="pc-row">
            ${field('email', 'Email *', '<input id="pc-email" name="email" type="email" autocomplete="email" maxlength="120" required>')}
            ${field('phone', 'Phone *', '<input id="pc-phone" name="phone" type="tel" autocomplete="tel" maxlength="24" required>')}
          </div>
          ${field('country', 'Country *', `<span class="pc-select"><select id="pc-country" name="country" autocomplete="country-name" required>${COUNTRIES.map(c => `<option${c === 'India' ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select>${ICON.chev}</span>`)}
          ${field('message', 'Message *', '<textarea id="pc-message" name="message" rows="4" maxlength="2000" required placeholder="Product or model, quantity, your city - anything that helps us answer quickly."></textarea><span class="pc-count" aria-hidden="true"><b>0</b> / 2000</span>')}
          <div class="pc-hp" aria-hidden="true"><label>Website <input name="website" type="text" tabindex="-1" autocomplete="off"></label></div>
          <div class="pc-field pc-consent" data-f="consent"><label><input type="checkbox" name="consent"><span>I agree to the <a href="privacy-policy.html" target="_blank" rel="noopener">Privacy Policy</a>. Pilot India uses these details only to answer this enquiry.</span></label><em class="pc-err"></em></div>
          <div class="pc-submit">
            <button class="pc-btn" type="submit"><span>Send enquiry</span>${arrow}</button>
            <p class="pc-status" role="status" aria-live="polite"></p>
          </div>
        </form>
        <div class="pc-done" hidden>
          <span class="pc-done__ic">${ICON.check}</span>
          <h3>Thank you - your enquiry is with us.</h3>
          <p>Our team will get back to you shortly. For anything urgent, call <a href="tel:${TEL}">${PHONE}</a>.</p>
          <button class="pc-btn pc-btn--ghost" type="button" data-again>Send another enquiry</button>
        </div>
      </div>

      <aside class="pc-dir">
        <div class="pc-dir__head" data-reveal>
          <p class="pc-eyebrow pc-eyebrow--dark">Direct lines</p>
          <h2 class="pc-h2">Write to the right desk.</h2>
        </div>
        <ul class="pc-dir__list">
${DEPTS.map((d, i) => `          <li class="pc-dept" data-reveal style="--d:${i * 70}ms">
            <span class="pc-dept__k">${esc(d[0])}</span>
            <a class="pc-dept__mail" href="mailto:${d[1]}">${d[1]}</a>
            <span class="pc-dept__d">${esc(d[2])}</span>
            <button class="pc-copy" type="button" data-copy="${d[1]}" aria-label="Copy ${d[1]}">${ICON.copy}<span>Copy</span></button>
          </li>`).join('\n')}
        </ul>
        <div class="pc-callcard" data-reveal>
          <span class="pc-callcard__k">Head office</span>
          <a class="pc-callcard__tel" href="tel:${TEL}">${PHONE}</a>
          <span class="pc-callcard__d">One number for all Pilot product lines.</span>
        </div>
      </aside>

    </div>
  </section>

  <section class="pc-visit" id="pc-visit">
    <div class="pc-wrap pc-visit__grid">
      <div class="pc-visit__info" data-reveal="left">
        <p class="pc-eyebrow">Visit us</p>
        <h2 class="pc-h2 pc-h2--light">Pilot India, Mumbai.</h2>
        <address class="pc-addr">${ADDR.join('<br>')}</address>
        <div class="pc-visit__cta">
          <a class="pc-btn" href="https://www.google.com/maps/dir/?api=1&amp;destination=${MAP_Q}" target="_blank" rel="noopener"><span>Get directions</span>${arrow}</a>
          <button class="pc-btn pc-btn--ghost" type="button" data-copy="PILOT INDIA, ${ADDR.join(' ')}">${ICON.copy}<span>Copy address</span></button>
        </div>
      </div>
      <figure class="pc-visit__shot" data-reveal style="--d:80ms"><img src="../assets/img/about-fac-1.jpg" alt="Pilot manufacturing facility in Andheri, Mumbai" width="1200" height="831" loading="lazy"><figcaption>Manufacturing facility in Andheri, Mumbai</figcaption></figure>
      <div class="pc-map" data-reveal>
        <iframe src="${MAP_EMBED}" title="Map: Pilot India, Andheri East, Mumbai" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
      </div>
    </div>
  </section>

  <section class="pc-follow">
    <div class="pc-wrap pc-follow__row" data-reveal>
      <p class="pc-follow__t">Follow Pilot India</p>
      <div class="pc-follow__links">${SOCIAL.map(s => social(s, 'pc-soc')).join('')}</div>
    </div>
  </section>

</article>
<!-- pi-contact:end -->`;

if (html.includes('<!-- pi-contact:start -->')) {
  const a = html.indexOf('<!-- pi-contact:start -->'), b = html.indexOf('<!-- pi-contact:end -->') + '<!-- pi-contact:end -->'.length;
  html = html.slice(0, a) + block + html.slice(b);
} else {
  const a = html.indexOf('<article id="post-2284"');
  const b = html.indexOf('</article>', a) + '</article>'.length;
  if (a < 0 || b < a) throw new Error('original article not found');
  html = html.slice(0, a) + block + html.slice(b);
}
if (!/<body class="[^"]*pi-contact-page/.test(html)) html = html.replace(/<body class="/, '<body class="pi-contact-page ');

const link = `<link rel="stylesheet" href="../assets/css/pi-contact.css?v=${V}" />`;
if (html.includes('pi-contact.css')) html = html.replace(/<link rel="stylesheet" href="\.\.\/assets\/css\/pi-contact\.css[^"]*" \/>/, link);
else html = html.replace('</head>', link + '\n</head>');
const script = `<script src="../assets/js/pi-contact.js?v=${V}" defer></script>`;
if (html.includes('pi-contact.js')) html = html.replace(/<script src="\.\.\/assets\/js\/pi-contact\.js[^"]*" defer><\/script>/, script);
else html = html.replace('</body>', script + '\n</body>');

fs.writeFileSync(file, html);
console.log('contact-us rebuilt');
