import fs from 'node:fs';
import path from 'node:path';

const CLONE = path.join(process.cwd(), 'pilotindia-clone');
const WELDING_HTML = path.join(CLONE, 'welding', 'index.html');
const CSS_FILE = path.join(CLONE, 'assets', 'css', 'pg-tech.css');
const JS_FILE = path.join(CLONE, 'assets', 'js', 'pg-tech.js');

// 10 high-res welding products (pure images, NO names)
const galleryImages = [
  { src: '../assets/img/gas-torch-swage-1.png', alt: 'Pilot Industrial Welding Equipment' },
  { src: '../assets/img/gas-torch-detachable-1.png', alt: 'Pilot Industrial Welding Equipment' },
  { src: '../assets/img/gas-regulator-oxygen-2.png', alt: 'Pilot Industrial Welding Equipment' },
  { src: '../assets/img/gas-torches.png', alt: 'Pilot Industrial Welding Equipment' },
  { src: '../assets/img/gt-18.png', alt: 'Pilot Industrial Welding Equipment' },
  { src: '../assets/img/gas-regulator-acetylene-1.png', alt: 'Pilot Industrial Welding Equipment' },
  { src: '../assets/img/gas-torch-swage.png', alt: 'Pilot Industrial Welding Equipment' },
  { src: '../assets/img/gct.png', alt: 'Pilot Industrial Welding Equipment' },
  { src: '../assets/img/gas-regulator-oxygen-1.png', alt: 'Pilot Industrial Welding Equipment' },
  { src: '../assets/img/gas-torch-detachable.png', alt: 'Pilot Industrial Welding Equipment' }
];

// Read current HTML
let html = fs.readFileSync(WELDING_HTML, 'utf8');

// Preserve the 4 cards exactly
const cardRegex = /<div class="pg-tech__card"[\s\S]*?<div class="pg-tech__card-line"><\/div>\s*<\/div>/g;
let cardMatches = [...html.matchAll(cardRegex)].map(m => m[0]);

if (cardMatches.length !== 4) {
  console.error('Failed to extract exactly 4 capability cards! Count:', cardMatches.length);
  process.exit(1);
}

// Generate gallery cards (NO names/titles, pure gallery showcase)
const itemsHtml = galleryImages.map((img, idx) => `
          <div class="pg-gallery__item" data-index="${idx}">
            <div class="pg-gallery__card">
              <div class="pg-gallery__glow"></div>
              <div class="pg-gallery__media">
                <img src="${img.src}" alt="${img.alt}" decoding="async" loading="${idx < 4 ? 'eager' : 'lazy'}" draggable="false" />
              </div>
            </div>
          </div>`).join('');

const newSectionHtml = `		<section class="pg-tech pg-tech--gallery" id="pg-tech">
  <div class="pg-tech__wrap">
    <div class="pg-tech__head">
      <div class="pg-tech__pill-badge">
        <span class="pg-tech__pill-pilot"><span class="pg-tech__pill-p">P</span>ILOT</span>
        <span class="pg-tech__pill-dot"></span>
        <span class="pg-tech__pill-text">Technical Excellence</span>
      </div>
      <h2 class="pg-tech__h2">Technical Excellence</h2>
      <p class="pg-tech__lead">Discover the precision engineering behind our welding equipments. Every component is optimized for maximum efficiency and flawless finish.</p>
    </div>

    <!-- Automatic Moving Gallery Carousel (Pure Image Gallery, No Names) -->
    <div class="pg-gallery" id="pg-gallery" role="region" aria-roledescription="carousel" aria-label="Pilot Industrial Welding Gallery">
      
      <!-- Gallery Stage Viewport with Edge Gradient Fade -->
      <div class="pg-gallery__stage" id="pg-gallery-stage">
        <div class="pg-gallery__track" id="pg-gallery-track">
${itemsHtml}
        </div>

        <!-- Floating Manual Bump Arrows (Left / Right) -->
        <button class="pg-gallery__nav pg-gallery__nav--prev" id="pg-gallery-prev" type="button" aria-label="Nudge gallery backward">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="15,18 9,12 15,6"></polyline>
          </svg>
        </button>
        <button class="pg-gallery__nav pg-gallery__nav--next" id="pg-gallery-next" type="button" aria-label="Nudge gallery forward">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="9,18 15,12 9,6"></polyline>
          </svg>
        </button>
      </div>

      <!-- Minimalist Gallery Footer Bar -->
      <div class="pg-gallery__bar">
        <div class="pg-gallery__live-badge">
          <span class="pg-gallery__live-dot"></span>
          <span class="pg-gallery__live-text">Continuous Product Gallery</span>
        </div>
        <div class="pg-gallery__actions">
          <button class="pg-gallery__ctrl-btn" id="pg-gallery-toggle" type="button" aria-label="Pause gallery reel" title="Pause / Resume">
            <svg class="pg-gallery__icon-pause" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="4" width="4" height="16" rx="1.5"></rect>
              <rect x="14" y="4" width="4" height="16" rx="1.5"></rect>
            </svg>
            <svg class="pg-gallery__icon-play" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <polygon points="6,4 20,12 6,20"></polygon>
            </svg>
            <span class="pg-gallery__btn-label" id="pg-gallery-btn-label">Pause</span>
          </button>
          <div class="pg-gallery__cert-badge">
            <span class="pg-gallery__cert-dot"></span>
            ISI Certified Equipment
          </div>
        </div>
      </div>
    </div>

    <!-- 4 Capability Cards Below (Content untouched) -->
    <div class="pg-tech__cards-bottom">
${cardMatches.join('\n')}
    </div>
  </div>
</section>
<!-- /pg-tech -->`;

const startMarker = '<section class="pg-tech';
const endMarker = '<!-- /pg-tech -->';
const startIdx = html.indexOf(startMarker);
const endIdx = html.indexOf(endMarker);

if (startIdx < 0 || endIdx < 0) {
  console.error('Markers not found in HTML!');
  process.exit(1);
}

html = html.slice(0, startIdx) + newSectionHtml + html.slice(endIdx + endMarker.length);
html = html.replace(/pg-tech\.css\?v=\d+/g, 'pg-tech.css?v=8');
html = html.replace(/pg-tech\.js\?v=\d+/g, 'pg-tech.js?v=8');

fs.writeFileSync(WELDING_HTML, html, 'utf8');
console.log('Successfully updated welding/index.html with Automatic Moving Gallery Carousel markup!');

// 2. CSS Styles for Gallery Carousel
const galleryCss = `
/* ==========================================================================
   AUTOMATIC MOVING GALLERY CAROUSEL (.pg-tech--gallery, .pg-gallery)
   Pure product image showcase: no names, continuous automatic gliding,
   edge gradient feathering, interactive scrub/pause, and responsive layout.
   ========================================================================== */

.pg-tech--gallery {
  padding: 84px 0 96px;
  background: #ffffff;
  position: relative;
  overflow: hidden;
}

.pg-tech--gallery .pg-tech__wrap {
  max-width: 1360px;
  margin: 0 auto;
  padding: 0 32px;
}

/* Gallery Container */
.pg-gallery {
  position: relative;
  width: 100%;
  margin: 36px 0 0;
  user-select: none;
  -webkit-user-select: none;
}

/* Stage Viewport with Edge Fade */
.pg-gallery__stage {
  position: relative;
  width: 100%;
  overflow: hidden;
  padding: 24px 0 28px;
  -webkit-mask-image: linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%);
  mask-image: linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%);
  cursor: grab;
}

.pg-gallery__stage:active,
.pg-gallery__stage.is-dragging {
  cursor: grabbing;
}

/* Continuously moving track */
.pg-gallery__track {
  display: flex;
  align-items: center;
  gap: 28px;
  width: max-content;
  will-change: transform;
  transform: translate3d(0, 0, 0);
  transition: transform 0s linear;
}

.pg-gallery__track.is-snapping {
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

/* Individual Gallery Item / Card */
.pg-gallery__item {
  flex: 0 0 320px;
  width: 320px;
  height: 350px;
  position: relative;
}

.pg-gallery__card {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 24px;
  background: linear-gradient(155deg, #ffffff 0%, #f7f8fa 100%);
  border: 1px solid rgba(17, 17, 20, 0.08);
  box-shadow: 0 10px 28px -8px rgba(0, 0, 0, 0.06), 0 2px 6px -2px rgba(0, 0, 0, 0.03);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px 24px;
  overflow: hidden;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1),
              border-color 0.4s ease;
}

/* Subtle ambient spotlight in card center */
.pg-gallery__glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 220px;
  height: 220px;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(245, 134, 52, 0.09) 0%, rgba(245, 134, 52, 0) 70%);
  border-radius: 50%;
  pointer-events: none;
  transition: transform 0.4s ease, opacity 0.4s ease;
}

/* Media wrapper for pure image */
.pg-gallery__media {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.pg-gallery__media img {
  max-width: 90%;
  max-height: 90%;
  width: auto;
  height: auto;
  object-fit: contain;
  filter: drop-shadow(0 14px 22px rgba(0, 0, 0, 0.09));
  transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1),
              filter 0.45s cubic-bezier(0.16, 1, 0.3, 1);
  user-select: none;
  -webkit-user-drag: none;
}

/* Hover effects */
.pg-gallery__item:hover .pg-gallery__card {
  transform: translateY(-8px);
  border-color: rgba(245, 134, 52, 0.35);
  box-shadow: 0 22px 42px -10px rgba(245, 134, 52, 0.16),
              0 12px 24px -6px rgba(0, 0, 0, 0.08);
}

.pg-gallery__item:hover .pg-gallery__glow {
  transform: translate(-50%, -50%) scale(1.25);
  opacity: 1;
}

.pg-gallery__item:hover .pg-gallery__media img {
  transform: scale(1.07);
  filter: drop-shadow(0 20px 28px rgba(0, 0, 0, 0.14));
}

/* Floating Navigation Chevrons */
.pg-gallery__nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(17, 17, 17, 0.1);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  color: #111114;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: all 0.25s ease;
  opacity: 0.85;
}

.pg-gallery__nav svg {
  width: 20px;
  height: 20px;
}

.pg-gallery__nav:hover {
  opacity: 1;
  background: #ffffff;
  color: var(--pi-accent, #f58634);
  transform: translateY(-50%) scale(1.08);
  box-shadow: 0 12px 28px rgba(245, 134, 52, 0.2);
}

.pg-gallery__nav--prev { left: 16px; }
.pg-gallery__nav--next { right: 16px; }

/* Gallery Footer Bar */
.pg-gallery__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 18px;
  padding: 0 12px;
}

.pg-gallery__live-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  border-radius: 999px;
  background: #ffffff;
  border: 1px solid rgba(17, 17, 17, 0.08);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04);
}

.pg-gallery__live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 10px #22c55e;
  animation: pgPulse 2s infinite ease-in-out;
}

@keyframes pgPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.45; transform: scale(0.85); }
}

.pg-gallery__live-text {
  font-size: 13px;
  font-weight: 700;
  color: #111114;
  letter-spacing: -0.01em;
}

.pg-gallery__actions {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.pg-gallery__ctrl-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #ffffff;
  border: 1px solid rgba(17, 17, 17, 0.1);
  padding: 8px 18px;
  border-radius: 999px;
  color: #111114;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
}

.pg-gallery__ctrl-btn:hover {
  background: #f7f8fa;
  color: var(--pi-accent, #f58634);
  border-color: rgba(245, 134, 52, 0.3);
}

.pg-gallery__ctrl-btn .pg-gallery__icon-play {
  display: none;
}

.pg-gallery.is-paused .pg-gallery__ctrl-btn .pg-gallery__icon-pause {
  display: none;
}

.pg-gallery.is-paused .pg-gallery__ctrl-btn .pg-gallery__icon-play {
  display: block;
}

.pg-gallery__cert-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #0d0f13;
  padding: 8px 18px;
  border-radius: 999px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.03em;
}

.pg-gallery__cert-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 8px #22c55e;
}

/* ==========================================================================
   RESPONSIVE BREAKPOINTS (Gallery Carousel)
   ========================================================================== */

@media (max-width: 1024px) {
  .pg-gallery__item { flex: 0 0 290px; width: 290px; height: 320px; }
  .pg-gallery__track { gap: 22px; }
}

@media (max-width: 768px) {
  .pg-tech--gallery { padding: 64px 0 72px; }
  .pg-gallery__item { flex: 0 0 260px; width: 260px; height: 290px; }
  .pg-gallery__nav { width: 42px; height: 42px; }
  .pg-gallery__nav--prev { left: 8px; }
  .pg-gallery__nav--next { right: 8px; }
  .pg-gallery__cert-badge { display: none; }
}

@media (max-width: 640px) {
  .pg-tech--gallery { padding: 50px 0 60px; }
  .pg-tech--gallery .pg-tech__wrap { padding: 0 16px; }
  .pg-gallery__item { flex: 0 0 220px; width: 220px; height: 250px; }
  .pg-gallery__card { padding: 18px 16px; border-radius: 20px; }
  .pg-gallery__track { gap: 16px; }
  .pg-gallery__stage {
    -webkit-mask-image: linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%);
    mask-image: linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%);
  }
}
`;

// Append or replace in pg-tech.css
fs.appendFileSync(CSS_FILE, '\n' + galleryCss, 'utf8');
console.log('Appended Gallery Carousel styles to pg-tech.css!');

// 3. JavaScript Controller for Automatic Moving Gallery Carousel
const galleryJs = `
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
`;

fs.appendFileSync(JS_FILE, '\n' + galleryJs, 'utf8');
console.log('Appended Gallery Carousel controller to pg-tech.js!');
console.log('All Automatic Moving Gallery Carousel components deployed successfully!');
