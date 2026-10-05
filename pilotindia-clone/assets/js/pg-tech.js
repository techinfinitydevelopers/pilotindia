/* ==========================================================================
   Pilot Spray Guns — "Technical Excellence" (pg-tech)
   Scroll reveal + Infinite Auto-Sliding Focus Carousel
   ========================================================================== */

(function () {
  'use strict';

  // 1. Scroll reveal for cards & visual container
  var revealItems = document.querySelectorAll('.pg-tech__card, .pg-tech__visual');
  if (revealItems.length) {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) {
      for (var i = 0; i < revealItems.length; i++) revealItems[i].classList.add('is-in');
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        });
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
      revealItems.forEach(function (el) { io.observe(el); });
    }
  }

  // 2. Focus Carousel Controller (Infinite Auto-Slide)
  var carousel = document.getElementById('pg-focus-carousel');
  if (!carousel) return;

  var track = document.getElementById('pg-focus-track');
  if (!track) return;

  var originalSlides = Array.prototype.slice.call(track.querySelectorAll('.focus-carousel__slide'));
  var dots = Array.prototype.slice.call(carousel.querySelectorAll('.focus-carousel__dot'));
  var numOriginals = originalSlides.length;
  if (!numOriginals) return;

  // Build infinite loop track by cloning original slides:
  // [Prepend 6 clones] + [6 Original Slides] + [Append 6 clones]
  // Real index 0 starts at track child index = numOriginals (6)
  var CLONE_COUNT = numOriginals;

  // Append clones
  for (var a = 0; a < CLONE_COUNT; a++) {
    var cloneAfter = originalSlides[a].cloneNode(true);
    cloneAfter.classList.remove('is-active', 'is-prev', 'is-next');
    cloneAfter.setAttribute('aria-hidden', 'true');
    track.appendChild(cloneAfter);
  }

  // Prepend clones in correct order
  for (var b = CLONE_COUNT - 1; b >= 0; b--) {
    var cloneBefore = originalSlides[b].cloneNode(true);
    cloneBefore.classList.remove('is-active', 'is-prev', 'is-next');
    cloneBefore.setAttribute('aria-hidden', 'true');
    track.insertBefore(cloneBefore, track.firstChild);
  }

  var allSlides = Array.prototype.slice.call(track.querySelectorAll('.focus-carousel__slide'));
  var totalSlides = allSlides.length;

  var currentTrackIndex = CLONE_COUNT; // starts at slide 0
  var isAnimating = false;
  var isDragging = false;
  var hasDragged = false;
  var startX = 0;
  var startTranslate = 0;
  var currentTranslate = 0;
  var autoplayTimer = null;
  var AUTOPLAY_INTERVAL = 1600; // fast auto-slide every 1.6s

  function getRealIndex(trackIdx) {
    return ((trackIdx - CLONE_COUNT) % numOriginals + numOriginals) % numOriginals;
  }

  function applySlideClasses() {
    for (var i = 0; i < totalSlides; i++) {
      allSlides[i].classList.remove('is-active', 'is-prev', 'is-next');
      if (i === currentTrackIndex) {
        allSlides[i].classList.add('is-active');
      } else if (i === currentTrackIndex - 1) {
        allSlides[i].classList.add('is-prev');
      } else if (i === currentTrackIndex + 1) {
        allSlides[i].classList.add('is-next');
      }
    }

    var realIdx = getRealIndex(currentTrackIndex);
    for (var d = 0; d < dots.length; d++) {
      if (d === realIdx) {
        dots[d].classList.add('is-active');
        dots[d].setAttribute('aria-selected', 'true');
      } else {
        dots[d].classList.remove('is-active');
        dots[d].setAttribute('aria-selected', 'false');
      }
    }
  }

  function getTranslateForIndex(idx) {
    var containerWidth = carousel.clientWidth;
    var targetSlide = allSlides[idx];
    if (!targetSlide) return 0;
    var slideLeft = targetSlide.offsetLeft;
    var slideWidth = targetSlide.offsetWidth;
    return (containerWidth / 2) - (slideLeft + slideWidth / 2);
  }

  function updatePosition(smooth) {
    if (smooth === false) {
      track.style.transition = 'none';
    } else {
      track.style.transition = '';
    }

    currentTranslate = getTranslateForIndex(currentTrackIndex);
    track.style.transform = 'translate3d(' + Math.round(currentTranslate) + 'px, 0, 0)';

    if (smooth === false) {
      track.offsetHeight; // force reflow
      track.style.transition = '';
    }

    applySlideClasses();
  }

  function goToTrackIndex(idx, smooth) {
    currentTrackIndex = idx;
    isAnimating = smooth !== false;
    updatePosition(smooth);
  }

  function advance(step) {
    if (isDragging) return;
    goToTrackIndex(currentTrackIndex + step, true);
  }

  // Handle seamless infinite loop jump when reaching clones
  track.addEventListener('transitionend', function (e) {
    if (e.target !== track) return;
    isAnimating = false;

    if (currentTrackIndex >= CLONE_COUNT + numOriginals) {
      // Reached the clones at the end — jump to equivalent original slide seamlessly
      currentTrackIndex = currentTrackIndex - numOriginals;
      goToTrackIndex(currentTrackIndex, false);
    } else if (currentTrackIndex < CLONE_COUNT) {
      // Reached the clones at the start — jump to equivalent original slide seamlessly
      currentTrackIndex = currentTrackIndex + numOriginals;
      goToTrackIndex(currentTrackIndex, false);
    }
  });

  // Autoplay management
  function startAutoplay() {
    stopAutoplay();
    autoplayTimer = setInterval(function () {
      advance(1);
    }, AUTOPLAY_INTERVAL);
  }

  function stopAutoplay() {
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  }

  // Dots click navigation
  dots.forEach(function (dot, idx) {
    dot.addEventListener('click', function (e) {
      e.preventDefault();
      var currentReal = getRealIndex(currentTrackIndex);
      var diff = idx - currentReal;
      goToTrackIndex(currentTrackIndex + diff, true);
      startAutoplay();
    });
  });

  // Click on any flanking slide to focus it
  allSlides.forEach(function (slide, idx) {
    slide.addEventListener('click', function (e) {
      if (hasDragged) return;
      if (idx !== currentTrackIndex) {
        e.preventDefault();
        goToTrackIndex(idx, true);
        startAutoplay();
      }
    });
  });

  // Drag & Swipe handling
  function onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    isDragging = true;
    hasDragged = false;
    startX = e.clientX;
    startTranslate = currentTranslate;
    track.classList.add('is-dragging');
    stopAutoplay();

    if (track.setPointerCapture) {
      try { track.setPointerCapture(e.pointerId); } catch (_) {}
    }
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    var diff = e.clientX - startX;
    if (Math.abs(diff) > 6) hasDragged = true;
    var tempTranslate = startTranslate + diff;
    track.style.transform = 'translate3d(' + Math.round(tempTranslate) + 'px, 0, 0)';
  }

  function onPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;
    track.classList.remove('is-dragging');

    if (track.releasePointerCapture) {
      try { track.releasePointerCapture(e.pointerId); } catch (_) {}
    }

    var diff = e.clientX - startX;
    if (diff < -45) {
      advance(1);
    } else if (diff > 45) {
      advance(-1);
    } else {
      goToTrackIndex(currentTrackIndex, true);
    }
    startAutoplay();
  }

  function onPointerCancel(e) {
    if (!isDragging) return;
    isDragging = false;
    track.classList.remove('is-dragging');
    goToTrackIndex(currentTrackIndex, true);
    startAutoplay();
  }

  track.addEventListener('pointerdown', onPointerDown);
  track.addEventListener('pointermove', onPointerMove);
  track.addEventListener('pointerup', onPointerUp);
  track.addEventListener('pointercancel', onPointerCancel);

  // Pause on hover, resume on mouse leave
  var hoverResumeTimer = null;
  carousel.addEventListener('mouseenter', function () {
    stopAutoplay();
    clearTimeout(hoverResumeTimer);
    hoverResumeTimer = setTimeout(function () {
      if (!isDragging) startAutoplay();
    }, 2000);
  });
  carousel.addEventListener('mouseleave', function () {
    clearTimeout(hoverResumeTimer);
    if (!isDragging) startAutoplay();
  });

  // Window resize debounced recenter
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      updatePosition(false);
    }, 60);
  });

  // Initialization
  function init() {
    updatePosition(false);
    startAutoplay();
    setTimeout(function () { updatePosition(false); }, 80);
    setTimeout(function () { updatePosition(false); }, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('load', function () {
    updatePosition(false);
  });
})();
