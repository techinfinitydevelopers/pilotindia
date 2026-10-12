import fs from 'node:fs';
import path from 'node:path';

const CLONE = path.join(process.cwd(), 'pilotindia-clone');
const WELDING_HTML = path.join(CLONE, 'welding', 'index.html');
const CSS_FILE = path.join(CLONE, 'assets', 'css', 'pg-tech.css');
const JS_FILE = path.join(CLONE, 'assets', 'js', 'pg-tech.js');

// 9 welding products
const slides = [
  { src: '../assets/img/gas-torch-swage-1.png', alt: 'Gas torch (Swage)', title: 'Gas Torch (Swage)', badge: 'Industrial Cutting' },
  { src: '../assets/img/gas-torch-detachable-1.png', alt: 'Gas torch (Detachable)', title: 'Gas Torch (Detachable)', badge: 'Modular Design' },
  { src: '../assets/img/gas-torch-swage.png', alt: 'Gas torch (Swage)', title: 'Gas Torch (Swage Model)', badge: 'Flame Stability' },
  { src: '../assets/img/gas-torch-detachable.png', alt: 'Gas torch (Detachable)', title: 'Gas Torch (Detachable Model)', badge: 'Heat Resistant' },
  { src: '../assets/img/gas-torches.png', alt: 'Gas torches', title: 'Industrial Gas Torches', badge: 'Certified Multi-Gas' },
  { src: '../assets/img/gt-18.png', alt: 'GT 18', title: 'GT 18 Heavy-Duty Torch', badge: 'High Impact Duty' },
  { src: '../assets/img/gct.png', alt: 'GCT', title: 'GCT Gas Cutting Torch', badge: 'Precision Bevel Cuts' },
  { src: '../assets/img/gas-regulator-oxygen-2.png', alt: 'Gas regulator (oxygen) 2', title: 'Two-Stage Gas Regulator', badge: 'Constant Delivery' },
  { src: '../assets/img/gas-regulator-oxygen-1.png', alt: 'Gas regulator (oxygen) 1', title: 'Single-Stage Gas Regulator', badge: 'Solid Brass Body' }
];

// Read current HTML to get existing 4 cards content & SVGs exactly
let html = fs.readFileSync(WELDING_HTML, 'utf8');

// The 4 cards SVGs & content from existing HTML
const cardRegex = /<div class="pg-tech__card"[\s\S]*?<div class="pg-tech__card-line"><\/div>\s*<\/div>/g;
let cardMatches = [...html.matchAll(cardRegex)].map(m => m[0]);

if (cardMatches.length !== 4) {
  console.log('Falling back to finding cards by title');
  // fallback if needed
}

// Top progress bars
const progressBarsHtml = slides.map((s, idx) => `
          <button class="pg-3d__bar${idx === 0 ? ' is-active' : ''}" data-index="${idx}" role="tab" aria-selected="${idx === 0 ? 'true' : 'false'}" aria-label="Slide ${idx + 1}: ${s.title}">
            <span class="pg-3d__bar-fill" style="width: 0%"></span>
          </button>`).join('');

// Slides HTML inside track
const slidesHtml = slides.map((s, idx) => `
          <div class="pg-3d__slide${idx === 0 ? ' is-active' : ''}" data-index="${idx}" data-title="${s.title}" data-badge="${s.badge}" role="group" aria-roledescription="slide" aria-label="${idx + 1} of ${slides.length}">
            <div class="pg-3d__card">
              <span class="pg-3d__card-tag">${s.badge}</span>
              <div class="pg-3d__card-media">
                <img src="${s.src}" alt="${s.alt}" decoding="async" loading="${idx < 3 ? 'eager' : 'lazy'}" draggable="false" />
              </div>
              <div class="pg-3d__card-foot">
                <h4 class="pg-3d__card-title">${s.title}</h4>
                <span class="pg-3d__card-num">${String(idx + 1).padStart(2, '0')} / 09</span>
              </div>
            </div>
          </div>`).join('');

const newSectionHtml = `		<section class="pg-tech pg-tech--3d" id="pg-tech">
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

    <!-- 3D Scale Carousel Component -->
    <div class="pg-3d" id="pg-3d" role="region" aria-roledescription="carousel" aria-label="Pilot Welding Equipment 3D Scale Showcase" tabindex="0">
      
      <!-- Top Control Bar: Segmented Progress & Play/Pause -->
      <div class="pg-3d__controls">
        <div class="pg-3d__bars" role="tablist" aria-label="Slides progress">
${progressBarsHtml}
        </div>
        <button class="pg-3d__play-btn" id="pg-3d-play-btn" type="button" aria-label="Pause slideshow" title="Pause / Play">
          <svg class="pg-3d__icon-pause" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="6" y="4" width="4" height="16" rx="1.5"></rect>
            <rect x="14" y="4" width="4" height="16" rx="1.5"></rect>
          </svg>
          <svg class="pg-3d__icon-play" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <polygon points="6,4 20,12 6,20"></polygon>
          </svg>
        </button>
      </div>

      <!-- 3D Stage with Edge Fade Mask & Depth Scaling -->
      <div class="pg-3d__stage" id="pg-3d-stage">
        <div class="pg-3d__track" id="pg-3d-track">
${slidesHtml}
        </div>

        <!-- Left / Right Floating Chevrons -->
        <button class="pg-3d__nav pg-3d__nav--prev" id="pg-3d-prev" type="button" aria-label="Previous slide">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="15,18 9,12 15,6"></polyline>
          </svg>
        </button>
        <button class="pg-3d__nav pg-3d__nav--next" id="pg-3d-next" type="button" aria-label="Next slide">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="9,18 15,12 9,6"></polyline>
          </svg>
        </button>
      </div>

      <!-- Bottom Floating Status Bar -->
      <div class="pg-3d__footer">
        <div class="pg-3d__status-pill">
          <span class="pg-3d__counter"><span class="pg-3d__counter-cur" id="pg-3d-cur">01</span> / 09</span>
          <span class="pg-3d__sep"></span>
          <span class="pg-3d__active-title" id="pg-3d-title">${slides[0].title}</span>
        </div>
        <div class="pg-3d__cert-pill">
          <span class="pg-3d__cert-dot"></span>
          ISI Certified Equipment
        </div>
      </div>
    </div>

    <!-- Revamped Cards Section Below 3D Carousel (Content untouched) -->
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
  console.error('Markers not found!');
  process.exit(1);
}

html = html.slice(0, startIdx) + newSectionHtml + html.slice(endIdx + endMarker.length);
html = html.replace(/pg-tech\.css\?v=\d+/g, 'pg-tech.css?v=7');
html = html.replace(/pg-tech\.js\?v=\d+/g, 'pg-tech.js?v=7');

fs.writeFileSync(WELDING_HTML, html, 'utf8');
console.log('Successfully updated welding/index.html with 3D Scale Carousel markup!');

// 2. Add 3D Scale Carousel styles to pg-tech.css
const css3D = `
/* ==========================================================================
   3D SCALE CAROUSEL (.pg-tech--3d, .pg-3d)
   Inspired by Framer 3D Scale Carousel:
   Depth scaling, side fade, active focus elevation, smooth drag & snap
   ========================================================================== */

.pg-tech--3d {
  padding: 84px 0 96px;
  background: #ffffff;
  position: relative;
  overflow: hidden;
}

.pg-tech--3d .pg-tech__wrap {
  max-width: 1360px;
  margin: 0 auto;
  padding: 0 32px;
}

/* ---- 3D Carousel Container ---- */
.pg-3d {
  position: relative;
  width: 100%;
  margin: 36px 0 0;
  user-select: none;
  -webkit-user-select: none;
  outline: none;
}

/* ---- Top Control Bar (Progress segments + Play/Pause) ---- */
.pg-3d__controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  max-width: 640px;
  margin: 0 auto 28px;
}

.pg-3d__bars {
  flex: 1;
  display: flex;
  gap: 6px;
  align-items: center;
}

.pg-3d__bar {
  flex: 1;
  height: 4px;
  background: rgba(17, 17, 17, 0.12);
  border-radius: 999px;
  overflow: hidden;
  cursor: pointer;
  padding: 0;
  border: none;
  outline: none;
  transition: background 0.2s ease, transform 0.2s ease;
}

.pg-3d__bar:hover {
  background: rgba(17, 17, 17, 0.24);
  transform: scaleY(1.3);
}

.pg-3d__bar-fill {
  display: block;
  height: 100%;
  width: 0%;
  border-radius: 999px;
  background: var(--pi-accent, #f58634);
  transition: width 0.04s linear;
}

.pg-3d__play-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #ffffff;
  border: 1px solid rgba(17, 17, 17, 0.09);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #1f2024;
  padding: 0;
  flex-shrink: 0;
  transition: all 0.25s ease;
}

.pg-3d__play-btn:hover {
  transform: scale(1.08);
  box-shadow: 0 4px 16px rgba(245, 134, 52, 0.2);
  color: var(--pi-accent, #f58634);
  border-color: rgba(245, 134, 52, 0.3);
}

.pg-3d__play-btn .pg-3d__icon-play { display: none; }
.pg-3d__play-btn.is-paused .pg-3d__icon-pause { display: none; }
.pg-3d__play-btn.is-paused .pg-3d__icon-play { display: block; }

/* ---- 3D Stage with Edge Fade Mask & Depth Scaling ---- */
.pg-3d__stage {
  position: relative;
  width: 100%;
  height: 480px;
  perspective: 1200px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  -webkit-mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
  mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
}

.pg-3d__track {
  position: relative;
  display: flex;
  align-items: center;
  width: max-content;
  gap: 28px;
  height: 100%;
  transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
  cursor: grab;
}

.pg-3d__track.is-dragging {
  cursor: grabbing;
  transition: none !important;
}

/* Individual Slide wrapper in 3D space */
.pg-3d__slide {
  flex: 0 0 460px;
  width: 460px;
  height: 380px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1),
              opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1),
              filter 0.55s cubic-bezier(0.22, 1, 0.36, 1);
  transform-origin: center center;
  will-change: transform, opacity;
}

/* 3D Depth Card styling */
.pg-3d__card {
  width: 100%;
  height: 100%;
  border-radius: 26px;
  background: radial-gradient(85% 75% at 50% 50%, #ffffff 0%, #f6f2ea 100%);
  border: 1px solid rgba(17, 17, 17, 0.08);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;
  transition: box-shadow 0.4s ease, border-color 0.4s ease, background 0.4s ease;
}

.pg-3d__card-tag {
  position: absolute;
  top: 18px;
  left: 22px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--pi-accent, #f58634);
  background: rgba(245, 134, 52, 0.1);
  padding: 4px 12px;
  border-radius: 999px;
  z-index: 5;
}

.pg-3d__card-media {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 40px 48px;
}

.pg-3d__card-media img {
  max-width: 86%;
  max-height: 80%;
  object-fit: contain;
  filter: drop-shadow(0 14px 28px rgba(0, 0, 0, 0.1));
  mix-blend-mode: multiply;
  pointer-events: none;
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.pg-3d__card-foot {
  position: absolute;
  bottom: 18px;
  left: 22px;
  right: 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 5;
  pointer-events: none;
}

.pg-3d__card-title {
  margin: 0;
  font-family: var(--pi-font-heading, Roboto, system-ui, sans-serif);
  font-size: 16px;
  font-weight: 700;
  color: #111114;
  letter-spacing: -0.01em;
}

.pg-3d__card-num {
  font-family: monospace, system-ui, sans-serif;
  font-size: 12px;
  font-weight: 700;
  color: #8c8f96;
}

/* ---- 3D Scale States (Active vs Flanking) ---- */

/* Active (Center) Card */
.pg-3d__slide.is-active {
  transform: scale(1) translateZ(0);
  opacity: 1;
  z-index: 20;
}

.pg-3d__slide.is-active .pg-3d__card {
  border-color: rgba(245, 134, 52, 0.35);
  box-shadow: 0 24px 60px -16px rgba(0, 0, 0, 0.14),
              0 0 0 1px rgba(245, 134, 52, 0.2);
}

.pg-3d__slide.is-active:hover .pg-3d__card-media img {
  transform: scale(1.04);
}

/* Flanking 1-step Left & Right */
.pg-3d__slide.is-prev,
.pg-3d__slide.is-next {
  transform: scale(0.85) translateZ(-40px);
  opacity: 0.58;
  z-index: 10;
  cursor: pointer;
}

.pg-3d__slide.is-prev:hover,
.pg-3d__slide.is-next:hover {
  opacity: 0.82;
  transform: scale(0.88) translateZ(-20px);
}

/* Flanking 2-step Left & Right */
.pg-3d__slide.is-far-prev,
.pg-3d__slide.is-far-next {
  transform: scale(0.72) translateZ(-80px);
  opacity: 0.26;
  z-index: 5;
}

/* Outside visibility range */
.pg-3d__slide.is-hidden {
  transform: scale(0.6) translateZ(-120px);
  opacity: 0;
  pointer-events: none;
}

/* ---- Side Floating Arrows ---- */
.pg-3d__nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(17, 17, 17, 0.09);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  color: #111114;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 30;
  padding: 0;
  transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.pg-3d__nav--prev { left: 24px; }
.pg-3d__nav--next { right: 24px; }

.pg-3d__nav:hover {
  background: #ffffff;
  transform: translateY(-50%) scale(1.1);
  box-shadow: 0 12px 32px rgba(245, 134, 52, 0.25);
  color: var(--pi-accent, #f58634);
  border-color: rgba(245, 134, 52, 0.3);
}

.pg-3d__nav svg { width: 22px; height: 22px; }

/* ---- Bottom Status Bar ---- */
.pg-3d__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 20px;
}

.pg-3d__status-pill {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  background: #ffffff;
  padding: 8px 20px;
  border-radius: 999px;
  border: 1px solid rgba(17, 17, 17, 0.08);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
}

.pg-3d__counter {
  font-family: monospace, system-ui, sans-serif;
  font-size: 13px;
  font-weight: 800;
  color: var(--pi-accent, #f58634);
}

.pg-3d__sep {
  width: 1px;
  height: 14px;
  background: rgba(17, 17, 17, 0.15);
}

.pg-3d__active-title {
  font-size: 14.5px;
  font-weight: 700;
  color: #111114;
  letter-spacing: -0.01em;
}

.pg-3d__cert-pill {
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

.pg-3d__cert-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 8px #22c55e;
}

/* ==========================================================================
   RESPONSIVE BREAKPOINTS (3D Scale Carousel)
   ========================================================================== */

@media (max-width: 1100px) {
  .pg-3d__stage { height: 430px; }
  .pg-3d__slide { flex: 0 0 380px; width: 380px; height: 330px; }
  .pg-3d__track { gap: 20px; }
}

@media (max-width: 768px) {
  .pg-tech--3d { padding: 64px 0 72px; }
  .pg-3d__stage { height: 380px; }
  .pg-3d__slide { flex: 0 0 320px; width: 320px; height: 280px; }
  .pg-3d__nav { width: 42px; height: 42px; }
  .pg-3d__nav--prev { left: 12px; }
  .pg-3d__nav--next { right: 12px; }
  .pg-3d__cert-pill { display: none; }
  .pg-3d__controls { margin-bottom: 20px; }
}

@media (max-width: 640px) {
  .pg-tech--3d { padding: 50px 0 60px; }
  .pg-tech--3d .pg-tech__wrap { padding: 0 16px; }
  .pg-3d__stage {
    height: 330px;
    -webkit-mask-image: linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%);
    mask-image: linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%);
  }
  .pg-3d__slide { flex: 0 0 280px; width: 280px; height: 240px; }
  .pg-3d__card-media { padding: 24px 30px; }
  .pg-3d__card-title { font-size: 14px; }
  .pg-3d__controls { gap: 10px; }
  .pg-3d__play-btn { width: 32px; height: 32px; }
}
`;

let css = fs.readFileSync(CSS_FILE, 'utf8');
if (!css.includes('.pg-tech--3d')) {
  css += '\n' + css3D;
  fs.writeFileSync(CSS_FILE, css, 'utf8');
  console.log('Appended 3D Scale Carousel styles to pg-tech.css!');
} else {
  const marker = '/* ==========================================================================\n   3D SCALE CAROUSEL (.pg-tech--3d, .pg-3d)';
  const at = css.indexOf(marker);
  if (at >= 0) {
    css = css.slice(0, at) + css3D;
    fs.writeFileSync(CSS_FILE, css, 'utf8');
    console.log('Updated 3D Scale Carousel styles in pg-tech.css!');
  }
}

// 3. Add 3D Scale Carousel Controller in pg-tech.js
const js3D = `
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
`;

let js = fs.readFileSync(JS_FILE, 'utf8');
if (!js.includes('init3DScaleCarousel')) {
  const lastParen = js.lastIndexOf('})();');
  if (lastParen >= 0) {
    js = js.slice(0, lastParen) + js3D + '\n})();\n';
    fs.writeFileSync(JS_FILE, js, 'utf8');
    console.log('Appended 3D Scale Carousel controller to pg-tech.js!');
  }
} else {
  const marker = '  // 4. 3D Scale Carousel Controller';
  const at = js.indexOf(marker);
  const lastParen = js.lastIndexOf('})();');
  if (at >= 0 && lastParen >= 0) {
    js = js.slice(0, at) + js3D + '\n})();\n';
    fs.writeFileSync(JS_FILE, js, 'utf8');
    console.log('Updated 3D Scale Carousel controller in pg-tech.js!');
  }
}

console.log('All 3D Scale Carousel components deployed successfully!');
