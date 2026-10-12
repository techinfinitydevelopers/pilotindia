import fs from 'node:fs';
import path from 'node:path';

const CLONE = path.join(process.cwd(), 'pilotindia-clone');
const WELDING_HTML = path.join(CLONE, 'welding', 'index.html');
const CSS_FILE = path.join(CLONE, 'assets', 'css', 'pg-tech.css');
const JS_FILE = path.join(CLONE, 'assets', 'js', 'pg-tech.js');

const techData = JSON.parse(fs.readFileSync('tools/extracted_tech.json', 'utf8'));

// 1. Generate HTML for ReelCarousel & revamped cards
const slides = [
  { src: '../assets/img/gas-torch-swage-1.png', alt: 'Gas torch (Swage)', title: 'Gas Torch (Swage)', badge: 'Heavy-Duty Industrial Cutting' },
  { src: '../assets/img/gas-torch-detachable-1.png', alt: 'Gas torch (Detachable)', title: 'Gas Torch (Detachable)', badge: 'Quick-Change Modular Design' },
  { src: '../assets/img/gas-torch-swage.png', alt: 'Gas torch (Swage)', title: 'Gas Torch (Swage Model)', badge: 'Precision Flame Stability' },
  { src: '../assets/img/gas-torch-detachable.png', alt: 'Gas torch (Detachable)', title: 'Gas Torch (Detachable Model)', badge: 'High-Temperature Endurance' },
  { src: '../assets/img/gas-torches.png', alt: 'Gas torches', title: 'Industrial Gas Torches', badge: 'Certified Multi-Gas Compatibility' },
  { src: '../assets/img/gt-18.png', alt: 'GT 18', title: 'GT 18 Heavy-Duty Torch', badge: 'Continuous High-Impact Duty' },
  { src: '../assets/img/gct.png', alt: 'GCT', title: 'GCT Gas Cutting Torch', badge: 'Clean Bevel & Precision Cuts' },
  { src: '../assets/img/gas-regulator-oxygen-2.png', alt: 'Gas regulator (oxygen) 2', title: 'Double-Stage Gas Regulator (Oxygen)', badge: 'Constant Pressure Delivery' },
  { src: '../assets/img/gas-regulator-oxygen-1.png', alt: 'Gas regulator (oxygen) 1', title: 'Single-Stage Gas Regulator (Oxygen)', badge: 'Durable Leak-Free Brass Body' }
];

// Progress bars HTML
const progressBarsHtml = slides.map((s, idx) => `
          <button class="pg-reel__bar-item${idx === 0 ? ' is-active' : ''}" data-index="${idx}" role="tab" aria-selected="${idx === 0 ? 'true' : 'false'}" aria-label="Slide ${idx + 1}: ${s.title}">
            <span class="pg-reel__bar-fill" style="width: ${idx === 0 ? '0%' : '0%'}"></span>
          </button>`).join('');

// Slides HTML
const slidesHtml = slides.map((s, idx) => `
        <div class="pg-reel__slide${idx === 0 ? ' is-active' : ''}" data-index="${idx}" data-title="${s.title}">
          <div class="pg-reel__media">
            <img src="${s.src}" decoding="async" alt="${s.alt}" loading="${idx < 2 ? 'eager' : 'lazy'}">
          </div>
          <div class="pg-reel__caption">
            <span class="pg-reel__badge-pill">${s.badge}</span>
            <h4 class="pg-reel__caption-title">${s.title}</h4>
          </div>
        </div>`).join('');

// 4 cards HTML - content 100% UNTOUCHED!
const cardsHtml = techData.cards.map((c, idx) => {
  const num = String(idx + 1).padStart(2, '0');
  return `
      <div class="pg-tech__card" tabindex="0" style="transition-delay:${idx * 70}ms">
        <div class="pg-tech__card-top">
          <span class="pg-tech__card-tag">CAPABILITY ${num}</span>
          <span class="pg-tech__icon">${c.svg}</span>
        </div>
        <h3 class="pg-tech__title">${c.title}</h3>
        <p class="pg-tech__desc">${c.desc}</p>
        <div class="pg-tech__card-line"></div>
      </div>`;
}).join('\n');

// Complete Section HTML
const newSectionHtml = `		<section class="pg-tech pg-tech--reel" id="pg-tech" data-pg-src="${Buffer.from(JSON.stringify(techData)).toString('base64')}">
  <div class="pg-tech__wrap">
    <div class="pg-tech__head">
      <div class="pg-tech__pill-badge">
        <span class="pg-tech__pill-pilot"><span class="pg-tech__pill-p">P</span>ILOT</span>
        <span class="pg-tech__pill-dot"></span>
        <span class="pg-tech__pill-text">Technical Excellence</span>
      </div>
      <h2 class="pg-tech__h2">${techData.heading}</h2>
      <p class="pg-tech__lead">${techData.subhead}</p>
    </div>

    <!-- Framer-Inspired ReelCarousel Component -->
    <div class="pg-reel" id="pg-reel" role="region" aria-roledescription="carousel" aria-label="Pilot Welding Equipment Reel Showcase" tabindex="0">
      <!-- Top Progress Bars & Playback Control -->
      <div class="pg-reel__header">
        <div class="pg-reel__bars" role="tablist" aria-label="Carousel slide progress">
${progressBarsHtml}
        </div>
        <button class="pg-reel__play-toggle" id="pg-reel-play-btn" type="button" aria-label="Pause slideshow" title="Pause / Play">
          <svg class="pg-reel__icon-pause" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="6" y="4" width="4" height="16" rx="1.5"></rect>
            <rect x="14" y="4" width="4" height="16" rx="1.5"></rect>
          </svg>
          <svg class="pg-reel__icon-play" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <polygon points="6,4 20,12 6,20"></polygon>
          </svg>
        </button>
      </div>

      <!-- Stage for High-Res Product Slides -->
      <div class="pg-reel__stage" id="pg-reel-stage">
${slidesHtml}
      </div>

      <!-- Left & Right Arrow Chevrons -->
      <button class="pg-reel__arrow pg-reel__arrow--prev" id="pg-reel-prev" type="button" aria-label="Previous image">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="15,18 9,12 15,6"></polyline>
        </svg>
      </button>
      <button class="pg-reel__arrow pg-reel__arrow--next" id="pg-reel-next" type="button" aria-label="Next image">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="9,18 15,12 9,6"></polyline>
        </svg>
      </button>

      <!-- Bottom Floating Product Info -->
      <div class="pg-reel__footer">
        <div class="pg-reel__info-pill">
          <span class="pg-reel__counter"><span class="pg-reel__counter-current" id="pg-reel-num">01</span><span class="pg-reel__counter-sep">/</span>09</span>
          <span class="pg-reel__info-sep"></span>
          <span class="pg-reel__active-name" id="pg-reel-caption-text">${slides[0].title}</span>
        </div>
        <div class="pg-reel__cert-pill">
          <span class="pg-reel__cert-dot"></span>
          ISI Certified Equipment
        </div>
      </div>
    </div>

    <!-- Revamped Cards Section Below Carousel (Content untouched) -->
    <div class="pg-tech__cards-bottom">
${cardsHtml}
    </div>
  </div>
</section>
<!-- /pg-tech -->`;

// 2. Splice into welding/index.html
let html = fs.readFileSync(WELDING_HTML, 'utf8');
const startMarker = '<section class="pg-tech" id="pg-tech"';
const endMarker = '<!-- /pg-tech -->';
const startIdx = html.indexOf(startMarker);
const endIdx = html.indexOf(endMarker);

if (startIdx < 0 || endIdx < 0) {
  console.error('Markers not found in welding/index.html!');
  process.exit(1);
}

const before = html.slice(0, startIdx);
const after = html.slice(endIdx + endMarker.length);
html = before + newSectionHtml + after;

// Cache bust css & js in welding/index.html
html = html.replace(/pg-tech\.css\?v=\d+/g, 'pg-tech.css?v=6');
html = html.replace(/pg-tech\.js\?v=\d+/g, 'pg-tech.js?v=6');

fs.writeFileSync(WELDING_HTML, html, 'utf8');
console.log('Successfully updated welding/index.html!');

// 3. Update pg-tech.css
const reelCss = `
/* ==========================================================================
   REEL CAROUSEL & REVAMPED BOTTOM CARDS (pg-tech--reel)
   Framer ReelCarousel component implementation for Technical Excellence
   ========================================================================== */

.pg-tech--reel {
  padding: 88px 0 96px;
  background: #ffffff;
  position: relative;
  overflow: hidden;
}

.pg-tech--reel .pg-tech__wrap {
  max-width: 1320px;
  margin: 0 auto;
  padding: 0 32px;
}

/* ---- Pill Badge matching live design ---- */
.pg-tech__pill-badge {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  background: #0d0f13;
  padding: 7px 22px 7px 18px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.12);
  margin-bottom: 24px;
}

.pg-tech__pill-pilot {
  font-family: var(--pi-font-heading, Roboto, system-ui, sans-serif);
  font-size: 14.5px;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: #ffffff;
  text-transform: uppercase;
}

.pg-tech__pill-p {
  color: var(--pi-accent, #f58634);
}

.pg-tech__pill-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--pi-accent, #f58634);
  box-shadow: 0 0 10px rgba(245, 134, 52, 0.9);
}

.pg-tech__pill-text {
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: rgba(255, 255, 255, 0.92);
}

.pg-tech--reel .pg-tech__head {
  max-width: 780px;
  margin: 0 auto 40px;
  text-align: center;
}

.pg-tech--reel .pg-tech__h2 {
  font-family: var(--pi-font-heading, Roboto, system-ui, sans-serif);
  font-size: clamp(32px, 3.6vw, 48px);
  font-weight: 800;
  letter-spacing: -0.025em;
  line-height: 1.15;
  color: #111114;
  margin: 0 0 16px;
}

.pg-tech--reel .pg-tech__lead {
  font-size: 16.5px;
  line-height: 1.7;
  color: #55575e;
  margin: 0;
}

/* ==========================================================================
   THE REEL CAROUSEL COMPONENT (.pg-reel)
   ========================================================================== */

.pg-reel {
  position: relative;
  width: 100%;
  height: 520px;
  border-radius: 28px;
  background: radial-gradient(85% 75% at 50% 50%, #ffffff 0%, #f7f3eb 100%);
  border: 1px solid rgba(17, 17, 17, 0.08);
  box-shadow: 0 16px 48px -12px rgba(0, 0, 0, 0.07), 0 2px 12px rgba(0, 0, 0, 0.02);
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
  outline: none;
}

.pg-reel:focus-visible {
  box-shadow: 0 0 0 3px rgba(245, 134, 52, 0.4), 0 16px 48px -12px rgba(0, 0, 0, 0.07);
}

/* ---- Top Header (Progress segments + Play/Pause) ---- */
.pg-reel__header {
  position: absolute;
  top: 22px;
  left: 26px;
  right: 26px;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 14px;
}

.pg-reel__bars {
  flex: 1;
  display: flex;
  gap: 6px;
  align-items: center;
}

.pg-reel__bar-item {
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

.pg-reel__bar-item:hover {
  background: rgba(17, 17, 17, 0.24);
  transform: scaleY(1.3);
}

.pg-reel__bar-fill {
  display: block;
  height: 100%;
  width: 0%;
  border-radius: 999px;
  background: var(--pi-accent, #f58634);
  transition: width 0.04s linear;
}

.pg-reel__play-toggle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(17, 17, 17, 0.08);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #1f2024;
  padding: 0;
  flex-shrink: 0;
  transition: all 0.25s ease;
}

.pg-reel__play-toggle:hover {
  background: #ffffff;
  transform: scale(1.08);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  color: var(--pi-accent, #f58634);
}

.pg-reel__play-toggle .pg-reel__icon-play {
  display: none;
}

.pg-reel__play-toggle.is-paused .pg-reel__icon-pause {
  display: none;
}

.pg-reel__play-toggle.is-paused .pg-reel__icon-play {
  display: block;
}

/* ---- Slides Stage ---- */
.pg-reel__stage {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.pg-reel__slide {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transform: scale(0.96) translateY(12px);
  transition: opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1), transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

.pg-reel__slide.is-active {
  opacity: 1;
  pointer-events: auto;
  transform: scale(1) translateY(0);
  z-index: 10;
}

.pg-reel__media {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 60px 80px 72px;
}

.pg-reel__media img {
  max-width: 90%;
  max-height: 85%;
  object-fit: contain;
  filter: drop-shadow(0 16px 36px rgba(0, 0, 0, 0.1));
  mix-blend-mode: multiply;
  transition: transform 0.4s ease;
}

.pg-reel:hover .pg-reel__slide.is-active .pg-reel__media img {
  transform: scale(1.02);
}

.pg-reel__caption {
  position: absolute;
  top: 76px;
  left: 28px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  pointer-events: none;
  z-index: 15;
}

.pg-reel__badge-pill {
  display: inline-block;
  align-self: flex-start;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--pi-accent, #f58634);
  background: rgba(245, 134, 52, 0.1);
  padding: 4px 12px;
  border-radius: 999px;
}

.pg-reel__caption-title {
  margin: 0;
  font-family: var(--pi-font-heading, Roboto, system-ui, sans-serif);
  font-size: 21px;
  font-weight: 700;
  color: #111114;
  letter-spacing: -0.015em;
}

/* ---- Side Arrow Chevrons ---- */
.pg-reel__arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(17, 17, 17, 0.08);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
  color: #111114;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 25;
  padding: 0;
  transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.pg-reel__arrow--prev { left: 22px; }
.pg-reel__arrow--next { right: 22px; }

.pg-reel__arrow:hover {
  background: #ffffff;
  transform: translateY(-50%) scale(1.12);
  box-shadow: 0 10px 28px rgba(245, 134, 52, 0.24);
  color: var(--pi-accent, #f58634);
}

.pg-reel__arrow svg {
  width: 22px;
  height: 22px;
}

/* ---- Bottom Floating Info Bar ---- */
.pg-reel__footer {
  position: absolute;
  bottom: 22px;
  left: 26px;
  right: 26px;
  z-index: 25;
  display: flex;
  align-items: center;
  justify-content: space-between;
  pointer-events: none;
}

.pg-reel__info-pill {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 8px 18px;
  border-radius: 999px;
  border: 1px solid rgba(17, 17, 17, 0.08);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  pointer-events: auto;
}

.pg-reel__counter {
  font-family: monospace, system-ui, sans-serif;
  font-size: 13px;
  font-weight: 800;
  color: var(--pi-accent, #f58634);
}

.pg-reel__info-sep {
  width: 1px;
  height: 14px;
  background: rgba(17, 17, 17, 0.15);
}

.pg-reel__active-name {
  font-size: 14.5px;
  font-weight: 700;
  color: #111114;
  letter-spacing: -0.01em;
}

.pg-reel__cert-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(13, 15, 19, 0.88);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 7px 16px;
  border-radius: 999px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.03em;
  pointer-events: auto;
}

.pg-reel__cert-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 8px #22c55e;
}

/* ==========================================================================
   REVAMPED CARDS BELOW (.pg-tech__cards-bottom)
   4 Columns on Desktop, 2 on Tablet, 1 on Mobile
   ========================================================================== */

.pg-tech__cards-bottom {
  margin-top: 48px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.pg-tech--reel .pg-tech__card {
  position: relative;
  background: #ffffff;
  border: 1px solid rgba(17, 17, 17, 0.09);
  border-radius: 20px;
  padding: 28px 24px 26px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
  display: flex;
  flex-direction: column;
  transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
  outline: none;
  overflow: hidden;
  height: 100%;
}

.pg-tech--reel .pg-tech__card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22px;
}

.pg-tech__card-tag {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: var(--pi-accent, #f58634);
  background: rgba(245, 134, 52, 0.08);
  padding: 4px 11px;
  border-radius: 999px;
}

.pg-tech--reel .pg-tech__icon {
  width: 50px;
  height: 50px;
  margin: 0;
  border-radius: 14px;
  background: rgba(245, 134, 52, 0.09);
  color: var(--pi-accent, #f58634);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.pg-tech--reel .pg-tech__icon svg {
  width: 26px;
  height: 26px;
}

.pg-tech--reel .pg-tech__icon svg path {
  fill: currentColor !important;
}

.pg-tech--reel .pg-tech__title {
  font-family: var(--pi-font-heading, Roboto, system-ui, sans-serif);
  font-size: 19px;
  font-weight: 700;
  line-height: 1.3;
  color: #111114;
  margin: 0 0 10px;
  transition: color 0.3s ease;
}

.pg-tech--reel .pg-tech__desc {
  font-size: 14px;
  line-height: 1.68;
  color: #55575e;
  margin: 0;
  flex: 1;
}

.pg-tech__card-line {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--pi-accent, #f58634), #ffaa66);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

/* Hover & Focus Interactions */
.pg-tech--reel .pg-tech__card:hover,
.pg-tech--reel .pg-tech__card:focus-visible {
  transform: translateY(-8px);
  border-color: rgba(245, 134, 52, 0.35);
  box-shadow: 0 20px 42px -12px rgba(245, 134, 52, 0.16), 0 6px 20px rgba(0, 0, 0, 0.04);
}

.pg-tech--reel .pg-tech__card:hover .pg-tech__icon,
.pg-tech--reel .pg-tech__card:focus-visible .pg-tech__icon {
  background: linear-gradient(135deg, #f58634 0%, #ee7418 100%);
  color: #ffffff;
  transform: scale(1.08) rotate(2deg);
  box-shadow: 0 6px 18px rgba(245, 134, 52, 0.3);
}

.pg-tech--reel .pg-tech__card:hover .pg-tech__title,
.pg-tech--reel .pg-tech__card:focus-visible .pg-tech__title {
  color: var(--pi-accent, #f58634);
}

.pg-tech--reel .pg-tech__card:hover .pg-tech__card-line,
.pg-tech--reel .pg-tech__card:focus-visible .pg-tech__card-line {
  transform: scaleX(1);
}

/* ==========================================================================
   RESPONSIVE BREAKPOINTS FOR REEL LAYOUT
   ========================================================================== */

@media (max-width: 1100px) {
  .pg-tech--reel .pg-tech__wrap { padding: 0 24px; }
  .pg-reel { height: 460px; }
  .pg-tech__cards-bottom {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
}

@media (max-width: 768px) {
  .pg-tech--reel { padding: 64px 0 72px; }
  .pg-reel { height: 420px; border-radius: 22px; }
  .pg-reel__caption { display: none; }
  .pg-reel__arrow { width: 40px; height: 40px; }
  .pg-reel__arrow--prev { left: 14px; }
  .pg-reel__arrow--next { right: 14px; }
  .pg-reel__footer { bottom: 14px; left: 16px; right: 16px; }
  .pg-reel__cert-pill { display: none; }
}

@media (max-width: 640px) {
  .pg-tech--reel { padding: 54px 0 64px; }
  .pg-tech--reel .pg-tech__wrap { padding: 0 18px; }
  .pg-reel { height: 350px; border-radius: 18px; }
  .pg-reel__media { padding: 44px 50px 54px; }
  .pg-reel__header { top: 14px; left: 14px; right: 14px; gap: 8px; }
  .pg-reel__bars { gap: 4px; }
  .pg-reel__play-toggle { width: 30px; height: 30px; }
  .pg-tech__cards-bottom {
    grid-template-columns: 1fr;
    gap: 16px;
    margin-top: 32px;
  }
  .pg-tech--reel .pg-tech__card { padding: 24px 20px; }
}
`;

// Check if already in pg-tech.css
let css = fs.readFileSync(CSS_FILE, 'utf8');
if (!css.includes('.pg-tech--reel')) {
  css += '\n' + reelCss;
  fs.writeFileSync(CSS_FILE, css, 'utf8');
  console.log('Appended Reel styles to pg-tech.css!');
} else {
  // Replace existing definition
  const marker = '/* ==========================================================================\n   REEL CAROUSEL & REVAMPED BOTTOM CARDS (pg-tech--reel)';
  const at = css.indexOf(marker);
  if (at >= 0) {
    css = css.slice(0, at) + reelCss;
    fs.writeFileSync(CSS_FILE, css, 'utf8');
    console.log('Updated Reel styles in pg-tech.css!');
  }
}

// 4. Update pg-tech.js with ReelCarousel Controller
const reelJs = `
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
`;

let js = fs.readFileSync(JS_FILE, 'utf8');
if (!js.includes('initReelCarousel')) {
  // Insert before ending
  const lastParen = js.lastIndexOf('})();');
  if (lastParen >= 0) {
    js = js.slice(0, lastParen) + reelJs + '\n})();\n';
    fs.writeFileSync(JS_FILE, js, 'utf8');
    console.log('Appended Reel controller to pg-tech.js!');
  }
} else {
  // Replace existing
  const at = js.indexOf('// 3. Reel Carousel Controller');
  const lastParen = js.lastIndexOf('})();');
  if (at >= 0 && lastParen >= 0) {
    js = js.slice(0, at) + reelJs + '\n})();\n';
    fs.writeFileSync(JS_FILE, js, 'utf8');
    console.log('Updated Reel controller in pg-tech.js!');
  }
}

console.log('All changes applied successfully!');
