/* "Built With Trust" bento: cards rise in one after another when the section scrolls into view.
   The section is only hidden (.is-armed) once this script runs and IntersectionObserver exists,
   so with scripting off, or in an old browser, every card is just visible. */
(function () {
  var sec = document.querySelector('section.bento');
  if (!sec || !('IntersectionObserver' in window)) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var cards = sec.querySelectorAll('.bento__card');
  for (var i = 0; i < cards.length; i++) cards[i].style.setProperty('--i', i);

  // already on screen at load (short pages): don't hide what the visitor can see right now
  var r = sec.getBoundingClientRect();
  var inView = r.top < window.innerHeight * 0.8 && r.bottom > 0;
  sec.classList.add('is-armed');
  if (inView) { requestAnimationFrame(function () { sec.classList.add('is-in'); }); return; }

  var io = new IntersectionObserver(function (entries) {
    if (entries[0].isIntersecting) { sec.classList.add('is-in'); io.disconnect(); }
  }, { threshold: 0.12 });
  io.observe(sec);
})();
