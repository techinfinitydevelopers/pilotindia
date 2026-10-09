/* Catalogue downloads: a short form (name, email, country, phone, company) before the file.
   Any link with "catalog" in its text or file name that points at a PDF opens the form instead of downloading. After a
   successful submit the server sets a cookie, the download starts, and later catalogue clicks go straight through. The
   server also refuses the catalogue files themselves without that cookie (see leads.mjs), so the form cannot be skipped. */
(function () {
  'use strict';
  var PRIVACY = '/pages/privacy-policy.html';
  var COUNTRIES = [
    ['India', '+91'], ['United Arab Emirates', '+971'], ['Saudi Arabia', '+966'], ['Qatar', '+974'], ['Oman', '+968'],
    ['Kuwait', '+965'], ['Bahrain', '+973'], ['Nepal', '+977'], ['Bangladesh', '+880'], ['Sri Lanka', '+94'],
    ['Bhutan', '+975'], ['Maldives', '+960'], ['Singapore', '+65'], ['Malaysia', '+60'], ['Indonesia', '+62'],
    ['Thailand', '+66'], ['Vietnam', '+84'], ['Philippines', '+63'], ['China', '+86'], ['Japan', '+81'],
    ['South Korea', '+82'], ['Australia', '+61'], ['New Zealand', '+64'], ['United Kingdom', '+44'], ['Ireland', '+353'],
    ['Germany', '+49'], ['France', '+33'], ['Italy', '+39'], ['Spain', '+34'], ['Netherlands', '+31'],
    ['Belgium', '+32'], ['Switzerland', '+41'], ['Sweden', '+46'], ['Poland', '+48'], ['Turkey', '+90'],
    ['Russia', '+7'], ['United States', '+1'], ['Canada', '+1'], ['Mexico', '+52'], ['Brazil', '+55'],
    ['South Africa', '+27'], ['Nigeria', '+234'], ['Kenya', '+254'], ['Egypt', '+20'], ['Tanzania', '+255'],
    ['Uganda', '+256'], ['Ethiopia', '+251'], ['Ghana', '+233'], ['Iran', '+98'], ['Iraq', '+964'],
  ];
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

  // ---- the card
  var modal, form, errBox, lastFocus, target = '';
  function el(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; }
  function field(name, label, icon, input, optional) {
    return '<div class="pi-lead__field" data-f="' + name + '"><label for="pi-lead-' + name + '">' + label +
      (optional ? ' <i>(Optional)</i>' : ' <b aria-hidden="true">*</b>') + '</label>' +
      '<div class="pi-lead__box">' + (icon ? '<span class="pi-lead__ic">' + icon + '</span>' : '') + input + '</div><em></em></div>';
  }
  function build() {
    var opts = COUNTRIES.map(function (c, i) { return '<option value="' + i + '"' + (i === 0 ? ' selected' : '') + '>' + c[0] + ' (' + c[1] + ')</option>'; }).join('') +
      '<option value="other">Other</option>';
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
      field('country', 'Country', '', '<select id="pi-lead-country" name="country" autocomplete="country-name">' + opts + '</select><span class="pi-lead__chev">' + ICON.chev + '</span>') +
      field('phone', 'Phone Number', '', '<span class="pi-lead__dial">+91</span><span class="pi-lead__ic">' + ICON.phone + '</span><input id="pi-lead-phone" name="phone" type="tel" autocomplete="tel-national" inputmode="tel" maxlength="20" placeholder="98765 43210">') +
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
    var sel = form.elements.country, dial = modal.querySelector('.pi-lead__dial');
    sel.addEventListener('change', function () { dial.textContent = sel.value === 'other' ? '+' : COUNTRIES[+sel.value][1]; });
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
    ['name', 'email', 'country', 'phone', 'company', 'consent'].forEach(function (k) { mark(k, ''); });
    lastFocus = document.activeElement;
    modal.hidden = false;
    // inline style, not a class: some site scripts rewrite <html class> while the page loads
    document.documentElement.style.overflow = 'hidden';
    void modal.offsetWidth;          // start the transition now; no rAF (it can stall while a long page is loading)
    modal.classList.add('is-in');
    try { form.elements.name.focus({ preventScroll: true }); } catch (err) { form.elements.name.focus(); }
    modal.querySelector('.pi-lead__form').scrollTop = 0;
  }
  function close() {
    if (!modal || modal.hidden) return;
    modal.classList.remove('is-in');
    document.documentElement.style.overflow = '';
    setTimeout(function () { modal.hidden = true; }, 220);
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
    var sel = form.elements.country.value, c = sel === 'other' ? ['Other', ''] : COUNTRIES[+sel];
    var num = form.elements.phone.value.trim();
    return {
      name: form.elements.name.value.trim(), email: form.elements.email.value.trim(),
      country: c[0], phone: (/^\+/.test(num) || !c[1] ? num : c[1] + ' ' + num),
      company: form.elements.company.value.trim(), consent: form.elements.consent.checked,
    };
  }
  function check(v) {
    var digits = v.phone.replace(/\D/g, '');
    var msgs = {
      name: v.name.length < 2 ? 'Please enter your name.' : '',
      email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email) ? '' : 'Please enter a valid email address.',
      country: v.country ? '' : 'Please choose your country.',
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
  function idle() { if (window.requestIdleCallback) requestIdleCallback(prebuild, { timeout: 2000 }); else setTimeout(prebuild, 200); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', idle); else idle();

  // the page served for a catalogue opened directly (server side): open the form straight away
  if (window.__PI_GATE_FILE) {
    var start = function () { open(window.__PI_GATE_FILE); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  }
})();
