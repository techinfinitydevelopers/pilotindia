import fs from 'node:fs';
import path from 'node:path';

const CLONE = path.join(process.cwd(), 'pilotindia-clone');
const WELDING_HTML = path.join(CLONE, 'welding', 'index.html');
const CSS_FILE = path.join(CLONE, 'assets', 'css', 'pg-tech.css');
const JS_FILE  = path.join(CLONE, 'assets', 'js', 'pg-tech.js');

// ── 9 product slides ────────────────────────────────────────────────────────
const slides = [
  { src: '../assets/img/gas-torch-swage-1.png',        alt: 'Gas Torch Swage' },
  { src: '../assets/img/gas-torch-detachable-1.png',   alt: 'Gas Torch Detachable' },
  { src: '../assets/img/gas-torches.png',              alt: 'Industrial Gas Torches' },
  { src: '../assets/img/gt-18.png',                    alt: 'GT-18 Heavy-Duty Torch' },
  { src: '../assets/img/gas-regulator-oxygen-2.png',   alt: 'Two-Stage Gas Regulator' },
  { src: '../assets/img/gas-torch-swage.png',          alt: 'Gas Torch Swage Model' },
  { src: '../assets/img/gct.png',                      alt: 'GCT Gas Cutting Torch' },
  { src: '../assets/img/gas-regulator-oxygen-1.png',   alt: 'Single-Stage Gas Regulator' },
  { src: '../assets/img/gas-regulator-acetylene-1.png',alt: 'Acetylene Gas Regulator' },
];

// ── Read existing HTML & extract 4 capability cards ─────────────────────────
let html = fs.readFileSync(WELDING_HTML, 'utf8');

const cardRegex = /<div class="pg-tech__card"[\s\S]*?<div class="pg-tech__card-line"><\/div>\s*<\/div>/g;
const cardMatches = [...html.matchAll(cardRegex)].map(m => m[0]);

if (cardMatches.length !== 4) {
  console.error('Expected 4 pg-tech cards, got', cardMatches.length);
  process.exit(1);
}

// ── Build slide HTML ─────────────────────────────────────────────────────────
const slidesHtml = slides.map((s, i) => `
          <div class="sc3d__slide" data-index="${i}">
            <div class="sc3d__card">
              <div class="sc3d__card-inner">
                <img src="${s.src}" alt="${s.alt}" decoding="async" loading="${i < 3 ? 'eager' : 'lazy'}" draggable="false" />
              </div>
            </div>
          </div>`).join('');

// ── Progress dots ────────────────────────────────────────────────────────────
const dotsHtml = slides.map((_, i) => `<button class="sc3d__dot${i===0?' is-active':''}" data-index="${i}" aria-label="Slide ${i+1}"></button>`).join('');

// ── Full section HTML ─────────────────────────────────────────────────────────
const newSection = `\t\t<section class="pg-tech pg-tech--sc3d" id="pg-tech">
  <div class="pg-tech__wrap">

    <!-- Section Header -->
    <div class="pg-tech__head">
      <div class="pg-tech__pill-badge">
        <span class="pg-tech__pill-pilot"><span class="pg-tech__pill-p">P</span>ILOT</span>
        <span class="pg-tech__pill-dot"></span>
        <span class="pg-tech__pill-text">Technical Excellence</span>
      </div>
      <h2 class="pg-tech__h2">Technical Excellence</h2>
      <p class="pg-tech__lead">Discover the precision engineering behind our welding equipments. Every component is optimized for maximum efficiency and flawless finish.</p>
    </div>

    <!-- ═══ 3-D SCALE CAROUSEL ═══ -->
    <div class="sc3d" id="sc3d" role="region" aria-roledescription="3D carousel" aria-label="Pilot Welding Equipment Showcase">

      <!-- Segmented progress bars + play/pause -->
      <div class="sc3d__top-bar">
        <div class="sc3d__progress-bars" id="sc3d-bars">
${slides.map((_,i) => `          <div class="sc3d__bar${i===0?' is-active':''}"><span class="sc3d__bar-fill"></span></div>`).join('\n')}
        </div>
        <button class="sc3d__play-btn" id="sc3d-play" type="button" aria-label="Pause">
          <svg class="sc3d__icon-pause" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/>
          </svg>
          <svg class="sc3d__icon-play" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="6,4 20,12 6,20"/>
          </svg>
        </button>
      </div>

      <!-- 3-D Stage -->
      <div class="sc3d__stage" id="sc3d-stage">
        <!-- Left arrow -->
        <button class="sc3d__arrow sc3d__arrow--prev" id="sc3d-prev" type="button" aria-label="Previous">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15,18 9,12 15,6"/>
          </svg>
        </button>

        <!-- Track -->
        <div class="sc3d__track" id="sc3d-track">
${slidesHtml}
        </div>

        <!-- Right arrow -->
        <button class="sc3d__arrow sc3d__arrow--next" id="sc3d-next" type="button" aria-label="Next">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9,18 15,12 9,6"/>
          </svg>
        </button>
      </div>

      <!-- Status line -->
      <div class="sc3d__status">
        <div class="sc3d__dots" id="sc3d-dots">${dotsHtml}</div>
        <div class="sc3d__cert">
          <span class="sc3d__cert-dot"></span>ISI Certified Equipment
        </div>
      </div>

    </div><!-- /sc3d -->

    <!-- 4 Capability Cards (content unchanged) -->
    <div class="pg-tech__cards-bottom">
${cardMatches.join('\n')}
    </div>

  </div>
</section>
<!-- /pg-tech -->`;

// ── Splice into HTML ──────────────────────────────────────────────────────────
const START = '<section class="pg-tech';
const END   = '<!-- /pg-tech -->';
const si = html.indexOf(START);
const ei = html.indexOf(END);
if (si < 0 || ei < 0) { console.error('Markers not found!'); process.exit(1); }
html = html.slice(0, si) + newSection + html.slice(ei + END.length);
html = html.replace(/pg-tech\.css\?v=\d+/g, 'pg-tech.css?v=9');
html = html.replace(/pg-tech\.js\?v=\d+/g,  'pg-tech.js?v=9');
fs.writeFileSync(WELDING_HTML, html, 'utf8');
console.log('HTML patched ✓');

// ══════════════════════════════════════════════════════════════════════════════
// CSS
// ══════════════════════════════════════════════════════════════════════════════
const css = `

/* ============================================================
   3-D SCALE CAROUSEL  (.sc3d)
   Centre card full-size; flanking cards shrink & recede;
   auto-advance, drag/swipe, click-to-centre, progress bars.
   ============================================================ */

/* Section wrapper */
.pg-tech--sc3d {
  padding: 80px 0 96px;
  background: #fff;
  position: relative;
  overflow: hidden;
}
.pg-tech--sc3d .pg-tech__wrap {
  max-width: 1360px;
  margin: 0 auto;
  padding: 0 32px;
}

/* ── Top bar (progress + play) ───────────────────────────────── */
.sc3d__top-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 36px 0 24px;
}
.sc3d__progress-bars {
  flex: 1;
  display: flex;
  gap: 6px;
}
.sc3d__bar {
  flex: 1;
  height: 3px;
  background: rgba(0,0,0,0.1);
  border-radius: 99px;
  overflow: hidden;
  position: relative;
}
.sc3d__bar-fill {
  display: block;
  height: 100%;
  width: 0%;
  background: var(--pi-accent,#f58634);
  border-radius: 99px;
  transition: none;
}
.sc3d__bar.is-active .sc3d__bar-fill {
  /* width is driven by JS rAF */
}
.sc3d__bar.is-done .sc3d__bar-fill { width: 100%; }

.sc3d__play-btn {
  flex-shrink: 0;
  width: 36px; height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(0,0,0,0.12);
  background: #fff;
  color: #111;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: background .2s, border-color .2s, color .2s;
}
.sc3d__play-btn:hover { background: var(--pi-accent,#f58634); color:#fff; border-color:transparent; }
.sc3d__icon-play  { display:none; }
.sc3d.is-paused .sc3d__icon-pause { display:none; }
.sc3d.is-paused .sc3d__icon-play  { display:block; }

/* ── 3-D Stage ───────────────────────────────────────────────── */
.sc3d__stage {
  position: relative;
  width: 100%;
  /* edge vignette */
  -webkit-mask-image: linear-gradient(to right, transparent 0%, #000 9%, #000 91%, transparent 100%);
  mask-image:         linear-gradient(to right, transparent 0%, #000 9%, #000 91%, transparent 100%);
  /* 3-D perspective for child transforms */
  perspective: 1400px;
  perspective-origin: 50% 45%;
  overflow: visible;
  padding: 40px 0 52px;
  cursor: grab;
}
.sc3d__stage:active,
.sc3d__stage.is-dragging { cursor: grabbing; }

/* Track: absolutely positioned slides centred on stage */
.sc3d__track {
  position: relative;
  height: 420px;
  display: flex;
  align-items: center;
  justify-content: center;
  transform-style: preserve-3d;
  will-change: transform;
  pointer-events: none;   /* slides get individual pointer-events */
}

/* ── Individual Slide ────────────────────────────────────────── */
.sc3d__slide {
  position: absolute;
  width: 380px;
  height: 400px;
  transform-origin: center center;
  transform-style: preserve-3d;
  transition:
    transform  .65s cubic-bezier(0.22,1,0.36,1),
    opacity    .65s cubic-bezier(0.22,1,0.36,1),
    filter     .45s ease,
    box-shadow .45s ease;
  cursor: pointer;
  pointer-events: auto;
  user-select: none;
  -webkit-user-select: none;
}

/* ── State transforms (set by JS) ───────────────────────────── */
/* active  */ .sc3d__slide[data-pos="0"]  { transform: translateX(0)    translateZ(0px)   scale(1);    opacity: 1;    filter: blur(0px);   z-index:10; }
/* ±1      */ .sc3d__slide[data-pos="1"]  { transform: translateX(310px) translateZ(-90px) scale(0.84); opacity: 0.72; filter: blur(1px);   z-index:7; }
              .sc3d__slide[data-pos="-1"] { transform: translateX(-310px) translateZ(-90px) scale(0.84);opacity: 0.72; filter: blur(1px);   z-index:7; }
/* ±2      */ .sc3d__slide[data-pos="2"]  { transform: translateX(580px) translateZ(-170px) scale(0.68); opacity: 0.40; filter: blur(2.5px); z-index:4; }
              .sc3d__slide[data-pos="-2"] { transform: translateX(-580px) translateZ(-170px) scale(0.68);opacity: 0.40; filter: blur(2.5px); z-index:4; }
/* ±3+     */ .sc3d__slide[data-pos="3"],
              .sc3d__slide[data-pos="-3"] { transform: translateX(0) translateZ(-300px) scale(0.5); opacity: 0; filter: blur(5px); z-index:1; pointer-events:none; }

/* ── Card face ───────────────────────────────────────────────── */
.sc3d__card {
  width: 100%; height: 100%;
  border-radius: 28px;
  background: linear-gradient(148deg,#fff 0%,#f5f6fa 100%);
  border: 1.5px solid rgba(17,17,20,.07);
  box-shadow:
    0 8px 28px -6px rgba(0,0,0,.07),
    0 2px 6px  -2px rgba(0,0,0,.04);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30px 28px;
  overflow: hidden;
  position: relative;
  transition: border-color .4s, box-shadow .4s;
}

/* Accent glow on active card */
.sc3d__slide[data-pos="0"] .sc3d__card {
  border-color: rgba(245,134,52,.28);
  box-shadow:
    0 24px 56px -12px rgba(245,134,52,.18),
    0 8px  24px -6px  rgba(0,0,0,.1);
}

.sc3d__card-inner {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  position: relative; z-index: 2;
}
.sc3d__card-inner img {
  max-width: 88%;
  max-height: 88%;
  width: auto; height: auto;
  object-fit: contain;
  filter: drop-shadow(0 14px 24px rgba(0,0,0,.1));
  transition: transform .45s cubic-bezier(.16,1,.3,1), filter .45s ease;
  pointer-events: none;
  -webkit-user-drag: none;
}
.sc3d__slide[data-pos="0"] .sc3d__card-inner img {
  filter: drop-shadow(0 20px 30px rgba(0,0,0,.14));
  transform: scale(1.04);
}

/* Ambient centre glow */
.sc3d__card::before {
  content: '';
  position: absolute; top:50%; left:50%;
  transform: translate(-50%,-50%);
  width: 200px; height: 200px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(245,134,52,.1) 0%, transparent 70%);
  pointer-events: none;
  opacity: 0;
  transition: opacity .5s;
}
.sc3d__slide[data-pos="0"] .sc3d__card::before { opacity: 1; }

/* ── Arrows ──────────────────────────────────────────────────── */
.sc3d__arrow {
  position: absolute;
  top: 50%; transform: translateY(-50%);
  width: 50px; height: 50px;
  border-radius: 50%;
  background: rgba(255,255,255,.92);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(0,0,0,.1);
  box-shadow: 0 8px 24px rgba(0,0,0,.09);
  color: #111;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; z-index: 20;
  transition: all .25s ease;
}
.sc3d__arrow svg { width: 22px; height: 22px; }
.sc3d__arrow:hover {
  background: var(--pi-accent,#f58634);
  color: #fff; border-color: transparent;
  transform: translateY(-50%) scale(1.08);
  box-shadow: 0 12px 28px rgba(245,134,52,.3);
}
.sc3d__arrow--prev { left: 20px; }
.sc3d__arrow--next { right: 20px; }

/* ── Status bar ──────────────────────────────────────────────── */
.sc3d__status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
  padding: 0 8px;
}
.sc3d__dots {
  display: flex; gap: 8px;
}
.sc3d__dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: rgba(0,0,0,.15);
  border: none; cursor: pointer;
  transition: background .3s, transform .3s;
}
.sc3d__dot.is-active {
  background: var(--pi-accent,#f58634);
  transform: scale(1.3);
}
.sc3d__cert {
  display: inline-flex; align-items: center; gap: 8px;
  background: #0d0f13;
  padding: 8px 18px; border-radius: 99px;
  color: #fff; font-size: 12px; font-weight: 600; letter-spacing:.03em;
}
.sc3d__cert-dot {
  width:6px; height:6px; border-radius:50%;
  background:#22c55e; box-shadow:0 0 8px #22c55e;
}

/* ── Responsive ──────────────────────────────────────────────── */
@media (max-width: 1100px) {
  .sc3d__track { height: 360px; }
  .sc3d__slide { width: 320px; height: 340px; }
  .sc3d__slide[data-pos="1"]  { transform: translateX(270px) translateZ(-80px) scale(0.84); }
  .sc3d__slide[data-pos="-1"] { transform: translateX(-270px) translateZ(-80px) scale(0.84); }
  .sc3d__slide[data-pos="2"]  { transform: translateX(510px) translateZ(-150px) scale(0.68); }
  .sc3d__slide[data-pos="-2"] { transform: translateX(-510px) translateZ(-150px) scale(0.68); }
}
@media (max-width: 768px) {
  .pg-tech--sc3d { padding: 60px 0 72px; }
  .sc3d__track   { height: 310px; }
  .sc3d__slide   { width: 270px; height: 290px; }
  .sc3d__slide[data-pos="1"]  { transform: translateX(230px) translateZ(-70px) scale(0.84); }
  .sc3d__slide[data-pos="-1"] { transform: translateX(-230px) translateZ(-70px) scale(0.84); }
  .sc3d__slide[data-pos="2"]  { transform: translateX(430px) translateZ(-130px) scale(0.68); opacity:.25; }
  .sc3d__slide[data-pos="-2"] { transform: translateX(-430px) translateZ(-130px) scale(0.68); opacity:.25; }
  .sc3d__arrow { width:42px; height:42px; }
  .sc3d__arrow--prev { left:10px; }
  .sc3d__arrow--next { right:10px; }
  .sc3d__cert { display:none; }
  .sc3d__stage {
    -webkit-mask-image: linear-gradient(to right, transparent 0%, #000 13%, #000 87%, transparent 100%);
    mask-image: linear-gradient(to right, transparent 0%, #000 13%, #000 87%, transparent 100%);
  }
}
@media (max-width: 540px) {
  .pg-tech--sc3d { padding:48px 0 60px; }
  .pg-tech--sc3d .pg-tech__wrap { padding:0 16px; }
  .sc3d__track { height:270px; }
  .sc3d__slide { width:230px; height:250px; }
  .sc3d__slide[data-pos="1"]  { transform: translateX(195px) translateZ(-60px) scale(0.84); opacity:.55; }
  .sc3d__slide[data-pos="-1"] { transform: translateX(-195px) translateZ(-60px) scale(0.84); opacity:.55; }
  .sc3d__slide[data-pos="2"]  { transform: translateX(360px) translateZ(-100px) scale(0.68); opacity:0; }
  .sc3d__slide[data-pos="-2"] { transform: translateX(-360px) translateZ(-100px) scale(0.68); opacity:0; }
  .sc3d__card { border-radius:20px; padding:22px 18px; }
}
`;

fs.appendFileSync(CSS_FILE, css);
console.log('CSS appended ✓');

// ══════════════════════════════════════════════════════════════════════════════
// JS
// ══════════════════════════════════════════════════════════════════════════════
const js = `
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
`;

fs.appendFileSync(JS_FILE, js);
console.log('JS appended ✓');

// ── Verify HTML balance ───────────────────────────────────────────────────────
const final = fs.readFileSync(WELDING_HTML, 'utf8');
const openDiv  = (final.match(/<div(\s|>)/gi)||[]).length;
const closeDiv = (final.match(/<\/div>/gi)||[]).length;
console.log('Div balance:', openDiv === closeDiv ? '✓' : '✗ MISMATCH', openDiv, '/', closeDiv);
const openSec  = (final.match(/<section(\s|>)/gi)||[]).length;
const closeSec = (final.match(/<\/section>/gi)||[]).length;
console.log('Section balance:', openSec === closeSec ? '✓' : '✗ MISMATCH', openSec, '/', closeSec);
