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
  function unitOf(label) {
    var m = label.match(/\(([^)]*)\)/);
    // "(Approx.)" is a qualifier, not a unit; the value already carries its unit ("26 kg")
    return m && !/approx/i.test(m[1]) ? m[1].trim() : '';
  }

  // a spec table with three or more cells in a row (the gas regulators' pressure matrix) is a real grid,
  // not label | value lines: mark it so it keeps a grid look
  document.querySelectorAll('.pg-prod table').forEach(function (t) {
    if (t.querySelector('img')) return;
    var wide = false;
    t.querySelectorAll('tr').forEach(function (tr) { if (tr.children.length >= 3) wide = true; });
    if (wide) t.classList.add('pg-wide');
  });

  // size long model names down so they stay on one or two lines
  document.querySelectorAll('.pg-prod h1').forEach(function (h) {
    var n = h.textContent.replace(/\s+/g, ' ').trim().length;
    if (n > 16) h.classList.add('pg-h1--xl'); else if (n > 9) h.classList.add('pg-h1--long');
  });

  // a download cell that holds only a stray empty link (HVLP 06 has one: an <a> containing a single
  // non-breaking space) would otherwise render as a blank white pill
  document.querySelectorAll('.pg-prod--desk table[border="0"] td').forEach(function (td) {
    if (!td.querySelector('img') && !td.textContent.replace(/\s+/g, '').length) td.classList.add('pg-empty');
  });

  document.querySelectorAll('.pg-prod--desk').forEach(function (sec) {
    var cols = sec.querySelectorAll('.et_pb_row > .et_pb_column');
    if (cols.length < 3) return;

    // the "areas of application" block: the wrapper that holds the label and its icon table. Where it
    // sits differs between pages (inside the flex row, or beside the downloads), so find it by its label.
    var left = cols[0].querySelector('.et_pb_text_inner');
    var areas = null;
    cols[2].querySelectorAll('p').forEach(function (p) {
      if (!areas && /^\s*areas of application/i.test(p.textContent)) areas = p.parentElement;
    });
    if (left && areas && !areas.classList.contains('et_pb_text_inner') && !areas.classList.contains('pg-areas')) {
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


  // ---- gallery + product pages ------------------------------------------------------------
  // A page with two or more models opens as a gallery of product images. Each tile links to the
  // same page with ?model=<id>, which shows only that model's full card (a page of its own: own URL,
  // back link, previous / next). The cards are not copied anywhere: the view just hides the others.
  var view = (function () {
    var cards = Array.prototype.slice.call(document.querySelectorAll('.pg-prod--desk[id]'));
    if (cards.length < 2) return null;
    var body = document.body;
    var base = location.pathname;
    var seriesName = (function () {
      // a page without a series menu (Power Tools) names itself
      var own = document.body.getAttribute('data-pg-series');
      if (own) return own;
      var cur = document.querySelector('.pg-nav li.current-menu-item > a, .pg-nav li.current_page_item > a');
      var t = cur ? cur.textContent.trim() : document.title.split(/[-|–]/)[0].trim();
      // the menu writes it in capitals; title case reads better inside a sentence
      return t.toLowerCase().replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); });
    })();
    function nameOf(sec) { var h = sec.querySelector('h1'); return h ? h.textContent.replace(/\s+/g, ' ').trim() : ''; }
    function urlOf(sec) { return base + '?model=' + encodeURIComponent(sec.id); }
    function imageOf(sec) {
      var col = sec.querySelector('.et_pb_row > .et_pb_column:nth-child(2)') || sec;
      var mod = col.querySelector('.et_pb_image') || col;
      var bg = getComputedStyle(mod).backgroundImage;
      var m = bg && bg.match(/url\(["']?(.*?)["']?\)/);
      if (m && !/^data:/.test(m[1])) return m[1];
      var img = col.querySelector('img');
      if (!img) return '';
      return img.getAttribute('bv-data-src') || img.getAttribute('data-src') || img.getAttribute('src') || '';
    }
    function subOf(sec) {
      var h = sec.querySelector('h1');
      var p = h && h.nextElementSibling;
      var t = p && p.tagName === 'P' ? p.textContent.replace(/\s+/g, ' ').trim() : '';
      return t.length && t.length < 60 ? t : '';
    }
    function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }
    var first = document.querySelector('.pg-prod');

    var wanted = new URLSearchParams(location.search).get('model');
    var current = wanted ? document.getElementById(wanted) : null;
    if (current && cards.indexOf(current) < 0) current = null;

    if (!current) {
      // ---- the gallery ----
      // A shop-style listing: type pills that filter, a count, a sort control, and a grid of
      // hairline-bordered cells. Every value shown comes from the model's own card.
      body.classList.add('pg-view-gallery');

      // the spec table rows of a card, as [label, value] pairs
      function specsOf(c) {
        var out = [];
        c.querySelectorAll('table').forEach(function (t) {
          if (t.querySelector('img') || t.classList.contains('pg-wide')) return;
          t.querySelectorAll('tr').forEach(function (tr) {
            var td = tr.querySelectorAll('td');
            if (td.length === 2) out.push([td[0].textContent.replace(/\s+/g, ' ').trim(), td[1].textContent.replace(/\s+/g, ' ').trim()]);
          });
        });
        return out;
      }
      var KEY = [/cup capacity/i, /^capacity/i, /counting speed/i, /sorting speed/i, /performance in sheets/i, /^weight/i];
      function keyOf(rows) {
        for (var k = 0; k < KEY.length; k++) {
          for (var r = 0; r < rows.length; r++) {
            if (KEY[k].test(rows[r][0]) && rows[r][1]) {
              var u = unitOf(rows[r][0]);
              return { v: rows[r][1] + (u && !/[a-z]/i.test(rows[r][1]) ? ' ' + u : ''), l: clean(rows[r][0]) };
            }
          }
        }
        return null;
      }
      function codeOf(rows) {
        for (var r = 0; r < rows.length; r++) if (/^(code|model)/i.test(rows[r][0]) && rows[r][1]) return rows[r][1];
        return '';
      }
      function typeOf(c) { return subOf(c).replace(/^\(|\)$/g, '').trim(); }

      var sec = el('section', 'pg-gallery');
      var head = el('div', 'pg-gallery__head');
      head.appendChild(el('span', 'pg-gallery__eyebrow', 'Pilot range'));
      head.appendChild(el('h2', 'pg-gallery__title', seriesName));
      sec.appendChild(head);

      // ---- toolbar: type pills | sort ----
      var types = [];
      cards.forEach(function (c) { var t = typeOf(c); if (t && types.indexOf(t) < 0) types.push(t); });
      var bar = el('div', 'pg-gallery__bar');
      var pills = el('div', 'pg-gallery__pills');
      pills.setAttribute('role', 'group');
      pills.setAttribute('aria-label', 'Filter by type');
      var filter = '';
      function pill(label, value) {
        var b = el('button', 'pg-pill', label);
        b.type = 'button';
        b.setAttribute('aria-pressed', value === '' ? 'true' : 'false');
        b.addEventListener('click', function () {
          filter = value;
          pills.querySelectorAll('.pg-pill').forEach(function (p) { p.setAttribute('aria-pressed', p === b ? 'true' : 'false'); });
          apply();
        });
        pills.appendChild(b);
      }
      pill('All models', '');
      if (types.length > 1) types.forEach(function (t) { pill(t, t); });
      bar.appendChild(pills);

      // search: matches name, type and code number, on top of the type pill
      var query = '';
      var search = el('label', 'pg-search');
      var input = el('input', 'pg-search__input');
      input.type = 'search';
      input.placeholder = 'Search models';
      input.setAttribute('aria-label', 'Search models');
      input.addEventListener('input', function () { query = input.value.trim().toLowerCase(); apply(); });
      search.appendChild(input);
      var tools = el('div', 'pg-gallery__tools');
      tools.appendChild(search);

      var sortWrap = el('label', 'pg-sort');
      sortWrap.appendChild(el('span', 'pg-sort__label', 'Sort by'));
      var sel = el('select', 'pg-sort__select');
      [['', 'Featured'], ['az', 'Name A–Z'], ['za', 'Name Z–A']].forEach(function (o) {
        var op = el('option', '', o[1]); op.value = o[0]; sel.appendChild(op);
      });
      sel.addEventListener('change', apply);
      sortWrap.appendChild(sel);
      tools.appendChild(sortWrap);
      bar.appendChild(tools);
      sec.appendChild(bar);

      var count = el('p', 'pg-gallery__count');
      count.setAttribute('aria-live', 'polite');
      sec.appendChild(count);

      // ---- the grid ----
      var grid = el('div', 'pg-gallery__grid');
      var tiles = cards.map(function (c, i) {
        var a = el('a', 'pg-tile');
        a.href = urlOf(c);
        a.setAttribute('data-type', typeOf(c));
        a.setAttribute('data-name', nameOf(c));
        a.setAttribute('data-order', String(i));
        var pic = el('span', 'pg-tile__pic');
        var src = imageOf(c);
        if (src) { var img = el('img'); img.src = src; img.alt = nameOf(c); img.loading = 'lazy'; img.decoding = 'async'; pic.appendChild(img); }
        a.appendChild(pic);
        var meta = el('span', 'pg-tile__meta');
        meta.appendChild(el('span', 'pg-tile__name', nameOf(c)));
        var rows = specsOf(c), key = keyOf(rows), code = codeOf(rows);
        var line = el('span', 'pg-tile__line');
        if (key) {
          var kv = el('span', 'pg-tile__key');
          kv.appendChild(el('b', '', key.v));
          kv.appendChild(el('span', '', ' ' + key.l.toLowerCase()));
          line.appendChild(kv);
        }
        if (code && code !== nameOf(c)) line.appendChild(el('span', 'pg-tile__code', code));
        if (!line.children.length) line.appendChild(el('span', 'pg-tile__key', typeOf(c) || 'View details'));
        meta.appendChild(line);
        a.appendChild(meta);
        a.setAttribute('data-search', (nameOf(c) + ' ' + typeOf(c) + ' ' + code).toLowerCase());
        grid.appendChild(a);
        return a;
      });
      sec.appendChild(grid);

      function apply() {
        var mode = sel.value;
        var order = tiles.slice();
        if (mode) order.sort(function (x, y) {
          var r = x.getAttribute('data-name').localeCompare(y.getAttribute('data-name'), undefined, { numeric: true });
          return mode === 'az' ? r : -r;
        });
        else order.sort(function (x, y) { return +x.getAttribute('data-order') - +y.getAttribute('data-order'); });
        var shown = 0;
        order.forEach(function (t) {
          grid.appendChild(t);
          var ok = (!filter || t.getAttribute('data-type') === filter) &&
                   (!query || t.getAttribute('data-search').indexOf(query) >= 0);
          t.hidden = !ok;
          if (ok) shown++;
        });
        count.textContent = shown ? 'Showing ' + shown + ' of ' + tiles.length : 'No models match "' + input.value.trim() + '"';
      }
      apply();

      first.parentNode.insertBefore(sec, first);
      return { mode: 'gallery', urlOf: urlOf };
    }

    // ---- one product's page ----
    body.classList.add('pg-view-model');
    current.classList.add('is-shown');
    var i = cards.indexOf(current);
    // the "No. 0X" label is a CSS counter; hidden cards do not count, so give this one its real number
    current.style.counterSet = 'pgm ' + (i + 1);
    document.title = nameOf(current) + ' - ' + seriesName + ' | Pilot India';

    var bar = el('div', 'pg-crumb');
    var back = el('a', 'pg-crumb__back', 'All ' + seriesName + ' models');
    back.href = base;
    bar.appendChild(back);
    bar.appendChild(el('span', 'pg-crumb__pos', 'Model ' + (i + 1) + ' of ' + cards.length));
    current.parentNode.insertBefore(bar, current);

    var pager = el('nav', 'pg-pager');
    pager.setAttribute('aria-label', 'Other models');
    [[cards[i - 1], 'prev', 'Previous'], [cards[i + 1], 'next', 'Next']].forEach(function (x) {
      if (!x[0]) { pager.appendChild(el('span', 'pg-pager__gap')); return; }
      var a = el('a', 'pg-pager__link pg-pager__link--' + x[1]);
      a.href = urlOf(x[0]);
      a.appendChild(el('span', 'pg-pager__dir', x[2]));
      a.appendChild(el('span', 'pg-pager__name', nameOf(x[0])));
      pager.appendChild(a);
    });
    current.parentNode.insertBefore(pager, current.nextSibling);
    return { mode: 'model', urlOf: urlOf, current: current };
  })();

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
      // with the gallery, every model is its own page
      if (view) { location.href = view.urlOf(sec); return; }
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
  if (view && view.current && chips[view.current.id]) chips[view.current.id].classList.add('is-on');

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
