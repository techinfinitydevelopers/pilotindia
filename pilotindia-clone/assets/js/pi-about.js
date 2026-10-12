/* About Us: scroll motion.
   - [data-reveal] (up | left | clip): fades/slides in once, staggered with --d
   - [data-count]: counts up when it first scrolls into view
   - [data-parallax] / [data-parallax-img]: gentle vertical drift tied to scroll
   Nothing is hidden until this script has run (#pi-about.pa-js), so with scripting off, an old browser or
   reduced-motion set, the page is simply fully visible. */
(function () {
  var root = document.getElementById('pi-about');
  if (!root) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  function fmt(n) { return n >= 1000 ? n.toLocaleString('en-IN') : String(n); }
  function setFinal(el) { el.textContent = fmt(parseInt(el.getAttribute('data-count'), 10)); }

  function countUp(el) {
    var to = parseInt(el.getAttribute('data-count'), 10), dur = 1400, t0 = null;
    if (reduce) { setFinal(el); return; }
    function step(t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(to * e));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  var counters = root.querySelectorAll('[data-count]');
  if (!hasIO || reduce) {
    for (var i = 0; i < counters.length; i++) setFinal(counters[i]);
    return;
  }

  root.classList.add('pa-js');
  for (var c = 0; c < counters.length; c++) counters[c].textContent = '0';

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var el = en.target;
      el.classList.add('is-in');
      var inner = el.querySelectorAll ? el.querySelectorAll('[data-count]') : [];
      for (var k = 0; k < inner.length; k++) countUp(inner[k]);
      if (el.hasAttribute('data-count')) countUp(el);
      io.unobserve(el);
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });

  var targets = root.querySelectorAll('[data-reveal], .pa-tray, .pa-tiers, .pa-facts, .pa-hero__copy');
  for (var j = 0; j < targets.length; j++) io.observe(targets[j]);
  // counters that are not inside a revealed block (e.g. the export line) get their own observer entry
  var lone = root.querySelectorAll('[data-count]');
  for (var m = 0; m < lone.length; m++) if (!lone[m].closest('[data-reveal], .pa-tray, .pa-tiers, .pa-facts')) io.observe(lone[m]);

  // parallax: rAF-throttled, only elements near the viewport
  var par = root.querySelectorAll('[data-parallax], [data-parallax-img]');
  if (!par.length) return;
  var ticking = false;
  function frame() {
    ticking = false;
    var vh = window.innerHeight;
    for (var i = 0; i < par.length; i++) {
      var el = par[i], r = el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) continue;
      var k = el.hasAttribute('data-parallax') ? parseFloat(el.getAttribute('data-parallax')) : 0.06;
      var off = (r.top + r.height / 2 - vh / 2) * -k;
      el.style.setProperty('--py', off.toFixed(1) + 'px');
    }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  frame();
})();
