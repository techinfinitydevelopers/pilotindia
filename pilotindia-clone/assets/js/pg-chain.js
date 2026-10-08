/* Chain carousel: every card is one of is-active / is-prev-1 / is-next-1 / is-prev-2 / is-next-2 /
   is-hidden, recomputed from its circular distance to the active slide. Autoplay runs on
   requestAnimationFrame so the active dot can fill smoothly; hover pauses and resumes from where it was. */
(function () {
  'use strict';
  var root = document.getElementById('pg-chain');
  if (!root) return;
  var stage = root.querySelector('.pg-chain__stage');
  var cards = Array.prototype.slice.call(root.querySelectorAll('.pg-chain__card'));
  var dots = Array.prototype.slice.call(root.querySelectorAll('.pg-chain__dot'));
  var total = cards.length;
  if (total < 2) return;

  var DURATION = 3000;
  var STATES = ['is-active', 'is-prev-1', 'is-next-1', 'is-prev-2', 'is-next-2', 'is-hidden'];
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var active = 0;

  function stateFor(i) {
    var diff = (i - active + total) % total;
    if (diff > total / 2) diff -= total;
    if (total === 2 && diff === 1) diff = -1;          // two slides: the other one sits on the left
    if (diff === 0) return 'is-active';
    if (diff === -1) return 'is-prev-1';
    if (diff === 1) return 'is-next-1';
    if (diff === -2 && total >= 4) return 'is-prev-2';
    if (diff === 2 && total >= 4) return 'is-next-2';
    return 'is-hidden';
  }

  function render() {
    cards.forEach(function (c, i) {
      var s = stateFor(i);
      STATES.forEach(function (k) { c.classList.toggle(k, k === s); });
      c.setAttribute('aria-hidden', s === 'is-hidden' ? 'true' : 'false');
      c.tabIndex = s === 'is-hidden' ? -1 : s === 'is-active' ? -1 : 0;
      // links inside a card are only reachable while it is the large card
      Array.prototype.forEach.call(c.querySelectorAll('a'), function (a) { a.tabIndex = s === 'is-active' ? 0 : -1; });
    });
    dots.forEach(function (d, i) {
      var on = i === active;
      d.classList.toggle('is-active', on);
      d.setAttribute('aria-selected', on ? 'true' : 'false');
      if (!on) fillOf(d).style.width = '0%';
    });
  }
  function fillOf(d) { return d.querySelector('.pg-chain__fill'); }

  // ---- autoplay -------------------------------------------------------------------------------
  var elapsed = 0;          // ms into the current slide
  var last = 0;             // timestamp of the previous frame
  var paused = false;
  var raf = 0;

  function frame(t) {
    if (!last) last = t;
    if (!paused) {
      elapsed += t - last;
      var pct = Math.min(elapsed / DURATION, 1);
      fillOf(dots[active]).style.width = (pct * 100).toFixed(2) + '%';
      if (pct >= 1) { go(active + 1); }
    }
    last = t;
    raf = requestAnimationFrame(frame);
  }
  function resetTimer() { elapsed = 0; if (dots[active]) fillOf(dots[active]).style.width = '0%'; }

  function go(i) {
    active = ((i % total) + total) % total;
    resetTimer();
    render();
  }

  // ---- clicks: pills, dots, keyboard ----------------------------------------------------------
  var dragMoved = false;
  cards.forEach(function (c, i) {
    c.addEventListener('click', function (e) {
      if (dragMoved) { e.preventDefault(); e.stopPropagation(); return; }
      if (i !== active) { e.preventDefault(); go(i); }
    });
    c.addEventListener('keydown', function (e) {
      if (i !== active && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); go(i); cards[i].focus({ preventScroll: true }); }
    });
  });
  dots.forEach(function (d, i) { d.addEventListener('click', function () { go(i); }); });
  root.addEventListener('keydown', function (e) {
    if (e.target.closest && e.target.closest('a')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); go(active + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(active - 1); }
  });

  // ---- pause on hover, resume from the elapsed time ----
  stage.addEventListener('mouseenter', function () { paused = true; });
  stage.addEventListener('mouseleave', function () { paused = false; });
  root.addEventListener('focusin', function () { paused = true; });
  root.addEventListener('focusout', function (e) { if (!root.contains(e.relatedTarget)) paused = false; });

  // ---- drag / swipe (Pointer Events: mouse, touch and pen) ----
  var startX = 0, dx = 0, dragging = false, pointerId = null;
  var THRESHOLD = 50;
  stage.addEventListener('pointerdown', function (e) {
    if (e.button !== undefined && e.button !== 0) return;
    dragging = true; dragMoved = false; startX = e.clientX; dx = 0; pointerId = e.pointerId;
    stage.classList.remove('is-settling');
    stage.classList.add('is-dragging');
  });
  stage.addEventListener('pointermove', function (e) {
    if (!dragging || e.pointerId !== pointerId) return;
    dx = e.clientX - startX;
    if (Math.abs(dx) > 6 && !dragMoved) {
      dragMoved = true;
      try { stage.setPointerCapture(pointerId); } catch (err) { /* already released */ }
    }
    if (dragMoved) stage.style.transform = 'translateX(' + (dx * 0.6) + 'px)';
  });
  function end(e) {
    if (!dragging || (e && e.pointerId !== pointerId)) return;
    dragging = false;
    stage.classList.remove('is-dragging');
    stage.classList.add('is-settling');
    stage.style.transform = '';
    if (dragMoved && Math.abs(dx) > THRESHOLD) go(active + (dx < 0 ? 1 : -1));
    // the click that follows this pointerup must not also select a pill
    setTimeout(function () { dragMoved = false; }, 0);
  }
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);
  stage.addEventListener('transitionend', function (e) { if (e.target === stage) stage.classList.remove('is-settling'); });

  render();
  if (!reduce) raf = requestAnimationFrame(frame);
  // stop the loop while the tab is hidden; the timer picks up where it left off
  document.addEventListener('visibilitychange', function () {
    if (reduce) return;
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else if (!raf) { last = 0; raf = requestAnimationFrame(frame); }
  });
})();
