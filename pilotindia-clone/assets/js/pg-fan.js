/* "Fan" gallery (see pg-fan.css). One picture in the middle; the others to either side, each a step smaller and fainter.
   - Slides are listed once in the markup and cloned once, so the row has enough pictures to fill both sides at any position.
   - Drag or swipe with the finger or mouse: the row follows the pointer, and on release it settles on the nearest picture
     (a quick flick carries it further). Also a click on any picture, Left / Right keys, and an auto-advance that stops on hover or
     focus, while dragging, when the tab is hidden, when the gallery is off screen, and under reduced motion.
   - Only transform and opacity change (custom properties --x --s --o --z --p on each tile). */
(function () {
  'use strict';

  var SCALE = [1, 0.52, 0.4, 0.31, 0.23, 0.17, 0.12];     // by distance from the middle
  var FADE = [1, 1, 0.95, 0.85, 0.7, 0.5, 0];
  var REACH = SCALE.length - 1;                           // farthest distance shown
  var GAP = 12, GAP0 = 20;                                // between pictures; around the middle one
  var EVERY = 3400;

  function init(root) {
    var stage = root.querySelector('.pg-fan__stage');
    var cap = root.querySelector('.pg-fan__cap');
    var originals = Array.prototype.slice.call(stage.querySelectorAll('.pg-fan__tile'));
    if (originals.length < 3) return;

    // enough copies (hidden from assistive technology) that both sides are always full: at least 14 tiles in all
    var tiles = originals.slice();
    for (var set = 1; set < Math.max(2, Math.ceil(14 / originals.length)); set++) {
      originals.forEach(function (t) {
        var c = t.cloneNode(true);
        c.setAttribute('aria-hidden', 'true'); c.setAttribute('tabindex', '-1');
        var im = c.querySelector('img'); if (im) { im.alt = ''; }
        stage.appendChild(c); tiles.push(c);
      });
    }
    var N = tiles.length, M = originals.length;

    var pos = 0;                                          // position of the row: a whole number at rest, fractional while dragging
    var w0 = 0, OFF = [], timer = null, hovering = false, inView = true, capName = '';
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // distance from the middle of the tile at each whole step, accounting for each tile's scaled width
    function measure() {
      w0 = parseFloat(getComputedStyle(originals[0]).width) || 300;
      OFF = [0];
      var x = w0 / 2 + GAP0;
      for (var a = 1; a <= REACH; a++) {
        if (a > 1) x += w0 * SCALE[a - 1] + GAP;
        OFF.push(x + w0 * SCALE[a] / 2);
      }
    }
    var lerp = function (a, b, f) { return a + (b - a) * f; };

    function place() {
      for (var i = 0; i < N; i++) {
        var d = (((i - pos) % N) + N + N / 2) % N - N / 2, a = Math.abs(d), sg = d < 0 ? -1 : 1, t = tiles[i];
        if (a >= REACH) {
          t.style.setProperty('--x', sg * OFF[REACH] + 'px'); t.style.setProperty('--s', SCALE[REACH]);
          t.style.setProperty('--o', 0); t.style.setProperty('--z', 0); t.style.setProperty('--p', 'none');
        } else {
          var lo = Math.floor(a), f = a - lo;
          var o = lerp(FADE[lo], FADE[lo + 1], f);
          t.style.setProperty('--x', sg * lerp(OFF[lo], OFF[lo + 1], f) + 'px');
          t.style.setProperty('--s', lerp(SCALE[lo], SCALE[lo + 1], f));
          t.style.setProperty('--o', o);
          t.style.setProperty('--z', 50 - Math.round(a));
          t.style.setProperty('--p', o > 0.01 ? 'auto' : 'none');
        }
      }
      var name = originals[(((Math.round(pos)) % M) + M) % M].getAttribute('data-name') || '';
      if (cap && name !== capName) {
        capName = name;
        cap.classList.add('is-swap');
        setTimeout(function () { cap.textContent = capName; cap.classList.remove('is-swap'); }, 130);
      }
    }

    function go(to) { pos = to; place(); restart(); }
    function next() { go(Math.round(pos) + 1); }
    function prev() { go(Math.round(pos) - 1); }
    function toTile(i) { var d = (((i - Math.round(pos)) % N) + N + N / 2) % N - N / 2; go(Math.round(pos) + d); }

    var down = false, dragging = false, moved = 0, sx = 0, sp = 0, lx = 0, lt = 0, vx = 0, id = null;

    function restart() {
      clearInterval(timer);
      if (reduce) return;
      timer = setInterval(function () { if (!hovering && inView && !document.hidden && !dragging) next(); }, EVERY);
    }

    // keys and hover
    stage.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    });
    stage.addEventListener('mouseenter', function () { hovering = true; });
    stage.addEventListener('mouseleave', function () { hovering = false; });
    stage.addEventListener('focusin', function () { hovering = true; });
    stage.addEventListener('focusout', function () { hovering = false; });

    // drag / swipe: the row follows the pointer
    stage.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      down = true; dragging = false; moved = 0; sx = lx = e.clientX; sp = pos; lt = e.timeStamp; vx = 0; id = e.pointerId;
    });
    stage.addEventListener('pointermove', function (e) {
      if (!down || e.pointerId !== id) return;
      var dx = e.clientX - sx;
      if (!dragging && Math.abs(dx) > 6) {
        dragging = true; root.classList.add('is-drag');
        try { stage.setPointerCapture(id); } catch (err) { /* not every pointer can be captured */ }
      }
      if (!dragging) return;
      moved = Math.max(moved, Math.abs(dx));
      var dt = e.timeStamp - lt; if (dt > 0) vx = 0.8 * vx + 0.2 * ((e.clientX - lx) / dt); lx = e.clientX; lt = e.timeStamp;
      pos = sp - dx / (OFF[1] || 200);
      place();
    });
    function release() {
      if (!down) return; down = false;
      if (!dragging) return;
      dragging = false; root.classList.remove('is-drag');
      var carry = -vx * 260 / (OFF[1] || 200);            // a flick carries the row a little further
      go(Math.round(pos + Math.max(-3, Math.min(3, carry))));
    }
    stage.addEventListener('pointerup', release);
    stage.addEventListener('pointercancel', release);
    stage.addEventListener('click', function (e) {
      if (moved > 6) { moved = 0; return; }               // that was a drag, not a click
      var t = e.target.closest('.pg-fan__tile'); if (!t) return;
      var i = tiles.indexOf(t); if (i >= 0 && i !== (((Math.round(pos)) % N) + N) % N) toTile(i);
    });

    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { inView = es[0].isIntersecting; }).observe(root);
    var rz = 0;
    window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { measure(); place(); }, 120); });

    measure(); place();
    requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add('is-ready'); }); });
    restart();
  }

  var roots = document.querySelectorAll('.pg-fan');
  for (var i = 0; i < roots.length; i++) init(roots[i]);
})();
