/* Warm the lazy images so scrolling never waits on them.
   Images below the fold are lazy-loaded, which keeps the first screen fast but means a large photo is fetched and
   decoded at the moment it scrolls into view, which shows as a stall. Once the page has loaded and the browser is
   idle, this walks the lazy images in page order, fetches each one and decodes it off the main thread, one at a time,
   so they are ready by the time they are reached. Skipped when the visitor has asked to save data. */
(function () {
  'use strict';
  var conn = navigator.connection;
  if (conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || ''))) return;

  function idle(fn) {
    if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout: 1500 });
    else setTimeout(fn, 250);
  }

  function warm() {
    var queue = Array.prototype.slice.call(document.querySelectorAll('img[loading="lazy"]'))
      .filter(function (img) { return img.getAttribute('src') && !/^data:/.test(img.getAttribute('src')); });
    function next() {
      var img = queue.shift();
      if (!img) return;
      // fetching an eager copy leaves the page's own element alone; the browser keeps the decoded bitmap in cache
      var copy = new Image();
      copy.decoding = 'async';
      copy.src = img.currentSrc || img.src;
      var done = function () { idle(next); };
      if (copy.decode) copy.decode().then(done, done); else { copy.onload = done; copy.onerror = done; }
    }
    idle(next);
  }

  if (document.readyState === 'complete') setTimeout(warm, 1200);
  else addEventListener('load', function () { setTimeout(warm, 1200); });
})();
