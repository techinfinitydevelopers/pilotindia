const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'pilotindia-clone', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Backup original index.html first if not backed up
const backupPath = path.join(__dirname, '..', 'pilotindia-clone', 'index.html.bak');
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, html);
  console.log('Created backup index.html.bak');
}

// 1. Add step-flow.css in <head>
if (!html.includes('theme/step-flow.css')) {
  html = html.replace(
    '<link rel="stylesheet" href="theme/theme.css" />',
    '<link rel="stylesheet" href="theme/theme.css" />\n<link rel="stylesheet" href="theme/step-flow.css" />'
  );
  console.log('Added step-flow.css link');
}

// 2. Add step-flow.js before </body>
if (!html.includes('theme/step-flow.js')) {
  html = html.replace(
    '<script src="assets/js/pi-nav.js" defer></script>',
    '<script src="assets/js/pi-nav.js" defer></script>\n<script src="theme/step-flow.js" defer></script>'
  );
  console.log('Added step-flow.js script');
}

// 3. Replace the slider sections (et_pb_section_0 and et_pb_section_1)
const startMarker = '<div class="et_pb_section et_pb_section_0 et_pb_fullwidth_section et_section_regular" >';
const endMarker = '</div>\t\t</div>\n\t</div>\n\t\t\t\t\t\t</div>';

const startIdx = html.indexOf(startMarker);
const endIdx = html.indexOf(endMarker);

console.log('startIdx:', startIdx, 'endIdx:', endIdx);

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not find markers for slider replacement!');
  process.exit(1);
}

const stepFlowHTML = `
		<!-- Framer Step Flow Hero Section -->
		<section class="step-flow-section" id="hero-step-flow">
			<div class="step-flow-wrapper">
				<div class="step-flow-container">
					
					<!-- Left: Interactive Steps List -->
					<div class="step-flow-steps-col">
						<ul class="step-flow-steps-list" role="tablist">
							<!-- Animated Sliding Pill Indicator -->
							<div class="step-flow-pill-indicator" aria-hidden="true"></div>

							<!-- Step 01 -->
							<li class="step-flow-item is-active" role="tab" tabindex="0" aria-selected="true" data-index="0">
								<div class="step-flow-item-content">
									<span class="step-flow-serial">01</span>
									<h2 class="step-flow-title">SPRAY GUNS</h2>
								</div>
								<span class="step-flow-arrow" aria-hidden="true">
									<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
								</span>
							</li>

							<!-- Step 02 -->
							<li class="step-flow-item" role="tab" tabindex="0" aria-selected="false" data-index="1">
								<div class="step-flow-item-content">
									<span class="step-flow-serial">02</span>
									<h2 class="step-flow-title">AIRLESS SPRAY SYSTEMS</h2>
								</div>
								<span class="step-flow-arrow" aria-hidden="true">
									<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
								</span>
							</li>

							<!-- Step 03 -->
							<li class="step-flow-item" role="tab" tabindex="0" aria-selected="false" data-index="2">
								<div class="step-flow-item-content">
									<span class="step-flow-serial">03</span>
									<h2 class="step-flow-title">POWER TOOLS</h2>
								</div>
								<span class="step-flow-arrow" aria-hidden="true">
									<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
								</span>
							</li>

							<!-- Step 04 -->
							<li class="step-flow-item" role="tab" tabindex="0" aria-selected="false" data-index="3">
								<div class="step-flow-item-content">
									<span class="step-flow-serial">04</span>
									<h2 class="step-flow-title">WELDING EQUIPMENTS</h2>
								</div>
								<span class="step-flow-arrow" aria-hidden="true">
									<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
								</span>
							</li>

							<!-- Step 05 -->
							<li class="step-flow-item" role="tab" tabindex="0" aria-selected="false" data-index="4">
								<div class="step-flow-item-content">
									<span class="step-flow-serial">05</span>
									<h2 class="step-flow-title">NOTE COUNTING MACHINES</h2>
								</div>
								<span class="step-flow-arrow" aria-hidden="true">
									<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
								</span>
							</li>

							<!-- Step 06 -->
							<li class="step-flow-item" role="tab" tabindex="0" aria-selected="false" data-index="5">
								<div class="step-flow-item-content">
									<span class="step-flow-serial">06</span>
									<h2 class="step-flow-title">PAPER SHREDDERS</h2>
								</div>
								<span class="step-flow-arrow" aria-hidden="true">
									<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
								</span>
							</li>
						</ul>
					</div>

					<!-- Right: Image Showcase Frame -->
					<div class="step-flow-image-col">
						<div class="step-flow-image-frame">

							<!-- Slide 01: Spray Guns -->
							<div class="step-flow-image-slide is-active" data-index="0">
								<img src="assets/img/spray-guns1-scaled.jpg" alt="Spray Guns" loading="eager" />
								<div class="step-flow-image-overlay">
									<div class="step-flow-image-badge"><span></span> Step 01 &bull; Surface Coating</div>
									<h3 class="step-flow-image-title">SPRAY GUNS</h3>
									<a href="spray-guns/" class="step-flow-image-cta">
										<span>Explore Collection</span>
										<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
									</a>
								</div>
							</div>

							<!-- Slide 02: Airless Spray Systems -->
							<div class="step-flow-image-slide" data-index="1">
								<img src="assets/img/airless-spray-systems-scaled.jpg" alt="Airless Spray Systems" loading="lazy" />
								<div class="step-flow-image-overlay">
									<div class="step-flow-image-badge"><span></span> Step 02 &bull; Industrial Airless</div>
									<h3 class="step-flow-image-title">AIRLESS SPRAY SYSTEMS</h3>
									<a href="airless/" class="step-flow-image-cta">
										<span>Explore Collection</span>
										<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
									</a>
								</div>
							</div>

							<!-- Slide 03: Power Tools -->
							<div class="step-flow-image-slide" data-index="2">
								<img src="assets/img/img-5657-scaled.jpeg" alt="Power Tools" loading="lazy" />
								<div class="step-flow-image-overlay">
									<div class="step-flow-image-badge"><span></span> Step 03 &bull; Heavy Duty</div>
									<h3 class="step-flow-image-title">POWER TOOLS</h3>
									<a href="pages/power-tools.html" class="step-flow-image-cta">
										<span>Explore Collection</span>
										<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
									</a>
								</div>
							</div>

							<!-- Slide 04: Welding Equipments -->
							<div class="step-flow-image-slide" data-index="3">
								<img src="assets/img/welding-equipments-scaled.jpg" alt="Welding Equipments" loading="lazy" />
								<div class="step-flow-image-overlay">
									<div class="step-flow-image-badge"><span></span> Step 04 &bull; Welding &amp; Cutting</div>
									<h3 class="step-flow-image-title">WELDING EQUIPMENTS</h3>
									<a href="welding/" class="step-flow-image-cta">
										<span>Explore Collection</span>
										<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
									</a>
								</div>
							</div>

							<!-- Slide 05: Note Counting Machines -->
							<div class="step-flow-image-slide" data-index="4">
								<img src="assets/img/note-counting-machines-scaled.jpg" alt="Note Counting Machines" loading="lazy" />
								<div class="step-flow-image-overlay">
									<div class="step-flow-image-badge"><span></span> Step 05 &bull; Office Automation</div>
									<h3 class="step-flow-image-title">NOTE COUNTING MACHINES</h3>
									<a href="office/currency-counters.html" class="step-flow-image-cta">
										<span>Explore Collection</span>
										<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
									</a>
								</div>
							</div>

							<!-- Slide 06: Paper Shredders -->
							<div class="step-flow-image-slide" data-index="5">
								<img src="assets/img/paper-shrdr-scaled.jpg" alt="Paper Shredders" loading="lazy" />
								<div class="step-flow-image-overlay">
									<div class="step-flow-image-badge"><span></span> Step 06 &bull; Secure Document Shredding</div>
									<h3 class="step-flow-image-title">PAPER SHREDDERS</h3>
									<a href="office/paper-shredders.html" class="step-flow-image-cta">
										<span>Explore Collection</span>
										<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
									</a>
								</div>
							</div>

						</div>
					</div>

				</div>
			</div>
		</section>
`;

html = html.slice(0, startIdx) + stepFlowHTML.trim() + '\n\t\t\t' + html.slice(endIdx);
fs.writeFileSync(indexPath, html);
console.log('Successfully replaced hero slider with Framer Step Flow component!');
