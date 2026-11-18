/* Product mascot for the "Enhance your craft"-style bento on the product landing pages. See assets/css/pg-spray.css.
   The mascot is the TYPE 59 S gun (its own cut-out photo) with a face drawn on it, the same on every product page,
   spraying red paint at the five headings. The scroll position sets where the mascot
   should be and how far each heading is painted; every frame it and the paint ease toward that, so wheel steps and
   flicks glide, and droplets fly while paint is going on.
   Desktop ("pin"): the section is pinned for a short run, about a third of a screen per card.
   Phones/tablets ("follow"): the cards scroll normally; the mascot rides at a fixed height on screen at the right
   edge and sprays each heading as it passes the nozzle.
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
  box.className = 'pg-spray';
  box.setAttribute('aria-hidden', 'true');
  box.innerHTML = '<canvas class="pg-spray__fx"></canvas><div class="pg-spray__gun"><div class="pg-spray__art">' + art + '</div>' + face + '</div>';
  wrap.appendChild(box);
  var cv = box.querySelector('canvas'), ctx = cv.getContext('2d');
  var gun = box.querySelector('.pg-spray__gun'), pupils = box.querySelector('.pupils');

  // desktop run: per card a third of a screen, 60% of it spraying; a short lead in and out
  var STEP = 0.32, LEAD = 0.15, SPRAY = 0.6;
  var wide = matchMedia('(min-width: 961px)');
  var pin = false, vh = innerHeight, top = 0, dpr = 1, bw = 0, bh = 0, GW = M.width[2], NOZ = { x: 24, y: 104 };

  function layout() {
    pin = wide.matches && window.CSS && CSS.supports('position', 'sticky');
    track.classList.toggle('is-pin', pin);
    box.classList.toggle('pg-spray--follow', !pin);
    vh = innerHeight;
    if (pin) {
      var h = sec.offsetHeight;
      top = Math.max(84, Math.round((vh - h) / 2));          // under the floating nav, else centred
      sec.style.top = top + 'px';
      track.style.height = Math.round(h + vh * (LEAD * 2 + STEP * N)) + 'px';
    } else { sec.style.top = ''; track.style.height = ''; }
    // the stage reaches right of the cards (room for the mascot) but never past the screen edge, so the page cannot scroll sideways
    var room = document.documentElement.clientWidth - wrap.getBoundingClientRect().right;
    box.style.right = pin ? -Math.max(0, Math.min(190, room - 1)) + 'px' : '';
    GW = pin ? M.width[2] : (innerWidth < 600 ? M.width[0] : M.width[1]);
    var GH = Math.round(GW / ASPECT);
    NOZ = { x: (M.nozzle[0] - M.crop[0]) / CW * GW, y: (M.nozzle[1] - M.crop[1]) / CH * GH };
    gun.style.width = GW + 'px'; gun.style.height = GH + 'px';
    gun.style.transformOrigin = NOZ.x.toFixed(1) + 'px ' + NOZ.y.toFixed(1) + 'px';
    dpr = Math.min(2, window.devicePixelRatio || 1);
    bw = box.clientWidth; bh = box.clientHeight;
    cv.width = Math.round(bw * dpr); cv.height = Math.round(bh * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ease(k) { return k * k * (3 - 2 * k); }
  // where a block's text is, in the stage's coordinates
  var bRect;
  function textRect(h) {
    var r = document.createRange(); r.selectNodeContents(h);
    var a = r.getBoundingClientRect();
    return { l: a.left - bRect.left, r: a.right - bRect.left, t: a.top - bRect.top, b: a.bottom - bRect.top };
  }

  // ---- where everything should be for the current scroll position
  function goal() {
    bRect = box.getBoundingClientRect();
    var rects = heads.map(textRect), paint = [], pos, target, vis;
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
    return { paint: paint, pos: pos, target: target, vis: vis };
  }

  // ---- what is on screen, easing toward the goal
  var cur = null, parts = [], raf = 0, vis = 0, last = 0;
  // time-based easing (same glide at 60 and 120 frames a second): share of the remaining distance covered in dt ms
  function lerp(dt, ms) { return 1 - Math.exp(-dt / ms); }
  var PAPER = M.fx === 'paper';
  function frame(now) {
    raf = 0;
    var g = goal();
    if (!cur) cur = { x: g.pos.x, y: g.pos.y, paint: g.paint.slice(), tx: (g.target.l + g.target.r) / 2, ty: (g.target.t + g.target.b) / 2 };
    var dt = last ? Math.min(64, now - last) : 16; last = now;
    var K = lerp(dt, 110), painting = -1, settled = true;
    cur.x += (g.pos.x - cur.x) * K; cur.y += (g.pos.y - cur.y) * K;
    vis += (g.vis - vis) * lerp(dt, 160);
    for (var i = 0; i < N; i++) {
      var d = g.paint[i] - cur.paint[i];
      cur.paint[i] += d * lerp(dt, 130);
      if (Math.abs(d) < 0.002) cur.paint[i] = g.paint[i];
      else settled = false;
      if (d > 0.004 && painting < 0) painting = i;              // paint going on: that heading is being sprayed
      heads[i].style.setProperty('--paint', cur.paint[i].toFixed(3));
    }
    if (Math.abs(g.pos.x - cur.x) > 0.3 || Math.abs(g.pos.y - cur.y) > 0.3) settled = false;
    var T = painting >= 0 ? textRect(heads[painting]) : g.target;
    var tx = (T.l + T.r) / 2, ty = (T.t + T.b) / 2;
    cur.tx += (tx - cur.tx) * lerp(dt, 70); cur.ty += (ty - cur.ty) * lerp(dt, 70);
    var spraying = painting >= 0 && vis > 0.5;
    // aim the nozzle (pointing left) at the text it works on
    var ang = Math.atan2(cur.ty - cur.y, cur.tx - cur.x) - Math.PI;
    while (ang < -Math.PI) ang += 2 * Math.PI;
    ang = clamp(ang, -0.45, 0.45);
    var bob = spraying ? (Math.random() - 0.5) * 1.4 : Math.sin(now / 520) * 4;
    gun.style.opacity = vis.toFixed(2);
    gun.style.transform = 'translate(' + (cur.x - NOZ.x).toFixed(1) + 'px,' + (cur.y - NOZ.y + bob).toFixed(1) + 'px) rotate(' + (ang * 57.3 + (spraying ? (Math.random() - 0.5) * 1.2 : 0)).toFixed(2) + 'deg)';
    gun.classList.toggle('is-spraying', spraying);
    var dx = cur.tx - cur.x, dy = cur.ty - cur.y, dl = Math.hypot(dx, dy) || 1;
    pupils.style.transform = 'translate(' + (dx / dl * TRAVEL).toFixed(2) + 'px,' + (dy / dl * TRAVEL).toFixed(2) + 'px)';

    // droplets (or paper shreds) from the nozzle to random points on the heading, mist along the way
    if (spraying) {
      var nx = cur.x + Math.cos(ang + Math.PI) * 4, ny = cur.y + Math.sin(ang + Math.PI) * 4, many = pin ? 7 : 5;
      for (var n = 0; n < many; n++) {
        var gx = T.l + Math.random() * (T.r - T.l), gy = T.t + Math.random() * (T.b - T.t) + (Math.random() - 0.5) * 10;
        var L = 10 + Math.random() * 10;
        parts.push({ x: nx, y: ny, vx: (gx - nx) / L, vy: (gy - ny) / L, life: L, land: 26 + Math.random() * 26, r: 0.7 + Math.random() * 1.6, a: 0.55 + Math.random() * 0.4,
          rot: Math.random() * 6.28, spin: (Math.random() - 0.5) * 0.5, hue: Math.random() < 0.55 ? 0 : 1 });
      }
      if (!PAPER && Math.random() < 0.7) {
        var q = Math.random();
        parts.push({ mist: 1, x: nx + (tx - nx) * q, y: ny + (ty - ny) * q + (Math.random() - 0.5) * 12, r: 10 + q * 20, life: 24, a: 0.07 + Math.random() * 0.05 });
      }
    }
    ctx.clearRect(0, 0, bw, bh);
    for (var j = parts.length - 1; j >= 0; j--) {
      var p = parts[j];
      if (p.mist) {
        p.life--; p.r += 0.6;
        var gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        gr.addColorStop(0, 'rgba(212,42,32,' + (p.a * p.life / 24).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(212,42,32,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
        if (p.life <= 0) parts.splice(j, 1);
        continue;
      }
      if (p.life > 0) { p.x += p.vx; p.y += p.vy; p.life--; p.rot += p.spin; } else { p.land--; p.a *= 0.95; }   // landed: a speck that fades
      ctx.fillStyle = p.hue ? 'rgba(245,134,52,' + p.a.toFixed(3) + ')' : 'rgba(212,42,32,' + p.a.toFixed(3) + ')';
      if (PAPER) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.r * 1.6, -p.r * 0.5, p.r * 3.2, p.r); ctx.restore(); }
      else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); }
      if (p.life <= 0 && p.land <= 0) parts.splice(j, 1);
    }
    if (parts.length > 900) parts.splice(0, parts.length - 900);
    // keep going while anything moves, paint is in the air, or the mascot is on screen (its idle bob)
    var r = sec.getBoundingClientRect();
    if (settled) last = 0;
    if (!settled || parts.length || (vis > 0.02 && r.bottom > 0 && r.top < vh)) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', function () { layout(); kick(); });
  if (wide.addEventListener) wide.addEventListener('change', function () { layout(); kick(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { layout(); kick(); });
  layout(); kick();
})();
