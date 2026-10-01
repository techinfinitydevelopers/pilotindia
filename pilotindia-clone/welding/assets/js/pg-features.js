/* "Enhance Your Craft" feature columns: reveal on scroll.
   IntersectionObserver rather than a scroll handler, so nothing runs per frame.
   Under reduced motion, or with no observer available, everything is shown at once. */
(function () {
  var items = document.querySelectorAll('.pg-feat__item, .pg-feat__title');
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
