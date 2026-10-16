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
  // phone: a country-code picker in front of the number (pi-lead.js provides window.piDial; it loads on every page)
  var phoneIn = form && form.elements && form.elements.phone, dial = null;
  function mountDial() {
    if (dial || !phoneIn || !window.piDial) return;
    var wrap = document.createElement('span'); wrap.className = 'pc-phonebox';
    phoneIn.parentNode.insertBefore(wrap, phoneIn); wrap.appendChild(phoneIn);
    dial = window.piDial.mount(wrap, phoneIn);
    phoneIn.addEventListener('input', function () { dial.follow(); });
  }
  mountDial(); window.addEventListener('pi-dial-ready', mountDial);

  // ---- guided enquiry: 1. what it is about -> 2. the desk that answers it (email it directly) -> 3. the form.
  // Without this script every part is simply shown, with the topic chips inside the form.
  var flow = root.querySelector('.pc-flow');
  if (flow) {
    flow.classList.add('pc-flow--js');
    var next = flow.querySelector('.pc-next'), purpose = flow.querySelector('.pc-purpose');
    var steps = flow.querySelectorAll('.pc-steps__i'), pickedBox = flow.querySelector('.pc-picked');
    var go = function (el) { if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); };
    var setStep = function (n) { Array.prototype.forEach.call(steps, function (li) { li.classList.toggle('is-on', +li.getAttribute('data-step') <= n); li.classList.toggle('is-now', +li.getAttribute('data-step') === n); }); };
    var pick = function (btn, scroll) {
      var topic = btn.getAttribute('data-topic'), desk = btn.getAttribute('data-desk');
      Array.prototype.forEach.call(flow.querySelectorAll('.pc-pur'), function (b) { b.classList.toggle('is-on', b === btn); b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
      var list = flow.querySelector('.pc-dir__list');
      Array.prototype.forEach.call(list.querySelectorAll('.pc-dept'), function (li) { li.classList.toggle('is-picked', li.getAttribute('data-desk') === desk); });
      var mine = list.querySelector('.pc-dept[data-desk="' + desk + '"]');
      if (mine) list.insertBefore(mine, list.firstChild);
      // every email link opens with the subject already filled in
      Array.prototype.forEach.call(flow.querySelectorAll('[data-mail]'), function (a) {
        a.setAttribute('href', 'mailto:' + a.getAttribute('data-mail') + '?subject=' + encodeURIComponent('Enquiry: ' + topic));
      });
      if (form) {
        var r = form.querySelector('input[name="topic"][value="' + topic.replace(/"/g, '\\"') + '"]');
        if (r) r.checked = true;
      }
      // WhatsApp opens with a message about the chosen topic
      Array.prototype.forEach.call(document.querySelectorAll('[data-wa]'), function (a) {
        var base = a.getAttribute('href').split('?')[0];
        a.setAttribute('href', base + '?text=' + encodeURIComponent('Hello Pilot India, I have a query about ' + topic + ' and would like some help. Could you please get in touch with me?'));
      });
      if (pickedBox) { pickedBox.hidden = false; pickedBox.querySelector('[data-picked]').textContent = topic; }
      flow.classList.add('is-picked');
      setStep(2);
      if (scroll) go(next);
    };
    flow.addEventListener('click', function (e) {
      var b = e.target.closest('.pc-pur');
      if (b) { pick(b, true); return; }
      if (e.target.closest('[data-change]')) { flow.classList.remove('is-picked'); setStep(1); go(purpose); }
    });
    if (form) form.addEventListener('focusin', function () { if (flow.classList.contains('is-picked')) setStep(3); });
    // arriving from a product's "Enquire Now" (/contact-us?topic=...&product=...): the topic is picked and the
    // message names the product, then the page goes to the form
    var qs = new URLSearchParams(location.search), qTopic = qs.get('topic'), qProduct = (qs.get('product') || '').slice(0, 120);
    var qBtn = qTopic && Array.prototype.filter.call(flow.querySelectorAll('.pc-pur'), function (b) { return b.getAttribute('data-topic') === qTopic; })[0];
    if (qBtn) pick(qBtn, false);
    // after this script has set up the form's own listeners (the character count)
    if (qBtn || qProduct) setTimeout(function () {
      var m = form && form.elements.message;
      if (qProduct && m && !m.value) { m.value = 'Hello, I would like to enquire about the ' + qProduct + '. '; m.dispatchEvent(new Event('input', { bubbles: true })); }
      go(form || next);
    }, 300);
  }

  if (!form) return;
  var done = root.querySelector('.pc-done'), status = form.querySelector('.pc-status');
  var msg = form.elements.message, count = form.querySelector('.pc-count b');
  msg.addEventListener('input', function () { count.textContent = msg.value.length; });

  // the number is stored with its country code (unless the visitor typed their own +code)
  function withCode(num) { return !num || /^\+/.test(num) || !dial ? num : dial.get().code + ' ' + num; }

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
      phone: withCode(el.phone.value.trim()), country: dial ? dial.get().name : 'Not specified', message: el.message.value.trim(), consent: el.consent.checked,
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
    form.reset(); count.textContent = '0'; if (dial) dial.reset();
    done.hidden = true; form.hidden = false; form.elements.name.focus();
  });
})();
