/* Contact Us: scroll reveals, copy buttons, and the enquiry form (posts JSON to /api/enquiry, see leads.mjs).
   Nothing is hidden until this script has run (#pi-contact.pc-js), so without scripting the page is fully visible;
   the form then simply does nothing, and the emails / phone above it still work. */
(function () {
  'use strict';
  var root = document.getElementById('pi-contact');
  if (!root) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- reveals
  if ('IntersectionObserver' in window && !reduce) {
    root.classList.add('pc-js');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
    root.querySelectorAll('[data-reveal]').forEach(function (el) { io.observe(el); });
  }

  // ---- copy buttons
  function copied(btn) {
    var label = btn.querySelector('span'), old = label ? label.textContent : '';
    btn.classList.add('is-done'); if (label) label.textContent = 'Copied';
    setTimeout(function () { btn.classList.remove('is-done'); if (label) label.textContent = old; }, 1600);
  }
  root.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-copy]');
    if (!btn) return;
    var text = btn.getAttribute('data-copy');
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { copied(btn); }, function () {});
    else {
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); copied(btn); } catch (err) { /* nothing to copy with */ }
      ta.remove();
    }
  });

  // ---- enquiry form
  var form = document.getElementById('pc-form');
  if (!form) return;
  var done = root.querySelector('.pc-done'), status = form.querySelector('.pc-status');
  var msg = form.elements.message, count = form.querySelector('.pc-count b');
  msg.addEventListener('input', function () { count.textContent = msg.value.length; });

  function mark(name, text) {
    var f = form.querySelector('[data-f="' + name + '"]');
    if (!f) return;
    f.classList.toggle('is-bad', !!text);
    var em = f.querySelector('.pc-err'); if (em) em.textContent = text || '';
    var input = f.querySelector('input, select, textarea');
    if (input && input.type !== 'checkbox') {
      if (text) { input.setAttribute('aria-invalid', 'true'); if (em && em.id) input.setAttribute('aria-describedby', em.id); }
      else input.removeAttribute('aria-invalid');
    }
  }
  function check(v) {
    var digits = v.phone.replace(/\D/g, '');
    return {
      name: v.name.length >= 2 ? '' : 'Please enter your name.',
      email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email) ? '' : 'Please enter a valid email address.',
      phone: /^[+\d][\d\s()+-]*$/.test(v.phone) && digits.length >= 7 && digits.length <= 15 ? '' : 'Please enter a valid phone number.',
      country: v.country ? '' : 'Please choose your country.',
      message: v.message.length >= 10 ? '' : 'Please write a little more (at least 10 characters).',
      consent: v.consent ? '' : 'Please agree to the Privacy Policy to continue.',
    };
  }
  // clear a field's error as soon as it is edited
  form.addEventListener('input', function (e) { var f = e.target.closest('[data-f]'); if (f && f.classList.contains('is-bad')) mark(f.getAttribute('data-f'), ''); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (form.classList.contains('is-busy')) return;
    var el = form.elements, topic = form.querySelector('input[name="topic"]:checked');
    var v = {
      topic: topic ? topic.value : '', name: el.name.value.trim(), company: el.company.value.trim(), email: el.email.value.trim(),
      phone: el.phone.value.trim(), country: el.country.value, message: el.message.value.trim(), consent: el.consent.checked,
      website: el.website.value, page: location.pathname,
    };
    var errs = check(v), first = null;
    Object.keys(errs).forEach(function (k) { mark(k, errs[k]); if (errs[k] && !first) first = k; });
    status.classList.remove('is-bad'); status.textContent = '';
    if (first) {
      var f = form.querySelector('[data-f="' + first + '"] input, [data-f="' + first + '"] select, [data-f="' + first + '"] textarea');
      if (f) f.focus();
      return;
    }
    form.classList.add('is-busy'); status.textContent = 'Sending...';
    fetch('/api/enquiry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v), credentials: 'same-origin' })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }).then(function (d) { d.status = r.status; return d; }); })
      .then(function (d) {
        form.classList.remove('is-busy');
        if (d.ok) {
          form.hidden = true; done.hidden = false; status.textContent = '';
          done.querySelector('h3').setAttribute('tabindex', '-1'); done.querySelector('h3').focus();
          return;
        }
        if (d.errors) Object.keys(d.errors).forEach(function (k) { mark(k, d.errors[k]); });
        status.classList.add('is-bad');
        status.textContent = d.status === 429 ? 'Too many tries - please wait a minute and send again.' : (d.error || 'Please check the highlighted fields.');
      })
      .catch(function () {
        form.classList.remove('is-busy'); status.classList.add('is-bad');
        status.textContent = 'Could not send. Check your connection, or email info@pilotindia.com.';
      });
  });

  root.querySelector('[data-again]').addEventListener('click', function () {
    form.reset(); count.textContent = '0';
    done.hidden = true; form.hidden = false; form.elements.name.focus();
  });
})();
