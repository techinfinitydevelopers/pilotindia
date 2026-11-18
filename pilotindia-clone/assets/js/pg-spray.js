/* Spray-gun mascot for the "Enhance Your Craft" bento (spray-guns page). See assets/css/pg-spray.css.
   Desktop: the section is pinned for a scroll run; the scroll position drives which card the gun is at and how far
   that card's heading is painted, so it plays back when scrolling up. Droplets and mist are drawn on a canvas.
   Phones/tablets: each card gets a small gun that sprays its heading once when the card scrolls into view.
   Reduced motion, or no IntersectionObserver: nothing changes (headings stay as they are). 2026-11-18 */
(function () {
  'use strict';
  var sec = document.querySelector('section.bento');
  if (!sec || !window.matchMedia || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var wrap = sec.querySelector('.bento__wrap');
  var cards = Array.prototype.slice.call(sec.querySelectorAll('.bento__card'));
  var heads = cards.map(function (c) { return c.querySelector('.bento__t'); });
  if (!wrap || cards.length < 2 || heads.some(function (h) { return !h; })) return;

  var GUN = '/assets/img/type-59-s.png';
  // the face drawn on the gun's cup, in the photo's own 300 x 500 coordinates
  var FACE = '<svg class="pg-spray__face" viewBox="0 0 300 500"><g class="eyes">' +
    '<circle class="eye-w" cx="160" cy="126" r="12"/><circle class="eye-w" cx="199" cy="118" r="12"/>' +
    '<g class="pupils"><circle class="eye-p" cx="160" cy="126" r="5.5"/><circle class="eye-p" cx="199" cy="118" r="5.5"/>' +
    '<circle class="eye-s" cx="162" cy="124" r="1.8"/><circle class="eye-s" cx="201" cy="116" r="1.8"/></g></g>' +
    '<circle class="cheek" cx="148" cy="146" r="6"/><circle class="cheek" cx="214" cy="135" r="6"/>' +
    '<path class="mouth" d="M171 146 Q182 156 193 143"/><ellipse class="mouth-o" cx="182" cy="148" rx="5" ry="6"/></svg>';
  var desktop = matchMedia('(min-width: 961px)').matches && window.CSS && CSS.supports('position', 'sticky');
  sec.classList.add('pg-spray-on');

  // ------------------------------------------------------------------ phones and tablets
  if (!desktop) {
    if (!('IntersectionObserver' in window)) { sec.classList.remove('pg-spray-on'); return; }
    sec.classList.add('pg-spray-m');
    cards.forEach(function (c) {
      var m = document.createElement('span');
      m.className = 'pg-spray-mini';
      m.setAttribute('aria-hidden', 'true');
      m.innerHTML = '<img src="' + GUN + '" alt="" decoding="async" />' + FACE + '<i></i>';
      c.appendChild(m);
    });
    // cards that come into view together are sprayed one after another
    var free = 0;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var c = e.target;
        io.unobserve(c);
        var now = performance.now(), wait = Math.max(0, free - now);
        free = now + wait + 650;
        setTimeout(function () {
          c.classList.add('is-spraying');
          setTimeout(function () { c.classList.add('is-painted'); }, 450);
        }, wait);
      });
    }, { threshold: 0.6 });
    cards.forEach(function (c) { io.observe(c); });
    return;
  }

  // ------------------------------------------------------------------ desktop: the pinned run
  var N = cards.length, STEP = 0.5, LEAD = 0.25, SPRAY = 0.62;   // per card: half a screen of scroll, 62% of it spraying
  var track = document.createElement('div');
  track.className = 'pg-spray-track';
  sec.parentNode.insertBefore(track, sec);
  track.appendChild(sec);

  var box = document.createElement('div');
  box.className = 'pg-spray';
  box.setAttribute('aria-hidden', 'true');
  box.innerHTML = '<canvas class="pg-spray__fx"></canvas><div class="pg-spray__gun"><img src="' + GUN + '" alt="" decoding="async" />' + FACE + '</div>';
  wrap.appendChild(box);
  var cv = box.querySelector('canvas'), ctx = cv.getContext('2d');
  var gun = box.querySelector('.pg-spray__gun'), pupils = box.querySelector('.pupils');
  var NOZ = { x: 24, y: 104 };   // nozzle inside the 130 x 217 gun box

  var vh = innerHeight, top = 0, dpr = 1, bw = 0, bh = 0;
  function layout() {
    vh = innerHeight;
    var h = sec.offsetHeight;
    top = Math.max(84, Math.round((vh - h) / 2));          // under the floating nav, else centred
    sec.style.top = top + 'px';
    track.style.height = Math.round(h + vh * (LEAD * 2 + STEP * N)) + 'px';
    dpr = Math.min(2, window.devicePixelRatio || 1);
    bw = box.clientWidth; bh = box.clientHeight;
    cv.width = Math.round(bw * dpr); cv.height = Math.round(bh * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // where a heading's text is, in the coordinates of the spray box
  function textRect(h) {
    var r = document.createRange(); r.selectNodeContents(h);
    var a = r.getBoundingClientRect(), b = box.getBoundingClientRect();
    return { l: a.left - b.left, r: a.right - b.left, t: a.top - b.top, b: a.bottom - b.top };
  }
  // the nozzle sits a little right of a heading's end, at its middle, aiming at it
  function anchor(i) {
    var t = textRect(heads[i]);
    return { x: t.r + 58, y: (t.t + t.b) / 2 - 6, t: t };
  }
  // its resting place: right of the section title, at the title's middle
  var title = sec.querySelector('.bento__h2');
  function rest() {
    var t = textRect(title);
    return { x: t.r + 90, y: (t.t + t.b) / 2 - 4, t: t };
  }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ease(k) { return k * k * (3 - 2 * k); }

  var parts = [], lastY = scrollY, lastMove = 0, raf = 0, spraying = false;

  function progress() {
    var r = track.getBoundingClientRect(), run = track.offsetHeight - sec.offsetHeight;
    return clamp((top - r.top) / run, 0, 1);
  }

  function frame(now) {
    raf = 0;
    var p = progress();
    var total = LEAD * 2 + STEP * N, s = (p * total - LEAD) / STEP;    // s: 0..N across the cards
    // heading paint
    for (var i = 0; i < N; i++) heads[i].style.setProperty('--paint', clamp((s - i) / SPRAY, 0, 1).toFixed(3));
    // gun place: at card i while spraying it, then hopping to the next
    var i0 = clamp(Math.floor(s), 0, N - 1), f = s - i0, A = anchor(i0), pos = { x: A.x, y: A.y }, target = A.t;
    var spr = s > 0 && s < N && f > 0.02 && f < SPRAY;
    var R = rest(), k;
    function hop(P, Q, kk) { pos.x = P.x + (Q.x - P.x) * kk; pos.y = P.y + (Q.y - P.y) * kk - Math.sin(kk * Math.PI) * 46; }
    if (s < 0) {                                    // arriving: from beside the section title to the first card
      k = ease(clamp((s + 0.5) / 0.5, 0, 1)); hop(R, A, k); target = k < 0.5 ? R.t : A.t;
    } else if (f > SPRAY && i0 < N - 1) {           // between cards
      var B = anchor(i0 + 1); k = ease((f - SPRAY) / (1 - SPRAY)); hop(A, B, k); target = B.t;
    } else if (f > SPRAY) {                         // done: back beside the title, looking at it
      k = ease(clamp((f - SPRAY) / 0.5, 0, 1)); hop(A, R, k); if (k > 0.5) target = R.t;
    }
    var vis = clamp((s + 0.5) / 0.25, 0, 1);
    var moving = now - lastMove < 140;
    spraying = spr && moving;
    // aim the nozzle (pointing left) at the middle of the text it works on
    var tx = (target.l + target.r) / 2, ty = (target.t + target.b) / 2;
    var ang = Math.atan2(ty - pos.y, tx - pos.x) - Math.PI;
    while (ang < -Math.PI) ang += 2 * Math.PI;
    ang = clamp(ang, -0.45, 0.45);
    var bob = spraying ? (Math.random() - 0.5) * 1.6 : Math.sin(now / 520) * 4;
    gun.style.opacity = vis.toFixed(2);
    gun.style.transform = 'translate(' + (pos.x - NOZ.x).toFixed(1) + 'px,' + (pos.y - NOZ.y + bob).toFixed(1) + 'px) rotate(' + (ang * 57.3 + (spraying ? (Math.random() - 0.5) * 1.2 : 0)).toFixed(2) + 'deg)';
    gun.classList.toggle('is-spraying', spraying);
    // the eyes look where it sprays
    var dx = tx - pos.x, dy = ty - pos.y, dl = Math.hypot(dx, dy) || 1;
    pupils.style.transform = 'translate(' + (dx / dl * 4).toFixed(1) + 'px,' + (dy / dl * 4).toFixed(1) + 'px)';

    // droplets from the nozzle to random points on the heading text, mist along the way
    if (spraying) {
      var nx = pos.x + Math.cos(ang + Math.PI) * 4, ny = pos.y + Math.sin(ang + Math.PI) * 4;
      for (var n = 0; n < 7; n++) {
        var gx = target.l + Math.random() * (target.r - target.l), gy = target.t + Math.random() * (target.b - target.t) + (Math.random() - 0.5) * 10;
        var T = 12 + Math.random() * 12;
        parts.push({ x: nx, y: ny, vx: (gx - nx) / T, vy: (gy - ny) / T, life: T, land: 30 + Math.random() * 30, r: 0.7 + Math.random() * 1.7, a: 0.55 + Math.random() * 0.4 });
      }
      if (Math.random() < 0.7) {
        var q = Math.random();
        parts.push({ mist: 1, x: nx + (tx - nx) * q, y: ny + (ty - ny) * q + (Math.random() - 0.5) * 12, r: 10 + q * 22, life: 26, a: 0.07 + Math.random() * 0.05 });
      }
    }
    ctx.clearRect(0, 0, bw, bh);
    for (var j = parts.length - 1; j >= 0; j--) {
      var d = parts[j];
      if (d.mist) {
        d.life--; d.r += 0.6;
        var g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
        g.addColorStop(0, 'rgba(212,42,32,' + (d.a * d.life / 26).toFixed(3) + ')'); g.addColorStop(1, 'rgba(212,42,32,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.283); ctx.fill();
        if (d.life <= 0) parts.splice(j, 1);
        continue;
      }
      if (d.life > 0) { d.x += d.vx; d.y += d.vy; d.life--; }
      else { d.land--; d.a *= 0.96; }                         // landed: a speck that fades
      ctx.fillStyle = 'rgba(212,42,32,' + d.a.toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.283); ctx.fill();
      if (d.life <= 0 && d.land <= 0) parts.splice(j, 1);
    }
    if (parts.length > 900) parts.splice(0, parts.length - 900);
    // keep animating while paint is in the air or the section is on screen (the idle bob)
    var r = sec.getBoundingClientRect();
    if (parts.length || (r.bottom > 0 && r.top < vh)) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  addEventListener('scroll', function () { if (scrollY !== lastY) { lastY = scrollY; lastMove = performance.now(); } kick(); }, { passive: true });
  addEventListener('resize', function () { layout(); kick(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { layout(); kick(); });
  layout(); kick();
})();
