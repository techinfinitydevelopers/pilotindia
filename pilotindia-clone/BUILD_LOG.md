# Build Log

## 2026-09-21 — power-tools.html: pg-feat grid conversion

**Task:** Align `pages/power-tools.html`'s feature section with `spray-guns/index.html`'s
`pg-feat` UI (icon/title/paragraph grid), without touching hero, product galleries, tabs, FAQs,
or footer.

**Changed:**
- `pages/power-tools.html`
  - Replaced lines 1189–1289 (heading "Achieve Precision And Performance With Pilot Power Tools"
    + 5 `elementor-image-box` items) with a single `pg-feat` block (`id="pg-feat"`) containing
    the same 5 items, in the same order, text and icon `src` unchanged:
    1. High Performance Output — `../assets/img/screenshot-2026-07-10-172953.png`
    2. Built for Durability — `../assets/img/screenshot-2026-07-10-173045.png`
    3. Ergonomic Comfort — `../assets/img/screenshot-2026-07-10-173151.png`
    4. Versatile Applications — `../assets/img/screenshot-2026-07-10-173303.png`
    5. Easy Maintenance and Reliable Support — `../assets/img/screenshot-2026-07-10-173351.png`
  - Added `<link rel="stylesheet" href="../assets/css/pg-features.css" />` after the `theme.css`
    link.
  - Added `<script src="../assets/js/pg-features.js" defer></script>` before `</body>`.
- Out of scope, untouched: hero/product-slider, HG-25/BL-25/BL-26VS galleries, Features tabs,
  TECHNICAL DATA tables, Areas of application, PDF links, FAQs, footer, "WHY PROFESSIONALS TRUST
  PILOT INDIA" section.

**Verification:**
- Div-balance check (open `<div` vs `</div>`) on the replaced range and on the full rebuilt file:
  `final depth 0 ok`.
- `grep -c "pg-feat" pages/power-tools.html` → 25.
- `grep -c "pg-features.css\|pg-features.js" pages/power-tools.html` → 2.
- Confirmed all 5 original headings/titles still present verbatim.
- Confirmed unrelated sections intact: `HG-25|BL-25|BL-26VS` → 12 matches, `TECHNICAL DATA` → 3,
  `WHY PROFESSIONALS TRUST PILOT INDIA` → 1.

**Notes:** See memory note `pilotindia-clone-pgfeat-conversion` for the reusable method (line-range
div-depth check + sed/cat scratch-file rebuild) and the Windows `node -e` path-escaping gotcha.

## 2026-09-21 — office/index.html: hero marquee + pg-feat grid conversion

**Task:** Restyle `office/index.html`'s hero/nav/feature-grid area to match
`spray-guns/index.html` (and the earlier `welding/index.html` conversion) — animated marquee
product nav + `pg-feat` grid — while keeping office's own hero copy, feature titles/paragraphs,
and icon files unchanged. Other sections untouched.

**Changed:**
- `office/index.html`
  - Added `<link rel="stylesheet" href="assets/css/pg-features.css" />` after the `theme.css` link
    (line 6). CSS/JS files already existed at `office/assets/css/pg-features.css` and
    `office/assets/js/pg-features.js`.
  - Replaced the static `elementor-element-fe9821e` widget (old lines 657–782: `.pilot-blocks-section`
    style + 2 `pilot-block` links) with the `pilot-marquee-section` animated marquee, carrying over
    office's own 2 links verbatim: PAPER SHREDDERS → `pages/paper-shredders.html`, CURRENCY COUNTERS
    → `pages/currency-counters.html`. Kept hero heading "LIKE PEACE OF MIND? / TRY A PIECE OF THESE /
    HIGH-PERFORMANCE OFFICE EQUIPMENTS." and background (`assets/img/home-pg.png`, already wired via
    a direct `url(...)` — no `background-image:none` bug present) unchanged.
  - Replaced the title container + image-box grid (old lines 784–884: `elementor-element-3edf8ed` +
    `elementor-element-715414c`/`d8b3591` etc.) with a single `pg-feat` block (`id="pg-feat"`)
    containing the same 5 items, same order, text/icon `src` unchanged:
    1. Great Value — `assets/img/great-value.svg`
    2. Full Product Range — `assets/img/great-product-range.svg` (original h3 had a leading space,
       trimmed as whitespace-only)
    3. Wide Applications — `assets/img/versatile-use.svg`
    4. Durable Products — `assets/img/durable-products.svg`
    5. Industry Experience — `assets/img/industry-expertise.svg`
  - Added `<script src="assets/js/pg-features.js" defer></script>` before `</body>`.
- Out of scope, untouched: Technical Excellence, Why choose, WHY PROFESSIONALS TRUST PILOT, footer,
  product pages. Confirmed via full-file diff that everything from `elementor-element-6388e9c`
  onward is byte-identical except the appended script tag, and lines 6–656 are byte-identical
  except the appended CSS link.

**Verification:**
- Div-balance check on both replaced ranges individually (784–884 → depth 0; fe9821e widget
  657–782 → self-balanced 4 opens/4 closes) and on the full rebuilt file: `final depth 0 ok`.
- `grep -c "pilot-marquee-section" office/index.html` → 9.
- `grep -c "pg-feat" office/index.html` → 27.
- `grep -c "pg-features.css\|pg-features.js" office/index.html` → 2.
- Confirmed hero heading and all 5 feature titles/paragraphs present verbatim.
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/office/` → 200.
- Dead CSS rules for `.pilot-block`/`.pilot-blocks-section` remain in the head `<style>` block
  (unused but harmless) — same pattern left in place for `welding/index.html`.

**Notes:** Reused the method from `pilotindia-clone-pgfeat-conversion` memory note. On this Windows
box, `node -e` scripts must use forward-slash `C:/Users/...` paths (or the `SCRATCH_WIN` variant) —
passing a git-bash-style `/c/Users/...` path as a string embedded inside a `-e` argument does NOT
get MSYS-translated and resolves relative to cwd instead.

---

## 2026-09-21 — office/index.html: product cards → luboss sticky horizontal scroll (2 slides)

**Task:** Convert office's two stacked product cards into the "luboss" sticky horizontal-scroll
component used as the design reference in `spray-guns/index.html` (previously ported to
`welding/index.html` with 3 slides). UI-only; no copy invented.

**Changes:**
- Replaced `office/index.html` lines **855–912** (cards container `elementor-element-ec86df5`
  with children `9f27166` / `5d0432c`, plus the two trailing `</div>` closers for `.e-con-inner`
  and `elementor-element-6388e9c`) with: those same two closers verbatim + luboss `<style>`
  (spray-guns 955–1256) + a 2-slide `<section>` + luboss `<script>` (spray-guns 1340–1416).
- Header block kept untouched (h2 "Professional for Office products", intro paragraph,
  SELECT SERIES button).
- Slide 1 (`luboss-slide-1`, text top / image bottom): tag `N°01 — PAPER SHREDDERS`,
  title "Secure Document Handling", original paragraph verbatim,
  link `pages/paper-shredders.html`,
  img `assets/img/deskside-paper-shredder-pilot-12-cc.png` (full-size, not `-300x225`),
  alt "Deskside Paper Shredder PILOT – 12 CC &#045; Pilot India".
- Slide 2 (`luboss-slide-2`, image top / text bottom): tag `N°02 — CURRENCY COUNTERS`,
  title "Efficient Cash Management", original paragraph verbatim,
  link `pages/currency-counters.html`,
  img `assets/img/note-counting-machine-c-50-uv-mg-1.png`,
  alt "Note Counting Machine C-50 UV-MG-1".
- Step labels: "01 Secure Document Handling", "02 Efficient Cash Management".

**Two-slide adaptation (5 values changed from the 3-slide original):**
1. `.luboss-scroll-section { height: 320vh }` → `220vh`
2. `.luboss-track { width: 300vw }` → `200vw`
3. `const translateX = progress * 200` → `progress * 100`
4. `const activeIndex = progress < 0.33 ? 0 : (progress < 0.67 ? 1 : 2)` → `progress < 0.5 ? 0 : 1`
5. `const targetProgress = idx === 0 ? 0 : (idx === 1 ? 0.5 : 1)` → `idx === 0 ? 0 : 1`
`.luboss-slide { width: 100vw }` left alone. Comments updated to match (200vw track, 01/02).

**Verification:**
- Whole-file div balance: `final depth 0 ok`.
- Div-depth at the new `<section class="luboss-scroll-section">` (line 1160) = **7** (matches
  spray-guns/welding; required for `position: sticky` + 100vw slides).
- `grep -c luboss office/index.html` → **82** (welding = 93 for 3 slides).
- Both headings, both full paragraphs, both hrefs present verbatim; header h2 / intro /
  SELECT SERIES / Technical Excellence intact; `pg-feat__` count 24 unchanged.
- No stale 3-slide values remain (`320vh` / `300vw` / `progress * 200` / `progress < 0.33` → 0 hits).
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/office/` → 200.

**Notes:**
- Office's cards started at div-depth **9** (welding's at 8), so the replacement range had to
  swallow **two** trailing `</div>` lines, not one. Measured, not assumed.
- Original card headings were wrapped in an unrelated `<a href="../spray-guns/blog/...">` link;
  dropped in the luboss `<h3>` to match welding/spray-guns (titles are plain text there). The
  real destination links are preserved on the "Check out solutions" anchors.
- Dead CSS rules for `elementor-element-ec86df5` / `9f27166` / `5d0432c` remain in the head
  `<style>` (line 209–210) — unused but harmless, same pattern as prior conversions.
