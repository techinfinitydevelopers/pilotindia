/* Home page reveals. IntersectionObserver, not a scroll handler, so nothing runs
   per frame. Honours prefers-reduced-motion by simply showing everything. */
(function () {
  var items = document.querySelectorAll('.pi-reveal');
  if (!items.length) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) {
    for (var i = 0; i < items.length; i++) items[i].classList.add('is-in');
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  items.forEach(function (el) { io.observe(el); });

  /* Figures band: each number counts up from 0 the first time its cell is revealed. The markup already holds the
     final number, so with no JS (or reduced motion, handled above) it simply reads as is. */
  var counters = document.querySelectorAll('.pi-stat__n[data-count], .pi-ind__num[data-count]');
  if (counters.length) {
    var run = function (el) {
      var to = parseInt(el.getAttribute('data-count'), 10);
      if (!isFinite(to)) return;
      var sfx = el.getAttribute('data-suffix') || '';
      var t0 = null, dur = 1500;
      var step = function (t) {
        if (t0 === null) t0 = t;
        var p = Math.min(1, (t - t0) / dur);
        el.textContent = Math.round(to * (1 - Math.pow(1 - p, 4))) + sfx;     // ease-out quart
        if (p < 1) requestAnimationFrame(step); else el.textContent = to + sfx;
      };
      el.textContent = '0' + sfx;
      requestAnimationFrame(step);
    };
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        cio.unobserve(e.target);
        run(e.target);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { el.textContent = '0' + (el.getAttribute('data-suffix') || ''); cio.observe(el); });
  }

  /* "What sits behind the product" — Expand OnHover List component
     (Matches Framer Expand-OnHover-List component)
     - Desktop: Hovering any card activates/opens it with smooth spring swoop.
     - Mobile/Touch: Tapping any card activates/opens it (accordion behavior).
     - Keyboard: Tab focus activates the focused card.
  */
  var capList = document.querySelector('.pi-cap__list');
  var caps = document.querySelectorAll('.pi-cap__list .pi-cap');
  if (caps.length) {
    function setActiveCard(targetCard) {
      for (var i = 0; i < caps.length; i++) {
        if (caps[i] === targetCard) {
          caps[i].classList.add('is-open');
        } else {
          caps[i].classList.remove('is-open');
        }
      }
    }

    /* Nothing is open when the page loads. The first item opens by itself the moment the list is reached, so the
       section "unfolds" for the visitor instead of sitting open off screen; after that, hover / tap / focus take over. */
    var reduceCaps = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var revealed = false;
    function revealFirst() {
      if (revealed) return;
      revealed = true;
      // leave it alone if the visitor already hovered or focused an item
      if (!capList.querySelector('.pi-cap.is-open')) setActiveCard(caps[0]);
    }
    if ('IntersectionObserver' in window && !reduceCaps) {
      var capIo = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          capIo.disconnect();
          setTimeout(revealFirst, 280);
        });
      }, { threshold: 0.45 });
      capIo.observe(capList);
    } else {
      revealFirst();
    }

    // the open row closes when the pointer leaves the list, or on a click / focus anywhere outside it
    capList.addEventListener('mouseleave', function () { setActiveCard(null); });
    document.addEventListener('click', function (e) {
      if (!e.target.closest || !e.target.closest('.pi-cap__list')) setActiveCard(null);
    });
    capList.addEventListener('focusout', function (e) {
      if (!e.relatedTarget || !capList.contains(e.relatedTarget)) setActiveCard(null);
    });

    caps.forEach(function (card) {
      card.addEventListener('mouseenter', function () {
        setActiveCard(card);
      });

      card.addEventListener('click', function () {
        setActiveCard(card);
      });

      card.addEventListener('focus', function () {
        setActiveCard(card);
      });
    });
  }
})();

/* Hero figure deck: deal the top card off every few seconds.
   order[0] is the face-up card; dealing moves it to the end of the array. While the
   dealt card flies (CSS .is-dealt), the rest step up one place; when it lands it jumps,
   without a transition, to the hidden back slot and fades in on the next deal. Pauses
   on hover/focus, when the hero is off screen, and when the tab is hidden. Under
   reduced motion it never auto-plays, but click / Enter still advance it. */
(function () {
  var deck = document.querySelector('.pi-deck');
  if (!deck) return;
  var order = Array.prototype.slice.call(deck.querySelectorAll('.pi-deck__card'));
  if (order.length < 2) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var busy = false, hovering = false, inView = true, timer = null;

  function place(card, depth) {
    card.setAttribute('data-depth', String(depth));
    if (depth === 0) card.removeAttribute('aria-hidden');
    else card.setAttribute('aria-hidden', 'true');
  }

  function deal() {
    if (busy) return;
    var top = order.shift();
    order.push(top);

    if (reduce) { order.forEach(place); return; }

    busy = true;
    top.classList.add('is-dealt');
    order.forEach(function (c, d) { if (c !== top) place(c, d); });

    var landed = false;
    function land() {
      if (landed) return;
      landed = true;
      top.removeEventListener('animationend', land);
      top.classList.add('is-reset');
      top.classList.remove('is-dealt');
      place(top, order.length - 1);
      void top.offsetWidth;            // commit the jump before transitions return
      top.classList.remove('is-reset');
      busy = false;
    }
    top.addEventListener('animationend', land);
    setTimeout(land, 1000);            // background tabs may never fire animationend
  }

  function tick() { if (!hovering && inView && !document.hidden) deal(); }
  function start() { if (!reduce) { clearInterval(timer); timer = setInterval(tick, 3200); } }

  deck.addEventListener('mouseenter', function () { hovering = true; });
  deck.addEventListener('mouseleave', function () { hovering = false; });
  deck.addEventListener('focusin', function () { hovering = true; });
  deck.addEventListener('focusout', function () { hovering = false; });
  deck.addEventListener('click', function () { deal(); start(); });
  deck.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); deal(); start(); }
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { inView = es[0].isIntersecting; }).observe(deck);
  }
  start();
})();

/* Blog section: hovering (or focusing) a post in the list swaps the big card on the left to that post: image, date,
   title, summary and link. Wide screens with a pointer only; on touch and on narrow screens the card stays on the newest
   post and each row is a plain link. */
(function () {
  var grid = document.querySelector('.pi-ins__grid');
  if (!grid) return;
  var feat = grid.querySelector('.pi-ins__feat');
  var rows = grid.querySelectorAll('.pi-ins__row');
  if (!feat || rows.length < 2) return;

  var link = feat.querySelector('.pi-ins__feat-link');
  var imgs = feat.querySelectorAll('.pi-ins__img img');
  var chip = feat.querySelector('.pi-ins__chip');
  var date = feat.querySelector('.pi-ins__date');
  var title = feat.querySelector('.pi-ins__ft');
  var ex = feat.querySelector('.pi-ins__ex');
  var wide = window.matchMedia ? window.matchMedia('(hover: hover) and (min-width: 901px)') : { matches: false };
  var current = grid.querySelector('.pi-ins__row.is-active') || rows[0];
  var timer = null;

  // warm the images once the pointer is anywhere near the section, so a swap never waits on the network
  var warmed = false;
  function warm() {
    if (warmed) return;
    warmed = true;
    for (var i = 0; i < rows.length; i++) { var im = new Image(); im.decoding = 'async'; im.src = rows[i].getAttribute('data-img'); }
  }
  grid.addEventListener('pointerenter', warm, { once: true });

  function show(row) {
    if (!wide.matches || row === current) return;
    current = row;
    for (var i = 0; i < rows.length; i++) rows[i].classList.toggle('is-active', rows[i] === row);

    // image: fade the hidden layer in over the visible one
    var src = row.getAttribute('data-img') || 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
    var on = feat.querySelector('.pi-ins__img img.is-on');
    var off = imgs[0] === on ? imgs[1] : imgs[0];
    off.src = src;
    off.alt = row.getAttribute('data-t') || '';
    off.removeAttribute('aria-hidden');
    on.setAttribute('aria-hidden', 'true'); on.alt = '';
    off.classList.add('is-on');
    on.classList.remove('is-on');

    // text: dip, change, come back
    feat.classList.add('is-swap');
    clearTimeout(timer);
    timer = setTimeout(function () {
      link.setAttribute('href', row.getAttribute('href'));
      chip.textContent = row.getAttribute('data-n');
      date.textContent = row.getAttribute('data-date');
      title.textContent = row.getAttribute('data-t');
      ex.textContent = row.getAttribute('data-ex');
      feat.classList.remove('is-swap');
    }, 150);
  }

  rows.forEach(function (row) {
    row.addEventListener('mouseenter', function () { show(row); });
    row.addEventListener('focus', function () { show(row); });
  });
})();


// blog feature picture: the same picture, blurred, fills the frame behind the whole picture (nothing is cropped)
(function () {
  document.querySelectorAll('.pi-ins__img').forEach(function (box) {
    function sync() { var im = box.querySelector('img.is-on') || box.querySelector('img'); if (im && im.getAttribute('src')) box.style.setProperty('--pic', 'url("' + im.getAttribute('src') + '")'); }
    sync();
    if (window.MutationObserver) new MutationObserver(sync).observe(box, { subtree: true, attributes: true, attributeFilter: ['class', 'src'] });
  });
})();

// ---- closing band: a dashed arrow from the pointer to "Download catalogue", and a light that runs along the card's
// edge nearest the pointer (2026-10-16). The arrow follows the mouse; when the mouse rests its tail draws in to the
// head and it fades. Mouse only (no touch), and nothing at all with reduced motion.
(function () {
  var band = document.querySelector('.pi-close');
  var btn = band && band.querySelector('.pi-close__cta a, .pi-close a.pi-btn');
  if (!band || !btn || !window.matchMedia || !matchMedia('(hover: hover) and (pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var NS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'pi-close__arrow');
  svg.setAttribute('aria-hidden', 'true');
  var line = document.createElementNS(NS, 'path'), head = document.createElementNS(NS, 'path');
  line.setAttribute('class', 'pi-close__arrow-line');
  head.setAttribute('class', 'pi-close__arrow-head');
  svg.appendChild(line); svg.appendChild(head);
  var edge = document.createElement('span');
  edge.className = 'pi-close__edge';
  edge.setAttribute('aria-hidden', 'true');
  band.appendChild(edge); band.appendChild(svg);

  var GAP = 30, PAD = 12, MIN = 46;   // px: from the pointer to the tail, around the button, shortest arrow drawn
  var curve = null, t0 = 0, alpha = 0, idle = null, raf = 0, retract = null;
  function pt(a, b, t) { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }
  function draw() {
    raf = 0;
    if (!curve || alpha <= 0.01) { svg.style.opacity = '0'; return; }
    var p0 = curve[0], p1 = curve[1], p2 = curve[2];
    // the part of the curve from t0 to 1 (the tail shortens toward the head)
    var a = pt(pt(p0, p1, t0), pt(p1, p2, t0), t0), b = pt(p1, p2, t0);
    line.setAttribute('d', 'M' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + 'Q' + b.x.toFixed(1) + ' ' + b.y.toFixed(1) + ' ' + p2.x.toFixed(1) + ' ' + p2.y.toFixed(1));
    var dx = p2.x - p1.x, dy = p2.y - p1.y, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, L = 11, s = Math.sin(0.5), c = Math.cos(0.5);
    var w1 = { x: p2.x - L * (ux * c - uy * s), y: p2.y - L * (uy * c + ux * s) }, w2 = { x: p2.x - L * (ux * c + uy * s), y: p2.y - L * (uy * c - ux * s) };
    head.setAttribute('d', 'M' + w1.x.toFixed(1) + ' ' + w1.y.toFixed(1) + 'L' + p2.x.toFixed(1) + ' ' + p2.y.toFixed(1) + 'L' + w2.x.toFixed(1) + ' ' + w2.y.toFixed(1));
    svg.style.opacity = String(alpha);
  }
  function queue() { if (!raf) raf = requestAnimationFrame(draw); }
  function aim(e) {
    var r = band.getBoundingClientRect(), br = btn.getBoundingClientRect();
    var cx = e.clientX - r.left, cy = e.clientY - r.top;
    band.style.setProperty('--mx', cx + 'px'); band.style.setProperty('--my', cy + 'px');
    var minx = br.left - r.left - PAD, maxx = br.right - r.left + PAD, miny = br.top - r.top - PAD, maxy = br.bottom - r.top + PAD;
    var tx = (minx + maxx) / 2, ty = (miny + maxy) / 2, dx = tx - cx, dy = ty - cy, len = Math.hypot(dx, dy) || 1;
    var ux = dx / len, uy = dy / len;
    // where the line from the pointer to the button's centre meets the padded button box
    var ax = ux ? Math.min((minx - cx) / ux, (maxx - cx) / ux) : -Infinity, ay = uy ? Math.min((miny - cy) / uy, (maxy - cy) / uy) : -Infinity;
    var hit = Math.max(ax, ay);
    if (!(hit - GAP > MIN)) { curve = null; alpha = 0; queue(); return; }   // too close, or on the button
    var p0 = { x: cx + ux * GAP, y: cy + uy * GAP }, p2 = { x: cx + ux * hit, y: cy + uy * hit };
    // a hand-drawn arc: the bend sits toward the corner (button x, pointer y), so from above the arrow leaves sideways
    // and sweeps down into the button, from below it swings in and up, from the side it is nearly straight
    var mx = (p0.x + p2.x) / 2, my = (p0.y + p2.y) / 2, k = 0.62;
    var p1 = { x: mx + (p2.x - mx) * k, y: my + (p0.y - my) * k };
    curve = [p0, p1, p2];
    if (retract) { cancelAnimationFrame(retract); retract = null; }
    t0 = 0; alpha = 1; queue();
    clearTimeout(idle); idle = setTimeout(rest, 420);
  }
  // the pointer has stopped: the tail runs into the head, then the arrow fades
  function rest() {
    var start = performance.now(), D = 520;
    (function step(now) {
      var k = Math.min(1, (now - start) / D), e = k * k * (3 - 2 * k);
      t0 = e * 0.92; alpha = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4; queue();
      retract = k < 1 ? requestAnimationFrame(step) : null;
    })(start);
  }
  band.addEventListener('pointermove', aim, { passive: true });
  band.addEventListener('pointerenter', function () { band.classList.add('is-hot'); });
  band.addEventListener('pointerleave', function () { band.classList.remove('is-hot'); clearTimeout(idle); rest(); });
})();
