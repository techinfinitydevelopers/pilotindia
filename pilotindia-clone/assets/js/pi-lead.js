/* Catalogue downloads: a short form (name, email, phone) before the file.
   Any PDF link with "catalog" in its text or file name opens the form instead of downloading. After a successful submit
   the server sets a cookie, the download starts, and later catalogue clicks go straight through. The server also refuses
   the catalogue files themselves without that cookie (see leads.mjs), so the form cannot be skipped by opening the link. */
(function () {
  'use strict';
  var PRIVACY = '/pages/privacy-policy.html';

  function isCatalogue(a) {
    var href = a.getAttribute('href') || '';
    if (!/\.pdf(\?|#|$)/i.test(href)) return false;
    return /catalog/i.test((a.textContent || '') + ' ' + (a.getAttribute('aria-label') || '') + ' ' + href);
  }
  function unlocked() { return /(?:^|;\s*)pi_dl_ok=1/.test(document.cookie); }
  function fileName(url) { try { return decodeURIComponent(new URL(url, location.href).pathname.split('/').pop()); } catch (e) { return url; } }

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
  function build() {
    modal = el(
      '<div class="pi-lead" role="dialog" aria-modal="true" aria-labelledby="pi-lead-title" hidden>' +
      '  <div class="pi-lead__card">' +
      '    <button type="button" class="pi-lead__x" aria-label="Close">&times;</button>' +
      '    <span class="pi-lead__eyebrow">Catalogue</span>' +
      '    <h2 class="pi-lead__title" id="pi-lead-title">Download the catalogue</h2>' +
      '    <p class="pi-lead__file"></p>' +
      '    <form class="pi-lead__form" novalidate>' +
      '      <label class="pi-lead__field"><span>Name</span><input name="name" type="text" autocomplete="name" required maxlength="80"><em></em></label>' +
      '      <label class="pi-lead__field"><span>Email</span><input name="email" type="email" autocomplete="email" required maxlength="120"><em></em></label>' +
      '      <label class="pi-lead__field"><span>Phone number</span><input name="phone" type="tel" autocomplete="tel" required maxlength="24" inputmode="tel"><em></em></label>' +
      '      <label class="pi-lead__hp" aria-hidden="true">Website <input name="website" type="text" tabindex="-1" autocomplete="off"></label>' +
      '      <p class="pi-lead__err" role="alert" hidden></p>' +
      '      <button type="submit" class="pi-lead__go">Download catalogue</button>' +
      '      <p class="pi-lead__note">By downloading you agree to our <a href="' + PRIVACY + '" target="_blank" rel="noopener">Privacy Policy</a>.</p>' +
      '    </form>' +
      '  </div>' +
      '</div>');
    document.body.appendChild(modal);
    form = modal.querySelector('form');
    errBox = modal.querySelector('.pi-lead__err');
    modal.querySelector('.pi-lead__x').addEventListener('click', close);
    modal.addEventListener('mousedown', function (e) { if (e.target === modal) close(); });
    modal.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key === 'Tab') {        // keep focus inside the card
        var f = modal.querySelectorAll('input:not([tabindex="-1"]), button, a[href]');
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    form.addEventListener('submit', submit);
  }

  function open(url) {
    if (!modal) build();
    target = url;
    modal.querySelector('.pi-lead__file').textContent = fileName(url);
    setError('');
    Array.prototype.forEach.call(form.querySelectorAll('em'), function (m) { m.textContent = ''; });
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.documentElement.classList.add('pi-lead-open');
    requestAnimationFrame(function () { modal.classList.add('is-in'); form.elements.name.focus(); });
  }
  function close() {
    if (!modal || modal.hidden) return;
    modal.classList.remove('is-in');
    document.documentElement.classList.remove('pi-lead-open');
    setTimeout(function () { modal.hidden = true; }, 220);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function setError(msg) { errBox.textContent = msg; errBox.hidden = !msg; }

  function check() {
    var ok = true, v = {
      name: form.elements.name.value.trim(), email: form.elements.email.value.trim(), phone: form.elements.phone.value.trim(),
    };
    var msgs = {
      name: v.name.length < 2 ? 'Please enter your name.' : '',
      email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email) ? '' : 'Please enter a valid email address.',
      phone: (function () { var d = v.phone.replace(/\D/g, ''); return /^[+\d][\d\s()+-]*$/.test(v.phone) && d.length >= 7 && d.length <= 15 ? '' : 'Please enter a valid phone number.'; })(),
    };
    Object.keys(msgs).forEach(function (k) { var m = form.elements[k].parentNode.querySelector('em'); m.textContent = msgs[k]; form.elements[k].setAttribute('aria-invalid', msgs[k] ? 'true' : 'false'); if (msgs[k]) ok = false; });
    return ok ? v : null;
  }

  function submit(e) {
    e.preventDefault();
    setError('');
    var v = check();
    if (!v) { var bad = form.querySelector('[aria-invalid="true"]'); if (bad) bad.focus(); return; }
    var btn = form.querySelector('.pi-lead__go');
    btn.disabled = true; btn.textContent = 'Please wait…';
    fetch('/api/leads', {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: v.name, email: v.email, phone: v.phone, website: form.elements.website.value, file: target, page: location.pathname }),
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, body: j }; }); })
      .then(function (r) {
        btn.disabled = false; btn.textContent = 'Download catalogue';
        if (r.body && r.body.ok) { var url = target; close(); download(url); return; }
        if (r.body && r.body.errors) { Object.keys(r.body.errors).forEach(function (k) { var m = form.elements[k] && form.elements[k].parentNode.querySelector('em'); if (m) m.textContent = r.body.errors[k]; }); return; }
        setError(r.status === 429 ? 'Too many attempts. Please wait a minute and try again.' : (r.body && r.body.error) || 'Something went wrong. Please try again.');
      })
      .catch(function () { btn.disabled = false; btn.textContent = 'Download catalogue'; setError('Could not reach the server. Please check your connection and try again.'); });
  }

  // ---- catch catalogue clicks (capture phase, before any other handler)
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || !isCatalogue(a) || unlocked()) return;
    e.preventDefault();
    e.stopPropagation();
    open(a.href);
  }, true);

  // the page served for a catalogue opened directly (server side): open the form straight away
  if (window.__PI_GATE_FILE) {
    var start = function () { open(window.__PI_GATE_FILE); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  }
})();
