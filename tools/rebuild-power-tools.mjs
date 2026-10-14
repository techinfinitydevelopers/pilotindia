import fs from 'node:fs';
import path from 'node:path';

const CLONE = path.join(process.cwd(), 'pilotindia-clone');
const FILE = path.join(CLONE, 'pages', 'power-tools.html');

let html = fs.readFileSync(FILE, 'utf8');

// 1. Extract head section
const headMatch = html.match(/<head>([\s\S]*?)<\/head>/);
if (!headMatch) throw new Error('Head not found');
let headInner = headMatch[1];

// Ensure all required stylesheets are in head
const requiredCss = [
  '<script>document.documentElement.setAttribute(\'data-pi-acc\',\'\');</script>',
  '<script>document.documentElement.setAttribute(\'data-pgs-js\',\'\');</script>',
  '<link rel="stylesheet" href="../theme/theme.css" />',
  '<link rel="stylesheet" href="../assets/css/pg-features.css" />',
  '<link rel="stylesheet" href="../assets/css/bento-trust.css?v=14" />',
  '<link rel="stylesheet" href="../assets/css/pg-marquee.css" />',
  '<link rel="stylesheet" href="../assets/css/pg-hero-fit.css?v=2" />',
  '<link rel="stylesheet" href="../assets/css/pg-hero-coll.css?v=17" />',
  '<link rel="stylesheet" href="../assets/css/pi-nav.css" />',
  '<link rel="stylesheet" href="../assets/css/pi-footer2.css" />',
  '<link rel="stylesheet" href="../assets/css/pg-tech.css?v=9" />',
  '<link rel="stylesheet" href="../assets/css/pg-chain.css?v=7" />',
  '<link rel="stylesheet" href="../assets/css/pg-fan.css?v=5" />',
  '<link rel="stylesheet" href="../assets/css/pg-series.css" />',
  '<link rel="stylesheet" href="../assets/css/pi-accordion.css?v=1" />'
];

// Clean existing duplicate stylesheet links from headInner and insert our canonical set
requiredCss.forEach(tag => {
  const hrefMatch = tag.match(/href="([^"]+)"/);
  if (hrefMatch) {
    const re = new RegExp('<link[^>]*href="' + hrefMatch[1].replace('?', '\\?').replace('.', '\\.') + '"[^>]*>', 'g');
    headInner = headInner.replace(re, '');
  }
  const scriptMatch = tag.match(/setAttribute\('([^']+)'/);
  if (scriptMatch) {
    const re = new RegExp('<script[^>]*setAttribute\\(\'' + scriptMatch[1] + '\'[\\s\\S]*?<\\/script>', 'g');
    headInner = headInner.replace(re, '');
  }
});

// Remove any lingering legacy stylesheet links
headInner = headInner.replace(/<link rel="stylesheet" href="\.\.\/assets\/css\/pi-footer\.css"[^>]*>/g, '');

const cleanHead = `<head>
${requiredCss.join('\n')}
${headInner.trim()}
</head>`;

// 2. Extract product cards (desk + mob)
const prodDeskRegex = /<div class="et_pb_section et_pb_section_\d+ et_section_regular pg-prod pg-prod--desk"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/g;
const prodMobRegex = /<div class="et_pb_section et_pb_section_\d+ et_section_regular pg-prod pg-prod--mob"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/g;

const prodDeskMatches = html.match(prodDeskRegex) || [];
const prodMobMatches = html.match(prodMobRegex) || [];

console.log(`Found ${prodDeskMatches.length} desk model cards and ${prodMobMatches.length} mobile model cards`);

// 3. Extract Why Choose section (Elementor container)
const whyChooseMatch = html.match(/<div class="elementor-element elementor-element-e761720[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/);
const whyChooseHtml = whyChooseMatch ? whyChooseMatch[0] : '';

// 4. Extract FAQ section
const faqMatch = html.match(/<section class="pi-faq" id="faq">[\s\S]*?<\/section>/);
const faqHtml = faqMatch ? faqMatch[0] : '';

// 5. Extract Footer
const footerMatch = html.match(/<footer class="pi-f2" id="pi-footer">[\s\S]*?<\/footer>/);
const footerHtml = footerMatch ? footerMatch[0] : '';

// 6. Canonical Hero
const heroHtml = `				<div class="elementor-element elementor-element-bf681cd e-con-full e-flex e-con e-parent" data-id="bf681cd" data-element_type="container" data-e-type="container" id="select-series-re" data-settings="{&quot;background_background&quot;:&quot;classic&quot;}" style="--pi-hero:url('../assets/img/untitled-design.png')">
				<!-- pi-sg-hero:start -->
<div class="pi-sg-hero">
  <div class="pi-sg-hero__copy">
    <p class="pi-sg-hero__eyebrow">Pilot Power Tools</p>
    <h2 class="pi-sg-hero__title"><span>Power built for</span> <span>demanding work?</span> <em>Meet your match.</em></h2>
    <p class="pi-sg-hero__sub">Heat guns, blowers and more — engineered for automotive, industrial, and household maintenance tasks.</p>
    <div class="pi-sg-hero__cta">
      <a class="pi-sg-hero__btn" href="#model-hg-25">Explore products<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 5.3 19.9 12l-6.7 6.7-1.4-1.4 4.3-4.3H4v-2h12.1l-4.3-4.3z"/></svg></a>
      <a class="pi-sg-hero__btn pi-sg-hero__btn--ghost" href="contact-us.html">Talk to our team</a>
    </div>
  </div>
  <nav class="pi-coll" id="pi-coll" style="--n:3" aria-label="Products">
    <p class="pi-coll__label" data-n="03">Select a product</p>
    <ul class="pi-coll__list">
      <li><a class="pi-coll__card" href="#model-hg-25">
        <span class="pi-coll__img"><img src="../assets/img/hg-25.jpg" alt="HG-25 Heat Gun" width="120" height="120" loading="lazy"></span>
        <span class="pi-coll__txt"><span class="pi-coll__num">01</span><span class="pi-coll__name">HG-25 Heat Gun</span><span class="pi-coll__note">Industrial heat &amp; stripping</span></span>
        <span class="pi-coll__go"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 5.3 19.9 12l-6.7 6.7-1.4-1.4 4.3-4.3H4v-2h12.1l-4.3-4.3z"/></svg></span>
      </a></li>
      <li><a class="pi-coll__card" href="#model-bl-25">
        <span class="pi-coll__img"><img src="../assets/img/bl-25.jpg" alt="BL-25 Blower" width="120" height="120" loading="lazy"></span>
        <span class="pi-coll__txt"><span class="pi-coll__num">02</span><span class="pi-coll__name">BL-25 Blower</span><span class="pi-coll__note">High-power blower &amp; vacuum</span></span>
        <span class="pi-coll__go"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 5.3 19.9 12l-6.7 6.7-1.4-1.4 4.3-4.3H4v-2h12.1l-4.3-4.3z"/></svg></span>
      </a></li>
      <li><a class="pi-coll__card" href="#model-bl-26vs">
        <span class="pi-coll__img"><img src="../assets/img/bl-25vs.png" alt="BL-26VS Variable Speed Blower" width="120" height="120" loading="lazy"></span>
        <span class="pi-coll__txt"><span class="pi-coll__num">03</span><span class="pi-coll__name">BL-26VS Blower</span><span class="pi-coll__note">Variable speed, dual function</span></span>
        <span class="pi-coll__go"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 5.3 19.9 12l-6.7 6.7-1.4-1.4 4.3-4.3H4v-2h12.1l-4.3-4.3z"/></svg></span>
      </a></li>
    </ul>
  </nav>
</div>
<!-- pi-sg-hero:end -->
				</div>`;

// 7. Canonical Marquee
const marqueeHtml = `<!-- ══════════ MARQUEE BAR ══════════ -->
<div class="pg-marquee" aria-hidden="true">
  <div class="pg-marquee__track">
    <span class="pg-marquee__item">HG-25 · Heat Gun</span>
    <span class="pg-marquee__sep">◆</span>
    <span class="pg-marquee__item">BL-25 · Blower</span>
    <span class="pg-marquee__sep">◆</span>
    <span class="pg-marquee__item">BL-26VS · Variable Blower</span>
    <span class="pg-marquee__sep">◆</span>
    <span class="pg-marquee__item">Industrial Power Tools</span>
    <span class="pg-marquee__sep">◆</span>
    <span class="pg-marquee__item">ISI Certified</span>
    <span class="pg-marquee__sep">◆</span>
    <span class="pg-marquee__item">HG-25 · Heat Gun</span>
    <span class="pg-marquee__sep">◆</span>
    <span class="pg-marquee__item">BL-25 · Blower</span>
    <span class="pg-marquee__sep">◆</span>
    <span class="pg-marquee__item">BL-26VS · Variable Blower</span>
    <span class="pg-marquee__sep">◆</span>
    <span class="pg-marquee__item">Industrial Power Tools</span>
    <span class="pg-marquee__sep">◆</span>
    <span class="pg-marquee__item">ISI Certified</span>
    <span class="pg-marquee__sep">◆</span>
  </div>
</div>`;

// 8. Canonical Bento Trust Grid
const bentoHtml = `<!-- ══════════ BENTO TRUST GRID ══════════ -->
<section class="bento" id="trust" aria-labelledby="bento-title">
  <div class="bento__wrap">
    <header class="bento__head"><h2 class="bento__h2" id="bento-title">Achieve Precision And Performance With Pilot Power Tools</h2></header>
    <div class="bento__grid">
      <article class="bento__card bento__card--a">
        <span class="bento__num">01</span>
        <span class="bento__icon"><img src="../assets/img/screenshot-2026-07-10-172953.png" alt="" width="44" height="44" loading="lazy" decoding="async"></span>
        <h3 class="bento__t">High Performance Output</h3>
        <p class="bento__d">PILOT Power Tools delivers strong, consistent power, ensuring efficient operation and professional results across industrial, automotive, and workshop applications. Engineered with precision motors and optimized airflow, each tool offers reliable output that meets the demands of heavy-duty professional use.</p>
      </article>
      <article class="bento__card bento__card--b">
        <span class="bento__num">02</span>
        <span class="bento__icon"><img src="../assets/img/screenshot-2026-07-10-173045.png" alt="" width="44" height="44" loading="lazy" decoding="async"></span>
        <h3 class="bento__t">Built for Durability</h3>
        <p class="bento__d">Engineered with premium-grade components and robust construction, PILOT Power Tools are designed to withstand demanding workloads and deliver long-lasting, reliable performance even in tough working conditions. Every tool undergoes rigorous quality checks to ensure consistent strength, stability, and dependability across years of use.</p>
      </article>
      <article class="bento__card bento__card--c">
        <span class="bento__num">03</span>
        <span class="bento__icon"><img src="../assets/img/screenshot-2026-07-10-173151.png" alt="" width="44" height="44" loading="lazy" decoding="async"></span>
        <h3 class="bento__t">Ergonomic Comfort</h3>
        <p class="bento__d">With balanced grips, PILOT Power Tools reduce user fatigue and offer superior handling, allowing professionals to work longer with greater precision and comfort. Thoughtful design elements like easy-grip handles and well-distributed weight enhance control during extended operation.</p>
      </article>
      <article class="bento__card bento__card--d">
        <span class="bento__num">04</span>
        <span class="bento__icon"><img src="../assets/img/screenshot-2026-07-10-173303.png" alt="" width="44" height="44" loading="lazy" decoding="async"></span>
        <h3 class="bento__t">Versatile Applications</h3>
        <p class="bento__d">From paint stripping and shrink packaging to industrial cleaning and automotive refinishing, PILOT Power Tools are built to handle a wide range of tasks, making them ideal for both professional and everyday use. Their adaptability across industries makes them a smart, all-in-one solution for workshops, factories, and households alike.</p>
      </article>
      <article class="bento__card bento__card--e">
        <span class="bento__num">05</span>
        <span class="bento__icon"><img src="../assets/img/screenshot-2026-07-10-173351.png" alt="" width="44" height="44" loading="lazy" decoding="async"></span>
        <h3 class="bento__t">Easy Maintenance and Reliable Support</h3>
        <p class="bento__d">With readily available genuine spares and strong support, PILOT Power Tools ensure minimal downtime and uninterrupted productivity, keeping your work running smoothly every day. Our dedicated service network provides quick assistance and expert guidance, helping you get the most out of every tool you own.</p>
      </article>
    </div>
  </div>
</section>
<!-- /bento -->`;

// 9. Canonical Applications Carousel (pg-chain)
const chainHtml = `<!-- ══════════ APPLICATIONS CAROUSEL (pg-chain) ══════════ -->
<section class="pg-chain" id="pg-chain">
  <div class="pg-chain__intro">
    <h2 class="pg-chain__h2">Professional <em>Power Tool</em> Applications</h2>
    <p class="pg-chain__lead">Pilot power tools are engineered for precision and durability across a wide range of industrial and household applications. From paint stripping and vinyl wrapping to automotive maintenance and industrial cleaning, each tool delivers consistent high performance with every use.</p>
    <a class="pg-chain__ghost" href="#model-hg-25">VIEW PRODUCTS</a>
  </div>
  <div class="pg-chain__stage" role="region" aria-roledescription="carousel" aria-label="Power Tool Applications">
    <article class="pg-chain__card is-active" data-index="0" tabindex="-1" aria-roledescription="slide" aria-label="1 of 3: Heat &amp; Thermal Work">
      <div class="pg-chain__body">
        <div class="pg-chain__text">
          <span class="pg-chain__num">01</span>
          <h3 class="pg-chain__title">Heat &amp; Thermal Work</h3>
          <p class="pg-chain__quote">&ldquo;The HG-25 Heat Gun delivers precision temperature control from 220–650°C, making it ideal for paint stripping, vinyl wrapping, tube bending, and shrink packaging. With dual-speed settings and overheat protection, it performs reliably through extended professional use.&rdquo;</p>
          <a class="pg-chain__cta" href="#model-hg-25">View HG-25 Heat Gun<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 5.3 19.9 12l-6.7 6.7-1.4-1.4 4.3-4.3H4v-2h12.1l-4.3-4.3z"/></svg></a>
        </div>
        <div class="pg-chain__media" data-fit="cover"><img src="../assets/img/hg-25.jpg" alt="HG-25 Heat Gun" loading="lazy" decoding="async" draggable="false"></div>
      </div>
      <img class="pg-chain__pill" src="../assets/img/hg-25.jpg" alt="" aria-hidden="true" loading="lazy" decoding="async" draggable="false">
    </article>
    <article class="pg-chain__card is-next-1" data-index="1" tabindex="0" aria-roledescription="slide" aria-label="2 of 3: Automotive &amp; Workshop Cleaning">
      <div class="pg-chain__body">
        <div class="pg-chain__text">
          <span class="pg-chain__num">02</span>
          <h3 class="pg-chain__title">Automotive &amp; Workshop Cleaning</h3>
          <p class="pg-chain__quote">&ldquo;The BL-25 Blower generates powerful 120 CFM airflow at 16,000 rpm for fast and efficient clearing of dust, debris, and moisture. Its dual blower-vacuum function makes it indispensable for automotive detailing, workshop maintenance, and industrial housekeeping.&rdquo;</p>
          <a class="pg-chain__cta" href="#model-bl-25">View BL-25 Blower<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 5.3 19.9 12l-6.7 6.7-1.4-1.4 4.3-4.3H4v-2h12.1l-4.3-4.3z"/></svg></a>
        </div>
        <div class="pg-chain__media" data-fit="cover"><img src="../assets/img/bl-25.jpg" alt="BL-25 Blower" loading="lazy" decoding="async" draggable="false"></div>
      </div>
      <img class="pg-chain__pill" src="../assets/img/bl-25.jpg" alt="" aria-hidden="true" loading="lazy" decoding="async" draggable="false">
    </article>
    <article class="pg-chain__card is-prev-1" data-index="2" tabindex="0" aria-roledescription="slide" aria-label="3 of 3: Variable-Speed Versatility">
      <div class="pg-chain__body">
        <div class="pg-chain__text">
          <span class="pg-chain__num">03</span>
          <h3 class="pg-chain__title">Variable-Speed Versatility</h3>
          <p class="pg-chain__quote">&ldquo;The BL-26VS adds variable speed control to the proven BL-25 platform, offering ultimate airflow flexibility for delicate cleaning tasks alongside full-power industrial clearing. The dual blower-vacuum operation adapts seamlessly to every job on site.&rdquo;</p>
          <a class="pg-chain__cta" href="#model-bl-26vs">View BL-26VS Blower<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 5.3 19.9 12l-6.7 6.7-1.4-1.4 4.3-4.3H4v-2h12.1l-4.3-4.3z"/></svg></a>
        </div>
        <div class="pg-chain__media" data-fit="cover"><img src="../assets/img/bl-25vs.png" alt="BL-26VS Variable Speed Blower" loading="lazy" decoding="async" draggable="false"></div>
      </div>
      <img class="pg-chain__pill" src="../assets/img/bl-25vs.png" alt="" aria-hidden="true" loading="lazy" decoding="async" draggable="false">
    </article>
  </div>
  <div class="pg-chain__dots" role="tablist" aria-label="Choose an application">
    <button class="pg-chain__dot is-active" type="button" role="tab" aria-selected="true" aria-label="Heat &amp; Thermal Work" data-index="0"><span class="pg-chain__fill"></span></button>
    <button class="pg-chain__dot" type="button" role="tab" aria-selected="false" aria-label="Automotive &amp; Workshop Cleaning" data-index="1"><span class="pg-chain__fill"></span></button>
    <button class="pg-chain__dot" type="button" role="tab" aria-selected="false" aria-label="Variable-Speed Versatility" data-index="2"><span class="pg-chain__fill"></span></button>
  </div>
</section>
<!-- /pg-chain -->`;

// 10. Canonical Technical Excellence with 3D Scale Fan Carousel
const techHtml = `<!-- ══════════ TECHNICAL EXCELLENCE (3D Scale Fan Carousel) ══════════ -->
<section class="pg-tech pg-tech--sc3d pg-tech--fan" id="pg-tech">
  <div class="pg-tech__wrap">

    <!-- Section Header -->
    <div class="pg-tech__head">
      <div class="pg-tech__pill-badge">
        <span class="pg-tech__pill-pilot"><span class="pg-tech__pill-p">P</span>ILOT</span>
        <span class="pg-tech__pill-dot"></span>
        <span class="pg-tech__pill-text">Technical Excellence</span>
      </div>
      <h2 class="pg-tech__h2">Technical Excellence</h2>
      <p class="pg-tech__lead">Discover the precision engineering behind our industrial power tools. Every motor, fan, and heating element is optimized for maximum efficiency, thermal safety, and flawless output.</p>
    </div>

    <!-- ═══ 3-D SCALE CAROUSEL (Middle front highlighted, side receding, auto-scrolling, no text names) ═══ -->
    <div class="pg-fan" id="pg-fan" role="region" aria-roledescription="carousel" aria-label="Pilot Power Tools Showcase">
      <div class="pg-fan__stage" tabindex="0" aria-live="off">
        <span class="pg-fan__mark pg-fan__mark--l" aria-hidden="true"></span><span class="pg-fan__mark pg-fan__mark--r" aria-hidden="true"></span>
        <button type="button" class="pg-fan__tile" aria-label="HG-25 Heat Gun (1 of 10)"><img src="../assets/img/hg-25.jpg" alt="HG-25 Heat Gun" loading="lazy" decoding="async" draggable="false" /></button>
        <button type="button" class="pg-fan__tile" aria-label="BL-25 Blower (2 of 10)"><img src="../assets/img/bl-25.jpg" alt="BL-25 Blower" loading="lazy" decoding="async" draggable="false" /></button>
        <button type="button" class="pg-fan__tile" aria-label="BL-26VS Variable Blower (3 of 10)"><img src="../assets/img/bl-25vs.png" alt="BL-26VS Variable Blower" loading="lazy" decoding="async" draggable="false" /></button>
        <button type="button" class="pg-fan__tile" aria-label="Vehicle Wrapping (4 of 10)"><img src="../assets/img/hg-25-1.jpg" alt="Vehicle Wrapping" loading="lazy" decoding="async" draggable="false" /></button>
        <button type="button" class="pg-fan__tile" aria-label="Paint Stripping (5 of 10)"><img src="../assets/img/hg-25-2.jpg" alt="Paint Stripping" loading="lazy" decoding="async" draggable="false" /></button>
        <button type="button" class="pg-fan__tile" aria-label="Tube Bending (6 of 10)"><img src="../assets/img/hg-25-3.jpg" alt="Tube Bending" loading="lazy" decoding="async" draggable="false" /></button>
        <button type="button" class="pg-fan__tile" aria-label="Shrink Packaging (7 of 10)"><img src="../assets/img/hg-25-4.jpg" alt="Shrink Packaging" loading="lazy" decoding="async" draggable="false" /></button>
        <button type="button" class="pg-fan__tile" aria-label="Automotive Detailing (8 of 10)"><img src="../assets/img/2.png" alt="Automotive Detailing" loading="lazy" decoding="async" draggable="false" /></button>
        <button type="button" class="pg-fan__tile" aria-label="Household Maintenance (9 of 10)"><img src="../assets/img/3.png" alt="Household Maintenance" loading="lazy" decoding="async" draggable="false" /></button>
        <button type="button" class="pg-fan__tile" aria-label="Industrial Cleaning (10 of 10)"><img src="../assets/img/4.png" alt="Industrial Cleaning" loading="lazy" decoding="async" draggable="false" /></button>
      </div>
    </div><!-- /sc3d / fan -->

    <!-- 4 Capability Cards -->
    <div class="pg-tech__cards">
      <article class="pg-tech__card" tabindex="0" style="transition-delay:0ms">
        <div class="pg-tech__card-top"><span class="pg-tech__card-no">01</span><span class="pg-tech__icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="300" height="300"><path d="m402.79 443.418c-2.205 0-4.407-.845-6.087-2.524-3.353-3.364-3.344-8.81.017-12.163 39.39-39.276 61.085-91.539 61.085-147.161 0-114.583-93.221-207.804-207.807-207.804-114.582 0-207.804 93.221-207.804 207.804 0 55.504 21.616 107.69 60.864 146.943 3.358 3.359 3.358 8.799 0 12.157-3.359 3.359-8.799 3.359-12.157 0-42.496-42.5-65.901-99.003-65.901-159.1 0-124.065 100.934-224.999 224.998-224.999 124.067 0 225.002 100.934 225.002 224.999 0 60.226-23.489 116.813-66.139 159.341-1.68 1.673-3.874 2.507-6.071 2.507z" fill="#e09900"></path><path d="m249.998 128.083c-4.749 0-8.597-3.848-8.597-8.597v-28.657c0-4.749 3.848-8.598 8.597-8.598s8.598 3.848 8.598 8.598v28.658c0 4.749-3.849 8.596-8.598 8.596z" fill="#e09900"></path><path d="m305.436 137.862c-.977 0-1.97-.168-2.941-.52-4.461-1.624-6.762-6.557-5.138-11.021l9.801-26.931c1.623-4.461 6.557-6.767 11.021-5.138 4.461 1.623 6.762 6.557 5.138 11.021l-9.8 26.931c-1.272 3.489-4.569 5.658-8.081 5.658z" fill="#e09900"></path><path d="m249.998 326.624c-24.843 0-45.054-20.211-45.054-45.055 0-6.47 1.38-12.77 4.105-18.72l32.934-84.862c1.285-3.308 4.466-5.485 8.015-5.485 3.546 0 6.731 2.177 8.016 5.485l33.048 85.105c2.648 5.877 3.991 12.09 3.991 18.476 0 24.845-20.212 45.056-45.055 45.056z" fill="#e09900"></path></svg></span></div>
        <h3 class="pg-tech__title">Precision Thermal Control</h3>
        <p class="pg-tech__desc">Dual-speed heat regulation and fine airflow controls deliver exact temperature management from 220–650°C. Stable thermal output prevents burning, minimizes rework, and guarantees clean, consistent results across every job.</p>
        <span class="pg-tech__card-line" aria-hidden="true"></span>
      </article>
      <article class="pg-tech__card" tabindex="0" style="transition-delay:70ms">
        <div class="pg-tech__card-top"><span class="pg-tech__card-no">02</span><span class="pg-tech__icon"><svg xmlns="http://www.w3.org/2000/svg" height="300" viewBox="0 0 128 128" width="300"><path d="m22.2 110.5h83.6c2.6 0 4.7-2.1 4.7-4.7v-3.6c0-2.6-2.1-4.7-4.7-4.7h-83.6c-2.6 0-4.7 2.1-4.7 4.7v3.6c0 2.6 2.1 4.7 4.7 4.7zm80.5-10h3.1c.9 0 1.7.8 1.7 1.7v3.6c0 .9-.8 1.7-1.7 1.7h-6.2zm-8.9 0h5.6l-3.1 7h-5.6zm-11.8 0h8.6l-3.1 7h-8.6zm-8.9 0h5.6l-3.1 7h-5.6zm-11.9 0h8.6l-3.1 7h-8.6zm-8.8 0h5.6l-3.1 7h-5.6zm-11.9 0h8.6l-3.1 7h-8.6zm-8.8 0h5.6l-3.1 7h-5.6zm-11.2 5.3v-3.6c0-.9.8-1.7 1.7-1.7h6.2l-3.1 7h-3.1c-.9 0-1.7-.8-1.7-1.7z" fill="#e09900"></path><path d="m42.6 57.1c-1.8 8.2 3.8 18.4 16.4 21.4 1.5.3 2.7-1.2 1.9-2.6-2.2-3.2.1-6.4 3-6.4s5.5 3.2 3.1 6.5c-.8 1.3.4 2.9 1.9 2.6 9.8-2.2 16.8-11 16.8-21 0-11.3-5.1-16.7-9.7-21.5-4.3-4.5-8.1-8.5-8.1-16.9 0-1.6-1.9-2.3-3-1.2-9.8 9.8-6.1 17.2-3.1 23.1 1.4 2.8 2.7 5.4 2.7 8.1 0 3.6-2.1 4.9-4.1 4.9-1.7 0-3.4-.9-3.4-2.6 0-1.2.2-2.4.5-3.5.8-3.8 1.7-8.5-4.4-12.8-1.3-.9-3 .2-2.7 1.7.7 4.6-1.3 7.8-3.7 11.6-1.6 2.4-3.3 5.1-4.1 8.6z" fill="#e09900"></path></svg></span></div>
        <h3 class="pg-tech__title">Durable Industrial Build</h3>
        <p class="pg-tech__desc">Built with high-grade impact-resistant polymers and heat-treated internal casings to endure tough site environments. Reinforced components minimize wear and ensure long-term durability under heavy continuous workloads.</p>
        <span class="pg-tech__card-line" aria-hidden="true"></span>
      </article>
      <article class="pg-tech__card" tabindex="0" style="transition-delay:140ms">
        <div class="pg-tech__card-top"><span class="pg-tech__card-no">03</span><span class="pg-tech__icon"><svg xmlns="http://www.w3.org/2000/svg" height="300" viewBox="0 0 100 100" width="300"><path d="m14.34 40.37c-.83 0-1.5.67-1.5 1.5v16.27c0 .83.67 1.5 1.5 1.5h7.22c.42 1.26.93 2.49 1.53 3.66l-5.13 5.09c-.28.28-.44.66-.44 1.06s.16.78.44 1.06l11.51 11.51c.59.59 1.54.59 2.12 0l5.12-5.12c1.17.59 2.38 1.1 3.64 1.52v7.26c0 .83.67 1.5 1.5 1.5h16.26c.83 0 1.5-.67 1.5-1.5v-7.25c1.24-.41 2.46-.92 3.67-1.53l5.12 5.12c.28.28.66.44 1.06.44.4 0 .78-.16 1.06-.44l11.48-11.51c.58-.59.58-1.53 0-2.12l-5.1-5.1c.61-1.23 1.1-2.44 1.5-3.66h7.25c.83 0 1.5-.67 1.5-1.5v-16.26c0-.83-.67-1.5-1.5-1.5h-7.25c-.4-1.22-.9-2.43-1.5-3.66l5.1-5.1c.58-.58.59-1.53 0-2.12l-11.47-11.51c-.28-.28-.66-.44-1.06-.44-.4 0-.78.16-1.06.44l-5.12 5.12c-1.21-.62-2.43-1.12-3.67-1.53v-7.25c0-.83-.67-1.5-1.5-1.5h-16.27c-.83 0-1.5.67-1.5 1.5v7.26c-1.26.42-2.49.93-3.66 1.53l-5.09-5.13c-.28-.28-.66-.44-1.06-.44-.4 0-.78.16-1.06.44l-11.52 11.51c-.28.28-.44.66-.44 1.06s.16.78.44 1.06l5.13 5.09c-.6 1.17-1.11 2.39-1.53 3.66h-7.22z" fill="#e09900"></path><path d="m50 70.85c11.5 0 20.85-9.35 20.85-20.85s-9.35-20.85-20.85-20.85-20.85 9.35-20.85 20.85 9.35 20.85 20.85 20.85zm0-38.7c9.84 0 17.85 8.01 17.85 17.85s-8.01 17.85-17.85 17.85-17.85-8.01-17.85-17.85 8.01-17.85 17.85-17.85z" fill="#e09900"></path></svg></span></div>
        <h3 class="pg-tech__title">High-Velocity Airflow</h3>
        <p class="pg-tech__desc">Delivering up to 120 CFM discharge volume at 16,000 RPM, Pilot blowers produce concentrated high-pressure streams. Dual blower-vacuum functionality tackles dust, debris, and workshop clearing with effortless speed.</p>
        <span class="pg-tech__card-line" aria-hidden="true"></span>
      </article>
      <article class="pg-tech__card" tabindex="0" style="transition-delay:210ms">
        <div class="pg-tech__card-top"><span class="pg-tech__card-no">04</span><span class="pg-tech__icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="300" height="300"><path d="m10.9799805 41.0800781h4.2956543c3.5772094 6.7012329 12.1343994 11.6520996 14.2370605 12.7949219.1479492.0820313.3227539.125.4921875.125.1669922 0 .3808594-.0688477.5273438-.1484375 2.0691528-1.125061 10.6172485-6.0726929 14.1929932-12.7714844h4.2938232c.5522461 0 1-.4477539 1-1v-24.8330688c0-.001709.0009766-.0031128.0009766-.0048218v-8.2421875c0-.5522461-.4477539-1-1-1h-38.0385743c-.4145508 0-.7700806.2524414-.9216309.6118774-.0511475.1201782-.079834.2521973-.079834.3910522v33.0771484c.0000001.5522462.447754 1.0000001 1.0000001 1.0000001z" fill="#e09900"></path></svg></span></div>
        <h3 class="pg-tech__title">Enhanced Thermal Safety</h3>
        <p class="pg-tech__desc">Engineered with smart overheat cutoffs, insulated nozzle guards, and stable rest stands. Comprehensive thermal protection keeps both user and workplace safe during intensive, prolonged operation.</p>
        <span class="pg-tech__card-line" aria-hidden="true"></span>
      </article>
    </div>
  </div>
</section>
<!-- /pg-tech -->`;

// 11. Product models wrapper
const productsHtml = `<!-- ══════════ PRODUCT SHEETS ══════════ -->
<div id="pi-products">
${prodDeskMatches.join('\n')}
${prodMobMatches.join('\n')}
</div>`;

// 12. Scripts at bottom
const scriptsHtml = `
<script src="../assets/js/pi-nav.js" defer></script>
<script src="../assets/js/pg-features.js" defer></script>
<script src="../assets/js/pg-hero-fit.js" defer></script>
<script src="../assets/js/pg-tech.js?v=9" defer></script>
<script src="../assets/js/pg-chain.js?v=7" defer></script>
<script src="../assets/js/pg-warm.js" defer></script>
<script src="../assets/js/bento-reveal.js" defer></script>
<script src="../assets/js/pg-fan.js?v=5" defer></script>
<script src="../assets/js/pg-series.js" defer></script>
<script src="../assets/js/pi-accordion.js?v=1" defer></script>
</body>
</html>`;

// 13. Nav component
const navHtml = `<!-- ══════════ NAV ══════════ -->
<header class="pi-nav framer-dyn-nav" id="pi-nav">
  <div class="framer-dyn-track">
    <div class="framer-dyn-pill" id="framer-dyn-pill" data-state="static">
      <a class="framer-dyn-logo" href="../index.html" aria-label="Pilot India">
        <img class="framer-dyn-pilot-logo" src="../assets/img/pilot-logo-1-1.png" alt="Pilot India" width="138" height="32" />
      </a>
      <nav class="framer-dyn-menu" aria-label="Main Navigation">
        <ul class="framer-dyn-links">
          <li class="framer-dyn-item"><a class="framer-dyn-link" href="../index.html">Home</a></li>
          <li class="framer-dyn-item framer-dyn-dropdown-parent">
            <button class="framer-dyn-link is-active" type="button" aria-haspopup="true" aria-expanded="false">
              Products <svg class="framer-dyn-caret" viewBox="0 0 24 24"><path d="M12 15.4 5.6 9l1.4-1.4 5 5 5-5L18.4 9z"/></svg>
            </button>
            <div class="framer-dyn-dropdown">
              <ul class="framer-dyn-dropdown-list">
                <li><a href="../spray-guns/"><span class="framer-dyn-dd-title">Spray Guns</span><span class="framer-dyn-dd-desc">Evolution, HVLP &amp; legacy series</span></a></li>
                <li><a href="../airless/"><span class="framer-dyn-dd-title">Airless Spray Systems</span><span class="framer-dyn-dd-desc">High-output hydraulic &amp; electric</span></a></li>
                <li><a href="power-tools.html"><span class="framer-dyn-dd-title">Power Tools <span class="framer-dyn-tag">NEW</span></span><span class="framer-dyn-dd-desc">Heat guns &amp; blowers</span></a></li>
                <li><a href="../welding/"><span class="framer-dyn-dd-title">Welding Equipments</span><span class="framer-dyn-dd-desc">Industrial gas welding &amp; regulators</span></a></li>
                <li><a href="../office/"><span class="framer-dyn-dd-title">Office Products</span><span class="framer-dyn-dd-desc">Currency counters &amp; shredders</span></a></li>
              </ul>
            </div>
          </li>
          <li class="framer-dyn-item"><a class="framer-dyn-link" href="about-us.html">About Us</a></li>
          <li class="framer-dyn-item"><a class="framer-dyn-link" href="blogs.html">Blog</a></li>
          <li class="framer-dyn-item"><a class="framer-dyn-link" href="contact-us.html">Contact</a></li>
        </ul>
      </nav>
      <div class="framer-dyn-section" aria-live="polite">
        <span class="framer-dyn-dot"></span>
        <span class="framer-dyn-section-text" id="framer-dyn-section-text">Hero</span>
      </div>
      <div class="framer-dyn-actions">
        <button class="framer-dyn-burger" type="button" aria-label="Menu" aria-expanded="false" aria-controls="framer-dyn-mobile-drawer">
          <span class="framer-burger-line"></span>
          <span class="framer-burger-line"></span>
        </button>
      </div>
    </div>
    <div class="framer-dyn-mobile-drawer" id="framer-dyn-mobile-drawer">
      <div class="framer-dyn-mobile-content">
        <ul class="framer-dyn-mobile-links">
          <li><a href="../index.html">Home</a></li>
          <li class="framer-dyn-mobile-subgroup">
            <span class="framer-dyn-subgroup-label">Products</span>
            <div class="framer-dyn-subgroup-items">
              <a href="../spray-guns/">Spray Guns</a>
              <a href="../airless/">Airless Spray Systems</a>
              <a href="power-tools.html">Power Tools <span class="framer-dyn-tag">NEW</span></a>
              <a href="../welding/">Welding Equipments</a>
              <a href="../office/">Office Products</a>
            </div>
          </li>
          <li><a href="about-us.html">About Us</a></li>
          <li><a href="blogs.html">Blog</a></li>
          <li><a href="contact-us.html">Contact</a></li>
        </ul>
        <div class="framer-dyn-mobile-footer">
          <a class="framer-dyn-mobile-phone" href="tel:+912266047000"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.4 0 .7-.2 1l-2.2 2.2z"/></svg> +91 22 6604 7000</a>
          <a class="framer-dyn-mobile-cta" href="contact-us.html">Connect with Pilot</a>
        </div>
      </div>
    </div>
  </div>
</header>`;

// 14. Full assembly
const assembled = `<!--pi-theme-->
<!DOCTYPE html>
<html lang="en-US" prefix="og: https://ogp.me/ns#">
${cleanHead}
<body data-pg-series="Power Tools" class="wp-singular page-template page-template-elementor_header_footer page page-id-16283 wp-theme-Divi et_pb_button_helper_class et_fullwidth_nav et_non_fixed_nav et_show_nav et_primary_nav_dropdown_animation_fade et_secondary_nav_dropdown_animation_fade et_header_style_left et_pb_footer_columns4 et_cover_background et_pb_gutter windows et_pb_gutters3 et_pb_pagebuilder_layout et_no_sidebar et_divi_theme et-db elementor-default elementor-template-full-width elementor-kit-2523 elementor-page elementor-page-16283 pg-series">
  <div id="page-container">

${navHtml}

    <div id="et-main-area">
      <div id="main-content">
        <article id="post-16283" class="post-16283 page type-page status-publish hentry">
          <div class="entry-content">
            <div class="et-l et-l--post">
              <div class="et_builder_inner_content et_pb_gutters3">
                <div data-elementor-type="wp-page" data-elementor-id="16283" class="elementor elementor-16283">

${heroHtml}

${marqueeHtml}

${bentoHtml}

${chainHtml}

${techHtml}

${productsHtml}

${whyChooseHtml}

${faqHtml}

                </div>
              </div>
            </div>
          </div>
        </article>
      </div>

      <span class="et_pb_scroll_top et-pb-icon"></span>

${footerHtml}

    </div><!-- /et-main-area -->
  </div><!-- /page-container -->

${scriptsHtml}`;

fs.writeFileSync(FILE, assembled, 'utf8');
console.log('Successfully rebuilt power-tools.html!');
console.log('Total characters:', assembled.length);
