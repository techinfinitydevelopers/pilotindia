/**
 * Build a completely revamped power-tools.html that matches
 * the structure and styling of the welding page (pi-sg-hero, bento, pg-chain, product sheets, footer).
 *
 * Source of truth content extracted from power-tools.html lines 589-1460
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT   = path.join(process.cwd(), 'pilotindia-clone');
const TARGET = path.join(ROOT, 'pages', 'power-tools.html');

// ── Read the existing page to grab only the <head> boilerplate ──────────────
const old = fs.readFileSync(TARGET, 'utf8');

// Extract everything inside <head>...</head>
const headStart = old.indexOf('<head>');
const headEnd   = old.indexOf('</head>') + '</head>'.length;
let head = old.slice(headStart, headEnd);

// Patch CSS links – use same set as welding page
const cssLinks = `
<link rel="stylesheet" href="../assets/css/pg-marquee.css" />
<link rel="stylesheet" href="../assets/css/pg-hero-fit.css?v=2" />
<link rel="stylesheet" href="../assets/css/pg-hero-coll.css?v=17" />
<link rel="stylesheet" href="../assets/css/pi-nav.css" />
<link rel="stylesheet" href="../assets/css/pi-footer2.css" />
<link rel="stylesheet" href="../assets/css/pg-fan.css?v=5" />
<link rel="stylesheet" href="../assets/css/pg-features.css" />
<link rel="stylesheet" href="../assets/css/bento.css" />
`;

// Remove existing CSS link tags and replace with our set
head = head.replace(/<link rel="stylesheet"[^>]*>/g, '');
head = head.replace('</head>', cssLinks + '</head>');

// ── Full page HTML ──────────────────────────────────────────────────────────
const html = `<!--pi-theme-->
<!DOCTYPE html>
<html lang="en-US" prefix="og: https://ogp.me/ns#">
${head}
<body class="home wp-singular page-template-default page page-id-power-tools wp-theme-Divi et_pb_button_helper_class et_fullwidth_nav et_non_fixed_nav et_show_nav et_header_style_left et_pb_footer_columns4 et_cover_background et_pb_gutter windows et_pb_gutters3 et_pb_pagebuilder_layout et_no_sidebar et_divi_theme et-db elementor-default elementor-kit-2278">
  <div id="page-container">

    <!-- ══════════ NAV ══════════ -->
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
    </header>
    <!-- /nav -->

    <div id="et-main-area">
    <div id="main-content">
    <article class="page">
    <div class="entry-content">

      <!-- ══════════ HERO ══════════ -->
      <div class="elementor-element e-con-full e-flex e-con e-parent" data-settings="{&quot;background_background&quot;:&quot;classic&quot;}" style="--pi-hero:url('../assets/img/untitled-design.png')">
        <!-- pi-sg-hero:start -->
        <div class="pi-sg-hero">
          <div class="pi-sg-hero__copy">
            <p class="pi-sg-hero__eyebrow">Pilot Power Tools</p>
            <h2 class="pi-sg-hero__title"><span>Power built for</span> <span>demanding work?</span> <em>Meet your match.</em></h2>
            <p class="pi-sg-hero__sub">Heat guns, blowers and more — engineered for automotive, industrial, and household maintenance tasks.</p>
            <div class="pi-sg-hero__cta">
              <a class="pi-sg-hero__btn" href="#pi-products">Explore products<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 5.3 19.9 12l-6.7 6.7-1.4-1.4 4.3-4.3H4v-2h12.1l-4.3-4.3z"/></svg></a>
              <a class="pi-sg-hero__btn pi-sg-hero__btn--ghost" href="contact-us.html">Talk to our team</a>
            </div>
          </div>
          <nav class="pi-coll" id="pi-coll" style="--n:3" aria-label="Products">
            <p class="pi-coll__label" data-n="03">Select a product</p>
            <ul class="pi-coll__list">
              <li><a class="pi-coll__card" href="#pt-hg-25">
                <span class="pi-coll__img"><img src="../assets/img/hg-25.jpg" alt="" width="120" height="120" loading="lazy"></span>
                <span class="pi-coll__txt"><span class="pi-coll__num">01</span><span class="pi-coll__name">HG-25 Heat Gun</span><span class="pi-coll__note">Industrial heat &amp; stripping</span></span>
                <span class="pi-coll__go"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 5.3 19.9 12l-6.7 6.7-1.4-1.4 4.3-4.3H4v-2h12.1l-4.3-4.3z"/></svg></span>
              </a></li>
              <li><a class="pi-coll__card" href="#pt-bl-25">
                <span class="pi-coll__img"><img src="../assets/img/bl-25.jpg" alt="" width="120" height="120" loading="lazy"></span>
                <span class="pi-coll__txt"><span class="pi-coll__num">02</span><span class="pi-coll__name">BL-25 Blower</span><span class="pi-coll__note">High-power blower &amp; vacuum</span></span>
                <span class="pi-coll__go"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 5.3 19.9 12l-6.7 6.7-1.4-1.4 4.3-4.3H4v-2h12.1l-4.3-4.3z"/></svg></span>
              </a></li>
              <li><a class="pi-coll__card" href="#pt-bl-26vs">
                <span class="pi-coll__img"><img src="../assets/img/bl-25vs.png" alt="" width="120" height="120" loading="lazy"></span>
                <span class="pi-coll__txt"><span class="pi-coll__num">03</span><span class="pi-coll__name">BL-26VS Blower</span><span class="pi-coll__note">Variable speed, dual function</span></span>
                <span class="pi-coll__go"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 5.3 19.9 12l-6.7 6.7-1.4-1.4 4.3-4.3H4v-2h12.1l-4.3-4.3z"/></svg></span>
              </a></li>
            </ul>
          </nav>
        </div>
        <!-- pi-sg-hero:end -->
      </div>

      <!-- ══════════ MARQUEE BAR ══════════ -->
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
          <!-- duplicate for seamless loop -->
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
      </div>

      <!-- ══════════ BENTO TRUST GRID ══════════ -->
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
      <!-- /bento -->

      <!-- ══════════ APPLICATIONS CAROUSEL (pg-chain) ══════════ -->
      <section class="pg-chain" id="pg-chain">
        <div class="pg-chain__intro">
          <h2 class="pg-chain__h2">Professional <em>Power Tool</em> Applications</h2>
          <p class="pg-chain__lead">Pilot power tools are engineered for precision and durability across a wide range of industrial and household applications. From paint stripping and vinyl wrapping to automotive maintenance and industrial cleaning, each tool delivers consistent high performance with every use.</p>
          <a class="pg-chain__ghost" href="#pi-products">VIEW PRODUCTS</a>
        </div>
        <div class="pg-chain__stage" role="region" aria-roledescription="carousel" aria-label="Power Tool Applications">
          <article class="pg-chain__card is-active" data-index="0" tabindex="-1" aria-roledescription="slide" aria-label="1 of 3: Heat &amp; Thermal Work">
            <div class="pg-chain__body">
              <div class="pg-chain__text">
                <span class="pg-chain__num">01</span>
                <h3 class="pg-chain__title">Heat &amp; Thermal Work</h3>
                <p class="pg-chain__quote">&ldquo;The HG-25 Heat Gun delivers precision temperature control from 220–650°C, making it ideal for paint stripping, vinyl wrapping, tube bending, and shrink packaging. With dual-speed settings and overheat protection, it performs reliably through extended professional use.&rdquo;</p>
                <a class="pg-chain__cta" href="#pt-hg-25">View HG-25 Heat Gun<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 5.3 19.9 12l-6.7 6.7-1.4-1.4 4.3-4.3H4v-2h12.1l-4.3-4.3z"/></svg></a>
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
                <a class="pg-chain__cta" href="#pt-bl-25">View BL-25 Blower<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 5.3 19.9 12l-6.7 6.7-1.4-1.4 4.3-4.3H4v-2h12.1l-4.3-4.3z"/></svg></a>
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
                <a class="pg-chain__cta" href="#pt-bl-26vs">View BL-26VS Blower<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 5.3 19.9 12l-6.7 6.7-1.4-1.4 4.3-4.3H4v-2h12.1l-4.3-4.3z"/></svg></a>
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
      <!-- /pg-chain -->

      <!-- ══════════ PRODUCT SHEETS ══════════ -->
      <section class="pt-products" id="pi-products">

        <!-- HG-25 -->
        <div class="pt-prod" id="pt-hg-25">
          <div class="pt-prod__wrap">
            <div class="pt-prod__media">
              <img src="../assets/img/hg-25.jpg" alt="HG-25 Heat Gun" width="480" height="480" loading="lazy" decoding="async">
            </div>
            <div class="pt-prod__info">
              <div class="pt-prod__badge">
                <span class="pt-prod__series-tag">HEAT GUN</span>
                <span class="pt-prod__isi">ISI Certified</span>
              </div>
              <h2 class="pt-prod__model">HG-25</h2>
              <p class="pt-prod__sub">(Heat Gun)</p>
              <div class="pt-prod__divider"></div>
              <h3 class="pt-prod__features-head">Features</h3>
              <ul class="pt-prod__features">
                <li>Temperature 220–650°C</li>
                <li>2-Speed heat settings</li>
                <li>Overheat protection</li>
                <li>Up to 1800W</li>
              </ul>
              <div class="pt-prod__table-wrap">
                <h3 class="pt-prod__tech-head">Technical Data</h3>
                <table class="pt-prod__table">
                  <tbody>
                    <tr><td>Power Input</td><td>1600–1800 W*</td></tr>
                    <tr><td>Switch Type</td><td>Dual Speed</td></tr>
                    <tr><td>Voltage / Frequency</td><td>220V–240V / 50Hz</td></tr>
                    <tr><td>Temperature Range</td><td>220°C – 650°C</td></tr>
                  </tbody>
                </table>
              </div>
              <div class="pt-prod__downloads">
                <a class="pt-prod__dl-btn" href="../assets/media/hg-25-product-catalogue.pdf" target="_blank" rel="noopener">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.6 6 9.6l1.4-1.4 3.6 3.6V3h2v8.8l3.6-3.6L18 9.6l-6 6zM4 21v-2h16v2H4z"/></svg>
                  Download Catalogue
                </a>
                <a class="pt-prod__dl-btn" href="../assets/media/hg-25-product-manual.pdf" target="_blank" rel="noopener">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.6 6 9.6l1.4-1.4 3.6 3.6V3h2v8.8l3.6-3.6L18 9.6l-6 6zM4 21v-2h16v2H4z"/></svg>
                  Download Manual
                </a>
              </div>
            </div>
            <div class="pt-prod__apps">
              <h3 class="pt-prod__apps-head">Areas of Application</h3>
              <div class="pt-prod__apps-grid">
                <div class="pt-prod__app-item"><img src="../assets/img/hg-25-1.jpg" alt="Wrapping cars" loading="lazy"><span>Wrapping cars</span></div>
                <div class="pt-prod__app-item"><img src="../assets/img/hg-25-2.jpg" alt="Paint stripping" loading="lazy"><span>Paint stripping</span></div>
                <div class="pt-prod__app-item"><img src="../assets/img/hg-25-3.jpg" alt="Bending tubes" loading="lazy"><span>Bending tubes</span></div>
                <div class="pt-prod__app-item"><img src="../assets/img/hg-25-4.jpg" alt="Shrink packaging" loading="lazy"><span>Shrink packaging</span></div>
              </div>
            </div>
          </div>
        </div>

        <!-- BL-25 -->
        <div class="pt-prod pt-prod--alt" id="pt-bl-25">
          <div class="pt-prod__wrap">
            <div class="pt-prod__media">
              <img src="../assets/img/bl-25.jpg" alt="BL-25 Blower" width="480" height="480" loading="lazy" decoding="async">
            </div>
            <div class="pt-prod__info">
              <div class="pt-prod__badge">
                <span class="pt-prod__series-tag">BLOWER</span>
                <span class="pt-prod__isi">ISI Certified</span>
              </div>
              <h2 class="pt-prod__model">BL-25</h2>
              <p class="pt-prod__sub">(Blower)</p>
              <div class="pt-prod__divider"></div>
              <h3 class="pt-prod__features-head">Features</h3>
              <ul class="pt-prod__features">
                <li>Strong Air Output – 600W</li>
                <li>Air Flow Discharge – 120 CFM</li>
                <li>High RPM – 16,000 rpm</li>
                <li>Dual Function – Blower &amp; Vacuum</li>
              </ul>
              <div class="pt-prod__table-wrap">
                <h3 class="pt-prod__tech-head">Technical Data</h3>
                <table class="pt-prod__table">
                  <tbody>
                    <tr><td>Model</td><td>BL-25</td></tr>
                    <tr><td>Power Input</td><td>600 W*</td></tr>
                    <tr><td>Voltage / Frequency</td><td>220V / 50Hz</td></tr>
                    <tr><td>Air pressure up to</td><td>72 bar</td></tr>
                    <tr><td>Air Flow</td><td>120 CFM</td></tr>
                    <tr><td>No-Load Speed</td><td>16,000 rpm</td></tr>
                    <tr><td>Weight</td><td>1.45 Kg</td></tr>
                  </tbody>
                </table>
              </div>
              <div class="pt-prod__downloads">
                <a class="pt-prod__dl-btn" href="../assets/media/bl-25-product-catalogue.pdf" target="_blank" rel="noopener">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.6 6 9.6l1.4-1.4 3.6 3.6V3h2v8.8l3.6-3.6L18 9.6l-6 6zM4 21v-2h16v2H4z"/></svg>
                  Download Catalogue
                </a>
                <a class="pt-prod__dl-btn" href="../assets/media/bl-25-product-manual.pdf" target="_blank" rel="noopener">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.6 6 9.6l1.4-1.4 3.6 3.6V3h2v8.8l3.6-3.6L18 9.6l-6 6zM4 21v-2h16v2H4z"/></svg>
                  Download Manual
                </a>
              </div>
            </div>
            <div class="pt-prod__apps">
              <h3 class="pt-prod__apps-head">Areas of Application</h3>
              <div class="pt-prod__apps-grid">
                <div class="pt-prod__app-item"><img src="../assets/img/2.png" alt="Automotive &amp; Workshop" loading="lazy"><span>Automotive &amp; Workshop</span></div>
                <div class="pt-prod__app-item"><img src="../assets/img/3.png" alt="Household Applications" loading="lazy"><span>Household Applications</span></div>
                <div class="pt-prod__app-item"><img src="../assets/img/4.png" alt="Industrial Cleaning" loading="lazy"><span>Industrial Cleaning</span></div>
              </div>
            </div>
          </div>
        </div>

        <!-- BL-26VS -->
        <div class="pt-prod" id="pt-bl-26vs">
          <div class="pt-prod__wrap">
            <div class="pt-prod__media">
              <img src="../assets/img/bl-25vs.png" alt="BL-26VS Variable Speed Blower" width="480" height="480" loading="lazy" decoding="async">
            </div>
            <div class="pt-prod__info">
              <div class="pt-prod__badge">
                <span class="pt-prod__series-tag">BLOWER</span>
                <span class="pt-prod__isi">Variable Speed</span>
              </div>
              <h2 class="pt-prod__model">BL-26VS</h2>
              <p class="pt-prod__sub">(Variable Speed Blower)</p>
              <div class="pt-prod__divider"></div>
              <h3 class="pt-prod__features-head">Features</h3>
              <ul class="pt-prod__features">
                <li>Variable Speed Control</li>
                <li>Strong Air Output – 600W</li>
                <li>Air Flow Discharge – 120 CFM</li>
                <li>High RPM – 16,000 rpm</li>
                <li>Dual Function – Blower &amp; Vacuum</li>
              </ul>
              <div class="pt-prod__table-wrap">
                <h3 class="pt-prod__tech-head">Technical Data</h3>
                <table class="pt-prod__table">
                  <tbody>
                    <tr><td>Model</td><td>BL-26VS</td></tr>
                    <tr><td>Power Input</td><td>680 W*</td></tr>
                    <tr><td>Voltage / Frequency</td><td>220V / 50Hz</td></tr>
                    <tr><td>Air pressure up to</td><td>72 bar</td></tr>
                    <tr><td>Air Flow</td><td>120 CFM</td></tr>
                    <tr><td>No-Load Speed</td><td>16,000 rpm</td></tr>
                    <tr><td>Weight</td><td>1.65 Kg</td></tr>
                  </tbody>
                </table>
              </div>
              <div class="pt-prod__downloads">
                <a class="pt-prod__dl-btn" href="../assets/media/bl-26vs-product-catalogue.pdf" target="_blank" rel="noopener">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.6 6 9.6l1.4-1.4 3.6 3.6V3h2v8.8l3.6-3.6L18 9.6l-6 6zM4 21v-2h16v2H4z"/></svg>
                  Download Catalogue
                </a>
                <a class="pt-prod__dl-btn" href="../assets/media/bl-26vs-product-manual.pdf" target="_blank" rel="noopener">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.6 6 9.6l1.4-1.4 3.6 3.6V3h2v8.8l3.6-3.6L18 9.6l-6 6zM4 21v-2h16v2H4z"/></svg>
                  Download Manual
                </a>
              </div>
            </div>
            <div class="pt-prod__apps">
              <h3 class="pt-prod__apps-head">Areas of Application</h3>
              <div class="pt-prod__apps-grid">
                <div class="pt-prod__app-item"><img src="../assets/img/2.png" alt="Automotive &amp; Workshop" loading="lazy"><span>Automotive &amp; Workshop</span></div>
                <div class="pt-prod__app-item"><img src="../assets/img/3.png" alt="Household Applications" loading="lazy"><span>Household Applications</span></div>
                <div class="pt-prod__app-item"><img src="../assets/img/4.png" alt="Industrial Cleaning" loading="lazy"><span>Industrial Cleaning</span></div>
              </div>
            </div>
          </div>
        </div>

      </section>
      <!-- /products -->

      <!-- ══════════ WHY CHOOSE (features fan section) ══════════ -->
      <section class="pg-fan" id="pg-fan">
        <div class="pg-fan__wrap">
          <div class="pg-fan__left">
            <p class="pg-fan__eyebrow">Why choose Pilot Power Tools</p>
            <h2 class="pg-fan__h2">Built for <em>heavy work.</em> <span>Reliable every time.</span></h2>
            <p class="pg-fan__body">At PILOT, we build power tools engineered to withstand the toughest demands. From high-performance heat guns to powerful blowers, every tool combines precision control, robust construction, and dependable output. With smart thermal protection, variable speed settings, and durability built for daily use, Pilot delivers the reliability professionals count on — task after task.</p>
            <a class="pg-fan__cta" href="contact-us.html">Get in touch<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 5.3 19.9 12l-6.7 6.7-1.4-1.4 4.3-4.3H4v-2h12.1l-4.3-4.3z"/></svg></a>
          </div>
          <div class="pg-fan__right">
            <div class="pg-fan__card">
              <div class="pg-fan__card-icon"><i class="fas fa-tools"></i></div>
              <h3 class="pg-fan__card-t">Heavy-Duty Reliability</h3>
              <p class="pg-fan__card-d">PILOT Power Tools are engineered with industrial-grade components and rigorous quality standards, delivering consistent performance under the toughest workloads and ensuring long service life.</p>
            </div>
            <div class="pg-fan__card">
              <div class="pg-fan__card-icon"><i class="fas fa-hand-sparkles"></i></div>
              <h3 class="pg-fan__card-t">Spare Parts On Hand</h3>
              <p class="pg-fan__card-d">With a robust network ensuring ready availability of genuine spare parts, your tools stay productive with minimal downtime. Quick replacements mean projects keep moving without costly delays.</p>
            </div>
            <div class="pg-fan__card">
              <div class="pg-fan__card-icon"><i class="fas fa-exchange-alt"></i></div>
              <h3 class="pg-fan__card-t">Versatile Applications</h3>
              <p class="pg-fan__card-d">Whether stripping paint, wrapping vinyl, clearing industrial dust, or performing automotive maintenance — Pilot tools adapt to every task with confidence and precision.</p>
            </div>
            <div class="pg-fan__card">
              <div class="pg-fan__card-icon"><i class="fas fa-shield-alt"></i></div>
              <h3 class="pg-fan__card-t">Built for Demanding Work Sites</h3>
              <p class="pg-fan__card-d">We engineer our power tools to perform under constant heat, pressure, and long working hours. The result is reliable output and minimal breakdowns, even in heavy industrial environments.</p>
            </div>
            <div class="pg-fan__card">
              <div class="pg-fan__card-icon"><i class="fas fa-bullseye"></i></div>
              <h3 class="pg-fan__card-t">Precision Improves Output</h3>
              <p class="pg-fan__card-d">Precise temperature and airflow adjustment deliver clean results. Stable control improves finish quality, reduces rework, and keeps results consistent across repeated jobs.</p>
            </div>
          </div>
        </div>
      </section>
      <!-- /pg-fan -->

    </div>
    </article>
    </div>
    </div><!-- /et-main-area -->

    <!-- ══════════ FOOTER ══════════ -->
    <footer class="pi-f2" role="contentinfo">
      <div class="pi-f2__inner">

        <div class="pi-f2__brand">
          <a href="../index.html" aria-label="Pilot India home">
            <img src="../assets/img/pilot-logo-1-1.png" alt="Pilot India" width="178" height="42" loading="lazy" decoding="async" />
          </a>
          <p class="pi-f2__tagline">Over 70 years of precision engineering — surface coating, welding, and industrial tools you can count on.</p>
          <a class="pi-f2__contact-btn" href="contact-us.html">Connect with Pilot</a>
        </div>

        <nav class="pi-f2__col" aria-label="Products">
          <h2 class="pi-f2__h">Products</h2>
          <ul class="pi-f2__list">
            <li><a href="../spray-guns/">Spray Guns</a></li>
            <li><a href="../airless/">Airless Spray Systems</a></li>
            <li><a href="power-tools.html">Power Tools</a></li>
            <li><a href="../welding/">Welding Equipments</a></li>
            <li><a href="../office/">Office Products</a></li>
          </ul>
        </nav>

        <nav class="pi-f2__col" aria-label="Company">
          <h2 class="pi-f2__h">Company</h2>
          <ul class="pi-f2__list">
            <li><a href="about-us.html">About Us</a></li>
            <li><a href="blogs.html">Blog</a></li>
            <li><a href="contact-us.html">Contact</a></li>
          </ul>
        </nav>

        <nav class="pi-f2__col" aria-label="Resources">
          <h2 class="pi-f2__h">Resources</h2>
          <ul class="pi-f2__list">
            <li><a href="../assets/media/pilot-india-catalog-2025-e-catalog-new.pdf" target="_blank" rel="noopener">2025 catalogue</a></li>
            <li><a href="privacy-policy.html">Privacy Policy</a></li>
            <li><a href="terms-and-conditions.html">Terms and Conditions</a></li>
          </ul>
        </nav>

        <div class="pi-f2__col">
          <h2 class="pi-f2__h">Visit</h2>
          <address class="pi-f2__addr">
            24, Sona Udyog, Parsi Panchayat Road,<br />Andheri East, Mumbai 400069<br />Maharashtra, India
          </address>
        </div>
      </div>

      <div class="pi-f2__base">
        <div class="pi-f2__mark">
          <img src="../assets/img/pilot-logo-1-1.png" alt="Pilot India" width="178" height="42" loading="lazy" decoding="async" />
          <p class="pi-f2__copy">&copy; 2026 Pilot India. All rights reserved.</p>
        </div>
        <div class="pi-f2__ends">
          <ul class="pi-f2__legal">
            <li><a href="privacy-policy.html">Privacy</a></li>
            <li><a href="terms-and-conditions.html">Terms</a></li>
          </ul>
          <div class="pi-f2__social">
            <a href="https://www.facebook.com/pilotindiagroup" target="_blank" rel="noopener" aria-label="Pilot India on Facebook"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8.5V6.9c0-.7.2-1.1 1.2-1.1H16.5V3.1A17 17 0 0 0 14.6 3C12.6 3 11.2 4.2 11.2 6.5v2H8.8V11.4h2.4V21H14v-9.6h2.4l.4-2.9H14z"/></svg></a>
            <a href="https://www.instagram.com/pilotindiagroup/" target="_blank" rel="noopener" aria-label="Pilot India on Instagram"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.6c2.4 0 2.7 0 3.6.05.9.04 1.3.18 1.6.3.4.16.7.35 1 .65.3.3.5.6.65 1 .12.3.26.7.3 1.6.05.9.05 1.2.05 3.6s0 2.7-.05 3.6c-.04.9-.18 1.3-.3 1.6a2.7 2.7 0 0 1-.65 1c-.3.3-.6.5-1 .65-.3.12-.7.26-1.6.3-.9.05-1.2.05-3.6.05s-2.7 0-3.6-.05c-.9-.04-1.3-.18-1.6-.3a2.7 2.7 0 0 1-1-.65 2.7 2.7 0 0 1-.65-1c-.12-.3-.26-.7-.3-1.6C4.6 14.7 4.6 14.4 4.6 12s0-2.7.05-3.6c.04-.9.18-1.3.3-1.6.16-.4.35-.7.65-1 .3-.3.6-.5 1-.65.3-.12.7-.26 1.6-.3.9-.05 1.2-.05 3.6-.05M12 3c-2.44 0-2.75.01-3.7.06-.96.04-1.6.19-2.17.41-.6.23-1.1.54-1.6 1.04-.5.5-.81 1-1.04 1.6-.22.57-.37 1.21-.41 2.17C3.01 9.25 3 9.56 3 12s.01 2.75.06 3.7c.04.96.19 1.6.41 2.17.23.6.54 1.1 1.04 1.6.5.5 1 .81 1.6 1.04.57.22 1.21.37 2.17.41.95.05 1.26.06 3.7.06s2.75-.01 3.7-.06c.96-.04 1.6-.19 2.17-.41.6-.23 1.1-.54 1.6-1.04.5-.5.81-1 1.04-1.6.22-.57.37-1.21.41-2.17.05-.95.06-1.26.06-3.7s-.01-2.75-.06-3.7c-.04-.96-.19-1.6-.41-2.17a4.3 4.3 0 0 0-1.04-1.6c-.5-.5-1-.81-1.6-1.04-.57-.22-1.21-.37-2.17-.41C14.75 3.01 14.44 3 12 3z"/><path d="M12 7.38A4.62 4.62 0 1 0 12 16.62 4.62 4.62 0 0 0 12 7.38zm0 7.62a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/><circle cx="16.8" cy="7.2" r="1.08"/></svg></a>
          </div>
        </div>
      </div>
    </footer>
    <!-- /footer -->

    <!-- JS -->
    <script src="../assets/js/pi-nav.js" defer></script>
    <script src="../assets/js/pg-chain.js?v=7" defer></script>
    <script src="../assets/js/pg-fan.js?v=5" defer></script>

  </div><!-- /page-container -->
</body>
</html>`;

fs.writeFileSync(TARGET, html, 'utf8');
console.log('power-tools.html rebuilt successfully!');
console.log('Lines:', html.split('\n').length);
