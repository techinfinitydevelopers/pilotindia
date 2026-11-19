/* Product mascot for the "Enhance your craft"-style bento on the product landing pages. See assets/css/pg-spray.css.
   The mascot is the TYPE 59 S gun (its own cut-out photo) with a face drawn on it, the same on every product page,
   spraying red paint at the five headings. The scroll position sets where the mascot
   should be and how far each heading is painted; every frame it and the paint ease toward that, so wheel steps and
   flicks glide, and droplets fly while paint is going on.
   Desktop ("pin"): the section is pinned for a short run, about a third of a screen per card.
   Phones/tablets ("follow"): the cards scroll normally; the mascot rides at a fixed height on screen at the right
   edge and sprays each heading as it passes the nozzle.
   Lines (section.bento--lines, spray-guns page, 2026-11-19): the five headings are ruled lines with no card text; the
   section is pinned on every screen size and the gun writes each heading letter by letter as you scroll, the nozzle
   riding the writing point, then hops to the start of the next line. The spray is a jet of fine droplets with a mist
   that widens toward the surface; nothing is left on the page when a droplet lands.
   Letter positions are measured once (and on resize), so scrolling never forces a layout.
   Reduced motion: nothing changes (headings stay as they are). 2026-11-18 */
(function () {
  'use strict';
  var sec = document.querySelector('section.bento');
  if (!sec || !window.matchMedia || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var wrap = sec.querySelector('.bento__wrap');
  var title = sec.querySelector('.bento__h2');
  var cards = Array.prototype.slice.call(sec.querySelectorAll('.bento__card'));
  var heads = cards.map(function (c) { return c.querySelector('.bento__t'); });
  if (!wrap || !title || cards.length < 2 || heads.some(function (h) { return !h; })) return;
  var N = heads.length;
  // "lines" variant (spray-guns page): the gun writes each heading letter by letter. Each heading is split into
  // words (kept whole when lines wrap) of single-letter spans; the heading keeps its text as its accessible name.
  var LINES = sec.classList.contains('bento--lines');
  var chars = !LINES ? [] : heads.map(function (h) {
    var text = h.textContent.replace(/\s+/g, ' ').trim(), list = [];
    h.setAttribute('aria-label', text);
    h.textContent = '';
    text.split(' ').forEach(function (word, wi) {
      if (wi) h.appendChild(document.createTextNode(' '));
      var w = document.createElement('span');
      w.className = 'w'; w.setAttribute('aria-hidden', 'true');
      for (var k = 0; k < word.length; k++) { var c = document.createElement('span'); c.className = 'ch'; c.textContent = word[k]; c.style.setProperty('--p', '0'); w.appendChild(c); list.push(c); }
      h.appendChild(w);
    });
    return list;
  });
  var shown = heads.map(function () { return -1; });   // last letter state written, so only changing letters are touched

  // ---- the mascot (the TYPE 59 S gun, the same on every product page). Positions are fractions of the source picture (after the flip, when flip is set):
  // crop = [x0, y0, x1, y1] of the picture that is shown; nozzle = where the spray leaves; eyes = [x, y, white radius
  // (0: none, the picture has its own dials), pupil radius]; cheeks = [x, y, r]; mouth = {x, y, w}; patch = a white
  // disc [x, y, r] under the mouth (hides a logo); radii are fractions of the picture's width.
  // width = [phone, tablet, desktop] in px.
  var IMG = '/assets/img/';
  var MASCOTS = {
    'spray-guns': { src: 'type-59-s.png', w: 300, h: 500, crop: [0, 0, 1, 1], nozzle: [0.187, 0.48], width: [84, 104, 130],
      eyes: [[0.5333, 0.252, 0.04, 0.0183], [0.6633, 0.236, 0.04, 0.0183]], cheeks: [[0.4933, 0.292, 0.02], [0.7133, 0.27, 0.02]], mouth: { x: 0.6067, y: 0.296, w: 0.0733 } },
  };
  var M = MASCOTS[sec.getAttribute('data-mascot')] || MASCOTS['spray-guns'];
  // lines: the gun is kept within a line's height, so while it writes it does not cover the line above (width: phone, tablet, desktop)
  var GWS = LINES ? [60, 72, 84] : M.width;
  var CW = M.crop[2] - M.crop[0], CH = M.crop[3] - M.crop[1];
  var ASPECT = (CW * M.w) / (CH * M.h);                      // width / height of the shown part
  var VH = 100 / ASPECT;                                     // the face drawing is 100 units wide and VH tall
  var fx = function (x) { return ((x - M.crop[0]) / CW * 100).toFixed(2); };
  var fy = function (y) { return ((y - M.crop[1]) / CH * VH).toFixed(2); };
  var fr = function (r) { return (r / CW * 100).toFixed(2); };

  // the face as SVG in box units
  var face = '<svg class="pg-spray__face" viewBox="0 0 100 ' + VH.toFixed(2) + '" aria-hidden="true">';
  M.cheeks.forEach(function (c) { face += '<circle class="cheek" cx="' + fx(c[0]) + '" cy="' + fy(c[1]) + '" r="' + fr(c[2]) + '"/>'; });
  if (M.patch) face += '<circle class="patch" cx="' + fx(M.patch[0]) + '" cy="' + fy(M.patch[1]) + '" r="' + fr(M.patch[2]) + '"/>';
  face += '<g class="eyes">';
  M.eyes.forEach(function (e) { if (e[2]) face += '<circle class="eye-w" cx="' + fx(e[0]) + '" cy="' + fy(e[1]) + '" r="' + fr(e[2]) + '"/>'; });
  face += '<g class="pupils">';
  M.eyes.forEach(function (e) { face += '<circle class="eye-p" cx="' + fx(e[0]) + '" cy="' + fy(e[1]) + '" r="' + fr(e[3]) + '"/><circle class="eye-s" cx="' + (+fx(e[0]) + e[3] / CW * 25).toFixed(2) + '" cy="' + (+fy(e[1]) - e[3] / CW * 25).toFixed(2) + '" r="' + (e[3] / CW * 30).toFixed(2) + '"/>'; });
  face += '</g></g>';
  var mx = +fx(M.mouth.x), my = +fy(M.mouth.y), mw = M.mouth.w / CW * 100;
  face += '<path class="mouth" d="M' + (mx - mw / 2).toFixed(2) + ' ' + my.toFixed(2) + 'Q' + mx.toFixed(2) + ' ' + (my + mw * 0.45).toFixed(2) + ' ' + (mx + mw / 2).toFixed(2) + ' ' + (my - mw * 0.08).toFixed(2) + '"/>' +
    '<ellipse class="mouth-o" cx="' + mx.toFixed(2) + '" cy="' + (my + mw * 0.1).toFixed(2) + '" rx="' + (mw * 0.24).toFixed(2) + '" ry="' + (mw * 0.28).toFixed(2) + '"/></svg>';
  // how far the pupils may travel, in box units
  var TRAVEL = Math.max(0.5, (M.eyes[0][2] ? (M.eyes[0][2] - M.eyes[0][3]) * 0.7 : M.eyes[0][3] * 0.8) / CW * 100);
  // the picture, cropped to the shown part by sizing and offsetting the whole image inside the box
  var art = '<img src="' + IMG + M.src + '" alt="" decoding="async" style="width:' + (100 / CW).toFixed(2) + '%;height:' + (100 / CH).toFixed(2) + '%;left:' + (-M.crop[0] / CW * 100).toFixed(2) + '%;top:' + (-M.crop[1] / CH * 100).toFixed(2) + '%' + (M.flip ? ';transform:scaleX(-1)' : '') + '" />';

  sec.classList.add('pg-spray-on');
  var track = document.createElement('div');
  track.className = 'pg-spray-track';
  sec.parentNode.insertBefore(track, sec);
  track.appendChild(sec);
  var box = document.createElement('div');
  box.className = 'pg-spray' + (LINES ? ' pg-spray--lines' : '');
  box.setAttribute('aria-hidden', 'true');
  box.innerHTML = '<canvas class="pg-spray__fx"></canvas><div class="pg-spray__gun"><div class="pg-spray__art">' + art + '</div>' + face + '</div>';
  wrap.appendChild(box);
  var cv = box.querySelector('.pg-spray__fx'), ctx = cv.getContext('2d');       // droplets and mist in the air
  var gun = box.querySelector('.pg-spray__gun'), pupils = box.querySelector('.pupils');

  // ---- the paint: one red in six shades (droplets catch light differently), and a soft round sprite for the mist
  // lines: black ink (six near-blacks, so the droplets catch the light a little differently); the other pages: red
  var PAINT = LINES ? [60, 60, 67] : [212, 36, 26];
  var PAL = LINES
    ? ['#26262b', '#2d2d33', '#34343b', '#3c3c43', '#45454d', '#50505a']
    : [0.6, 0.72, 0.84, 0.95, 1.06, 1.16].map(function (k) {
      return 'rgb(' + Math.min(255, Math.round(PAINT[0] * k)) + ',' + Math.min(255, Math.round(PAINT[1] * k)) + ',' + Math.min(255, Math.round(PAINT[2] * k)) + ')';
    });
  var MIST = document.createElement('canvas');
  MIST.width = MIST.height = 64;
  (function () {
    var m = MIST.getContext('2d'), gr = m.createRadialGradient(32, 32, 0, 32, 32, 32), rgb = PAINT.join(',');
    gr.addColorStop(0, 'rgba(' + rgb + ',1)'); gr.addColorStop(0.4, 'rgba(' + rgb + ',0.42)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    m.fillStyle = gr; m.fillRect(0, 0, 64, 64);
  })();
  function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; }

  // desktop run: per card a third of a screen, 60% of it spraying; a short lead in and out
  // lines: half a screen per heading, 72% of it writing, the rest the hop to the next line
  // lines: the writing starts as soon as the section pins (short lead), and the gun leaves its resting place EARLY screens
  // before that, while the section is still scrolling into place
  var STEP = LINES ? 0.5 : 0.32, LEAD = LINES ? 0.05 : 0.15, SPRAY = LINES ? 0.72 : 0.6, EARLY = 0.42;
  var wide = matchMedia('(min-width: 961px)');
  var pin = false, vh = innerHeight, top = 0, dpr = 1, bw = 0, bh = 0, GW = GWS[2], NOZ = { x: 24, y: 104 };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ease(k) { return k * k * (3 - 2 * k); }
  // where a block's text is, in the stage's coordinates
  var bRect;
  function rel(a) { return { l: a.left - bRect.left, r: a.right - bRect.left, t: a.top - bRect.top, b: a.bottom - bRect.top }; }
  function textRect(h) { var r = document.createRange(); r.selectNodeContents(h); return rel(r.getBoundingClientRect()); }

  // lines: every letter's box, the title and each heading, measured once per layout (they do not move inside the
  // stage while the section is pinned)
  var G = [], TT = null, LB = [], REST = null;
  function measure() {
    bRect = box.getBoundingClientRect();
    G = chars.map(function (cs) { return cs.map(function (c) { return rel(c.getBoundingClientRect()); }); });
    TT = textRect(title);
    LB = heads.map(textRect);
    // the gun's resting place: just after the last word of the section title (the last line, when the title wraps)
    var rg = document.createRange(); rg.selectNodeContents(title);
    var rr = rg.getClientRects(), tl = rr.length ? rel(rr[rr.length - 1]) : TT;
    // level with the last line, and past the end of the longest line, so it never sits over the words above it
    REST = { x: Math.min(Math.max(tl.r + 38, TT.r + 26), bw - GW * 0.82), y: (tl.t + tl.b) / 2 - 2, t: tl };
  }

  function layout() {
    // lines: pinned on every screen size (the writing needs the section to hold still)
    pin = (LINES || wide.matches) && window.CSS && CSS.supports('position', 'sticky');
    track.classList.toggle('is-pin', pin);
    box.classList.toggle('pg-spray--follow', !pin);
    vh = innerHeight;
    if (pin) {
      if (LINES) sec.style.minHeight = '';
      var h = sec.offsetHeight;
      // lines: the pinned section fills the whole screen (its content is centred), so no page background shows above or below it
      if (LINES && h < vh) { sec.style.minHeight = vh + 'px'; h = vh; }
      // under the floating nav, else centred; a section taller than the screen keeps its bottom in view
      top = LINES ? Math.min(0, Math.round(vh - h)) : h <= vh - 100 ? Math.max(84, Math.round((vh - h) / 2)) : Math.min(84, Math.round(vh - h - 12));
      sec.style.top = top + 'px';
      track.style.height = Math.round(h + vh * (LEAD * 2 + STEP * N)) + 'px';
    } else { sec.style.top = ''; track.style.height = ''; if (LINES) sec.style.minHeight = ''; }
    // the stage reaches right of the cards (room for the mascot) but never past the screen edge, so the page cannot scroll sideways
    var room = document.documentElement.clientWidth - wrap.getBoundingClientRect().right;
    box.style.right = pin ? -Math.max(0, Math.min(190, room - 1)) + 'px' : '';
    GW = innerWidth < 600 ? GWS[0] : innerWidth < 961 ? GWS[1] : GWS[2];
    var GH = Math.round(GW / ASPECT);
    NOZ = { x: (M.nozzle[0] - M.crop[0]) / CW * GW, y: (M.nozzle[1] - M.crop[1]) / CH * GH };
    gun.style.width = GW + 'px'; gun.style.height = GH + 'px';
    gun.style.transformOrigin = NOZ.x.toFixed(1) + 'px ' + NOZ.y.toFixed(1) + 'px';
    dpr = Math.min(LINES ? 1.5 : 2, window.devicePixelRatio || 1);
    bw = box.clientWidth; bh = box.clientHeight;
    cv.width = Math.round(bw * dpr); cv.height = Math.round(bh * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (LINES) measure();
  }

  // lines: how far into heading i the writing is (k 0..1) -> letters typed (a little past the count, so the last letter
  // finishes), and the writing point: the leading edge of the letter going on, in stage coordinates
  function typed(i, k) { return k * (chars[i].length + 1.5); }
  function caret(i, k) {
    var gs = G[i], t = typed(i, k) - 0.75, c = clamp(Math.floor(t), 0, gs.length - 1), f = clamp(t - c, 0, 1), r = gs[c];
    var x = r.l + (r.r - r.l) * f;
    return { x: x, y: (r.t + r.b) / 2, l: x - 7, r: x + 2, t: r.t + (r.b - r.t) * 0.18, b: r.b - (r.b - r.t) * 0.12 };
  }
  var GUN_DX = LINES ? 20 : 26, GUN_DY = LINES ? -6 : -10;    // the nozzle sits just right of and above the writing point

  // ---- where everything should be for the current scroll position (reads only: no style is written before this)
  function goal() {
    var sr = sec.getBoundingClientRect(), on = sr.bottom > -80 && sr.top < vh + 80;
    var paint = [], pos, target, vis;
    bRect = box.getBoundingClientRect();
    var rects = heads.map(textRect);
    if (pin) {
      var r = track.getBoundingClientRect(), run = track.offsetHeight - sec.offsetHeight;
      var p = clamp((top - r.top) / run, 0, 1);
      var s = (p * (LEAD * 2 + STEP * N) - LEAD) / STEP;                 // 0..N across the cards
      for (var i = 0; i < N; i++) paint[i] = clamp((s - i) / SPRAY, 0, 1);
      var at = function (k) { var t = rects[k]; return { x: t.r + 58, y: (t.t + t.b) / 2 - 6, t: t }; };
      var tt = textRect(title), R = { x: tt.r + 90, y: (tt.t + tt.b) / 2 - 4, t: tt };   // its rest, beside the title
      var i0 = clamp(Math.floor(s), 0, N - 1), f = s - i0, A = at(i0), k;
      pos = { x: A.x, y: A.y }; target = A.t;
      var hop = function (P, Q, kk) { pos = { x: P.x + (Q.x - P.x) * kk, y: P.y + (Q.y - P.y) * kk - Math.sin(kk * Math.PI) * 46 }; };
      if (s < 0) { k = ease(clamp((s + 0.5) / 0.5, 0, 1)); hop(R, A, k); target = k < 0.5 ? R.t : A.t; }
      else if (f > SPRAY && i0 < N - 1) { var B = at(i0 + 1); k = ease((f - SPRAY) / (1 - SPRAY)); hop(A, B, k); target = B.t; }
      else if (f > SPRAY) { k = ease(clamp((f - SPRAY) / 0.6, 0, 1)); hop(A, R, k); if (k > 0.5) target = R.t; }
      vis = clamp((s + 0.5) / 0.25, 0, 1);
    } else {
      // the mascot's line: 42% down the screen; a heading paints as it rises past it
      var line = vh * 0.42 - bRect.top, first = (rects[0].t + rects[0].b) / 2, last = (rects[N - 1].t + rects[N - 1].b) / 2;
      var best = 0, bd = 1e9;
      for (var j = 0; j < N; j++) {
        var cy = (rects[j].t + rects[j].b) / 2;
        // two cards side by side (tablet): the left one first
        var lag = rects[j].l > bw * 0.45 && N > 2 ? 46 : 0;
        paint[j] = clamp((line - cy + 70 - lag) / 150, 0, 1);
        var d = Math.abs(cy + lag * 0.5 - line);
        if (paint[j] > 0.01 && paint[j] < 0.99 && d < bd) { bd = d; best = j; }
        else if (bd === 1e9 && d < Math.abs((rects[best].t + rects[best].b) / 2 - line)) best = j;
      }
      pos = { x: bw - GW * 0.74 + NOZ.x, y: clamp(line, first - 30, last + 30) };
      target = rects[best];
      vis = clamp(1 - Math.max(first - 160 - line, line - last - 160, 0) / 120, 0, 1);
    }
    return { paint: paint, pos: pos, target: target, vis: vis, on: on, rects: rects };
  }

  // ---- the spray
  var parts = [];
  // one frame's worth (F = frames at 60 a second) of droplets from the nozzle (nx, ny) onto the area T
  function emit(nx, ny, T, F) {
    var tx = (T.l + T.r) / 2, ty = (T.t + T.b) / 2, dist = Math.hypot(tx - nx, ty - ny) || 1, spread = LINES ? 1.2 + dist * 0.03 : 3 + dist * 0.09;
    var n = Math.round((pin ? 16 : 11) * F);
    for (var k = 0; k < n; k++) {
      var gx = T.l + (T.r - T.l) * Math.random() + gauss() * spread, gy = T.t + (T.b - T.t) * Math.random() + gauss() * spread * 0.6;
      var big = Math.random() < 0.04, L = (big ? 9 : 4.5) + Math.random() * 4;   // flight time, in 60 fps frames
      parts.push({ x: nx + gauss() * 0.8, y: ny + gauss() * 0.8, vx: (gx - nx) / L, vy: (gy - ny) / L, life: L,
        r: big ? 1.3 + Math.random() * 1.1 : 0.3 + Math.random() * Math.random() * 1.3, a: 0.4 + Math.random() * 0.5, c: PAL[(Math.random() * PAL.length) | 0], land: 30 });
    }
    // mist: soft puffs along the jet, widening and thinning toward the surface, drifting on a little after
    var m = Math.max(1, Math.round(3 * F));
    for (var q = 0; q < m; q++) {
      var u = Math.pow(Math.random(), 0.7), life = 16 + Math.random() * 12;
      parts.push({ mist: 1, x: nx + (tx - nx) * u + gauss() * spread * u * 0.5, y: ny + (ty - ny) * u + gauss() * spread * u * 0.4,
        r: 3 + u * (9 + spread * 0.8), vx: (tx - nx) / dist * 0.5, vy: (ty - ny) / dist * 0.5 - 0.06, life: life, max: life, a: 0.045 + 0.06 * u });
    }
  }
  function draw(F) {
    ctx.clearRect(0, 0, bw, bh);
    for (var j = parts.length - 1; j >= 0; j--) {
      var p = parts[j];
      if (p.mist) {
        p.life -= F; p.r += 0.5 * F; p.x += p.vx * F; p.y += p.vy * F;
        if (p.life <= 0) { parts.splice(j, 1); continue; }
        ctx.globalAlpha = p.a * (p.life / p.max);
        ctx.drawImage(MIST, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
        continue;
      }
      if (p.life > 0) {
        var st = Math.min(F, p.life); p.x += p.vx * st; p.y += p.vy * st; p.life -= F;
        ctx.globalAlpha = p.a; ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
        continue;
      }
      if (LINES) { parts.splice(j, 1); continue; }               // lines: a landed droplet is simply gone, nothing is left on the page
      p.land -= F; p.a *= Math.pow(0.95, F);                     // landed: a speck that fades
      if (p.land <= 0) { parts.splice(j, 1); continue; }
      ctx.globalAlpha = p.a; ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (parts.length > 1400) parts.splice(0, parts.length - 1400);
  }
  // ---- what is on screen, easing toward the goal
  var cur = null, raf = 0, vis = 0, last = 0;
  // time-based easing (same glide at 60 and 120 frames a second): share of the remaining distance covered in dt ms
  function lerp(dt, ms) { return 1 - Math.exp(-dt / ms); }

  // ---- lines: ONE value drives everything. s = how far down the run we are, in lines (0 = start of line 1, N = end of
  // line N; from -LEAD/STEP the gun leaves its resting place after the title, and returns there at the end). The scroll
  // sets a raw s; s is eased once; letters, paint, the gun's place, its hop to the next line and the spray are all computed
  // from that eased s, so they cannot drift apart however you scroll.
  var LEADS = LEAD / STEP, LEADS_IN = (LEAD + EARLY) / STEP;
  function linesRaw() {
    var lr = track.getBoundingClientRect();
    return (clamp((top - lr.top) / vh, -EARLY, LEAD * 2 + STEP * N) - LEAD) / STEP;     // d: screens scrolled past the pin point (negative before it)
  }
  function nib(i, k) { var c = caret(i, k); return { x: c.x + GUN_DX, y: c.y + GUN_DY, t: c }; }
  // gun path between two points: it drops to the new row first, then travels along it, with a small lift
  function route(P, Q, t) {
    var ky = ease(clamp(t / 0.6, 0, 1)), kx = ease(clamp((t - 0.3) / 0.7, 0, 1));
    return { x: P.x + (Q.x - P.x) * kx, y: P.y + (Q.y - P.y) * ky - Math.sin(clamp(t, 0, 1) * Math.PI) * 24 };
  }
  function linesAt(s) {
    var paint = [], pos, target, i, j = clamp(Math.floor(s), 0, N - 1), f = s - j, t;
    for (i = 0; i < N; i++) paint[i] = clamp((s - i) / SPRAY, 0, 1);
    var A = nib(j, paint[j]); pos = { x: A.x, y: A.y }; target = A.t;
    if (s < 0) { t = clamp((s + LEADS_IN) / LEADS_IN, 0, 1); pos = route(REST, nib(0, 0), t); target = t < 0.5 ? REST.t : nib(0, 0).t; }
    else if (f > SPRAY && j < N - 1) { t = (f - SPRAY) / (1 - SPRAY); var S = nib(j + 1, 0); pos = route(nib(j, 1), S, t); target = t < 0.5 ? nib(j, 1).t : S.t; }
    else if (f > SPRAY) { t = clamp((f - SPRAY) / (LEADS + 1 - SPRAY), 0, 1); pos = route(nib(j, 1), REST, t); target = t < 0.5 ? nib(j, 1).t : REST.t; }
    return { paint: paint, pos: pos, target: target };
  }
  var lcur = null;
  function frameLines(now) {
    raf = 0;
    var dt = last ? Math.min(50, now - last) : 16.7; last = now;
    var F = dt / 16.7, raw = linesRaw();
    if (!lcur) lcur = { s: raw, x: 0, y: 0, tx: 0, ty: 0, init: false };
    var prev = lcur.s;
    lcur.s += (raw - lcur.s) * lerp(dt, 130);
    var settled = Math.abs(raw - lcur.s) < 0.0006;
    if (settled) lcur.s = raw;
    var g = linesAt(lcur.s), rate = (lcur.s - prev) / F;         // lines per 60 fps frame
    if (!lcur.init) { lcur.x = g.pos.x; lcur.y = g.pos.y; lcur.tx = (g.target.l + g.target.r) / 2; lcur.ty = (g.target.t + g.target.b) / 2; lcur.init = true; }
    // letters and paint
    var painting = -1;
    for (var i = 0; i < N; i++) {
      var pi = g.paint[i];
      heads[i].style.setProperty('--paint', pi.toFixed(3));
      cards[i].style.setProperty('--paint', pi.toFixed(3));
      if (pi > 0.0005 && pi < 0.9995 && rate > 0.0004) painting = i;       // being written (scrolling forward)
      var cs = chars[i], n = cs.length, ty = typed(i, pi), was = shown[i];
      if (ty !== was) {
        var lo = was < 0 ? 0 : Math.max(0, Math.floor(Math.min(ty, was)) - 2), hi = was < 0 ? n - 1 : Math.min(n - 1, Math.ceil(Math.max(ty, was)) + 1);
        for (var c = lo; c <= hi; c++) {
          var pv1 = clamp((ty - c) / 1.5, 0, 1);
          cs[c].style.setProperty('--p', pv1.toFixed(3));
          cs[c].classList.toggle('d', pv1 >= 1);       // finished: no blur or glow left to compute
        }
        shown[i] = ty;
      }
    }
    // the gun sits exactly on the point computed from s (no second easing), only the aim and the face are smoothed a little
    var sr = sec.getBoundingClientRect(), on = sr.bottom > -80 && sr.top < vh + 80;
    var vis = clamp((vh * 0.94 - sr.top) / 160, 0, 1);
    lcur.x = g.pos.x; lcur.y = g.pos.y;
    var T = painting >= 0 ? caret(painting, g.paint[painting]) : g.target;
    var tx = (T.l + T.r) / 2, tyy = (T.t + T.b) / 2;
    lcur.tx += (tx - lcur.tx) * lerp(dt, 60); lcur.ty += (tyy - lcur.ty) * lerp(dt, 60);
    var spraying = painting >= 0 && vis > 0.5;
    var ang = Math.atan2(lcur.ty - lcur.y, lcur.tx - lcur.x) - Math.PI;
    while (ang < -Math.PI) ang += 2 * Math.PI;
    ang = clamp(ang || 0, -0.45, 0.45);
    var bob = spraying ? Math.sin(now / 26) * 0.6 : Math.sin(now / 520) * 3;     // a hum from the trigger, or a slow float
    gun.style.opacity = vis.toFixed(2);
    gun.style.transform = 'translate(' + (lcur.x - NOZ.x).toFixed(1) + 'px,' + (lcur.y - NOZ.y + bob).toFixed(1) + 'px) rotate(' + (ang * 57.3 + (spraying ? Math.sin(now / 37) * 0.45 : 0)).toFixed(2) + 'deg)';
    gun.classList.toggle('is-spraying', spraying);
    var dx = lcur.tx - lcur.x, dy = lcur.ty - lcur.y, dl = Math.hypot(dx, dy) || 1;
    pupils.style.transform = 'translate(' + (dx / dl * TRAVEL).toFixed(2) + 'px,' + (dy / dl * TRAVEL).toFixed(2) + 'px)';
    if (spraying) emit(lcur.x + Math.cos(ang + Math.PI) * 4, lcur.y + Math.sin(ang + Math.PI) * 4, T, F);
    draw(F);
    if (settled) last = 0;
    if (!settled || parts.length || (vis > 0.02 && on)) raf = requestAnimationFrame(frameLines);
  }

  function frame(now) {
    if (LINES) return frameLines(now);
    raf = 0;
    var g = goal();
    if (!cur) cur = { x: g.pos.x, y: g.pos.y, paint: g.paint.slice(), tx: (g.target.l + g.target.r) / 2, ty: (g.target.t + g.target.b) / 2 };
    var dt = last ? Math.min(50, now - last) : 16.7; last = now;
    var F = dt / 16.7;
    var K = lerp(dt, 140), painting = -1, settled = true;
    vis += (g.vis - vis) * lerp(dt, 160);
    for (var i = 0; i < N; i++) {
      var d = g.paint[i] - cur.paint[i];
      cur.paint[i] += d * lerp(dt, 170);
      if (Math.abs(d) < 0.002) cur.paint[i] = g.paint[i];
      else settled = false;
      if (d > 0.004 && painting < 0) painting = i;              // paint going on: that heading is being sprayed
      heads[i].style.setProperty('--paint', cur.paint[i].toFixed(3));
      if (LINES) {
        cards[i].style.setProperty('--paint', cur.paint[i].toFixed(3));
        // letters: each fades in over 1.5 letters of writing; only the ones whose state changed are touched
        var cs = chars[i], n = cs.length, ty = typed(i, cur.paint[i]), was = shown[i];
        if (ty !== was) {
          var lo = was < 0 ? 0 : Math.max(0, Math.floor(Math.min(ty, was)) - 2), hi = was < 0 ? n - 1 : Math.min(n - 1, Math.ceil(Math.max(ty, was)) + 1);
          for (var c = lo; c <= hi; c++) {
            var pv1 = clamp((ty - c) / 1.5, 0, 1);
            cs[c].style.setProperty('--p', pv1.toFixed(3));
            cs[c].classList.toggle('d', pv1 >= 1);       // finished: no blur or glow left to compute
          }
          shown[i] = ty;
        }
      }
    }
    // lines: while a heading is being written the nozzle rides the writing point closely; otherwise it eases to its goal
    var gx = g.pos.x, gy = g.pos.y, T;
    if (LINES && painting >= 0) { T = caret(painting, cur.paint[painting]); gx = T.x + GUN_DX; gy = T.y + GUN_DY; K = lerp(dt, 70); }
    else T = painting >= 0 ? (g.rects ? g.rects[painting] : LB[painting]) : g.target;
    cur.x += (gx - cur.x) * K; cur.y += (gy - cur.y) * K;
    if (Math.abs(gx - cur.x) > 0.3 || Math.abs(gy - cur.y) > 0.3) settled = false;
    var tx = (T.l + T.r) / 2, tyy = (T.t + T.b) / 2;
    cur.tx += (tx - cur.tx) * lerp(dt, 70); cur.ty += (tyy - cur.ty) * lerp(dt, 70);
    var spraying = painting >= 0 && vis > 0.5;
    // aim the nozzle (pointing left) at the text it works on
    var ang = Math.atan2(cur.ty - cur.y, cur.tx - cur.x) - Math.PI;
    while (ang < -Math.PI) ang += 2 * Math.PI;
    ang = clamp(ang || 0, -0.45, 0.45);
    // spraying: a fine, even hum from the trigger; idle: a slow float
    var bob = spraying ? Math.sin(now / 26) * 0.6 : Math.sin(now / 520) * 4;
    gun.style.opacity = vis.toFixed(2);
    gun.style.transform = 'translate(' + (cur.x - NOZ.x).toFixed(1) + 'px,' + (cur.y - NOZ.y + bob).toFixed(1) + 'px) rotate(' + (ang * 57.3 + (spraying ? Math.sin(now / 37) * 0.45 : 0)).toFixed(2) + 'deg)';
    gun.classList.toggle('is-spraying', spraying);
    var dx = cur.tx - cur.x, dy = cur.ty - cur.y, dl = Math.hypot(dx, dy) || 1;
    pupils.style.transform = 'translate(' + (dx / dl * TRAVEL).toFixed(2) + 'px,' + (dy / dl * TRAVEL).toFixed(2) + 'px)';

    if (spraying) emit(cur.x + Math.cos(ang + Math.PI) * 4, cur.y + Math.sin(ang + Math.PI) * 4, T, F);
    draw(F);
    // keep going while anything moves, paint is in the air, or the mascot is on screen (its idle float)
    if (settled) last = 0;
    if (!settled || parts.length || (vis > 0.02 && g.on)) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', function () { layout(); kick(); });
  if (wide.addEventListener) wide.addEventListener('change', function () { layout(); kick(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { layout(); kick(); });
  layout(); kick();
})();
