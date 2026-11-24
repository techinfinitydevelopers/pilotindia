/* Pilot India preloader (2026-11-24). A full-screen card that opens every visit to the home page, and the first page of any other
   visit: the TEX-90 spray gun (assets/img/tex-90.png, the product's own cut-out) slides in from the left and writes P-I-L-O-T
   from left to right, spraying each letter on as it passes; when the word is finished and the page has loaded, the gun leaves to
   the right and the card wipes up to show the page.
   Added to every page by serve.mjs, right after <head>, so no page file carries it. Self-contained: its own styles and font face.
   Not shown: in an iframe, in the admin editor, with reduced motion, or to automated browsers (audits); ?preloader=1 forces it.
   Click or press Escape to skip. It can never trap a visitor: a hard timeout removes it, and without script nothing is added. */
(function () {
  'use strict';
  var d = document, w = window, de = d.documentElement, loc = w.location, q = loc.search;
  var force = /[?&]preloader=(1|force)(&|$)/.test(q);
  if (!force) {
    if (navigator.webdriver) return;
    if (w.top !== w.self || /^\/admin(\/|$)/.test(loc.pathname) || /[?&]__cms=1(&|$)/.test(q)) return;
    if (w.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    try {
      var home = loc.pathname === '/' || loc.pathname === '/index.html';
      if (!home && w.sessionStorage.getItem('pi_pl')) return;
      w.sessionStorage.setItem('pi_pl', '1');
    } catch (e) { /* storage blocked: show it */ }
  }

  var WORD = 'PILOT', GUN = '/assets/img/tex-90.png', FONT = '/assets/fonts/pi-dm-sans-italic-latin.woff2';
  var NOZ = [0.185, 0.553];                 // the nozzle tip, as a fraction of the 1000 x 1000 cut-out
  var ENTER = 0.5, WRITE = 1.7, EXIT = 0.55; // seconds

  var CSS =
    'html.pi-pl-on{overflow:hidden!important}' +
    '@font-face{font-family:"PI Pre";font-style:italic;font-weight:300 800;font-display:block;src:url(' + FONT + ') format("woff2")}' +
    '#pi-pl{position:fixed;inset:0;z-index:2147483600;display:grid;place-items:center;background:#f7f5f1;overflow:hidden;clip-path:inset(0);transition:clip-path .8s cubic-bezier(.76,0,.24,1);-webkit-font-smoothing:antialiased;cursor:pointer}' +
    '#pi-pl.is-out{clip-path:inset(0 0 100% 0)}' +
    '#pi-pl *{box-sizing:border-box}' +
    '#pi-pl .pl-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}' +
    '#pi-pl .pl-word{position:relative;font-family:"PI Pre","DM Sans",system-ui,sans-serif;font-style:italic;font-weight:800;font-size:clamp(56px,18vw,200px);letter-spacing:-.035em;line-height:1;color:#111114;white-space:nowrap;padding:0 .08em}' +
    '#pi-pl .pl-ch{display:inline-block;opacity:var(--p,0);filter:blur(calc((1 - var(--p,0)) * 6px));text-shadow:0 0 calc((1 - var(--p,0)) * 14px) rgba(60,60,67,.6);will-change:opacity,filter}' +
    '#pi-pl .pl-ch.d{filter:none;text-shadow:none;will-change:auto}' +
    '#pi-pl .pl-rule{position:absolute;left:0;top:0;height:5px;border-radius:5px;background:rgba(17,17,20,.08);overflow:hidden}' +
    '#pi-pl .pl-rule b{display:block;width:100%;height:100%;background:#f58634;transform:scaleX(0);transform-origin:left}' +
    '#pi-pl .pl-fx{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}' +
    '#pi-pl .pl-gun{position:absolute;left:0;top:0;opacity:0;pointer-events:none;will-change:transform;filter:drop-shadow(0 16px 20px rgba(17,17,20,.22))}' +
    '#pi-pl .pl-gun img{position:absolute;inset:0;width:100%;height:100%;display:block;max-width:none}' +
    '#pi-pl .pl-face{position:absolute;inset:0;width:100%;height:100%}' +
    '#pi-pl .e-w{fill:#fff;stroke:#1b1b1f;stroke-width:5}#pi-pl .e-p{fill:#1b1b1f}#pi-pl .e-s{fill:#fff}' +
    '#pi-pl .eyes{transform-box:fill-box;transform-origin:center;animation:plBlink 4s infinite}' +
    '#pi-pl .cheek{fill:#f58634;opacity:.55}#pi-pl .mouth{fill:none;stroke:#1b1b1f;stroke-width:6;stroke-linecap:round}#pi-pl .mouth-o{fill:#1b1b1f;opacity:0}' +
    '#pi-pl .pl-gun.is-spraying .mouth{opacity:0}#pi-pl .pl-gun.is-spraying .mouth-o{opacity:1}' +
    '@keyframes plBlink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}' +
    '#pi-pl .pl-skip{position:absolute;right:20px;bottom:18px;padding:8px 14px;border:0;border-radius:999px;background:transparent;color:#4d4f55;font:600 13px/1 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;cursor:pointer}' +
    '#pi-pl .pl-skip:hover,#pi-pl .pl-skip:focus-visible{background:rgba(17,17,20,.07);outline:0}' +
    '@media(max-width:640px){#pi-pl .pl-word{font-size:22vw}}';

  var st = d.createElement('style'); st.id = 'pi-pl-css'; st.textContent = CSS; (d.head || de).appendChild(st);
  var ov = d.createElement('div');
  ov.id = 'pi-pl'; ov.setAttribute('role', 'status');
  ov.innerHTML =
    '<span class="pl-sr">Loading Pilot India</span><canvas class="pl-fx"></canvas>' +
    '<div class="pl-word" aria-hidden="true">' + WORD.split('').map(function (c) { return '<span class="pl-ch">' + c + '</span>'; }).join('') + '</div>' +
    '<i class="pl-rule" aria-hidden="true"><b></b></i>' +
    '<div class="pl-gun" aria-hidden="true"><img alt="" draggable="false" src="' + GUN + '">' +
    '<svg class="pl-face" viewBox="0 0 1000 1000"><circle class="cheek" cx="402" cy="712" r="15"/><circle class="cheek" cx="582" cy="712" r="15"/>' +
    '<g class="eyes"><circle class="e-w" cx="448" cy="650" r="27"/><circle class="e-w" cx="536" cy="650" r="27"/>' +
    '<g class="pupils"><circle class="e-p" cx="448" cy="650" r="12"/><circle class="e-s" cx="453" cy="644" r="4"/><circle class="e-p" cx="536" cy="650" r="12"/><circle class="e-s" cx="541" cy="644" r="4"/></g></g>' +
    '<path class="mouth" d="M462 712Q492 738 522 710"/><ellipse class="mouth-o" cx="492" cy="718" rx="12" ry="15"/></svg></div>' +
    '<button type="button" class="pl-skip">Skip</button>';
  de.classList.add('pi-pl-on');
  de.appendChild(ov);          // the script runs in <head>, before <body> exists: the card is the first thing painted

  var finished = false, raf = 0, timers = [];
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function finish() {
    if (finished) return; finished = true;
    if (raf) cancelAnimationFrame(raf);
    timers.forEach(clearTimeout);
    if (ov.parentNode) ov.parentNode.removeChild(ov);
    if (st.parentNode) st.parentNode.removeChild(st);
    de.classList.remove('pi-pl-on');
    try { w.dispatchEvent(new Event('pi-preloader-done')); } catch (e) { /* old browser */ }
  }
  var skipped = false;
  function skip() { if (skipped || finished) return; skipped = true; ov.classList.add('is-out'); later(finish, 700); }
  ov.addEventListener('click', skip);
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape') skip(); });
  later(finish, 12000);        // whatever happens, the page is never held longer than this

  try { run(); } catch (e) { finish(); }

  function run() {
    var word = ov.querySelector('.pl-word'), chs = [].slice.call(word.querySelectorAll('.pl-ch')), n = chs.length;
    var gun = ov.querySelector('.pl-gun'), im = gun.querySelector('img'), pupils = gun.querySelector('.pupils');
    var cv = ov.querySelector('.pl-fx'), ctx = cv.getContext('2d'), rule = ov.querySelector('.pl-rule'), bar = rule.firstChild;
    var u = 100, S = 135, W = 0, H = 0, G = [], oX = 0, oY = 0, gunOk = true;
    var loaded = d.readyState === 'complete';
    if (!loaded) w.addEventListener('load', function () { loaded = true; });
    later(function () { loaded = true; }, 7000);

    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
    function lerp(a, b, k) { return a + (b - a) * k; }
    function measure() {
      W = innerWidth; H = innerHeight;
      u = parseFloat(getComputedStyle(word).fontSize) || 100; S = u * 1.35;
      oX = NOZ[0] * S; oY = NOZ[1] * S;
      gun.style.width = gun.style.height = S + 'px'; gun.style.transformOrigin = oX + 'px ' + oY + 'px';
      G = chs.map(function (c) { var r = c.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; });
      var wr = word.getBoundingClientRect();
      rule.style.left = (wr.left + u * 0.08) + 'px'; rule.style.top = (wr.bottom + u * 0.12) + 'px'; rule.style.width = (wr.width - u * 0.16) + 'px';
      var dpr = Math.min(1.5, w.devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // the writing point: the leading edge of the letter that is going on
    function typed(k) { return k * (n + 1.5); }
    function caret(k) {
      var t = typed(k) - 0.75, c = clamp(Math.floor(t), 0, n - 1), f = clamp(t - c, 0, 1), r = G[c];
      var x = r.l + (r.r - r.l) * f, h = r.b - r.t;
      return { x: x, y: (r.t + r.b) / 2, l: x - u * 0.1, r: x + u * 0.02, t: r.t + h * 0.22, b: r.b - h * 0.18 };
    }
    var nib = function (k) { var c = caret(k); return { x: c.x + u * 0.1, y: c.y + u * 0.13, c: c }; };

    // ---- the spray: fine dark droplets in a short jet, and a soft mist that widens toward the letter
    var PAL = ['#17171b', '#202026', '#2a2a31', '#34343c'], parts = [];
    var MIST = d.createElement('canvas'); MIST.width = MIST.height = 64;
    (function () { var m = MIST.getContext('2d'), g = m.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(40,40,46,1)'); g.addColorStop(0.4, 'rgba(40,40,46,.42)'); g.addColorStop(1, 'rgba(40,40,46,0)'); m.fillStyle = g; m.fillRect(0, 0, 64, 64); })();
    function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; }
    function emit(nx, ny, T, F) {
      var tx = (T.l + T.r) / 2, ty = (T.t + T.b) / 2, dist = Math.hypot(tx - nx, ty - ny) || 1, spread = 1.4 + dist * 0.035, i;
      for (i = 0; i < Math.round(13 * F); i++) {
        var gx = T.l + (T.r - T.l) * Math.random() + gauss() * spread, gy = T.t + (T.b - T.t) * Math.random() + gauss() * spread * 0.7;
        var big = Math.random() < 0.04, L = (big ? 9 : 4.5) + Math.random() * 4;
        parts.push({ x: nx + gauss() * 0.8, y: ny + gauss() * 0.8, vx: (gx - nx) / L, vy: (gy - ny) / L, life: L, r: big ? 1.4 + Math.random() * 1.1 : 0.35 + Math.random() * Math.random() * 1.4, a: 0.4 + Math.random() * 0.5, c: PAL[(Math.random() * PAL.length) | 0] });
      }
      for (i = 0; i < Math.max(1, Math.round(3 * F)); i++) {
        var uu = Math.pow(Math.random(), 0.7), life = 16 + Math.random() * 12;
        parts.push({ mist: 1, x: nx + (tx - nx) * uu + gauss() * spread * uu * 0.5, y: ny + (ty - ny) * uu + gauss() * spread * uu * 0.4, r: 3 + uu * (9 + spread * 0.9), vx: (tx - nx) / dist * 0.5, vy: (ty - ny) / dist * 0.5 - 0.06, life: life, max: life, a: 0.05 + 0.06 * uu });
      }
    }
    function draw(F) {
      ctx.clearRect(0, 0, W, H);
      for (var j = parts.length - 1; j >= 0; j--) {
        var p = parts[j];
        if (p.mist) {
          p.life -= F; p.r += 0.5 * F; p.x += p.vx * F; p.y += p.vy * F;
          if (p.life <= 0) { parts.splice(j, 1); continue; }
          ctx.globalAlpha = p.a * (p.life / p.max); ctx.drawImage(MIST, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); continue;
        }
        if (p.life <= 0) { parts.splice(j, 1); continue; }
        var s = Math.min(F, p.life); p.x += p.vx * s; p.y += p.vy * s; p.life -= F;
        ctx.globalAlpha = p.a; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (parts.length > 900) parts.splice(0, parts.length - 900);
    }

    // ---- the timeline
    var t0 = 0, last = 0, exitAt = 0, shown = chs.map(function () { return -1; });
    function frame(now) {
      raf = 0; if (finished) return;
      if (!t0) t0 = now;
      var dt = last ? Math.min(50, now - last) : 16.7; last = now; var F = dt / 16.7;
      var t = (now - t0) / 1000;
      var k = clamp((t - ENTER) / WRITE, 0, 1); k = 0.5 - 0.5 * Math.cos(Math.PI * k);        // eased 0..1 across the word
      var ty = typed(k);
      for (var i = 0; i < n; i++) {
        var p = clamp((ty - i) / 1.5, 0, 1);
        if (p !== shown[i]) { chs[i].style.setProperty('--p', p.toFixed(3)); chs[i].classList.toggle('d', p >= 1); shown[i] = p; }
      }
      bar.style.transform = 'scaleX(' + k.toFixed(3) + ')';
      // the gun: in from the left, riding the writing point, then away to the right
      var x, y, N0 = nib(0), N1 = nib(1), cur = nib(k);
      if (t < ENTER) { var e = 1 - Math.pow(1 - clamp(t / ENTER, 0, 1), 3); x = lerp(G[0].l - S * 0.9, N0.x, e); y = N0.y + (1 - e) * -0.25 * u; }
      else if (!exitAt) { x = cur.x; y = cur.y; }
      else { var q = clamp((now - exitAt) / (EXIT * 1000), 0, 1), qe = q * q; x = lerp(N1.x, W + S, qe); y = N1.y - Math.sin(q * Math.PI) * 0.18 * u; }
      var spraying = !exitAt && t > ENTER + 0.02 && t < ENTER + WRITE + 0.06;
      var bob = spraying ? Math.sin(now / 26) * 0.6 : Math.sin(now / 500) * 2.5, rot = -2 + (spraying ? Math.sin(now / 37) * 0.45 : 0);
      if (gunOk) {
        gun.style.opacity = '1';
        gun.style.transform = 'translate(' + (x - oX).toFixed(1) + 'px,' + (y - oY + bob).toFixed(1) + 'px) rotate(' + rot.toFixed(2) + 'deg)';
        gun.classList.toggle('is-spraying', spraying);
        pupils.style.transform = 'translate(' + (-9 * (spraying ? 1 : 0.4)).toFixed(1) + 'px,' + (spraying ? 3 : 0) + 'px)';
      }
      if (spraying) emit(x - 2, y + bob, cur.c, F);
      draw(F);
      // done writing and the page is loaded: the gun leaves and the card wipes up
      if (!exitAt && !skipped && t > ENTER + WRITE + 0.3 && loaded) {
        exitAt = now; later(function () { ov.classList.add('is-out'); }, 260); later(finish, 1150);
      }
      raf = requestAnimationFrame(frame);
    }

    // start once the heading font and the gun picture are in (or after a short wait), so nothing jumps
    var need = 2, begun = false;
    function begin() { if (begun || finished) return; begun = true; measure(); raf = requestAnimationFrame(frame); }
    function one() { if (--need === 0) begin(); }
    var onceF = false, onceI = false;
    function fontDone() { if (!onceF) { onceF = true; one(); } }
    function imgDone(ok) { if (onceI) return; onceI = true; if (!ok) { gunOk = false; gun.style.display = 'none'; } one(); }
    if (d.fonts && d.fonts.load) { d.fonts.load('italic 800 100px "PI Pre"').then(fontDone, fontDone); later(fontDone, 1500); } else fontDone();
    if (im.complete && im.naturalWidth) imgDone(true); else { im.onload = function () { imgDone(true); }; im.onerror = function () { imgDone(false); }; later(function () { imgDone(!!im.naturalWidth); }, 2500); }
    w.addEventListener('resize', function () { if (!finished && begun) measure(); });
  }
})();
