/* Pilot India preloader (2026-11-24). A full-screen card that opens every visit to the home page, and the first page of any other
   visit. The TEX-90 spray gun (assets/img/tex-90.png, the product's own cut-out) slides in from the left and DRAWS the logo the way
   a hand would: the left wing stripe by stripe, then each letter along its own strokes (P: up the stem, across the top, round
   the bowl and back to the stem; I: up; L: up, then along the foot; O: one loop; T: across the bar, then down), then the right
   wing. The spray lands exactly on the point being drawn.
   How: every letter is an SVG <text> in the heading font, hidden by a mask; the mask is a set of thick stroke paths along the
   letter's skeleton, and each path is uncovered with stroke-dashoffset as the gun passes. The stroke geometry comes from the font
   itself (slant and stem width are measured from a rendered "I"), so it fits the real letters. If a stroke ever missed a piece,
   the whole letter is shown the moment its last stroke is done. The wings are six single-ribbon pictures cut from the full-size
   logo (assets/img/pilot-wing-*-N.png), uncovered left to right or right to left, and placed with the logo's own proportions.
   The drawing is tied to the page's real loading (loadTarget): the gun goes only as fast as the page loads, never faster than
   a short minimum, and the percentage under the bar is that progress. When it is finished the card wipes up.
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
  var NOZ = [0.185, 0.553];                  // the nozzle tip, as a fraction of the 1000 x 1000 cut-out
  var ENTER = 0.6, WRITE = 3.6, EXIT = 0.6;  // seconds: gun comes in, the fastest the drawing may go (a hand's pace), gun leaves
  // the logo (pilot-logo-1.png, 3384 x 802): the capitals are 574 px tall; each wing picture is 802 px tall with its stripes' flat
  // edges on the capitals' rows (114-687); 66 px between the left wing and the P, 60 px between the T and the right wing.
  var CAPL = 574, WH = 802, GAPL = 66, GAPR = 60;
  var WING = {                               // canvas width, then the three ribbons: [x, y, width, height, flat-centre row] in the wing's own px
    left: { w: 428, st: [[0, 114, 426, 267, 190], [0, 324, 426, 268, 400], [0, 534, 426, 268, 610]] },
    right: { w: 434, st: [[8, 0, 426, 268, 190], [8, 210, 426, 268, 400], [8, 421, 426, 267, 610]] }
  };

  var CSS =
    'html.pi-pl-on{overflow:hidden!important}' +
    '@font-face{font-family:"PI Pre";font-style:italic;font-weight:300 800;font-display:block;src:url(' + FONT + ') format("woff2")}' +
    '#pi-pl{position:fixed;inset:0;z-index:2147483600;display:grid;place-items:center;background:radial-gradient(ellipse 60% 50% at 50% 46%,#fff 0,#f7f5f1 72%);overflow:hidden;clip-path:inset(0);transition:clip-path .8s cubic-bezier(.76,0,.24,1);-webkit-font-smoothing:antialiased;cursor:pointer}' +
    '#pi-pl.is-out{clip-path:inset(0 0 100% 0)}' +
    '#pi-pl *{box-sizing:border-box}' +
    '#pi-pl .pl-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}' +
    '#pi-pl .pl-word{position:relative;z-index:1;display:inline-flex;align-items:center;font-family:"PI Pre","DM Sans",system-ui,sans-serif;font-style:italic;font-weight:800;font-size:clamp(40px,11vw,128px);letter-spacing:-.035em;line-height:1;color:#111114;white-space:nowrap;padding:0 .08em}' +
    '#pi-pl .pl-ch{display:inline-block;position:relative}' +
    '#pi-pl .pl-t{visibility:hidden}' +
    '#pi-pl .pl-let svg{position:absolute;left:0;top:0;width:1px;height:1px;overflow:visible}' +
    '#pi-pl .pl-wing{display:block}' +
    '#pi-pl .pl-st{position:absolute;display:block;max-width:none;clip-path:inset(0 100% 0 0)}' +
    '#pi-pl .pl-meta{position:absolute;left:0;top:0;display:flex;justify-content:space-between;font:600 12px/1 system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#6b6d74;font-variant-numeric:tabular-nums}' +
    '#pi-pl .pl-meta b{color:#111114;font-weight:700}' +
    '#pi-pl .pl-rule,#pi-pl .pl-meta{animation:plIn .5s cubic-bezier(.16,1,.3,1) both}@keyframes plIn{from{opacity:0;transform:translateY(8px)}}' +
    '#pi-pl.is-done .pl-word{animation:plPop .55s cubic-bezier(.34,1.56,.64,1)}@keyframes plPop{0%{transform:scale(1)}40%{transform:scale(1.035)}100%{transform:scale(1)}}' +
    '#pi-pl .pl-rule{position:absolute;left:0;top:0;height:5px;border-radius:5px;background:rgba(17,17,20,.08);overflow:hidden}' +
    '#pi-pl .pl-rule b{display:block;width:100%;height:100%;background:#f58634;transform:scaleX(0);transform-origin:left}' +
    '#pi-pl .pl-fx,#pi-pl .pl-wall{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2}' +
    '#pi-pl .pl-gun{position:absolute;left:0;top:0;z-index:3;opacity:0;pointer-events:none;will-change:transform;filter:drop-shadow(0 16px 20px rgba(17,17,20,.22))}' +
    '#pi-pl .pl-gun img{position:absolute;inset:0;width:100%;height:100%;display:block;max-width:none}' +
    '#pi-pl .pl-face{position:absolute;inset:0;width:100%;height:100%}' +
    '#pi-pl .e-w{fill:#fff;stroke:#1b1b1f;stroke-width:5}#pi-pl .e-p{fill:#1b1b1f}#pi-pl .e-s{fill:#fff}' +
    '#pi-pl .eyes{transform-box:fill-box;transform-origin:center;animation:plBlink 4s infinite}' +
    '#pi-pl .cheek{fill:#f58634;opacity:.55}#pi-pl .mouth{fill:none;stroke:#1b1b1f;stroke-width:6;stroke-linecap:round}#pi-pl .mouth-o{fill:#1b1b1f;opacity:0}' +
    '#pi-pl .pl-gun.is-spraying .mouth{opacity:0}#pi-pl .pl-gun.is-spraying .mouth-o{opacity:1}' +
    '@keyframes plBlink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}' +
    '#pi-pl .pl-skip{position:absolute;right:20px;bottom:18px;padding:8px 14px;border:0;border-radius:999px;background:transparent;color:#4d4f55;font:600 13px/1 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;cursor:pointer}' +
    '#pi-pl .pl-skip:hover,#pi-pl .pl-skip:focus-visible{background:rgba(17,17,20,.07);outline:0}' +
    '@media(max-width:640px){#pi-pl .pl-word{font-size:15vw}}';

  var st = d.createElement('style'); st.id = 'pi-pl-css'; st.textContent = CSS; (d.head || de).appendChild(st);
  function ribbons(side) { return [1, 2, 3].map(function (k) { return '<img class="pl-st" alt="" draggable="false" src="/assets/img/pilot-wing-' + side + '-' + k + '.png">'; }).join(''); }
  var ov = d.createElement('div');
  ov.id = 'pi-pl'; ov.setAttribute('role', 'status');
  ov.innerHTML =
    '<span class="pl-sr">Loading Pilot India</span><canvas class="pl-wall"></canvas><canvas class="pl-fx"></canvas>' +
    '<div class="pl-word" aria-hidden="true"><span class="pl-ch pl-wing l">' + ribbons('left') + '</span>' +
    WORD.split('').map(function (c) { return '<span class="pl-ch pl-let"><span class="pl-t">' + c + '</span></span>'; }).join('') +
    '<span class="pl-ch pl-wing r">' + ribbons('right') + '</span></div>' +
    '<i class="pl-rule" aria-hidden="true"><b></b></i>' +
    '<div class="pl-meta" aria-hidden="true"><span>Loading</span><b class="pl-pct">0%</b></div>' +
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
    var NS = 'http://www.w3.org/2000/svg';
    var word = ov.querySelector('.pl-word'), chs = [].slice.call(word.querySelectorAll('.pl-ch')), n = chs.length;
    var gun = ov.querySelector('.pl-gun'), im = gun.querySelector('img'), pupils = gun.querySelector('.pupils');
    var cv = ov.querySelector('.pl-fx'), ctx = cv.getContext('2d'), wall = ov.querySelector('.pl-wall'), wctx = wall.getContext('2d'), rule = ov.querySelector('.pl-rule'), bar = rule.firstChild;
    var meta = ov.querySelector('.pl-meta'), pct = meta.querySelector('.pl-pct');
    var u = 100, S = 120, W = 0, H = 0, oX = 0, oY = 0, gunOk = true;

    // How far the page really is: parsing (creeps up while the HTML arrives), then the images already on the page (visible,
    // non-lazy ones), then 100% at the load event. After 7 s it counts as done whatever is pending, so one slow third-party
    // file can never keep the card up. The site's script-delay loader fakes document.readyState (it stays "loading" after the
    // page has loaded), so the real DOMContentLoaded and load events are listened for instead.
    var capped = false, imgCache = 0, imgAt = -1e9, domReady = false, winLoaded = false;
    d.addEventListener('DOMContentLoaded', function () { domReady = true; });
    w.addEventListener('load', function () { winLoaded = true; });
    later(function () { capped = true; }, 7000);
    function loadTarget(now, tStart) {
      if (capped || winLoaded) return 1;
      if (!domReady) return 0.1 + 0.3 * Math.min(1, (now - tStart) / 3000);
      if (now - imgAt > 120) {
        var imgs = d.images, tot = 0, done = 0;
        for (var i = 0; i < imgs.length; i++) { if (ov.contains(imgs[i]) || imgs[i].loading === 'lazy') continue; tot++; if (imgs[i].complete) done++; }
        imgCache = tot ? done / tot : 1; imgAt = now;
      }
      return 0.5 + 0.45 * imgCache;
    }

    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
    function lerp(a, b, k) { return a + (b - a) * k; }
    function glide(dt, ms) { return 1 - Math.exp(-dt / ms); }          // share of the remaining distance covered in dt ms (same glide at 60 and 120 Hz)
    function el(tag, attrs, parent) { var e = d.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }

    // ---- the font's own proportions: the italic slant and stem width, measured on a rendered "I"
    function probe() {
      var out = { s: 0.17, sw: 0.2 };
      try {
        var S0 = 400, c = d.createElement('canvas'); c.width = 600; c.height = 700;
        var x = c.getContext('2d'); x.font = 'italic 800 ' + S0 + 'px "PI Pre","DM Sans",system-ui,sans-serif'; x.fillStyle = '#000'; x.textBaseline = 'alphabetic'; x.fillText('I', 100, 500);
        var cap = x.measureText('I').actualBoundingBoxAscent, px = x.getImageData(0, 0, 600, 700).data;
        var edge = function (row) { var l = -1, r = -1; for (var i = 0; i < 600; i++) if (px[(row * 600 + i) * 4 + 3] > 128) { if (l < 0) l = i; r = i; } return [l, r]; };
        var yT = Math.round(500 - cap + 8), yB = 492, eT = edge(yT), eB = edge(yB);
        if (eT[0] > 0 && eB[0] > 0) { out.s = (eT[0] - eB[0]) / (yB - yT); out.sw = (eB[1] - eB[0] + 1) / S0; }
      } catch (e) { /* defaults */ }
      return out;
    }

    // ---- everything that depends on the size: letter geometry, stroke paths, wing placement, the drawing's segments
    var segs = [], total = 1, groups = [], rest = null, swPx = 0, ruleTop = 1e9;
    function measure() {
      W = innerWidth; H = innerHeight;
      u = parseFloat(getComputedStyle(word).fontSize) || 100; S = u * 1.2;
      oX = NOZ[0] * S; oY = NOZ[1] * S;
      gun.style.width = gun.style.height = S + 'px'; gun.style.transformOrigin = oX + 'px ' + oY + 'px';

      var mc = d.createElement('canvas').getContext('2d'), k1 = u / 1000, cap = 0.7 * u, fa = 0.992 * u, fd = 0.31 * u;
      var ink = {};
      try {
        mc.font = 'italic 800 1000px "PI Pre","DM Sans",system-ui,sans-serif';
        WORD.split('').forEach(function (c) { var m = mc.measureText(c); ink[c] = { L: -m.actualBoundingBoxLeft * k1, R: m.actualBoundingBoxRight * k1, W: m.width * k1 }; });
        var mP = mc.measureText('P');
        if (mP.actualBoundingBoxAscent) cap = mP.actualBoundingBoxAscent * k1;
        if (mP.fontBoundingBoxAscent) { fa = mP.fontBoundingBoxAscent * k1; fd = mP.fontBoundingBoxDescent * k1; }
      } catch (e) { /* default proportions */ }
      WORD.split('').forEach(function (c) { if (!ink[c]) ink[c] = { L: 0, R: 0.62 * u, W: 0.62 * u }; });
      var pr = probe(), sl = pr.s, sw = pr.sw * u; swPx = sw;
      var sc = cap / CAPL;

      // wings: size, gap from the letters (bearings from the font), vertical placement on the capitals' rows
      var wl = chs[0], wr = chs[n - 1];
      [[wl, 'left'], [wr, 'right']].forEach(function (p) {
        var cfg = WING[p[1]], sp = p[0];
        sp.style.transform = ''; sp.style.width = (cfg.w * sc) + 'px'; sp.style.height = (WH * sc) + 'px';
        [].slice.call(sp.querySelectorAll('.pl-st')).forEach(function (img, k) {
          var a = cfg.st[k]; img.style.left = (a[0] * sc) + 'px'; img.style.top = (a[1] * sc) + 'px'; img.style.width = (a[2] * sc) + 'px'; img.style.height = (a[3] * sc) + 'px';
        });
      });
      wl.style.marginRight = (GAPL * sc - ink.P.L) + 'px';
      wr.style.marginLeft = (GAPR * sc - (ink.T.W - ink.T.R) + 0.035 * u) + 'px';     // 0.035u: the letter-spacing after the T
      var Pr = chs[1].getBoundingClientRect(), base = Pr.top + (Pr.height - (fa + fd)) / 2 + fa, capTop = base - cap, baseOff = base - Pr.top;
      [wl, wr].forEach(function (sp) { var r0 = sp.getBoundingClientRect(); sp.style.transform = 'translateY(' + ((capTop - 114 * sc) - r0.top).toFixed(2) + 'px)'; });

      // letters: an SVG per letter (origin = glyph origin on the baseline), the text under a mask of stroke paths
      segs = []; groups = [];
      var X = function (x, h) { return x + sl * h; };                                  // x at height h above the baseline, on the slant
      var bw = sw * 1.2;                                                               // the brush: a little wider than the stem
      function pathD(pts) { return pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(2) + ' ' + p[1].toFixed(2); }).join(' '); }
      function line(ax, ah, bx, bh) { return [[X(ax, ah), -ah], [X(bx, bh), -bh]]; }  // helpers take base x and height; return svg points
      var strokesOf = {
        P: function () {
          var xs = ink.P.L + sw / 2, hT = cap - sw / 2, hB = 0.40 * cap + sw / 2, hm = (hT + hB) / 2, rv = (hT - hB) / 2;
          var xr = ink.P.R - sw / 2 - sl * hm, cx = xr - rv, i, bowl = [];
          bowl.push([X(xs, hT), -hT], [X(cx, hT), -hT]);
          for (i = 1; i <= 20; i++) { var a = -Math.PI / 2 + Math.PI * i / 20, h = hm - rv * Math.sin(a); bowl.push([X(cx + rv * Math.cos(a), h), -h]); }
          bowl.push([X(xs + sw * 0.3, hB), -hB]);
          return [line(xs, 0, xs, cap), bowl];
        },
        I: function () { var xs = ink.I.L + sw / 2; return [line(xs, 0, xs, cap)]; },
        L: function () {
          var xs = ink.L.L + sw / 2, hf = sw / 2;
          return [line(xs, 0, xs, cap), [[X(xs, hf), -hf], [ink.L.R - sw * 0.25, -hf]]];
        },
        O: function () {
          var cx = (ink.O.L + ink.O.R) / 2, hc = cap / 2, rx = (ink.O.R - ink.O.L - sl * cap) / 2 - sw * 0.52, ry = cap / 2 - sw * 0.42, pts = [], i;
          for (i = 0; i <= 48; i++) { var a = -Math.PI / 2 - 2 * Math.PI * i / 48, h = hc - ry * Math.sin(a); pts.push([cx + rx * Math.cos(a) + sl * (h - hc), -h]); }
          return [pts];
        },
        T: function () {
          var hb = cap - sw / 2, xc = (ink.T.L + ink.T.R) / 2;
          return [[[ink.T.L + sw * 0.12, -hb], [ink.T.R - sw * 0.12, -hb]], [[xc, -hb], [xc - sl * hb, 0]]];
        }
      };

      // the items in drawing order: left wing, P I L O T, right wing
      function wingStripes(sp, side) {
        var cfg = WING[side], r = sp.getBoundingClientRect(), imgs = [].slice.call(sp.querySelectorAll('.pl-st')), out = [];
        cfg.st.forEach(function (a, k) {
          var dir = k % 2 === 0 ? 1 : -1, y = r.top + a[4] * sc, x0 = r.left + a[0] * sc, x1 = x0 + a[2] * sc, img = imgs[k];
          out.push({
            kind: 'stroke', wing: true, w: a[2] * sc, a: { x: dir > 0 ? x0 : x1, y: y }, b: { x: dir > 0 ? x1 : x0, y: y },
            set: function (f) { var v = ((1 - f) * 100).toFixed(2); img.style.clipPath = dir > 0 ? 'inset(0 ' + v + '% 0 0)' : 'inset(0 0 0 ' + v + '%)'; }
          });
        });
        return out;
      }
      var all = [];
      wingStripes(chs[0], 'left').forEach(function (s) { all.push(s); });
      for (var li = 1; li <= WORD.length; li++) {
        var ch = WORD.charAt(li - 1), sp = chs[li], old = sp.querySelector('svg'); if (old) sp.removeChild(old);
        var r = sp.getBoundingClientRect(), ox = r.left, oy = r.top + baseOff;
        var svg = el('svg', {}, sp); svg.style.top = baseOff + 'px';
        var defs = el('defs', {}, svg), mask = el('mask', { id: 'plm' + li, maskUnits: 'userSpaceOnUse', x: -u, y: -2 * u, width: 4 * u, height: 4 * u }, defs);
        var flt = el('filter', { id: 'plf' + li, filterUnits: 'userSpaceOnUse', x: -u, y: -2 * u, width: 4 * u, height: 4 * u }, defs);   // soft edge: paint builds up, it does not cut in
        el('feGaussianBlur', { stdDeviation: (0.011 * u).toFixed(2) }, flt);
        var safety = el('rect', { x: -u, y: -2 * u, width: 4 * u, height: 4 * u, fill: '#fff', opacity: 0 }, mask);   // shows the whole letter once it is drawn
        var text = el('text', { x: 0, y: 0, 'font-family': '"PI Pre","DM Sans",system-ui,sans-serif', 'font-style': 'italic', 'font-weight': 800, 'font-size': u, fill: '#111114', mask: 'url(#plm' + li + ')' }, svg);
        text.textContent = ch;
        var grp = { rect: safety, segs: [], done: false }; groups.push(grp);
        strokesOf[ch]().forEach(function (pts) {
          var p = el('path', { d: pathD(pts), fill: 'none', stroke: '#fff', 'stroke-width': ch === 'O' ? bw * 1.05 : bw, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', filter: 'url(#plf' + li + ')' }, mask);
          var len = p.getTotalLength() || 1, N = 40, sp2 = [];
          for (var j = 0; j <= N; j++) { var q1 = p.getPointAtLength(len * j / N); sp2.push({ x: ox + q1.x, y: oy + q1.y }); }
          p.setAttribute('stroke-dasharray', len + ' ' + (len + 2)); p.setAttribute('stroke-dashoffset', len); p.style.display = 'none';
          var seg = { kind: 'stroke', wing: false, w: len, pts: sp2, grp: grp, set: function (f) { p.style.display = f <= 0 ? 'none' : ''; p.setAttribute('stroke-dashoffset', (len * (1 - f)).toFixed(2)); } };
          grp.segs.push(seg); all.push(seg);
        });
      }
      wingStripes(chs[n - 1], 'right').forEach(function (s) { all.push(s); });

      // the gun's hop between one stroke and the next (paint off), then the timeline weights: pen speed is the same everywhere
      var first = function (s) { return s.pts ? s.pts[0] : s.a; }, lastPt = function (s) { return s.pts ? s.pts[s.pts.length - 1] : s.b; };
      var c0 = 0;
      all.forEach(function (s, i) {
        if (i) {
          var p0 = lastPt(all[i - 1]), p1 = first(s), dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
          segs.push({ kind: 'move', w: 0.3 * dist + 0.06 * u, a: p0, b: p1, dist: dist });
        }
        segs.push(s);
      });
      segs.forEach(function (s) { s.s0 = c0; c0 += s.w; s.lf = -1; });
      total = c0 || 1;
      rest = { first: first(segs[0]), last: lastPt(segs[segs.length - 1]) };
      groups.forEach(function (g) { g.done = false; g.rect.setAttribute('opacity', 0); });

      var wrect = word.getBoundingClientRect(); ruleTop = wrect.bottom + u * 0.12;
      rule.style.left = (wrect.left + u * 0.08) + 'px'; rule.style.top = (wrect.bottom + u * 0.12) + 'px'; rule.style.width = (wrect.width - u * 0.16) + 'px';
      meta.style.left = rule.style.left; meta.style.top = (wrect.bottom + u * 0.12 + 15) + 'px'; meta.style.width = rule.style.width;
      var dpr = Math.min(1.5, w.devicePixelRatio || 1);
      cv.width = wall.width = Math.round(W * dpr); cv.height = wall.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); wctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // the nozzle sits a little right of and below the point being drawn, so the spray goes left and up onto it
    var OFFX = 0.10, OFFY = 0.12;
    var nz = function (p) { return { x: p.x + OFFX * u, y: p.y + OFFY * u }; };

    // ---- the spray, like a can on a wall: a tight jet of fine droplets, a wide cone of overspray and a soft mist. Droplets that land
    // leave specks on the card, the mist leaves a faint halo around fresh paint, and a fresh stroke sometimes drips. Black paint
    // for the letters, orange for the wings.
    var PAL_INK = ['#17171b', '#202026', '#2a2a31', '#34343c'], PAL_ORG = ['#e8741f', '#f58634', '#f9974a', '#d9661a'], parts = [], drips = [];
    function sprite(rgb) {
      var c = d.createElement('canvas'); c.width = c.height = 64;
      var m = c.getContext('2d'), g = m.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(' + rgb + ',1)'); g.addColorStop(0.4, 'rgba(' + rgb + ',.42)'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
      m.fillStyle = g; m.fillRect(0, 0, 64, 64); return c;
    }
    var MIST_INK = sprite('40,40,46'), MIST_ORG = sprite('245,134,52');
    function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; }
    function emit(nx, ny, T, F, org) {
      var pal = org ? PAL_ORG : PAL_INK, mist = org ? MIST_ORG : MIST_INK;
      var tx = (T.l + T.r) / 2, ty = (T.t + T.b) / 2, dist = Math.hypot(tx - nx, ty - ny) || 1, spread = 1.2 + dist * 0.03, i, cnt = Math.round(22 * F);
      for (i = 0; i < cnt; i++) {
        var wide = Math.random() < 0.3, sg = wide ? 0.075 * u : spread;           // 30% of the droplets are overspray in a wide cone
        var gx2 = (wide ? tx : T.l + (T.r - T.l) * Math.random()) + gauss() * sg, gy2 = (wide ? ty : T.t + (T.b - T.t) * Math.random()) + gauss() * sg * 0.8;
        var big = Math.random() < (wide ? 0.03 : 0.04), L = (big ? 9 : 4.5) + Math.random() * 4 + (wide ? 2 : 0);
        parts.push({ x: nx + gauss() * 0.8, y: ny + gauss() * 0.8, vx: (gx2 - nx) / L, vy: (gy2 - ny) / L, life: L, r: big ? 1.4 + Math.random() * 1.1 : 0.35 + Math.random() * Math.random() * 1.4, a: 0.4 + Math.random() * 0.5, c: pal[(Math.random() * pal.length) | 0], sp: org ? 0.35 : 0.5 });
      }
      for (i = 0; i < Math.max(1, Math.round(4 * F)); i++) {
        var uu = Math.pow(Math.random(), 0.7), life = 18 + Math.random() * 14;
        parts.push({ mist: 1, spr: mist, x: nx + (tx - nx) * uu + gauss() * spread * uu * 0.6, y: ny + (ty - ny) * uu + gauss() * spread * uu * 0.5, r: 4 + uu * (11 + spread), vx: (tx - nx) / dist * 0.5, vy: (ty - ny) / dist * 0.5 - 0.06, life: life, max: life, a: 0.06 + 0.07 * uu });
      }
      var hr = (0.06 + Math.random() * 0.07) * u;                                 // the faint halo that builds up on the card around fresh paint
      wctx.globalAlpha = (org ? 0.03 : 0.035) * Math.min(F, 2); wctx.drawImage(mist, tx - hr, ty - hr, hr * 2, hr * 2); wctx.globalAlpha = 1;
    }
    function draw(F) {
      ctx.clearRect(0, 0, W, H);
      for (var j = parts.length - 1; j >= 0; j--) {
        var p = parts[j];
        if (p.mist) {
          p.life -= F; p.r += 0.5 * F; p.x += p.vx * F; p.y += p.vy * F;
          if (p.life <= 0) { parts.splice(j, 1); continue; }
          ctx.globalAlpha = p.a * (p.life / p.max); ctx.drawImage(p.spr, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); continue;
        }
        if (p.life <= 0) {                                                        // landed: some leave a speck on the card
          if (Math.random() < p.sp) { wctx.globalAlpha = p.a * 0.6; wctx.fillStyle = p.c; wctx.beginPath(); wctx.arc(p.x, p.y, p.r * 0.9, 0, 6.283); wctx.fill(); wctx.globalAlpha = 1; }
          parts.splice(j, 1); continue;
        }
        var st2 = Math.min(F, p.life); p.x += p.vx * st2; p.y += p.vy * st2; p.life -= F;
        ctx.globalAlpha = p.a; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (parts.length > 1200) parts.splice(0, parts.length - 1200);
    }
    function spawnDrip(sg) {                      // a drop of paint runs down from the lowest point of a fresh letter stroke
      if (Math.random() > 0.6) return;
      var lo = sg.pts[0], j, flat = true;
      for (j = 1; j < sg.pts.length; j++) { if (sg.pts[j].y > lo.y) lo = sg.pts[j]; if (Math.abs(sg.pts[j].y - sg.pts[0].y) > 2) flat = false; }
      var y0 = lo.y;
      if (flat) { lo = sg.pts[Math.round((0.2 + Math.random() * 0.6) * (sg.pts.length - 1))]; y0 = lo.y + swPx * 0.5; }   // a bar: from its lower edge, somewhere along it
      var room = ruleTop - 6 - y0;
      if (room < 0.06 * u) return;
      drips.push({ x: lo.x + gauss() * 0.01 * u, y: y0, v: 0.6 + Math.random() * 0.6, w: (0.012 + Math.random() * 0.011) * u, max: Math.min((0.16 + Math.random() * 0.3) * u, room), len: 0, wait: 10 + Math.random() * 25 });
    }
    function runDrips(F) {
      for (var j = drips.length - 1; j >= 0; j--) {
        var dp = drips[j];
        if (dp.wait > 0) { dp.wait -= F; continue; }
        var step = dp.v * F, y0 = dp.y;
        dp.y += step; dp.len += step; dp.v *= Math.pow(0.986, F);
        wctx.strokeStyle = 'rgba(23,23,27,.85)'; wctx.lineWidth = dp.w; wctx.lineCap = 'round';
        wctx.beginPath(); wctx.moveTo(dp.x, y0); wctx.lineTo(dp.x, dp.y); wctx.stroke();
        if (dp.v < 0.04 || dp.len >= dp.max) { wctx.fillStyle = 'rgba(23,23,27,.9)'; wctx.beginPath(); wctx.arc(dp.x, dp.y, dp.w * 0.85, 0, 6.283); wctx.fill(); drips.splice(j, 1); }
      }
    }

    // ---- the timeline
    var t0 = 0, last = 0, exitAt = 0, doneAt = 0, prog = 0, lastPct = -1, gx = null, gy = null;
    function frame(now) {
      raf = 0; if (finished) return;
      if (!t0) t0 = now;
      var dt = last ? Math.min(50, now - last) : 16.7; last = now; var F = dt / 16.7;
      var t = (now - t0) / 1000;
      // the schedule is the fastest the drawing may go; the page's real progress can only slow it down
      var sched = clamp((t - ENTER) / WRITE, 0, 1); sched = 0.5 - 0.5 * Math.cos(Math.PI * sched);
      var tgt = Math.min(loadTarget(now, t0), sched), prev = prog;
      prog += (tgt - prog) * glide(dt, 120); if (Math.abs(tgt - prog) < 0.0008) prog = tgt;
      var rate = (prog - prev) / F;                          // progress per 60 fps frame, > 0 while paint is going on
      var pc = Math.round(prog * 100); if (pc !== lastPct) { pct.textContent = pc + '%'; lastPct = pc; }
      bar.style.transform = 'scaleX(' + prog.toFixed(3) + ')';

      // where we are in the drawing; uncover every stroke up to there
      var pos = prog * total, cur = segs[segs.length - 1], i, s;
      for (i = 0; i < segs.length; i++) {
        s = segs[i]; var f = clamp((pos - s.s0) / s.w, 0, 1);
        if (s.kind === 'stroke') f = f * 0.55 + (0.5 - 0.5 * Math.cos(Math.PI * f)) * 0.45;       // a hand speeds up and slows down along a stroke
        if (f !== s.lf) { if (f === 1 && s.pts && !s.wing) spawnDrip(s); s.lf = f; if (s.set) s.set(f); }
        if (pos >= s.s0 && pos < s.s0 + s.w && cur === segs[segs.length - 1]) cur = s;
      }
      if (prog >= 0.9995) cur = segs[segs.length - 1];
      groups.forEach(function (g) { if (!g.done && g.segs[g.segs.length - 1].lf === 1) { g.done = true; g.rect.setAttribute('opacity', 1); } });   // a drawn letter is shown whole

      // the point being drawn (P) and where the nozzle should be (Nn)
      var cf = cur.lf < 0 ? 0 : cur.lf, P, Nn;
      if (cur.kind === 'move') {
        var ez = cf * cf * (3 - 2 * cf), arc = Math.sin(cf * Math.PI) * 0.22 * Math.min(cur.dist, 3 * u);
        var A = nz(cur.a), B = nz(cur.b);
        Nn = { x: lerp(A.x, B.x, ez), y: lerp(A.y, B.y, ez) - arc }; P = { x: Nn.x - OFFX * u, y: Nn.y - OFFY * u };
      } else if (cur.pts) {
        var fi = cf * (cur.pts.length - 1), i0 = Math.min(cur.pts.length - 2, Math.floor(fi)), ff = fi - i0;
        P = { x: lerp(cur.pts[i0].x, cur.pts[i0 + 1].x, ff), y: lerp(cur.pts[i0].y, cur.pts[i0 + 1].y, ff) }; Nn = nz(P);
      } else { P = { x: lerp(cur.a.x, cur.b.x, cf), y: lerp(cur.a.y, cur.b.y, cf) }; Nn = nz(P); }

      // the gun: in from the left, following the nozzle point (smoothed a little), then away to the right
      var x, y;
      if (t < ENTER) { var e = 1 - Math.pow(1 - clamp(t / ENTER, 0, 1), 3), N0 = nz(rest.first); x = lerp(-S * 0.5, N0.x, e); y = N0.y + (1 - e) * -0.25 * u; gx = x; gy = y; }
      else if (!exitAt) { if (gx === null) { gx = Nn.x; gy = Nn.y; } gx += (Nn.x - gx) * glide(dt, 52); gy += (Nn.y - gy) * glide(dt, 52); x = gx; y = gy; }
      else { var qq = clamp((now - exitAt) / (EXIT * 1000), 0, 1), N1 = nz(rest.last); x = lerp(N1.x, W + S, qq * qq); y = N1.y - Math.sin(qq * Math.PI) * 0.18 * u; }
      var spraying = !exitAt && t > ENTER && rate > 0.0003 && cur.kind === 'stroke' && prog < 0.9995;     // waiting for the page, or hopping: the gun idles
      if (spraying) { x += Math.sin(now / 57) * 0.5 + Math.sin(now / 23) * 0.25; y += Math.cos(now / 63) * 0.5; }   // a hand is never perfectly still
      var tilt = gx === null ? 0 : clamp((Nn.y - gy) * 0.12, -3, 3);                                     // it leans a little into the move
      var bob = spraying ? Math.sin(now / 26) * 0.4 : Math.sin(now / 500) * 2.5, rot = -2 + tilt + (spraying ? Math.sin(now / 37) * 0.4 : 0);
      if (gunOk) {
        gun.style.opacity = '1';
        gun.style.transform = 'translate(' + (x - oX).toFixed(1) + 'px,' + (y - oY + bob).toFixed(1) + 'px) rotate(' + rot.toFixed(2) + 'deg)';
        gun.classList.toggle('is-spraying', spraying);
        pupils.style.transform = 'translate(' + (-9 * (spraying ? 1 : 0.4)).toFixed(1) + 'px,' + (spraying ? 3 : 0) + 'px)';
      }
      if (spraying) emit(x - 2, y + bob, { l: P.x - 0.05 * u, r: P.x + 0.015 * u, t: P.y - 0.045 * u, b: P.y + 0.045 * u }, F, cur.wing === true);
      runDrips(F);
      draw(F);
      // done drawing (so the page has loaded): the logo pops, the gun leaves and the card wipes up
      if (!exitAt && !skipped && prog >= 0.999) {
        if (!doneAt) { doneAt = now; ov.classList.add('is-done'); }
        else if (now - doneAt > 500) { exitAt = now; later(function () { ov.classList.add('is-out'); }, 260); later(finish, 1250); }
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
