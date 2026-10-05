/* Product landing hero: measure what sits above it (and the strip below it, when the
   strip is outside the hero) so CSS can size the hero to exactly one screen.

   Only two numbers are needed and neither changes while scrolling, so this runs on
   load, once fonts settle, and on resize - there is no scroll handler. The values go
   out as custom properties (--pg-top, --pg-mq) and the maths stays in the stylesheet,
   where 100svh keeps it stable as a mobile address bar comes and goes. */
(function () {
  var hero = document.getElementById('select-series-re');
  if (!hero) return;

  var root = document.documentElement;
  var raf = 0;

  function measure() {
    raf = 0;
    /* distance from the top of the document to the hero: the header, whatever its
       height is at this width. getBoundingClientRect is viewport-relative, so add the
       scroll offset back to get a document position. */
    var top = hero.getBoundingClientRect().top + (window.pageYOffset || 0);
    root.style.setProperty('--pg-top', Math.max(0, Math.round(top)) + 'px');

    /* spray-guns keeps its strip as a sibling after the hero; welding, office and
       airless keep it inside, where the hero's own height already covers it. */
    var mq = document.querySelector('.pilot-marquee-section');
    var outside = mq && !hero.contains(mq) ? mq.offsetHeight : 0;
    root.style.setProperty('--pg-mq', outside + 'px');
  }

  function schedule() { if (!raf) raf = requestAnimationFrame(measure); }

  measure();
  window.addEventListener('load', schedule);
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('orientationchange', schedule);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
})();
