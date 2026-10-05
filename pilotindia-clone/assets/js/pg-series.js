/* Series pages: scroll-reveal for model cards, and a model rail inside the sticky
   series menu that scroll-spies the model currently in view.
   IntersectionObserver only, so nothing runs per frame. */
(function () {
  var prods = document.querySelectorAll('.pg-prod');
  if (!prods.length) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- reveal ----
  if (reduce || !('IntersectionObserver' in window)) {
    for (var i = 0; i < prods.length; i++) prods[i].classList.add('is-in');
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    prods.forEach(function (el) { io.observe(el); });
  }

  // ---- model rail ----
  var desk = Array.prototype.slice.call(document.querySelectorAll('.pg-prod--desk[id]'));
  var host = document.querySelector('.pg-nav .et_pb_column');
  if (desk.length < 2 || !host) return;

  var rail = document.createElement('nav');
  rail.className = 'pg-rail';
  rail.setAttribute('aria-label', 'Models on this page');
  var label = document.createElement('span');
  label.className = 'pg-rail__label';
  label.textContent = 'Models';
  rail.appendChild(label);

  // Divi lifts the series menu out of the flow once it sticks, which shortens the page
  // part way through a long smooth scroll and leaves the target tucked under the bar.
  // When the scroll ends, measure again and nudge the section to just below the bar.
  function settle(sec) {
    var done = false;
    function measure() {
      var bar = document.querySelector('.pg-nav');
      var want = (bar ? bar.offsetHeight : 0) + 8;
      var off = sec.getBoundingClientRect().top - want;
      if (Math.abs(off) > 4) window.scrollBy({ top: off, behavior: 'auto' });
    }
    function fix() {
      if (done) return;
      done = true;
      window.removeEventListener('scrollend', fix);
      measure();
      setTimeout(measure, 450);   // the bar can finish sticking a beat after the scroll ends
    }
    if ('onscrollend' in window) window.addEventListener('scrollend', fix);
    setTimeout(fix, reduce ? 150 : 2600);   // fallback where scrollend is missing
  }

  var chips = {};
  desk.forEach(function (sec) {
    var h = sec.querySelector('h1');
    if (!h) return;
    var a = document.createElement('a');
    a.className = 'pg-chip';
    a.href = '#' + sec.id;
    a.textContent = h.textContent.trim();
    a.addEventListener('click', function (ev) {
      ev.preventDefault();
      sec.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      if (history.replaceState) history.replaceState(null, '', '#' + sec.id);
      settle(sec);
    });
    rail.appendChild(a);
    chips[sec.id] = a;
  });
  host.appendChild(rail);

  if (!('IntersectionObserver' in window)) return;
  // a thin band a little below the sticky bar decides which model is "current"
  var spy = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      Object.keys(chips).forEach(function (k) { chips[k].classList.remove('is-on'); });
      var chip = chips[e.target.id];
      if (!chip) return;
      chip.classList.add('is-on');
      // keep the active chip visible when the rail scrolls sideways
      var l = chip.offsetLeft - rail.clientWidth / 2 + chip.clientWidth / 2;
      if (rail.scrollWidth > rail.clientWidth) rail.scrollTo({ left: l, behavior: 'smooth' });
    });
  }, { rootMargin: '-38% 0px -58% 0px', threshold: 0 });
  desk.forEach(function (s) { spy.observe(s); });
})();
