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

  // a download cell that holds only a stray empty link (HVLP 06 has one: an <a> containing a single
  // non-breaking space) would otherwise render as a blank white pill
  document.querySelectorAll('.pg-prod--desk table[border="0"] td').forEach(function (td) {
    if (!td.querySelector('img') && !td.textContent.replace(/\s+/g, '').length) td.classList.add('pg-empty');
  });

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

  var deckCtl = null;     // set below when the calendar deck is active
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
      // in the deck every model is a page of the same calendar: scroll to the point where it is on top
      if (deckCtl && deckCtl.on()) { deckCtl.goTo(desk.indexOf(sec)); return; }
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

  function setActiveChip(id) {
    Object.keys(chips).forEach(function (k) { chips[k].classList.remove('is-on'); });
    var chip = chips[id];
    if (!chip) return;
    chip.classList.add('is-on');
    // keep the active chip visible when the rail scrolls sideways
    var l = chip.offsetLeft - rail.clientWidth / 2 + chip.clientWidth / 2;
    if (rail.scrollWidth > rail.clientWidth) rail.scrollTo({ left: l, behavior: 'smooth' });
  }

  /* ---- the calendar deck ----------------------------------------------------------------
     On a wide, tall enough screen the nine model sections are stacked into one pinned stage, like
     the leaves of a desk calendar hinged at the top. Scrolling is the date: the top leaf holds still,
     then swings up and over its hinge (rotateX 0 -> 180deg, origin at its top edge) and the next model
     is underneath. The leaves below peek out as a stack and rise one place as each one goes.
     The sections are moved, not copied, so every `.pg-prod ...` style and every link still applies.
     On tablets and phones, with reduced motion, or when the cards would have to shrink too much to fit
     the window, nothing is built and the page stays the plain list of cards. */
  deckCtl = (function () {
    var MIN_W = 1101, MIN_S = 0.66, N = desk.length;
    if (reduce || N < 3 || !('requestAnimationFrame' in window)) return null;

    var built = false, deckEl, stickyEl, scalerEl, saved, step = 600, stickPx = 200, raf = 0, topIdx = -1;

    function el(tag, cls) { var e = document.createElement(tag); e.className = cls; return e; }
    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
    function smooth(t) { return t * t * (3 - 2 * t); }
    function stick() {
      var b = document.querySelector('.pg-nav');
      return (b ? b.offsetHeight + (parseFloat(getComputedStyle(b).top) || 0) : 0) + 14;
    }
    function eligible() { return window.innerWidth >= MIN_W && window.innerHeight >= 560; }

    function build() {
      saved = desk.map(function (s) { return { sec: s, parent: s.parentNode, next: s.nextSibling }; });
      deckEl = el('div', 'pg-deck');
      stickyEl = el('div', 'pg-deck__sticky');
      scalerEl = el('div', 'pg-deck__scaler');

      var rings = el('div', 'pg-deck__rings');
      rings.setAttribute('aria-hidden', 'true');
      for (var r = 0; r < 18; r++) rings.appendChild(el('span', 'pg-deck__ring'));

      desk[0].parentNode.insertBefore(deckEl, desk[0]);
      deckEl.appendChild(stickyEl);
      stickyEl.appendChild(rings);
      stickyEl.appendChild(scalerEl);

      desk.forEach(function (sec, i) {
        sec.classList.add('pg-deck__sheet');
        sec.style.zIndex = String(N - i);
        var back = el('div', 'pg-deck__back');            // what you see while the leaf is in the air
        back.setAttribute('aria-hidden', 'true');
        var h = sec.querySelector('h1');
        var ghost = el('span', 'pg-deck__back-t');
        ghost.textContent = h ? h.textContent.trim() : '';
        back.appendChild(ghost);
        sec.appendChild(back);
        sec.appendChild(el('div', 'pg-deck__shade'));
        scalerEl.appendChild(sec);
      });
      document.body.classList.add('pg-deck-on');
      built = true;
    }

    function destroy() {
      if (!built) return;
      for (var i = saved.length - 1; i >= 0; i--) {         // last to first, so neighbours land in order
        var s = saved[i];
        s.sec.classList.remove('pg-deck__sheet');
        ['zIndex', 'transform', 'visibility'].forEach(function (p) { s.sec.style[p] = ''; });
        s.sec.style.removeProperty('--fade'); s.sec.style.removeProperty('--shade');
        s.sec.removeAttribute('inert');
        s.sec.querySelectorAll('.pg-deck__back, .pg-deck__shade').forEach(function (n) { n.remove(); });
        s.parent.insertBefore(s.sec, s.next);
      }
      deckEl.remove();
      document.body.classList.remove('pg-deck-on');
      built = false; topIdx = -1;
    }

    // size the stage so the tallest card fits under the sticky bars, scaling the whole card down if needed
    function measure() {
      if (!built) return true;
      stickPx = stick();
      var avail = window.innerHeight - stickPx - 46, s = 1, h0 = 0;
      for (var k = 0; k < 3; k++) {                        // the card gets shorter as it gets wider: settle
        scalerEl.style.setProperty('--s', s);
        desk.forEach(function (sec) { sec.style.setProperty('--card-h', '0px'); });
        h0 = 0;
        desk.forEach(function (sec) {
          var row = sec.querySelector('.et_pb_row');
          if (row) h0 = Math.max(h0, row.offsetHeight);
        });
        s = Math.min(1, avail / h0);
      }
      if (s < MIN_S) return false;
      step = Math.max(window.innerHeight * 0.72, 520);
      scalerEl.style.setProperty('--s', s);
      scalerEl.style.height = h0 + 'px';
      desk.forEach(function (sec) { sec.style.setProperty('--card-h', h0 + 'px'); });
      stickyEl.style.height = Math.round(h0 * s) + 'px';
      stickyEl.style.top = stickPx + 'px';
      deckEl.style.height = Math.round(h0 * s + (N - 1) * step + 72) + 'px';
      return true;
    }

    function update() {
      raf = 0;
      if (!built) return;
      var rect = deckEl.getBoundingClientRect();
      var p = clamp((stickPx - rect.top) / step, 0, N - 1);
      var base = Math.floor(p), frac = p - base;
      if (base >= N - 1) { base = N - 1; frac = 0; }
      // each leaf holds still, flips over the middle of its stretch, then the next one holds
      var flip = base >= N - 1 ? 0 : smooth(clamp((frac - 0.26) / 0.54, 0, 1));
      var q = base + flip;                                  // continuous position in the stack
      var top = flip > 0.55 ? Math.min(N - 1, base + 1) : base;

      desk.forEach(function (sec, i) {
        var f = i < base ? 1 : (i === base ? flip : 0);     // how far this leaf has turned
        var d = Math.max(0, i - q);                         // how many leaves sit on top of it
        var dc = Math.min(d, 3);
        var fade = f <= 0.5 ? 1 : 1 - smooth(clamp((f - 0.5) / 0.4, 0, 1));
        // each leaf sits a little behind the one above it in real 3D depth, so the stack never sorts wrongly
        sec.style.transform = 'translate3d(0,' + (dc * 16).toFixed(1) + 'px,' + (-dc * 4).toFixed(1) + 'px) rotateX(' + (f * 180).toFixed(2) + 'deg) scale(' + (1 - dc * 0.035).toFixed(4) + ')';
        sec.style.setProperty('--fade', fade.toFixed(3));
        sec.style.setProperty('--shade', (clamp(d, 0, 3) * 0.11).toFixed(3));
        sec.style.visibility = (f >= 0.995 || d > 3.05) ? 'hidden' : 'visible';
        if (i === top) sec.removeAttribute('inert'); else sec.setAttribute('inert', '');
      });
      if (top !== topIdx) { topIdx = top; setActiveChip(desk[top].id); }
    }
    function queue() { if (!raf) raf = requestAnimationFrame(update); }

    function activate() {
      if (!eligible()) { destroy(); return; }
      if (!built) build();
      if (!measure()) { destroy(); return; }               // would have to shrink too far: plain list
      update();
    }

    window.addEventListener('scroll', queue, { passive: true });
    var lastW = window.innerWidth, lastH = window.innerHeight, t = 0;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        if (Math.abs(window.innerWidth - lastW) < 2 && Math.abs(window.innerHeight - lastH) < 2) return;
        lastW = window.innerWidth; lastH = window.innerHeight;
        activate();
      }, 150);
    });
    window.addEventListener('load', activate);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (built) { measure(); update(); } });
    activate();

    return {
      on: function () { return built; },
      goTo: function (i) {
        var rect = deckEl.getBoundingClientRect();
        window.scrollBy({ top: rect.top - stickPx + i * step, behavior: 'smooth' });
      }
    };
  })();

  if (!('IntersectionObserver' in window)) return;
  // a thin band a little below the sticky bar decides which model is "current"
  var spy = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (deckCtl && deckCtl.on()) return;        // the deck drives the chips itself
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
