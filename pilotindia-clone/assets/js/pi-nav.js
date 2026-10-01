/* Pilot India nav: mobile drawer, submenu disclosure, scrolled state.
   No scroll listener - the stuck state comes from an IntersectionObserver on a
   sentinel, per the perf rule against per-frame scroll handlers. */
(function () {
  var nav = document.querySelector('.pi-nav');
  if (!nav) return;

  var burger = nav.querySelector('.pi-nav__burger');
  var drawer = nav.querySelector('.pi-nav__drawer');
  var submenuBtn = nav.querySelector('.pi-nav__link[aria-haspopup="true"]');
  var submenu = submenuBtn && document.getElementById(submenuBtn.getAttribute('aria-controls'));
  var isMobile = function () { return window.matchMedia('(max-width: 900px)').matches; };

  function closeDrawer() {
    if (!burger || !drawer) return;
    burger.setAttribute('aria-expanded', 'false');
    drawer.classList.remove('is-open');
  }

  function closeSubmenu() {
    if (!submenuBtn || !submenu) return;
    submenuBtn.setAttribute('aria-expanded', 'false');
    submenu.classList.remove('is-open');
  }

  if (burger && drawer) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      drawer.classList.toggle('is-open', !open);
      if (open) closeSubmenu();
    });
  }

  if (submenuBtn && submenu) {
    submenuBtn.addEventListener('click', function (e) {
      // desktop opens the panel on hover/focus; the tap toggle is for touch
      if (!isMobile()) return;
      e.preventDefault();
      var open = submenuBtn.getAttribute('aria-expanded') === 'true';
      submenuBtn.setAttribute('aria-expanded', String(!open));
      submenu.classList.toggle('is-open', !open);
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    closeSubmenu();
    closeDrawer();
  });

  document.addEventListener('click', function (e) {
    if (!nav.contains(e.target)) { closeSubmenu(); closeDrawer(); }
  });

  window.addEventListener('resize', function () {
    if (!isMobile()) { closeSubmenu(); closeDrawer(); }
  });

  // sentinel sits directly above the nav; once it leaves the viewport the bar is stuck
  var sentinel = document.createElement('div');
  sentinel.setAttribute('aria-hidden', 'true');
  sentinel.style.cssText = 'position:absolute;top:0;left:0;height:1px;width:1px;pointer-events:none';
  if (nav.parentNode) nav.parentNode.insertBefore(sentinel, nav);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      nav.classList.toggle('is-stuck', !entries[0].isIntersecting);
    }, { threshold: 0 }).observe(sentinel);
  }
})();
