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

  // 3. Reel Carousel Controller (Framer-Style ReelCarousel with Progress Indicators)
  (function initReelCarousel() {
    var reel = document.getElementById('pg-reel');
    if (!reel) return;

    var slides = Array.prototype.slice.call(reel.querySelectorAll('.pg-reel__slide'));
    var bars = Array.prototype.slice.call(reel.querySelectorAll('.pg-reel__bar-item'));
    var playBtn = document.getElementById('pg-reel-play-btn');
    var prevBtn = document.getElementById('pg-reel-prev');
    var nextBtn = document.getElementById('pg-reel-next');
    var counterEl = document.getElementById('pg-reel-num');
    var captionEl = document.getElementById('pg-reel-caption-text');

    var total = slides.length;
    if (!total) return;

    var current = 0;
    var progress = 0; // 0 to 100
    var isPlaying = true;
    var isHovered = false;
    var lastTime = performance.now();
    var SPEED = 3600; // 3.6s per reel slide

    function updateBars() {
      for (var i = 0; i < bars.length; i++) {
        var fill = bars[i].querySelector('.pg-reel__bar-fill');
        if (i === current) {
          bars[i].classList.add('is-active');
          bars[i].setAttribute('aria-selected', 'true');
          if (fill) fill.style.width = progress + '%';
        } else if (i < current) {
          bars[i].classList.remove('is-active');
          bars[i].setAttribute('aria-selected', 'false');
          if (fill) fill.style.width = '100%';
        } else {
          bars[i].classList.remove('is-active');
          bars[i].setAttribute('aria-selected', 'false');
          if (fill) fill.style.width = '0%';
        }
      }
    }

    function goToSlide(index) {
      if (index === current && slides[current].classList.contains('is-active')) return;
      slides[current].classList.remove('is-active');

      current = ((index % total) + total) % total;
      progress = 0;

      slides[current].classList.add('is-active');

      if (counterEl) {
        counterEl.textContent = String(current + 1).padStart(2, '0');
      }

      var titleAttr = slides[current].getAttribute('data-title');
      if (captionEl && titleAttr) {
        captionEl.textContent = titleAttr;
      }

      updateBars();
    }

    function nextSlide() {
      goToSlide(current + 1);
    }

    function prevSlide() {
      goToSlide(current - 1);
    }

    function loop(time) {
      var delta = time - lastTime;
      lastTime = time;

      if (isPlaying && !isHovered) {
        progress += (delta / SPEED) * 100;
        if (progress >= 100) {
          nextSlide();
        } else {
          var activeBar = bars[current];
          if (activeBar) {
            var fill = activeBar.querySelector('.pg-reel__bar-fill');
            if (fill) fill.style.width = progress + '%';
          }
        }
      }

      requestAnimationFrame(loop);
    }

    // Hover pause & resume
    reel.addEventListener('mouseenter', function () {
      isHovered = true;
    });
    reel.addEventListener('mouseleave', function () {
      isHovered = false;
      lastTime = performance.now();
    });

    // Play/Pause button
    if (playBtn) {
      playBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        isPlaying = !isPlaying;
        playBtn.classList.toggle('is-paused', !isPlaying);
        playBtn.setAttribute('aria-label', isPlaying ? 'Pause slideshow' : 'Play slideshow');
        lastTime = performance.now();
      });
    }

    // Progress bar segment click
    bars.forEach(function (bar, idx) {
      bar.addEventListener('click', function (e) {
        e.preventDefault();
        goToSlide(idx);
      });
    });

    // Arrow navigation
    if (nextBtn) {
      nextBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        nextSlide();
      });
    }
    if (prevBtn) {
      prevBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        prevSlide();
      });
    }

    // Touch & Pointer drag swipe
    var startX = 0;
    var isPointerActive = false;
    reel.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button')) return;
      startX = e.clientX;
      isPointerActive = true;
    });
    reel.addEventListener('pointerup', function (e) {
      if (!isPointerActive) return;
      isPointerActive = false;
      var diff = e.clientX - startX;
      if (diff < -45) nextSlide();
      else if (diff > 45) prevSlide();
    });
    reel.addEventListener('pointercancel', function () {
      isPointerActive = false;
    });

    // Keyboard navigation
    reel.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === ' ') {
        e.preventDefault();
        if (playBtn) playBtn.click();
      }
    });

    // Start carousel
    goToSlide(0);
    lastTime = performance.now();
    requestAnimationFrame(loop);
  })();


  // 4. 3D Scale Carousel Controller (Infinite Snap, Depth Falloff, Drag & Auto-Play)
  (function init3DScaleCarousel() {
    var root = document.getElementById('pg-3d');
    if (!root) return;

    var stage = document.getElementById('pg-3d-stage');
    var track = document.getElementById('pg-3d-track');
    var playBtn = document.getElementById('pg-3d-play-btn');
    var prevBtn = document.getElementById('pg-3d-prev');
    var nextBtn = document.getElementById('pg-3d-next');
    var counterEl = document.getElementById('pg-3d-cur');
    var titleEl = document.getElementById('pg-3d-title');

    var originalSlides = Array.prototype.slice.call(track.querySelectorAll('.pg-3d__slide'));
    var bars = Array.prototype.slice.call(root.querySelectorAll('.pg-3d__bar'));
    var numOriginals = originalSlides.length;
    if (!numOriginals) return;

    // Build infinite 3-fold track: [Clones Before] + [Originals] + [Clones After]
    var CLONE_COUNT = numOriginals;

    for (var a = 0; a < CLONE_COUNT; a++) {
      var cloneAfter = originalSlides[a].cloneNode(true);
      cloneAfter.classList.remove('is-active', 'is-prev', 'is-next', 'is-far-prev', 'is-far-next');
      cloneAfter.setAttribute('aria-hidden', 'true');
      track.appendChild(cloneAfter);
    }

    for (var b = CLONE_COUNT - 1; b >= 0; b--) {
      var cloneBefore = originalSlides[b].cloneNode(true);
      cloneBefore.classList.remove('is-active', 'is-prev', 'is-next', 'is-far-prev', 'is-far-next');
      cloneBefore.setAttribute('aria-hidden', 'true');
      track.insertBefore(cloneBefore, track.firstChild);
    }

    var allSlides = Array.prototype.slice.call(track.querySelectorAll('.pg-3d__slide'));
    var totalSlides = allSlides.length;

    var currentTrackIndex = CLONE_COUNT; // Starts at slide 0
    var isPlaying = true;
    var isHovered = false;
    var isDragging = false;
    var hasDragged = false;
    var startX = 0;
    var startTranslate = 0;
    var currentTranslate = 0;
    var progress = 0;
    var lastTime = performance.now();
    var SPEED = 3800; // 3.8s per slide

    function getRealIndex(trackIdx) {
      return ((trackIdx - CLONE_COUNT) % numOriginals + numOriginals) % numOriginals;
    }

    function apply3DClasses() {
      for (var i = 0; i < totalSlides; i++) {
        var diff = i - currentTrackIndex;
        var slide = allSlides[i];
        slide.classList.remove('is-active', 'is-prev', 'is-next', 'is-far-prev', 'is-far-next', 'is-hidden');

        if (diff === 0) {
          slide.classList.add('is-active');
        } else if (diff === -1) {
          slide.classList.add('is-prev');
        } else if (diff === 1) {
          slide.classList.add('is-next');
        } else if (diff === -2) {
          slide.classList.add('is-far-prev');
        } else if (diff === 2) {
          slide.classList.add('is-far-next');
        } else {
          slide.classList.add('is-hidden');
        }
      }

      var realIdx = getRealIndex(currentTrackIndex);
      for (var d = 0; d < bars.length; d++) {
        var fill = bars[d].querySelector('.pg-3d__bar-fill');
        if (d === realIdx) {
          bars[d].classList.add('is-active');
          bars[d].setAttribute('aria-selected', 'true');
          if (fill) fill.style.width = progress + '%';
        } else if (d < realIdx) {
          bars[d].classList.remove('is-active');
          bars[d].setAttribute('aria-selected', 'false');
          if (fill) fill.style.width = '100%';
        } else {
          bars[d].classList.remove('is-active');
          bars[d].setAttribute('aria-selected', 'false');
          if (fill) fill.style.width = '0%';
        }
      }

      if (counterEl) {
        counterEl.textContent = String(realIdx + 1).padStart(2, '0');
      }
      var targetSlide = allSlides[currentTrackIndex];
      if (titleEl && targetSlide) {
        var t = targetSlide.getAttribute('data-title');
        if (t) titleEl.textContent = t;
      }
    }

    function getTranslateForIndex(idx) {
      var stageWidth = stage.clientWidth;
      var targetSlide = allSlides[idx];
      if (!targetSlide) return 0;
      var slideLeft = targetSlide.offsetLeft;
      var slideWidth = targetSlide.offsetWidth;
      return (stageWidth / 2) - (slideLeft + slideWidth / 2);
    }

    function updatePosition(smooth) {
      if (smooth === false) {
        track.style.transition = 'none';
      } else {
        track.style.transition = 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)';
      }

      currentTranslate = getTranslateForIndex(currentTrackIndex);
      track.style.transform = 'translate3d(' + Math.round(currentTranslate) + 'px, 0, 0)';

      if (smooth === false) {
        track.offsetHeight; // force reflow
        track.style.transition = 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)';
      }

      apply3DClasses();
    }

    function goToTrackIndex(idx, smooth) {
      currentTrackIndex = idx;
      progress = 0;
      updatePosition(smooth);
    }

    function advance(step) {
      if (isDragging) return;
      goToTrackIndex(currentTrackIndex + step, true);
    }

    // Seamless loop wrap on clone boundary
    track.addEventListener('transitionend', function (e) {
      if (e.target !== track) return;

      if (currentTrackIndex >= CLONE_COUNT + numOriginals) {
        currentTrackIndex = currentTrackIndex - numOriginals;
        goToTrackIndex(currentTrackIndex, false);
      } else if (currentTrackIndex < CLONE_COUNT) {
        currentTrackIndex = currentTrackIndex + numOriginals;
        goToTrackIndex(currentTrackIndex, false);
      }
    });

    // Animation Loop for Auto-Play Progress
    function loop(time) {
      var delta = time - lastTime;
      lastTime = time;

      if (isPlaying && !isHovered && !isDragging) {
        progress += (delta / SPEED) * 100;
        if (progress >= 100) {
          advance(1);
        } else {
          var realIdx = getRealIndex(currentTrackIndex);
          var activeBar = bars[realIdx];
          if (activeBar) {
            var fill = activeBar.querySelector('.pg-3d__bar-fill');
            if (fill) fill.style.width = progress + '%';
          }
        }
      }

      requestAnimationFrame(loop);
    }

    // Hover pause
    root.addEventListener('mouseenter', function () { isHovered = true; });
    root.addEventListener('mouseleave', function () { isHovered = false; lastTime = performance.now(); });

    // Play/Pause button
    if (playBtn) {
      playBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        isPlaying = !isPlaying;
        playBtn.classList.toggle('is-paused', !isPlaying);
        playBtn.setAttribute('aria-label', isPlaying ? 'Pause slideshow' : 'Play slideshow');
        lastTime = performance.now();
      });
    }

    // Bar jump
    bars.forEach(function (bar, idx) {
      bar.addEventListener('click', function (e) {
        e.preventDefault();
        var currentReal = getRealIndex(currentTrackIndex);
        var diff = idx - currentReal;
        goToTrackIndex(currentTrackIndex + diff, true);
      });
    });

    // Arrow navigation
    if (nextBtn) nextBtn.addEventListener('click', function (e) { e.stopPropagation(); advance(1); });
    if (prevBtn) prevBtn.addEventListener('click', function (e) { e.stopPropagation(); advance(-1); });

    // Click on flanking slide to center it!
    allSlides.forEach(function (slide, idx) {
      slide.addEventListener('click', function (e) {
        if (hasDragged) return;
        if (idx !== currentTrackIndex) {
          e.preventDefault();
          goToTrackIndex(idx, true);
        }
      });
    });

    // Drag / Touch Swipe Handling
    function onPointerDown(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.target.closest('button')) return;
      isDragging = true;
      hasDragged = false;
      startX = e.clientX;
      startTranslate = currentTranslate;
      track.classList.add('is-dragging');

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
      lastTime = performance.now();
    }

    track.addEventListener('pointerdown', onPointerDown);
    track.addEventListener('pointermove', onPointerMove);
    track.addEventListener('pointerup', onPointerUp);
    track.addEventListener('pointercancel', onPointerUp);

    // Keyboard navigation
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') advance(1);
      if (e.key === 'ArrowLeft') advance(-1);
      if (e.key === ' ' && playBtn) {
        e.preventDefault();
        playBtn.click();
      }
    });

    // Window resize
    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        updatePosition(false);
      }, 60);
    });

    // Init
    updatePosition(false);
    setTimeout(function () { updatePosition(false); }, 60);
    setTimeout(function () { updatePosition(false); }, 250);
    lastTime = performance.now();
    requestAnimationFrame(loop);
  })();

})();


/* ==========================================================================
   AUTOMATIC MOVING GALLERY CAROUSEL CONTROLLER (.pg-gallery)
   Silky 60fps infinite marquee gliding, edge-wrapping, drag & scrub,
   pause-on-hover & toggle button, zero stutter.
   ========================================================================== */

(function () {
  'use strict';

  function initGalleryCarousel() {
    var gallery = document.getElementById('pg-gallery');
    if (!gallery) return;

    var stage = document.getElementById('pg-gallery-stage');
    var track = document.getElementById('pg-gallery-track');
    var toggleBtn = document.getElementById('pg-gallery-toggle');
    var btnLabel = document.getElementById('pg-gallery-btn-label');
    var prevBtn = document.getElementById('pg-gallery-prev');
    var nextBtn = document.getElementById('pg-gallery-next');
    if (!stage || !track) return;

    var originalItems = Array.prototype.slice.call(track.querySelectorAll('.pg-gallery__item'));
    var count = originalItems.length;
    if (!count) return;

    // Clone items twice to create seamless continuous infinite wrap
    // [Originals] + [Clones 1] + [Clones 2]
    for (var c = 0; c < 2; c++) {
      for (var i = 0; i < count; i++) {
        var clone = originalItems[i].cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        track.appendChild(clone);
      }
    }

    var allItems = Array.prototype.slice.call(track.querySelectorAll('.pg-gallery__item'));

    // Motion state
    var currentX = 0;
    var baseSpeed = 0.85; // pixels per frame (~50px/sec at 60fps)
    var currentSpeed = baseSpeed;
    var targetSpeed = baseSpeed;
    var isPaused = false;
    var isHovered = false;
    var isDragging = false;
    var startX = 0;
    var dragStartX = 0;
    var velocity = 0;
    var lastDragX = 0;
    var lastDragTime = 0;
    var singleSetWidth = 0;

    function measure() {
      // Calculate total width of one complete set of original items including gaps
      var firstItem = allItems[0];
      var nextSetFirstItem = allItems[count];
      if (firstItem && nextSetFirstItem) {
        singleSetWidth = nextSetFirstItem.offsetLeft - firstItem.offsetLeft;
      }
      if (!singleSetWidth || singleSetWidth < 100) {
        // Fallback calculation: item width + gap
        var itemWidth = firstItem ? firstItem.offsetWidth : 320;
        var gap = 28;
        singleSetWidth = count * (itemWidth + gap);
      }
    }

    measure();
    window.addEventListener('resize', function () {
      measure();
    });

    // Main animation loop (runs every frame)
    var lastTimestamp = null;
    function tick(timestamp) {
      if (!lastTimestamp) lastTimestamp = timestamp;
      var delta = Math.min((timestamp - lastTimestamp) / 16.67, 2.5); // normalized to 60fps
      lastTimestamp = timestamp;

      if (!isDragging) {
        if (Math.abs(velocity) > 0.05) {
          // Inertia damping after drag release
          currentX += velocity * delta;
          velocity *= 0.94;
        } else {
          velocity = 0;
          // Smooth speed easing
          if (isPaused || isHovered) {
            targetSpeed = 0;
          } else {
            targetSpeed = baseSpeed;
          }
          currentSpeed += (targetSpeed - currentSpeed) * 0.1;
          currentX -= currentSpeed * delta;
        }

        // Seamless wrap: wrap around singleSetWidth
        if (singleSetWidth > 0) {
          while (currentX <= -singleSetWidth) {
            currentX += singleSetWidth;
          }
          while (currentX > 0) {
            currentX -= singleSetWidth;
          }
        }

        track.style.transform = 'translate3d(' + currentX.toFixed(2) + 'px, 0, 0)';
      }

      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);

    // Hover to slow / pause
    stage.addEventListener('mouseenter', function () {
      isHovered = true;
    });
    stage.addEventListener('mouseleave', function () {
      isHovered = false;
    });

    // Toggle button (Pause / Play)
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function () {
        isPaused = !isPaused;
        if (isPaused) {
          gallery.classList.add('is-paused');
          if (btnLabel) btnLabel.textContent = 'Play';
          toggleBtn.setAttribute('aria-label', 'Resume gallery reel');
        } else {
          gallery.classList.remove('is-paused');
          if (btnLabel) btnLabel.textContent = 'Pause';
          toggleBtn.setAttribute('aria-label', 'Pause gallery reel');
        }
      });
    }

    // Nudge buttons (prev/next)
    if (prevBtn) {
      prevBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        velocity = 14; // smooth nudge backward
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        velocity = -14; // smooth nudge forward
      });
    }

    // Pointer Drag / Swipe
    function onPointerDown(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.target.closest('button')) return;
      isDragging = true;
      startX = e.clientX;
      dragStartX = currentX;
      lastDragX = e.clientX;
      lastDragTime = performance.now();
      velocity = 0;
      stage.classList.add('is-dragging');

      if (stage.setPointerCapture) {
        try { stage.setPointerCapture(e.pointerId); } catch (_) {}
      }
    }

    function onPointerMove(e) {
      if (!isDragging) return;
      var now = performance.now();
      var diffX = e.clientX - startX;
      currentX = dragStartX + diffX;

      // Calculate instantaneous release velocity
      var dt = now - lastDragTime;
      if (dt > 10) {
        velocity = (e.clientX - lastDragX) / dt * 14;
        lastDragX = e.clientX;
        lastDragTime = now;
      }

      if (singleSetWidth > 0) {
        while (currentX <= -singleSetWidth) {
          currentX += singleSetWidth;
          dragStartX += singleSetWidth;
        }
        while (currentX > 0) {
          currentX -= singleSetWidth;
          dragStartX -= singleSetWidth;
        }
      }

      track.style.transform = 'translate3d(' + currentX.toFixed(2) + 'px, 0, 0)';
    }

    function onPointerUp(e) {
      if (!isDragging) return;
      isDragging = false;
      stage.classList.remove('is-dragging');

      if (stage.releasePointerCapture) {
        try { stage.releasePointerCapture(e.pointerId); } catch (_) {}
      }

      // Clamp max velocity
      if (velocity > 28) velocity = 28;
      if (velocity < -28) velocity = -28;
    }

    stage.addEventListener('pointerdown', onPointerDown);
    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('pointerup', onPointerUp);
    stage.addEventListener('pointercancel', onPointerUp);

    // Initial check after images load
    window.addEventListener('load', measure);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGalleryCarousel);
  } else {
    initGalleryCarousel();
  }
})();

/* ============================================================
   3-D SCALE CAROUSEL  (.sc3d)
   centre → pos=0, flanks at ±1 ±2 ±3, infinite wrap, drag,
   auto-advance with segmented progress bar, play/pause.
   ============================================================ */
(function () {
  'use strict';

  var root = document.getElementById('sc3d');
  if (!root) return;

  var stage   = document.getElementById('sc3d-stage');
  var track   = document.getElementById('sc3d-track');
  var playBtn = document.getElementById('sc3d-play');
  var prevBtn = document.getElementById('sc3d-prev');
  var nextBtn = document.getElementById('sc3d-next');
  var barsEl  = document.getElementById('sc3d-bars');
  var dotsEl  = document.getElementById('sc3d-dots');
  if (!stage || !track) return;

  var slides = Array.prototype.slice.call(track.querySelectorAll('.sc3d__slide'));
  var bars   = barsEl  ? Array.prototype.slice.call(barsEl.querySelectorAll('.sc3d__bar'))  : [];
  var dots   = dotsEl  ? Array.prototype.slice.call(dotsEl.querySelectorAll('.sc3d__dot'))  : [];
  var N = slides.length;
  if (!N) return;

  // ── State ──────────────────────────────────────────────────
  var current  = 0;
  var isPaused = false;
  var isAnim   = false;

  // Drag
  var isDragging    = false;
  var hasDragged    = false;
  var dragStartX    = 0;

  // Auto-advance
  var DURATION     = 4000;   // ms per slide
  var elapsed      = 0;
  var lastTS       = null;

  // ── Helpers ────────────────────────────────────────────────
  function mod(n, m) { return ((n % m) + m) % m; }

  function applyPositions() {
    for (var i = 0; i < N; i++) {
      var diff = i - current;
      // shortest path on circular ring
      if (diff > N / 2)  diff -= N;
      if (diff < -N / 2) diff += N;
      var pos = Math.max(-3, Math.min(3, diff));
      slides[i].setAttribute('data-pos', String(pos));
    }
  }

  function updateDots() {
    dots.forEach(function (d, i) {
      d.classList.toggle('is-active', i === current);
    });
  }

  function resetBar() {
    bars.forEach(function (b, i) {
      b.classList.remove('is-active', 'is-done');
      var fill = b.querySelector('.sc3d__bar-fill');
      if (fill) fill.style.width = '0%';
      if (i < current) {
        b.classList.add('is-done');
        if (fill) fill.style.width = '100%';
      }
    });
    if (bars[current]) bars[current].classList.add('is-active');
    elapsed = 0;
  }

  function goTo(idx, animate) {
    if (isAnim && animate) return;
    current = mod(idx, N);
    if (animate) {
      isAnim = true;
      setTimeout(function () { isAnim = false; }, 700);
    }
    applyPositions();
    updateDots();
    resetBar();
  }

  function advance(dir) { goTo(current + dir, true); }

  // ── Auto-advance loop ──────────────────────────────────────
  function tick(ts) {
    if (lastTS === null) lastTS = ts;
    var dt = ts - lastTS;
    lastTS = ts;

    if (!isPaused && !isDragging) {
      elapsed += dt;
      var pct = Math.min((elapsed / DURATION) * 100, 100);
      var fill = bars[current] ? bars[current].querySelector('.sc3d__bar-fill') : null;
      if (fill) fill.style.width = pct + '%';

      if (elapsed >= DURATION) {
        advance(1);
      }
    }

    requestAnimationFrame(tick);
  }

  // ── Init ───────────────────────────────────────────────────
  applyPositions();
  updateDots();
  resetBar();
  lastTS = null;
  requestAnimationFrame(tick);

  // ── Arrow buttons ──────────────────────────────────────────
  if (prevBtn) prevBtn.addEventListener('click', function (e) { e.stopPropagation(); advance(-1); });
  if (nextBtn) nextBtn.addEventListener('click', function (e) { e.stopPropagation(); advance( 1); });

  // ── Play/Pause ─────────────────────────────────────────────
  if (playBtn) {
    playBtn.addEventListener('click', function () {
      isPaused = !isPaused;
      root.classList.toggle('is-paused', isPaused);
      playBtn.setAttribute('aria-label', isPaused ? 'Play' : 'Pause');
    });
  }

  // ── Click-to-centre (flanking slides) ─────────────────────
  slides.forEach(function (sl, idx) {
    sl.addEventListener('click', function () {
      if (hasDragged) return;
      if (idx !== current) goTo(idx, true);
    });
  });

  // ── Dot clicks ────────────────────────────────────────────
  dots.forEach(function (d, i) {
    d.addEventListener('click', function () { goTo(i, true); });
  });

  // ── Drag / Swipe ──────────────────────────────────────────
  function onDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target.closest('button')) return;
    isDragging = true;
    hasDragged = false;
    dragStartX = e.clientX;
    stage.classList.add('is-dragging');
    if (stage.setPointerCapture) try { stage.setPointerCapture(e.pointerId); } catch(_) {}
  }

  function onMove(e) {
    if (!isDragging) return;
    if (Math.abs(e.clientX - dragStartX) > 8) hasDragged = true;
  }

  function onUp(e) {
    if (!isDragging) return;
    isDragging = false;
    stage.classList.remove('is-dragging');
    if (stage.releasePointerCapture) try { stage.releasePointerCapture(e.pointerId); } catch(_) {}
    var diff = e.clientX - dragStartX;
    if (diff < -50)       advance(1);
    else if (diff > 50)   advance(-1);
  }

  stage.addEventListener('pointerdown',  onDown);
  stage.addEventListener('pointermove',  onMove);
  stage.addEventListener('pointerup',    onUp);
  stage.addEventListener('pointercancel',onUp);

  // ── Keyboard ──────────────────────────────────────────────
  root.setAttribute('tabindex', '0');
  root.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') advance( 1);
    if (e.key === 'ArrowLeft')  advance(-1);
    if (e.key === ' ' && playBtn) { e.preventDefault(); playBtn.click(); }
  });

  // ── Pause on hover ────────────────────────────────────────
  stage.addEventListener('mouseenter', function () { isPaused = true; });
  stage.addEventListener('mouseleave', function () { if (!root.classList.contains('is-paused')) isPaused = false; });

})();
