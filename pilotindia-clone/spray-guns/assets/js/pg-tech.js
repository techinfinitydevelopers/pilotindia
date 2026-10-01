/* "Technical Excellence" cards: reveal on scroll.
   Same pattern as pg-features.js: IntersectionObserver rather than a scroll
   handler, everything shown at once under reduced motion or with no observer. */
(function () {
  var items = document.querySelectorAll('.pg-tech__card, .pg-tech__visual');
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
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });

  items.forEach(function (el) { io.observe(el); });
})();
