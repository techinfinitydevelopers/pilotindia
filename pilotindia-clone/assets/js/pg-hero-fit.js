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

    placeholder();
  }

  /* Hero photo placeholder (data-hero-ph on the hero): fills only the part of the hero that is
     really visible - from its top edge down to the collection tray - and prints that size, so a
     replacement photo can be made to fit without the tray covering it. */
  var ph = null;
  function placeholder() {
    if (!hero.hasAttribute('data-hero-ph')) return;
    if (!ph) {
      ph = document.createElement('div');
      ph.className = 'pg-hero-ph';
      ph.setAttribute('aria-hidden', 'true');
      ph.innerHTML = '<div class="pg-hero-ph__label"><svg viewBox="0 0 24 24"><path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm1 2v8.6l4.3-4.3 3 3 2.2-2.2L19 16.6V7H5zm11 3.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/></svg>' +
        '<strong>Hero image</strong><span class="pg-hero-ph__size"></span><span class="pg-hero-ph__hint">Use a 2560 &times; 1080 px photo (about 2.4 : 1), subject on the right half</span></div>';
      hero.insertBefore(ph, hero.firstChild);
    }
    var tray = hero.querySelector('.pi-coll');
    var hr = hero.getBoundingClientRect();
    var h = tray ? Math.round(tray.getBoundingClientRect().top - hr.top) : Math.round(hr.height);
    hero.style.setProperty('--pg-hero-vis-h', Math.max(0, h) + 'px');
    ph.querySelector('.pg-hero-ph__size').textContent = Math.round(hr.width) + ' × ' + h + ' px visible on this screen';
  }

  function schedule() { if (!raf) raf = requestAnimationFrame(measure); }

  measure();
  window.addEventListener('load', schedule);
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('orientationchange', schedule);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
})();
