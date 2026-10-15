/* Catalogue downloads: a short form (name, email, phone with country code, company) before the file.
   Any link with "catalog" in its text or file name that points at a PDF opens the form instead of downloading. After a
   successful submit the server sets a cookie, the download starts, and later catalogue clicks go straight through. The
   server also refuses the catalogue files themselves without that cookie (see leads.mjs), so the form cannot be skipped. */
(function () {
  'use strict';
  var PRIVACY = '/pages/privacy-policy.html';
  var ICON = {
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
    org: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 9h2a2 2 0 0 1 2 2v10M2 21h20M8 7h4M8 11h4M8 15h4"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>',
    dl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
  };

  function isCatalogue(a) {
    var href = a.getAttribute('href') || '';
    if (!/\.pdf(\?|#|$)/i.test(href)) return false;
    if (labelled(a)) return true;
    // an icon-only link to the same file as a "Download Catalogue" link
    var url = a.href, all = document.querySelectorAll('a[href]');
    for (var i = 0; i < all.length; i++) if (all[i] !== a && all[i].href === url && labelled(all[i])) return true;
    return false;
  }
  function labelled(a) { return /catalog/i.test((a.textContent || '') + ' ' + (a.getAttribute('aria-label') || '') + ' ' + (a.getAttribute('href') || '')); }
  function unlocked() { return /(?:^|;\s*)pi_dl_ok=1/.test(document.cookie); }
  function fileName(url) { try { return decodeURIComponent(new URL(url, location.href).pathname.split('/').pop()); } catch (e) { return url; } }
  // "pilot-india-catalog-2025-e-catalog-new.pdf" -> "Pilot India Catalog 2025 E Catalog New"
  function niceName(url) {
    return fileName(url).replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
      .replace(/\b([a-z])/g, function (m) { return m.toUpperCase(); });
  }

  function download(url) {
    var u = new URL(url, location.href);
    if (u.origin !== location.origin) { window.open(u.href, '_blank', 'noopener'); return; }
    var a = document.createElement('a');
    a.href = u.href; a.download = fileName(u.href); a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
  }

  // ---- phone country-code picker: a "+91 v" button in front of the number opens a searchable list of every country with its
  // dialling code (type a name or a code). The chosen country is also what gets stored as the lead's country, so there is no
  // separate Country field. Exposed as window.piDial for the Contact form.
  var DIAL = ('India,91;United Arab Emirates,971;Saudi Arabia,966;Qatar,974;Oman,968;Kuwait,965;Bahrain,973;United States,1;United Kingdom,44;Canada,1;Australia,61;Singapore,65;' +
    'Afghanistan,93;Albania,355;Algeria,213;Andorra,376;Angola,244;Antigua and Barbuda,1268;Argentina,54;Armenia,374;Aruba,297;Austria,43;Azerbaijan,994;Bahamas,1242;Bangladesh,880;Barbados,1246;Belarus,375;Belgium,32;Belize,501;Benin,229;Bermuda,1441;Bhutan,975;Bolivia,591;Bosnia and Herzegovina,387;Botswana,267;Brazil,55;Brunei,673;Bulgaria,359;Burkina Faso,226;Burundi,257;' +
    'Cambodia,855;Cameroon,237;Cape Verde,238;Cayman Islands,1345;Central African Republic,236;Chad,235;Chile,56;China,86;Colombia,57;Comoros,269;Congo,242;Costa Rica,506;Croatia,385;Cuba,53;Cyprus,357;Czech Republic,420;DR Congo,243;Denmark,45;Djibouti,253;Dominica,1767;Dominican Republic,1809;' +
    'Ecuador,593;Egypt,20;El Salvador,503;Equatorial Guinea,240;Eritrea,291;Estonia,372;Eswatini,268;Ethiopia,251;Fiji,679;Finland,358;France,33;Gabon,241;Gambia,220;Georgia,995;Germany,49;Ghana,233;Greece,30;Greenland,299;Grenada,1473;Guatemala,502;Guinea,224;Guinea-Bissau,245;Guyana,592;' +
    'Haiti,509;Honduras,504;Hong Kong,852;Hungary,36;Iceland,354;Indonesia,62;Iran,98;Iraq,964;Ireland,353;Israel,972;Italy,39;Ivory Coast,225;Jamaica,1876;Japan,81;Jordan,962;Kazakhstan,7;Kenya,254;Kiribati,686;Kyrgyzstan,996;Laos,856;Latvia,371;Lebanon,961;Lesotho,266;Liberia,231;Libya,218;Liechtenstein,423;Lithuania,370;Luxembourg,352;' +
    'Macau,853;Madagascar,261;Malawi,265;Malaysia,60;Maldives,960;Mali,223;Malta,356;Marshall Islands,692;Mauritania,222;Mauritius,230;Mexico,52;Micronesia,691;Moldova,373;Monaco,377;Mongolia,976;Montenegro,382;Morocco,212;Mozambique,258;Myanmar,95;Namibia,264;Nauru,674;Nepal,977;Netherlands,31;New Zealand,64;Nicaragua,505;Niger,227;Nigeria,234;North Korea,850;North Macedonia,389;Norway,47;' +
    'Pakistan,92;Palau,680;Palestine,970;Panama,507;Papua New Guinea,675;Paraguay,595;Peru,51;Philippines,63;Poland,48;Portugal,351;Puerto Rico,1787;Romania,40;Russia,7;Rwanda,250;Saint Kitts and Nevis,1869;Saint Lucia,1758;Saint Vincent and the Grenadines,1784;Samoa,685;San Marino,378;Sao Tome and Principe,239;Senegal,221;Serbia,381;Seychelles,248;Sierra Leone,232;Slovakia,421;Slovenia,386;Solomon Islands,677;Somalia,252;South Africa,27;South Korea,82;South Sudan,211;Spain,34;Sri Lanka,94;Sudan,249;Suriname,597;Sweden,46;Switzerland,41;Syria,963;' +
    'Taiwan,886;Tajikistan,992;Tanzania,255;Thailand,66;Timor-Leste,670;Togo,228;Tonga,676;Trinidad and Tobago,1868;Tunisia,216;Turkey,90;Turkmenistan,993;Tuvalu,688;Uganda,256;Ukraine,380;Uruguay,598;Uzbekistan,998;Vanuatu,678;Vatican City,379;Venezuela,58;Vietnam,84;Yemen,967;Zambia,260;Zimbabwe,263')
    .split(';').map(function (s) { var i = s.lastIndexOf(','); return { name: s.slice(0, i), code: '+' + s.slice(i + 1) }; });

  // mounts the picker in front of `input` (inside `host`, which must be position: relative); returns { get(): { name, code } }
  function dialPicker(host, input) {
    var state = DIAL[0], shown = [], hot = 0;
    var box = document.createElement('span');
    box.className = 'pi-dial';
    box.innerHTML = '<button type="button" class="pi-dial__btn" aria-haspopup="listbox" aria-expanded="false" aria-label="Country code"><b></b>' + ICON.chev + '</button>' +
      '<div class="pi-dial__pop" hidden><input class="pi-dial__q" type="text" placeholder="Search country or code" autocomplete="off" aria-label="Search country or code"><ul class="pi-dial__list" role="listbox"></ul></div>';
    host.insertBefore(box, host.firstChild);
    var btn = box.querySelector('.pi-dial__btn'), lab = btn.querySelector('b'), pop = box.querySelector('.pi-dial__pop'), q = box.querySelector('.pi-dial__q'), list = box.querySelector('.pi-dial__list');
    function paint() { lab.textContent = state.code; btn.title = state.name + ' ' + state.code; }
    function render() {
      var t = q.value.trim().toLowerCase().replace(/^\+/, '');
      shown = !t ? DIAL.slice() : DIAL.filter(function (c) { return c.name.toLowerCase().indexOf(t) >= 0 || c.code.slice(1).indexOf(t) === 0; })
        .sort(function (a, b) { return (a.name.toLowerCase().indexOf(t) === 0 ? 0 : 1) - (b.name.toLowerCase().indexOf(t) === 0 ? 0 : 1); });
      list.innerHTML = shown.length ? shown.map(function (c, i) {
        return '<li role="option" data-i="' + i + '"' + (c === state ? ' aria-selected="true"' : '') + '><span>' + c.name + '</span><small>' + c.code + '</small></li>';
      }).join('') : '<li class="is-none">No country found</li>';
      hot = Math.max(0, shown.indexOf(state)); mark();
    }
    function mark() { var it = list.querySelectorAll('li[data-i]'); for (var i = 0; i < it.length; i++) it[i].classList.toggle('is-hot', i === hot); if (it[hot]) it[hot].scrollIntoView({ block: 'nearest' }); }
    function open() { q.value = ''; render(); pop.hidden = false; box.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); try { q.focus({ preventScroll: true }); } catch (e) { q.focus(); } }
    function close(refocus) { if (pop.hidden) return; pop.hidden = true; box.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); if (refocus) input.focus(); }
    function pick(i) { if (!shown[i]) return; state = shown[i]; paint(); close(true); input.dispatchEvent(new Event('input', { bubbles: true })); }
    btn.addEventListener('click', function () { if (pop.hidden) open(); else close(false); });
    q.addEventListener('input', render);
    q.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (shown.length) { hot = (hot + (e.key === 'ArrowDown' ? 1 : -1) + shown.length) % shown.length; mark(); } }
      else if (e.key === 'Enter') { e.preventDefault(); pick(hot); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }
      else if (e.key === 'Tab') close(false);
    });
    list.addEventListener('mousedown', function (e) { e.preventDefault(); var li = e.target.closest('li[data-i]'); if (li) pick(+li.getAttribute('data-i')); });
    document.addEventListener('mousedown', function (e) { if (!pop.hidden && !box.contains(e.target)) close(false); });
    paint();
    return {
      get: function () { return state; },
      reset: function () { state = DIAL[0]; paint(); },
      // a number typed with its own "+code" picks that country
      follow: function () { var m = input.value.trim().match(/^\+(\d{1,4})/); if (!m) return; for (var n = Math.min(4, m[1].length); n >= 1; n--) { var c = DIAL.filter(function (d) { return d.code === '+' + m[1].slice(0, n); })[0]; if (c) { state = c; paint(); return; } } },
    };
  }
  window.piDial = { mount: dialPicker, list: DIAL };
  try { window.dispatchEvent(new Event('pi-dial-ready')); } catch (e) { /* old browser */ }

  // ---- the card
  var modal, form, errBox, lastFocus, target = '', dial;
  function el(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; }
  function field(name, label, icon, input, optional) {
    return '<div class="pi-lead__field" data-f="' + name + '"><label for="pi-lead-' + name + '">' + label +
      (optional ? ' <i>(Optional)</i>' : ' <b aria-hidden="true">*</b>') + '</label>' +
      '<div class="pi-lead__box">' + (icon ? '<span class="pi-lead__ic">' + icon + '</span>' : '') + input + '</div><em></em></div>';
  }
  function build() {
    modal = el(
      '<div class="pi-lead" role="dialog" aria-modal="true" aria-labelledby="pi-lead-title" hidden>' +
      '<div class="pi-lead__card">' +
      '<header class="pi-lead__head">' +
      '<span class="pi-lead__badge">' + ICON.doc + '</span>' +
      '<div class="pi-lead__htext"><span class="pi-lead__eyebrow">Pilot India</span><h2 class="pi-lead__title" id="pi-lead-title">Download Catalogue</h2>' +
      '<p class="pi-lead__chip"><b>PDF</b><span class="pi-lead__file"></span></p></div>' +
      '<button type="button" class="pi-lead__x" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' +
      '</header>' +
      '<form class="pi-lead__form" novalidate>' +
      field('name', 'Full Name', ICON.user, '<input id="pi-lead-name" name="name" type="text" autocomplete="name" maxlength="80" placeholder="e.g. Rahul Sharma">') +
      field('email', 'Gmail / Business Email', ICON.mail, '<input id="pi-lead-email" name="email" type="email" autocomplete="email" maxlength="120" placeholder="e.g. name@gmail.com">') +
      field('phone', 'Phone Number', '', '<span class="pi-lead__ic">' + ICON.phone + '</span><input id="pi-lead-phone" name="phone" type="tel" autocomplete="tel-national" inputmode="tel" maxlength="20" placeholder="98765 43210">') +
      field('company', 'Company Name', ICON.org, '<input id="pi-lead-company" name="company" type="text" autocomplete="organization" maxlength="120" placeholder="e.g. Acme Engineering Services">', true) +
      '<label class="pi-lead__hp" aria-hidden="true">Website <input name="website" type="text" tabindex="-1" autocomplete="off"></label>' +
      '<div class="pi-lead__privacy"><p class="pi-lead__ptitle">' + ICON.shield + 'Privacy Policy &amp; Data Commitment</p>' +
      '<p>We value your privacy. The information provided (name, email, phone) will be used by Pilot India only to send you the catalogue and related product communication. We keep your details confidential and do not share them with third parties.</p></div>' +
      '<div class="pi-lead__field pi-lead__consent" data-f="consent"><label><input type="checkbox" name="consent"><span>I have read and agree to the <a href="' + PRIVACY + '" target="_blank" rel="noopener">Privacy Policy</a> and consent to receiving the catalogue.</span></label><em></em></div>' +
      '<p class="pi-lead__err" role="alert" hidden></p>' +
      '<button type="submit" class="pi-lead__go"><span>Download Catalogue</span><i class="pi-lead__goic">' + ICON.dl + '</i></button>' +
      '<p class="pi-lead__after">Your download starts as soon as you submit.</p>' +
      '</form></div></div>');
    document.body.appendChild(modal);
    form = modal.querySelector('form');
    errBox = modal.querySelector('.pi-lead__err');
    var phone = form.elements.phone;
    dial = dialPicker(phone.parentNode, phone);
    phone.addEventListener('input', function () { dial.follow(); });
    modal.querySelector('.pi-lead__x').addEventListener('click', close);
    modal.addEventListener('mousedown', function (e) { if (e.target === modal) close(); });
    modal.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key === 'Tab') {        // keep focus inside the card
        var f = modal.querySelectorAll('input:not([tabindex="-1"]), select, button, a[href]');
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    form.addEventListener('submit', submit);
    form.addEventListener('input', function (e) { mark(e.target.name, ''); });
    form.addEventListener('change', function (e) { mark(e.target.name, ''); });
  }

  function open(url) {
    if (!modal) build();
    target = url;
    modal.querySelector('.pi-lead__file').textContent = niceName(url);
    setError('');
    ['name', 'email', 'phone', 'company', 'consent'].forEach(function (k) { mark(k, ''); });
    lastFocus = document.activeElement;
    modal.hidden = false;
    modal.classList.add('is-in');
    try { form.elements.name.focus({ preventScroll: true }); } catch (err) { form.elements.name.focus(); }
    modal.querySelector('.pi-lead__form').scrollTop = 0;
  }
  function close() {
    if (!modal || modal.hidden) return;
    modal.classList.remove('is-in');
    modal.hidden = true;           // at once: there is no closing animation, and a delayed hide could undo a quick re-open
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  function setError(msg) { errBox.textContent = msg; errBox.hidden = !msg; }
  function mark(k, msg) {
    var f = form && form.querySelector('[data-f="' + k + '"]');
    if (!f) return;
    f.querySelector('em').textContent = msg;
    f.classList.toggle('is-bad', !!msg);
  }

  function values() {
    var c = dial.get();
    var num = form.elements.phone.value.trim();
    return {
      name: form.elements.name.value.trim(), email: form.elements.email.value.trim(),
      country: c.name, phone: (/^\+/.test(num) ? num : c.code + ' ' + num),
      company: form.elements.company.value.trim(), consent: form.elements.consent.checked,
    };
  }
  function check(v) {
    var digits = v.phone.replace(/\D/g, '');
    var msgs = {
      name: v.name.length < 2 ? 'Please enter your name.' : '',
      email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email) ? '' : 'Please enter a valid email address.',
      phone: /^[+\d][\d\s()+-]*$/.test(v.phone) && digits.length >= 7 && digits.length <= 15 ? '' : 'Please enter a valid phone number.',
      consent: v.consent ? '' : 'Please agree to the Privacy Policy to continue.',
    };
    var ok = true;
    Object.keys(msgs).forEach(function (k) { mark(k, msgs[k]); if (msgs[k]) ok = false; });
    return ok;
  }

  function submit(e) {
    e.preventDefault();
    setError('');
    var v = values();
    if (!check(v)) { var bad = form.querySelector('.is-bad input, .is-bad select'); if (bad) bad.focus(); return; }
    var btn = form.querySelector('.pi-lead__go'), label = btn.querySelector('span');
    btn.disabled = true; label.textContent = 'Please wait…';
    v.website = form.elements.website.value; v.file = target; v.page = location.pathname;
    fetch('/api/leads', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, body: j }; }); })
      .then(function (r) {
        btn.disabled = false; label.textContent = 'Download Catalogue';
        if (r.body && r.body.ok) { var url = target; close(); download(url); return; }
        if (r.body && r.body.errors) { Object.keys(r.body.errors).forEach(function (k) { mark(k, r.body.errors[k]); }); return; }
        setError(r.status === 429 ? 'Too many attempts. Please wait a minute and try again.' : (r.body && r.body.error) || 'Something went wrong. Please try again.');
      })
      .catch(function () { btn.disabled = false; label.textContent = 'Download Catalogue'; setError('Could not reach the server. Please check your connection and try again.'); });
  }

  // ---- catch catalogue clicks (capture phase, before any other handler)
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || !isCatalogue(a) || unlocked()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    open(a.href);
  }, true);

  function prebuild() { if (!modal && document.body) build(); }
  // build the card as soon as the DOM exists, and compute its styles while the browser is idle so the first click costs only a repaint
  function warm() { prebuild(); if (modal) (window.requestIdleCallback || function (f) { setTimeout(f, 300); })(function () { modal.getBoundingClientRect(); }, { timeout: 1500 }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', warm); else warm();

  // the tiny inline stub in <head> (serve.mjs) catches a click made before this file loaded: open the card for it now
  window.__piLead = true;
  if (window.__piLeadQ) { var queued = window.__piLeadQ; window.__piLeadQ = null; if (document.body) open(queued); else document.addEventListener('DOMContentLoaded', function () { open(queued); }); }

  // the page served for a catalogue opened directly (server side): open the form straight away
  if (window.__PI_GATE_FILE) {
    var start = function () { open(window.__PI_GATE_FILE); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  }

  // ---- the main brochure offers itself once a visitor has been on the site for a minute (time counts across pages in one visit).
  // Not for people who already have the catalogue, not while they are typing in a form, and not again for 3 days after it has shown.
  (function () {
    var AUTO_FILE = '/assets/media/pilot-india-catalog-2025-e-catalog-new.pdf', AUTO_MS = 60000, QUIET_MS = 3 * 24 * 3600 * 1000;
    function keep(f) { try { return f(); } catch (e) { return null; } }
    if (window.__PI_GATE_FILE || unlocked()) return;
    var now = Date.now();
    if ((+keep(function () { return localStorage.getItem('pi_lead_auto_until'); }) || 0) > now) return;
    var t0 = +keep(function () { return sessionStorage.getItem('pi_lead_t0'); }) || 0;
    if (!t0) { t0 = now; keep(function () { sessionStorage.setItem('pi_lead_t0', String(t0)); }); }
    function fire() {
      if (unlocked() || (modal && !modal.hidden)) return;
      var a = document.activeElement;
      if (document.hidden || (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) { setTimeout(fire, 15000); return; }
      keep(function () { localStorage.setItem('pi_lead_auto_until', String(Date.now() + QUIET_MS)); });
      open(location.origin + AUTO_FILE);
    }
    setTimeout(fire, Math.max(1000, AUTO_MS - (now - t0)));
  })();
})();
