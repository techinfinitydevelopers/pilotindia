// The hidden QR page: /get-catalogue
// Not linked from any page, not in the sitemap, noindex. The printed QR code (tools/make-qr.mjs) points here. The visitor fills
// the same details as the catalogue pop-up (same /api/leads, same cookie, same lead list), then every catalogue is offered for
// download. The lead is stored with file "QR catalogue page", so the admin Leads screen shows where it came from.
// `list` = [{ url, name, mb }] from leads.mjs catalogueList().
export function qrPage(list) {
  const json = JSON.stringify(list).replace(/</g, '\\u003c');
  return String.raw`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Download the Pilot India catalogue</title><meta name="robots" content="noindex, nofollow">
<link rel="icon" href="/assets/img/pilot-logo-1-1.png">
<link rel="stylesheet" href="/assets/css/pi-lead.css?v=10">
<style>
*,*::before,*::after{box-sizing:border-box}
body{margin:0;min-height:100vh;background:#f7f5f1;color:#111114;font-family:var(--pi-font-body,"Inter",system-ui,-apple-system,"Segoe UI",sans-serif);-webkit-font-smoothing:antialiased}
.qr{width:min(560px,100%);margin:0 auto;padding:28px 16px 48px}
.qr__brand{display:flex;width:max-content;margin:0 auto 20px;padding:12px 24px;border-radius:999px;background:#111114}
.qr__logo{display:block;height:28px}
.qr__card{background:#fff;border-radius:22px;box-shadow:0 30px 70px -36px rgba(0,0,0,.35);overflow:hidden}
.qr__head{position:relative;padding:26px 26px 20px;background:linear-gradient(180deg,#fbf7f2,#fff);border-bottom:1px solid #efe7dd}
.qr__head::before{content:"";position:absolute;left:0;right:0;top:0;height:4px;background:#f58634}
.qr__eyebrow{display:block;margin:0 0 6px;color:#f58634;font-size:11.5px;font-weight:700;letter-spacing:.2em;text-transform:uppercase}
.qr__head h1{margin:0;font-family:var(--pi-font-heading,"DM Sans",system-ui,sans-serif);font-style:italic;font-size:clamp(24px,7vw,30px);font-weight:800;line-height:1.1;letter-spacing:-.02em}
.qr__head p{margin:10px 0 0;color:#4d4f55;font-size:15px;line-height:1.55}
.qr__body{padding:24px 26px 28px}
.qr__body[hidden]{display:none}
.qr__list{display:grid;gap:10px;margin:0;padding:0;list-style:none}
.qr__dl{display:flex;align-items:center;gap:14px;padding:14px 16px;border:1px solid #e4e4e9;border-radius:14px;color:#111114;text-decoration:none;transition:border-color .2s,background .2s,transform .2s}
.qr__dl:hover,.qr__dl:focus-visible{border-color:#f58634;background:#fffaf5;outline:0}
.qr__dl svg{flex:none;width:22px;height:22px;color:#f58634}
.qr__dl b{flex:1;min-width:0;font-size:14.5px;font-weight:600;line-height:1.3}
.qr__dl small{flex:none;color:#8b8b93;font-size:12.5px}
.qr__dl--main{padding:18px;border:0;border-radius:999px;background:#111114;color:#fff;box-shadow:0 16px 30px -18px rgba(17,17,20,.8)}
.qr__dl--main:hover,.qr__dl--main:focus-visible{background:#111114;transform:translateY(-1px)}
.qr__dl--main svg{color:#f58634}.qr__dl--main small{color:#c9c9d0}.qr__dl--main b{font-size:16px;padding-left:4px}
.qr__more{margin:20px 0 0}
.qr__more[hidden]{display:none}
.qr__more summary{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px;border:1px solid #e4e4e9;border-radius:14px;color:#1f2024;font-size:14px;font-weight:700;cursor:pointer;list-style:none}
.qr__more summary::-webkit-details-marker{display:none}
.qr__more summary::after{content:"+";color:#f58634;font-size:22px;font-weight:600;line-height:1}
.qr__more[open] summary::after{content:"\2212"}
.qr__more .qr__list{margin-top:10px}
.qr__thanks{margin:0 0 16px;color:#4d4f55;font-size:15px;line-height:1.55}
.qr__go{width:100%}
.qr__back{display:block;margin-top:22px;text-align:center;color:#4d4f55;font-size:14px}
.qr__back a{color:#111114;font-weight:700}
</style></head>
<body><main class="qr">
<a class="qr__brand" href="/"><img class="qr__logo" src="/assets/img/pilot-logo-1-1.png" alt="Pilot India"></a>
<div class="qr__card">
<header class="qr__head"><span class="qr__eyebrow">Pilot India</span><h1>Download our catalogue</h1><p>Enter a few details and the PDF catalogues are yours to download.</p></header>
<form class="qr__body" id="qr-form" novalidate>
<div class="pi-lead__field" data-f="name"><label for="qr-name">Full Name <b aria-hidden="true">*</b></label><div class="pi-lead__box"><input id="qr-name" name="name" type="text" autocomplete="name" maxlength="80" placeholder="e.g. Rahul Sharma"></div><em></em></div>
<div class="pi-lead__field" data-f="email"><label for="qr-email">Gmail / Business Email <b aria-hidden="true">*</b></label><div class="pi-lead__box"><input id="qr-email" name="email" type="email" autocomplete="email" maxlength="120" placeholder="e.g. name@gmail.com"></div><em></em></div>
<div class="pi-lead__field" data-f="phone"><label for="qr-phone">Phone Number <b aria-hidden="true">*</b></label><div class="pi-lead__box" id="qr-phone-box" style="position:relative"><input id="qr-phone" name="phone" type="tel" autocomplete="tel-national" inputmode="tel" maxlength="20" placeholder="98765 43210"></div><em></em></div>
<div class="pi-lead__field" data-f="company"><label for="qr-company">Company Name <i>(Optional)</i></label><div class="pi-lead__box"><input id="qr-company" name="company" type="text" autocomplete="organization" maxlength="120" placeholder="e.g. Acme Engineering Services"></div><em></em></div>
<label class="pi-lead__hp" aria-hidden="true">Website <input name="website" type="text" tabindex="-1" autocomplete="off"></label>
<div class="pi-lead__field pi-lead__consent" data-f="consent"><label><input type="checkbox" name="consent"><span>I have read and agree to the <a href="/privacy-policy" target="_blank" rel="noopener">Privacy Policy</a> and consent to receiving the catalogue.</span></label><em></em></div>
<p class="pi-lead__err" id="qr-err" role="alert" hidden></p>
<button type="submit" class="pi-lead__go qr__go"><span>Get the catalogue</span><i class="pi-lead__goic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg></i></button>
</form>
<section class="qr__body" id="qr-done" hidden aria-live="polite"><p class="qr__thanks">Thank you. Tap a file to download it.</p><div id="qr-main"></div><details class="qr__more" id="qr-more"><summary id="qr-more-t">More product catalogues</summary><ul class="qr__list" id="qr-list"></ul></details></section>
</div>
<p class="qr__back"><a href="/">pilotindia.com</a></p>
</main>
<script>window.__PI_NOAUTO=true;window.__PI_CATALOGUES=${json};</script>
<script src="/assets/js/pi-lead.js?v=10"></script>
<script>
(function () {
  var form = document.getElementById('qr-form'), done = document.getElementById('qr-done'), err = document.getElementById('qr-err'), dial;
  var DL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>';
  function mount() {
    if (dial || !window.piDial) return;
    dial = window.piDial.mount(document.getElementById('qr-phone-box'), form.elements.phone);
    form.elements.phone.addEventListener('input', function () { dial.follow(); });
  }
  mount(); window.addEventListener('pi-dial-ready', mount);
  function mark(k, m) { var f = form.querySelector('[data-f="' + k + '"]'); if (!f) return; f.querySelector('em').textContent = m; f.classList.toggle('is-bad', !!m); }
  form.addEventListener('input', function (e) { mark(e.target.name, ''); });
  form.addEventListener('change', function (e) { mark(e.target.name, ''); });
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function row(c, main) {
    return '<a class="qr__dl' + (main ? ' qr__dl--main' : '') + '" href="' + esc(c.url) + '" download>' + DL + '<b>' + esc(main ? 'Pilot India Catalogue 2025' : c.name) + '</b><small>PDF · ' + c.mb + ' MB</small></a>';
  }
  function show() {
    var all = window.__PI_CATALOGUES || [];
    var main = all.filter(function (c) { return /pilot-india-catalog-2025/i.test(c.url); })[0] || all[0];
    var rest = all.filter(function (c) { return c !== main; });
    document.getElementById('qr-main').innerHTML = main ? row(main, true) : '';
    document.getElementById('qr-list').innerHTML = rest.map(function (c) { return '<li>' + row(c, false) + '</li>'; }).join('');
    document.getElementById('qr-more').hidden = !rest.length;
    document.getElementById('qr-more-t').textContent = 'More product catalogues (' + rest.length + ')';
    form.hidden = true; done.hidden = false; window.scrollTo(0, 0);
  }
  if (/(?:^|;\s*)pi_dl_ok=1/.test(document.cookie)) show();
  form.addEventListener('submit', function (e) {
    e.preventDefault(); err.hidden = true;
    var c = dial.get(), num = form.elements.phone.value.trim();
    var v = {
      name: form.elements.name.value.trim(), email: form.elements.email.value.trim(), country: c.name,
      phone: /^\+/.test(num) ? num : c.code + ' ' + num, company: form.elements.company.value.trim(),
      consent: form.elements.consent.checked, website: form.elements.website.value, file: 'QR catalogue page', page: '/get-catalogue'
    };
    var d = v.phone.replace(/\D/g, ''), ok = true;
    var m = {
      name: v.name.length < 2 ? 'Please enter your name.' : '',
      email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email) ? '' : 'Please enter a valid email address.',
      phone: /^[+\d][\d\s()+-]*$/.test(v.phone) && d.length >= 7 && d.length <= 15 ? '' : 'Please enter a valid phone number.',
      consent: v.consent ? '' : 'Please agree to the Privacy Policy to continue.'
    };
    Object.keys(m).forEach(function (k) { mark(k, m[k]); if (m[k]) ok = false; });
    if (!ok) { var b = form.querySelector('.is-bad input'); if (b) b.focus(); return; }
    var btn = form.querySelector('.qr__go'), lab = btn.querySelector('span'); btn.disabled = true; lab.textContent = 'Please wait…';
    function fail(msg) { btn.disabled = false; lab.textContent = 'Get the catalogue'; err.textContent = msg; err.hidden = false; }
    fetch('/api/leads', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { s: r.status, b: j }; }); })
      .then(function (r) {
        btn.disabled = false; lab.textContent = 'Get the catalogue';
        if (r.b && r.b.ok) { show(); return; }
        if (r.b && r.b.errors) { Object.keys(r.b.errors).forEach(function (k) { mark(k, r.b.errors[k]); }); return; }
        fail(r.s === 429 ? 'Too many attempts. Please wait a minute and try again.' : (r.b && r.b.error) || 'Something went wrong. Please try again.');
      })
      .catch(function () { fail('Could not reach the server. Please check your connection and try again.'); });
  });
})();
</script></body></html>`;
}
