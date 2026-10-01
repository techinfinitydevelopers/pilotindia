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

  /* "What sits behind the product": scroll-spy stack, one row awake at a time.
     A near-invisible trigger line sits at the vertical centre of the viewport
     (rootMargin collapses top and bottom by 50% each); whichever row's box
     crosses it becomes .is-active. Same IntersectionObserver approach as the
     reveal above, so still no per-frame scroll handler. */
  var caps = document.querySelectorAll('.pi-cap-sec .pi-cap');
  if (caps.length && !reduce && 'IntersectionObserver' in window) {
    var capIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        caps.forEach(function (c) { c.classList.remove('is-active'); });
        e.target.classList.add('is-active');
      });
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
    caps.forEach(function (c) { capIO.observe(c); });
  }
})();
