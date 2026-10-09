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
