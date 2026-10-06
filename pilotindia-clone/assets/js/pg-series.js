/* Series pages: scroll-reveal for model cards, and a model rail inside the sticky
   series menu that scroll-spies the model currently in view.
   IntersectionObserver only, so nothing runs per frame. */
(function () {
  var prods = document.querySelectorAll('.pg-prod');
  if (!prods.length) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- restructure each desktop card ----
  // 1. The "areas of application" block lives in the data column; moved under the features it
  //    balances the card (the data column was stretching into empty space beside it).
  // 2. A figure card overlaps the corner of the photo, built from two rows of the spec table.
  //    Nothing is invented: the values and labels are read straight from the table.
  function clean(label) { return label.replace(/\([^)]*\)/g, '').replace(/[–—-]+\s*$/, '').replace(/\s+/g, ' ').trim(); }
  function unitOf(label) { var m = label.match(/\(([^)]*)\)/); return m ? m[1].trim() : ''; }

  document.querySelectorAll('.pg-prod--desk').forEach(function (sec) {
    var cols = sec.querySelectorAll('.et_pb_row > .et_pb_column');
    if (cols.length < 3) return;

    var flex = cols[2].querySelector('.et_pb_text_inner > div[style*="flex"]');
    var left = cols[0].querySelector('.et_pb_text_inner');
    var areas = flex && flex.lastElementChild;
    if (left && areas && areas !== flex.firstElementChild && !areas.classList.contains('pg-areas')) {
      areas.classList.add('pg-areas');
      left.appendChild(areas);
    }

    if (cols[1].querySelector('.pg-fig')) return;
    var table = null;
    cols[2].querySelectorAll('table').forEach(function (t) { if (!table && !t.querySelector('img')) table = t; });
    if (!table) return;
    var wanted = [/cup capacity/i, /^weight/i], items = [];
    table.querySelectorAll('tr').forEach(function (tr) {
      var td = tr.querySelectorAll('td');
      if (td.length < 2 || items.length >= 2) return;
      var label = td[0].textContent.trim();
      for (var k = 0; k < wanted.length; k++) {
        if (wanted[k].test(label) && !items.some(function (it) { return it.k === k; })) {
          items.push({ k: k, v: td[1].textContent.trim(), u: unitOf(label), l: clean(label) });
        }
      }
    });
    if (!items.length) return;
    items.sort(function (a, b) { return a.k - b.k; });

    var fig = document.createElement('div');
    fig.className = 'pg-fig';
    fig.setAttribute('aria-hidden', 'true');          // repeats the table; screen readers get the table
    items.forEach(function (it) {
      var box = document.createElement('div'); box.className = 'pg-fig__item';
      var n = document.createElement('span'); n.className = 'pg-fig__n'; n.textContent = it.v;
      if (it.u) { var u = document.createElement('small'); u.textContent = it.u; n.appendChild(u); }
      var l = document.createElement('span'); l.className = 'pg-fig__l'; l.textContent = it.l;
      box.appendChild(n); box.appendChild(l); fig.appendChild(box);
    });
    cols[1].appendChild(fig);
  });


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
      // the bar sticks below the site menu, so its own `top` counts as well as its height
      var want = (bar ? bar.offsetHeight + (parseFloat(getComputedStyle(bar).top) || 0) : 0) + 8;
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
    // a button, not a link: Divi binds its own smooth-scroll to every href="#..." and animates to the
    // target at the same time as this does, so the page zigzags before it lands
    var a = document.createElement('button');
    a.type = 'button';
    a.className = 'pg-chip';
    a.setAttribute('data-target', sec.id);
    a.textContent = h.textContent.trim();
    a.addEventListener('click', function (ev) {
      ev.preventDefault();
      sec.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      // Divi reads location.hash once, when the page finishes loading, and answers with scrollTo(0,0)
      // plus its own animation to that anchor. A hash written before then sends the page to the top.
      if (history.replaceState && document.readyState === 'complete') history.replaceState(null, '', '#' + sec.id);
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
