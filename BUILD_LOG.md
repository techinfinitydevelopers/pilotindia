# Build log — pilotindia.com static clone

**Date:** 2026-09-11
**Task:** Scrape `https://pilotindia.com` in full and produce a runnable local clone with all
images and content, in a flat folder structure, then serve it on localhost.
**Status:** Complete and verified.

## Result

| | |
| --- | --- |
| Output | `pilotindia-clone/` |
| Pages | 125 HTML (1 home + 25 pages/author archives + 83 blog posts + 16 category listings) |
| Assets | 668 (124 CSS, 14 JS, 446 images, 76 fonts, 8 PDFs) |
| Files / size | 794 files, 126 MB |
| Broken local references | 0 |
| Folders | 8 (`pages`, `blog`, `category`, `assets/{css,js,img,fonts,media}`) |
| Server | `node serve.mjs` → http://localhost:8080 (running) |

## Steps

1. **Recon** — `sitemap_index.xml` gave 97 URLs across page/post/category sitemaps. `robots.txt`
   permits crawling. Identified the stack: WordPress 7.1, Divi 4.27.8, Elementor 4.2.3, Rank
   Math, Airlift optimizer.
2. **First crawl** (deep mirror, `wp-content/...` paths preserved) — 109 pages, 830 assets,
   317 directories. Rejected: too many folders.
3. **Rebuild flat** (`tools/mirror2.mjs`) — same crawl into `pages/ blog/ category/ assets/*`
   with slugified filenames; reused the first mirror as a binary cache so only HTML and CSS were
   re-fetched. Also added author archives, dropped WP head cruft (dns-prefetch, shortlink,
   oEmbed, RSS, EditURI, api.w.org), and gave extensionless Google Fonts URLs a real `.css`
   extension.
4. **Recover hidden assets** (`tools/fix.mjs`) — the Airlift plugin emits no `<script src>`
   tags; every script and several stylesheets are JSON-escaped strings inside inline JS. This
   pass extracted them, downloaded 54 further files (all 14 JS bundles among them) and applied
   3,119 rewrites.
5. **Bug found and fixed** — the CSS `url(...)` rewriter was also matching JS identifiers ending
   in `url(`, e.g. `bv_replace_lazyloaded_image_url(element2)` → corrupted the Airlift lazy-load
   runtime in 10 bundles. Anchored the pattern with `(?<![\w-])` and rebuilt from scratch.
6. **Verification**
   - `tools/check.mjs`: 14,857 local references checked, 0 genuinely missing (remaining hits are
     the checker's own regex matching JS identifiers).
   - HTTP smoke test: home, pages, blog, category, pretty URLs, CSS, JS, WebP — all 200 with
     correct content types.
   - Headless-Chrome renders of the clone vs. the live site for `/`, `/about-us/` and a blog
     post: visually identical (hero slider, Divi layout, images, webfonts, sidebar, footer).

## Known limitations (inherent to a static copy)

- Contact form, comment submission and site search need `wp-admin/admin-ajax.php`.
- Analytics beacons (gtag, Jetpack stats) are external and no-op.
- Elementor keeps an absolute asset base URL in inline config for lazily-fetched widget assets.

## Files added

```
README.md            usage + layout
memory.md            project knowledge base
BUILD_LOG.md         this file
serve.mjs            static server with pretty-URL fallbacks
tools/mirror2.mjs    crawler + link rewriter
tools/fix.mjs        Airlift hidden-URL recovery pass
tools/check.mjs      broken-reference checker
tools/allurls.txt    sitemap seed list
pilotindia-clone/    the clone
```

---

# Build log — footer redesign

**Date:** 2026-09-11 (same session)
**Task:** Replace the stock Divi footer with a better UI in the logo palette (black / white /
orange), applied across the whole clone.
**Status:** Complete and verified at desktop and mobile widths.

## What changed

- Sampled the brand orange straight from `assets/img/pilot-logo-1-1.png`: **#F58634**.
- New markup (`tools/footer.mjs`) replaces `<footer id="main-footer">` on all **125** pages with
  a four-column layout: **Brand** (logo, tagline, address, social) · **Products** ·
  **Company** · **Get in touch** (phone / email / works + catalogue CTA), plus a bottom bar with
  copyright and legal links. Relative paths are computed per page depth.
- New stylesheet `assets/css/pi-footer.css`, linked into every page.
- Icons are **inline SVG**, not Font Awesome — the site's FA stylesheet is lazy-loaded by Airlift
  and silently fails on interior pages (the live site has the same gap).

## Design decisions

| | |
| --- | --- |
| Palette | `#0a0a0a` ground, `#f58634` accent, `#ffffff` headings, `#9a9a9a` body |
| Top edge | 3px orange→transparent gradient rule, echoing the logo bars |
| Depth | one faint orange radial glow behind the brand column |
| Headings | 12px, `0.16em` tracking, uppercase, 26px orange underline |
| Links | grey → white on hover with an orange tick sliding in from the left |
| CTA | solid orange button, inverts to outline on hover |
| Social | 40px bordered tiles, fill orange and lift 2px on hover |
| Responsive | 4 cols → 2 (brand full width) at 980px → 1 at 560px; CTA goes full width |
| A11y | `<nav aria-label>` per column, `aria-label` on icon links, visible focus rings, `prefers-reduced-motion` honoured |

## Bug fixed during this work

The catalogue CTA rendered as default-blue underlined text on the orange button. Cause: the
theme's own CSS carries `a:-webkit-any-link{color:-webkit-link;text-decoration:underline}`,
specificity (0,1,1) — which outranks a bare class such as `.pi-footer__cta` (0,1,0). Every
anchor rule in the footer stylesheet was re-scoped to `.pi-footer .x a` / `.pi-footer a.x` to
clear it, with a blanket `text-decoration: none` guard for good measure.

## Verification

- `tools/check.mjs`: 15,357 references, no new broken links.
- Footer targets (contact, power tools, logo, catalogue PDF, stylesheet) all return 200.
- Headless-Chrome renders at 1440px (home + about) and 420px (mobile) reviewed.

---

# Build log — navbar redesign + curved chrome

**Date:** 2026-09-11 (same session)
**Task:** New navbar theme in the logo palette with 15px rounded edges, curves on both the
nav and the footer, styled like a conventional modern site nav.
**Status:** Complete and verified at desktop and mobile widths.

## Design read and dials

Redesign, preserve mode. Sticky top nav for a 70-year industrial manufacturer, audience is
procurement and distributor buyers, serious industrial-B2B language, native CSS with brand
tokens from the logo. Dials: `DESIGN_VARIANCE 4` · `MOTION_INTENSITY 3` · `VISUAL_DENSITY 5`.
Labels, hrefs and IA carried over unchanged.

## What shipped

- `assets/css/pi-nav.css` + `assets/js/pi-nav.js` + `tools/navbar.mjs`, applied to all 125 pages.
- **Both bars now float and curve.** Nav and footer share a 15px shell radius and an 18px side
  inset, so the black chrome reads as two rounded slabs on the white page.
- **Radius scale locked page-wide:** shells 15px (nav, dropdown, drawer, footer), controls 10px
  (hover pills, icon tiles), pills 999px (action buttons, NEW tags). The footer's old 4px and
  8px control radii were brought onto this scale.
- Nav layout: logo · About Us · Products (dropdown) · phone · orange pill CTA. One line at
  desktop, 72px tall, shrinking to 62px once scrolled.
- Scrolled state driven by an IntersectionObserver sentinel, not a scroll listener.
- Dropdown: 15px dark panel, opens on hover and on focus, orange tick on row hover.
- Mobile below 960px: burger, panel drawer, tap-disclosed submenu, full-width CTA.

## Three bugs found and fixed

1. **Nav wrapped to two rows.** `.pi-nav__drawer` was only given `flex-direction: column` inside
   the mobile query and never `display: flex` at desktop, so the links and the actions stacked.
2. **Bar overflowed the viewport by exactly its own margins.** The new header kept
   `id="main-header"`, so Divi's `#main-header{position:fixed!important; width:100%}` still
   applied: 100% of the viewport *plus* the side margins. The ids on both the header and the
   footer were changed to `pi-nav` / `pi-footer` so no Divi chrome rule matches them.
3. **Original contrast defect** carried over from the live site: `#top-menu a{color:rgba(0,0,0,0.6)}`
   renders "PRODUCTS" as dark grey on a black bar. The new nav uses `#cfcfcf` rising to white.

## Note on the debugging detour

Several injected measurement probes returned nothing because the generated script had a real
newline inside a JS string literal (`join("\n")` written as a literal break), which is a
SyntaxError. Separately, headless Chrome on Windows clamps the window to ~504px wide, so
`--window-size=420` screenshots were really 504px pages cropped to 420 - the "missing" mobile
burger was only cropped out of frame, not missing.

## Verification

- 125/125 pages carry both the new nav and the new footer.
- `tools/check.mjs`: 15,730 references, no new broken links.
- Renders reviewed: desktop 1440px (nav, dropdown open, footer), mobile 504px (bar closed,
  drawer open with submenu, CTA).

---

# Build log — satellite sites mirrored and internalised

**Date:** 2026-09-11 (same session)
**Task:** Scrape the other Pilot product sites so that clicking "Spray Guns" (and the rest) in
the Products menu opens a local page with exact images and content instead of leaving for the
live domain.
**Status:** Complete and verified.

## What was mirrored

| Menu entry | Source | Local path | Pages | Size |
| --- | --- | --- | --- | --- |
| Spray Guns | pilotsprayguns.com | `sites/spray-guns/` | 152 | 292 MB |
| Airless Spray Systems | pilotairless.com | `sites/airless/` | 152 | 102 MB |
| Welding Equipments | pilotwelding.com | `sites/welding/` | 135 | 85 MB |
| Office Products | pilotofficeproducts.com | `sites/office/` | 150 | 138 MB |

Clone total: **714 HTML pages, 737 MB**. Each satellite keeps its own header, footer and
styling exactly as published; only the main pilotindia pages carry the redesigned chrome.

## Pipeline

1. `tools/mirror-site.mjs <slug>` — one parameterised crawler for all four. Same flat layout as
   the main clone (`index.html` + `pages/` + `blog/` + `category/` + `assets/`), same Airlift
   inline-JSON recovery pass, same anchored `url()` regex.
2. `tools/crosslink.mjs` — rewrites every remaining absolute Pilot-domain URL across all five
   mirrors to a relative local path. A link to a page that was not mirrored lands on that
   site's home page rather than escaping to the internet. **7,933 links rewritten.**
3. `tools/navbar.mjs` / `tools/footer.mjs` — Products entries now point at the local mirrors.
   Both generators were given a `sites/` guard so they never overwrite satellite chrome.

## Bug found and fixed

The first crosslink run damaged 1,188 links. `.split(hit).join(out)` was replacing hits in
document order, so the bare `https://pilotindia.com/` was substituted *inside* longer URLs that
contain it, leaving dangling tails like `href="../../../index.htmlpower-tools/"`. Fixed by
sorting hits longest-first; `tools/repair-links.mjs` repaired the 2,358 already-written
occurrences (and retargeted 154 `/?page_id=N` home links that had been filed as extensionless
assets).

## Upstream problems found on the live sites (not mirror defects)

- **pilotsprayguns.com is carrying injected SEO spam**: 9 Polish casino / betting pages
  (`polskie-kasyno-online-...`, `gamdom-sportsbook-...`, `understanding-rtp-in-new-zealand-slots`,
  `mms-video-telegram`). Excluded from the mirror via a spam filter in the crawler. Whoever runs
  that site should be told.
- **pilotairless.com (108 files) and pilotwelding.com (84 files) reference images that their own
  servers 404** — both the `//wp-content/...` and `/wp-content/...` forms return 404/301→404. Those
  images are broken on the live sites, so they are broken in the mirror too.

## Verification

- All six Products entries: HTTP 200, correct page titles, **zero** external Pilot links.
- `grep` for external Pilot page links across all 714 files: none.
- `tools/check.mjs`: 90,378 references checked. Remaining misses are the checker's own regex
  false positives plus the upstream-broken images listed above.
- Renders reviewed: spray-guns home and the Evolution Series product page (photos, technical
  data table, application thumbnails, sub-nav all intact).

---

# Build log — satellite sites moved to top-level slugs

**Date:** 2026-09-11 (same session)
**Task:** Clicking a Products entry should open a page on this host at a slug, not sit under a
`sites/` wrapper. The URL should just extend with the name.
**Status:** Complete and verified.

## Change

`sites/<slug>/` moved up to `<slug>/`, so the folder name *is* the URL:

| Menu entry | Before | After |
| --- | --- | --- |
| Spray Guns | `/sites/spray-guns/index.html` | `/spray-guns` |
| Airless Spray Systems | `/sites/airless/index.html` | `/airless` |
| Welding Equipments | `/sites/welding/index.html` | `/welding` |
| Office Products | `/sites/office/index.html` | `/office` |

Inner pages extend the slug: `/spray-guns/evolution-series`, `/welding/gas-cutting-torches`.

`tools/flatten-sites.mjs` did the move. Rather than pattern-matching paths, it resolves every
relative reference against the file's OLD location, maps it to the new layout, and recomputes it
relative to the NEW location - covering links, images, srcset, css `url()` and the
backslash-escaped paths Airlift leaves in inline JS. **4,955 references across 710 files.**

`serve.mjs` gained a deep pretty-URL fallback (`/<site>/<page>` -> `<site>/pages/<page>.html`).
`navbar.mjs`, `footer.mjs`, `crosslink.mjs` and `audit.mjs` were repointed, and the generators'
skip-guard now names the four mirror folders instead of `sites`.

## Verification

Audit numbers are byte-identical to before the move, so nothing broke:
710 pages, 669 reachable from the home page, **0 broken internal links**, images 100% on main /
spray-guns / office and unchanged on the two sites with upstream-broken media.
All slug URLs return 200, checked at both root and depth-1 page contexts.

## Note

A stale server from an earlier session was still holding port 8080, so the first test of the new
URLs returned 404s from the old process. Killed PID and restarted. If the slug URLs ever 404,
check for a leftover listener: `netstat -ano | grep :8080`.

---

# Build log — central theme folder

**Date:** 2026-09-17
**Task:** One root folder holding the colour palette and font family, so a change there
applies across the site with no further effort.
**Status:** Complete and proven with a before/after render.

## What shipped

`pilotindia-clone/theme/` containing `theme.css` (the only file to edit) and a `README.md`
documenting every token. Linked into all **710** pages.

## Approach, and why not an override stylesheet

A "load a stylesheet last and re-colour things" layer would have been guesswork against
minified Divi CSS. Instead `tools/theme.mjs` converts the hardcoded literals into tokens:

    color: #e09900        ->   color: var(--pi-accent-legacy, #e09900)

The original value stays as the fallback, so nothing changes visually on install and a page
still renders correctly if `theme.css` fails to load.

| Pass | Result |
| --- | --- |
| External stylesheets | 79 files, 325 colours, 6,252 font stacks |
| Inline `<style>` blocks | 710 pages, 3,938 colours, 3,099 font stacks |

Safety rules in the tokeniser: `url(...)` is masked first so hexes inside `data:` SVG URIs are
never touched; only values of known colour properties are rewritten, never arbitrary text;
icon fonts (Font Awesome, ETmodules, eicons) are excluded from font swapping; every file
carries a marker comment so re-running is idempotent.

## The step that was nearly missed

The first pass only handled external `.css` and appeared to work - the nav went blue on a test
flip. But the page body stayed orange. Divi emits most of its brand colour in **per-page inline
`<style>` blocks** (14 per page, ~122 KB), and the section headings use `#ee833e`, an orange
absent from the external CSS entirely. Surveying the inline blocks turned up two more real brand
values (`#ee833e`, `#d39000`) and 3,457 inline uses of `#e09900`. Without that second pass the
theme would have controlled only the chrome.

WordPress default block-palette colours (`#fcb900`, `#f15b5f`) were deliberately left alone -
unused presets, not brand.

## Verification

Flipped `--pi-accent` to blue and unified the legacy oranges to it in one edit, rendered, then
restored. Nav CTA, active states, section headings and the statistic figures all followed;
photographs correctly did not. Heading colour confirmed back at `#EE833E` after restore.
Audit unchanged: 710 pages, 669 reachable, **0 broken internal links**.

---

# Build log — home page revamp

**Date:** 2026-09-17
**Task:** Revamp the home page. Modern hero, useful elements pulled from other pages, some
About Us content, and a footer in the same palette but a different design and font.
**Status:** Complete and reviewed at desktop and mobile.

## Design read and dials

Home page for a 70-year industrial manufacturer; audience is procurement and distributor
buyers; industrial-B2B language; native CSS on the theme tokens.
Dials: `DESIGN_VARIANCE 7` · `MOTION_INTENSITY 5` · `VISUAL_DENSITY 4`.

## Sections, eight different layout families

| # | Section | Layout family | Source of the content |
| --- | --- | --- | --- |
| 1 | Hero | full-bleed image, left copy | factory photo already in the library |
| 2 | Figures | dark band, four rules | About Us: 70 / 700 / 7000 / 12 |
| 3 | Product range | asymmetric bento, 5 items in 5 cells | the five Products menu entries + their slider images |
| 4 | About | split, copy left, facilities right | About Us copy, vision quote, 3 facility photos |
| 5 | Capability | divided rows, no cards | About Us claims: manufacturing, R&D, distribution, exports |
| 6 | Industries | pill field on dark | application lists from the product mirrors |
| 7 | Insights | numbered editorial list | 6 real blog posts |
| 8 | Closing | centred band | 2025 catalogue |

Everything is Pilot's own copy and Pilot's own images, per the instruction. Nothing invented,
no stock photography, no placeholder text.

Discipline held to: 2 eyebrows across 8 sections; bento has exactly as many cells as products;
one CTA per intent (products in the hero, catalogue in the closing band, contact in the nav);
no marquee; motion is scroll-reveal only, via IntersectionObserver, and collapses under
`prefers-reduced-motion`.

## Footer variant 2

`assets/css/pi-footer2.css`. Same palette, deliberately different from v1:

| | v1 (rest of site) | v2 (home) |
| --- | --- | --- |
| Shape | floating inset slab | full bleed |
| Structure | brand column + 3 link columns | statement prow, 4 equal columns, wide base row |
| Headings | sans, orange underline | **slab serif**, orange rule over each column |
| Accent | gradient rule along the top | warm wash rising from the base |

Font comes from `--pi-font-accent`, so it is still theme controlled.

## Two bugs found while reviewing my own render

1. **Card text ran together on one line.** The card title, description and link are `<span>`s
   inside the `<a>`; inline elements ignore vertical margins and never break. Fixed by making
   the card body a flex column and the parts `display: block`.
2. **Underlines on the card text.** Same `a:-webkit-any-link{text-decoration:underline}` trap as
   the footer: specificity (0,1,1) beats a bare `.pi-card`. Fixed with `.pi-home a.pi-card`.

## Verification

Full-page renders reviewed section by section at 1440px, plus 504px mobile (hero readable,
CTAs full width, stats 2x2, bento single column). Audit unchanged: **0 broken internal links**,
page counts identical.

Scope note: the new footer is on the home page only. The other 709 pages still carry footer v1.

---

# Build log — capability section restyled as a stacked reveal list

**Date:** 2026-09-17
**Task:** Rework "What sits behind the product" to behave like the expertise section on
o-scs.com, without changing any font size.
**Status:** Done, verified at rest and on hover.

## What the reference does

A stacked list of full-width rows carrying only a large title, with a second layer holding the
description that is revealed on interaction. I took the interaction idea and wrote my own
implementation. No markup, CSS, content or assets from that site were used.

## What our version does

- At rest each row shows only the number and the title, separated by hairlines.
- On hover or keyboard focus a near-black fill wipes in from the left (`scaleX` on a
  `::before`, 0.5s), the title turns white and shifts 6px right, the description fades in from
  the left, and an orange arrow slides out at the end of the row.
- **Font sizes are untouched**: number 15px, title 20px, description 15.5px, exactly as before.

## Accessibility and touch

A hover-only reveal would hide the copy from anyone not using a mouse, so:
- rows are focusable and the reveal fires on `:focus-within` as well as `:hover`
- under `@media (hover: none)` the description is shown outright and the arrow is dropped
- below 1024px the row collapses to number + title with the description always visible
- the whole thing still collapses to static under `prefers-reduced-motion`

## Verification

Rendered the section at rest and with row 02 forced into its hover state. Audit unchanged:
0 broken internal links.

---

# Build log — capability rows: scroll-triggered lift

**Date:** 2026-09-17
**Task:** Make the reveal scroll-driven rather than hover-driven, so the titles rise into place
as the section scrolls into view.
**Status:** Done, verified in both scripted and unscripted rendering.

## Change

Each number and title now sits inside a clipping box with an inner `.pi-cap__lift` span. When
the section enters the viewport the existing IntersectionObserver adds `is-in` and the text
translates from `translateY(115%)` to rest over 0.75s, staggered 90ms per row. The row hairline
draws in from the left on the same stagger.

Hover still fills the row and reveals the description; scroll now handles the entrance.
Font sizes remain untouched: number 15px, title 20px, description 15.5px.

Line-height on the clipping boxes was raised to 1.35 with 2px of bottom padding, otherwise the
box cut the descender off the "p" in "development".

## Content-hiding risk found and fixed

Rendering with scripting removed showed the titles **stayed hidden** - the start state is a
transform that only clears when JS adds `is-in`. Content that disappears without JS is not
acceptable, so the hidden start states are now gated behind a `.pi-js` class set by a tiny
inline script in `<head>` before first paint:

    .pi-js .pi-reveal      { opacity: 0; transform: translateY(18px); }
    .pi-js .pi-cap__lift   { transform: translateY(115%); }
    .pi-js .pi-cap::after  { transform: scaleX(0); }

No JS means no `.pi-js`, which means nothing is ever hidden. This also protects every other
`.pi-reveal` element on the page, which had the same latent problem.

## Verification

Side-by-side render with and without scripting: both show all four rows, titles and rules
intact, descenders uncut. Audit unchanged: 0 broken internal links.

# Spray-guns UI rolled out to welding, office and power-tools

The spray-guns page is the design reference. Its custom UI is exactly three components -
everything else on it is stock Elementor markup already shared by every product page:

  pilot-marquee-*  animated product-nav strip
  pg-feat*         5-column feature grid, scroll-revealed  (assets/css|js/pg-features.*)
  luboss-*         sticky horizontal-scroll product showcase

Those three were ported to the other product pages. Text, paragraphs, images and hrefs were
carried over verbatim from each page's existing markup - this was a UI swap, not a rewrite.

                marquee  pg-feat  luboss
  welding          y        y       y (3 slides)
  office           y        y       y (2 slides)
  power-tools      y        y       -

## luboss is slide-count-dependent

The component is hardcoded for three slides. Office has two products, so five values had to
change or the track scrolls past a slide that does not exist:

  CSS  .luboss-scroll-section height   320vh -> 220vh
  CSS  .luboss-track width             300vw -> 200vw
  JS   translateX = progress * 200     -> * 100
  JS   activeIndex 0.33/0.67 thresholds -> 0.5
  JS   targetProgress 0/0.5/1          -> 0/1

Verified at runtime rather than by grep: at the end of the pinned travel the office track sits
at -905.6px against a 906px viewport (-100vw exactly), progress bar 100%, step 2 active.

## Nesting depth matters for luboss, not for marquee

luboss uses position:sticky and 100vw slides, so it has to sit at the same DOM depth as in
spray-guns - div-depth 7. Nested deeper it ends up inside a boxed flex container and the
sticky/full-width behaviour breaks. Depth was measured per page rather than assumed: the cards
block started at depth 8 on welding but depth 9 on office, so each swap had to re-emit a
different number of trailing closing divs. The marquee is not sticky and tolerates depth
(welding's sits at 8 and renders fine).

## power-tools got no luboss, deliberately

Its three products (HG-25, BL-25, BL-26VS) are full spec sections - feature lists, technical
data tables, catalogue and manual PDFs. There is no card block to convert, and forcing them
into slides would have destroyed that content. It got a marquee linking to the three products
instead; anchor ids pt-hg-25 / pt-bl-25 / pt-bl-26vs were added to the section containers.

## The luboss tag label

Slides carry a small "N deg 01 - CATEGORY" tag the old cards had no equivalent for. Rather than
invent copy, each page reuses its own existing product-category names (welding: GAS WELDING &
BRAZING TORCHES / GAS CUTTING TORCHES / GAS REGULATORS; office: PAPER SHREDDERS / CURRENCY
COUNTERS). Card headings that were wrapped in an unrelated spray-guns blog link were unwrapped
to plain text, matching spray-guns; the real product links survive on "Check out solutions".

## Editing method - these files fight string-replace

300KB+ Elementor exports with inconsistent tabs. Plain string-replace edits silently fail to
match and are easy to believe succeeded - one such failure earlier in this work left a page
looking unchanged while reporting success. Every swap here used line-based splicing (sed split
into part1/part2/part3, cat, replace) followed by a whole-file div-balance check, and only then
a browser render check. Two bugs were caught this way that greps alone missed: a hero image
rewritten to a .webp path that never existed, and a marquee block that was never inserted.

## Verification

All four pages: div balance 0, marquee/pg-feat/luboss counts as tabled above, original headings
and paragraphs present verbatim, product hrefs unchanged. Rendered and screenshotted each page.
Remaining console noise (6x 404, an all.css SRI mismatch) is pre-existing - it reproduces
identically on the untouched homepage.

---

# Home page: "What sits behind the product" -> expand-on-hover list (2026-09-21)

Replaced the o-scs-style ghost/active scroll stack with the row list from
`https://expand-on-hover-list.framer.website/`. Owned by `tools/home.mjs` (CAPS array +
section markup) and section 5 of `assets/css/pi-home.css`. Idempotent: re-run `node tools/home.mjs`.

## Measurements taken off the reference, not guessed

The reference is a Framer page; its hover state is a JS variant, so CSS `:hover` cannot be
forced and `--dump-dom` shows only the collapsed layout. Measured instead by driving a headless
Chrome over the DevTools protocol (`Input.dispatchMouseEvent` to hover, then read boxes):

| property | reference | ours |
|---|---|---|
| collapsed band | 49px | 49px band, 90px row pitch |
| open row | 200px | 226px |
| gap between rows | 60px | 60px |
| artwork | 275 x 179, radius ~16px | same |
| index / name / copy | 40 / 30 / 16px | same |
| ghost colour | `#acacac` | `#acacac` |
| active name | `#0e0e0e` | `--h-accent` (Pilot orange) |

## Artwork

No image-generation tool exists in this environment, and the asset library has photographs for
Manufacturing and CNC only - nothing for Distribution or Exports. So all four illustrations were
drawn as SVG (`assets/img/pi-cap-{manufacturing,research,distribution,exports}.svg`), 560x364, in
one visual language: warm cream card, charcoal `#23262b` forms, `#f58634` accents. Drawing all
four keeps the set consistent, which mixing two photographs with two diagrams would not.

## Techniques

- Row height animates through `grid-template-rows: 0fr -> 1fr` on the copy and an explicit
  `height: 0 -> 179px` on the artwork. `height: auto` is not animatable; this pair is.
- `white-space: nowrap` on the name is load-bearing. Without it "RESEARCH AND DEVELOPMENT"
  wrapped to two lines and that row's collapsed band was 123px against 90px for the rest.
  The list was widened to 1100px so nowrap fits.
- Hover exclusivity kept from the previous build: `.pi-cap__list:has(.pi-cap:hover, ...)` closes
  the scroll-active row so only the hovered one is open.
- `@media (hover: none), (max-width: 680px)` opens every row outright - there is no pointer to
  hover with. Verified at 400px: all four open, no horizontal overflow.

## Verification

Headless Chrome over CDP against `localhost:8080`. All four SVGs load (natural size 560x364).
Collapsed rows 90/90/90/91px, open row 226px, artwork 179px. Hovering row 3 closed the
scroll-active row 2 (orange -> `#acacac`, artwork -> 0px). Mobile at 400px: rows 394/394/369/420px,
artwork 304px wide, `scrollWidth == innerWidth`.

---

# spray-guns: "Technical Excellence" redesign (2026-09-21)

Restyled the one section on `spray-guns/index.html` still running stock Elementor
icon-box widgets (default white rounded-square tiles, no motion, plain arrow-linked
carousel) - matching the user's screenshot of the live rendering. Owned by
`tools/sprayguns-technical.mjs` + `spray-guns/assets/css/pg-tech.css` +
`spray-guns/assets/js/pg-tech.js`. Idempotent: re-run `node tools/sprayguns-technical.mjs`.

## Scope: same content, same images, new chrome

Heading, subhead, all four card titles/descriptions, all four inline SVG icons and the
six-image product carousel (its exact Elementor widget markup, `data-settings`, and
`assets/img/*.png` sources) are extracted verbatim from the original block and
re-emitted unchanged. Only the surrounding layout, typography and motion are new: the
four cards move from a 2-and-2 flanking arrangement into a 2x2 grid beside a single
themed carousel panel (cream gradient frame, pill-shaped re-skinned nav arrows), icon
chips (56px rounded square, accent-tinted, flips solid orange with a white icon on
hover/focus), card lift + shadow on hover, and the same reveal-on-scroll two-layer
system pg-feat already uses on this page (`[data-pg-js]` + IntersectionObserver
fallback, `animation-timeline: view()` where supported).

## Extraction, not invention

The tool follows the same shape as `sprayguns-features.mjs`: locate the original
Elementor container by its element id, walk it with a balanced-`<div>` `spanOf()`,
regex out the heading/subhead/four icon-boxes/carousel widget, then discard the
original markup entirely in favour of custom `pg-tech__*` classes. On a re-run it
reads its own previous output instead (payload round-tripped as base64 JSON in a
`data-pg-src` attribute) so it never has to re-parse Elementor markup that no longer
exists - verified idempotent: re-running against already-converted output produced a
byte-identical file (same md5).

## Bug caught in verification, not by eye

First render put the carousel widget inside a CSS Grid track with no `min-width: 0`.
Swiper measured the track's width, the grid tried to size the track off Swiper's own
now-changed layout, and the two fed each other into computing a slide width of
33,553,856px (an active slide translated 33.5 million px offscreen, panel rendered as
blank white). This is the standard CSS-Grid-plus-JS-carousel trap: a grid item's
default `min-width: auto` lets it size to intrinsic content, and a JS layout library
measuring that same box creates a feedback loop. Fixed with `min-width: 0` on
`.pg-tech__grid`, `.pg-tech__cards` and `.pg-tech__visual`, plus `overflow: hidden` on
the visual panel as a second guard. Re-verified over the DevTools protocol: slide width
dropped to 453px (viewport-appropriate), active slide opacity 1, real product image
loaded.

## Verification

Headless Chrome over CDP against `localhost:8080/spray-guns/`. Div/section tag balance
0. All four card titles present exactly once. Re-run idempotent (identical md5).
Carousel: sane widget dimensions, six `assets/img/*.png` sources resolve and decode
(`naturalWidth` 300+ each), fade-autoplay advances between captures. Hover: icon chip
`rgba(245,134,52,.12)` -> solid `rgb(245,134,52)`, card lifts with shadow. Mobile at
400px: image panel reflows above the card stack, cards go full-width single column,
`scrollWidth == innerWidth` (no horizontal overflow).

---

# Home page: capability list revamp - smoother, more premium transitions (2026-09-21)

Kept the expand-on-hover interaction and all content, revamped the feel. Owned by
section 5 of `assets/css/pi-home.css` (no markup or JS changes - same `.pi-cap__no`
`__body` `__text` `__t` `__d` `__shot` `__go` structure, same scroll-spy JS).

## What changed

- **Accent wash**: a soft orange `::before` card (gradient, rounded, bleeding slightly
  past the row's own edges) fades in behind the open row instead of just recoloring
  text - the open row now reads as "lifted", not just "repainted".
- **Left accent bar**: a 3px `::after` bar grows from the vertical centre to full
  height on open - a second, more literal read of "this one is active" alongside the
  wash.
- **Orchestrated reveal**: opening staggers text (no delay) -> description (~20-60ms)
  -> artwork (80ms) -> button (120ms), so the row unfolds like a short sequence rather
  than every element snapping at once. Closing drops every delay to 0 and shortens
  durations (0.3s vs 0.5-0.6s open) - a row should feel eager to open, quick to let go.
- **One shared curve**: every transitioning property moved onto `cubic-bezier(0.19, 1,
  0.22, 1)` (expo-out), replacing the mix of `ease` and the old `cubic-bezier(0.22, 1,
  0.36, 1)` - nothing in the row arrives on a different curve than its neighbours.
- **Artwork**: now scales in from 0.94 with a drop shadow on open, not just a flat
  translateX - reads as the image settling into place rather than sliding in flush.
- **Arrow button**: scales to 1.08 and its glyph rotates -45deg on open, with a soft
  orange glow shadow - a more tactile "this is clickable and it just activated" cue.

## Technique

`::before`/`::after` on `.pi-cap` (which gained `isolation: isolate`, same pattern as
`.pi-exp__card`'s img/scrim layers) so the wash and bar sit behind the row's own
content without new markup. Transition delays are set in a separate rule from the
property-value changes they delay (a standard CSS split: one rule says *when*, another
says *to what*) so the close-state overrides further down can zero every delay without
fighting specificity.

## Verification

Headless Chrome over CDP against `localhost:8080`. Hovering a row: accent bar 0 -> 246px,
wash opacity 0 -> 1, artwork height 0 -> 179px - all independently confirmed via computed
styles, not just a screenshot. Scroll-active idle state (no pointer involved) produces
the identical treatment, confirming the effect is keyed off `.is-active`/`:hover`/
`:focus-within` uniformly. Mobile at 400px: existing `(hover: none)` fallback still
opens every row outright, scroll-active row still carries the wash/bar/glow, no
horizontal overflow (`scrollWidth == innerWidth`).

---

# Home page: closing CTA band revamp (2026-10-01)

Flat black "Seventy years..." CTA card gained depth; copy unchanged. Owned by
`tools/home.mjs` (section 8 markup) + section 8 of `assets/css/pi-home.css`.

## What changed

- **Two soft radial glows** (top-right, bottom-left, accent orange) replace the flat
  black fill - the card now reads as lit rather than a solid block.
- **Faint blueprint grid** texture, masked to fade out toward the edges - a restrained
  nod to the brand's engineering-shop register, not a loud pattern.
- **Ghost "70"** - the headline's own word, drawn as a huge near-invisible outlined
  numeral behind the copy (`-webkit-text-stroke`, `color: transparent`). Decoration
  only, `aria-hidden`, not new content.
- **"Est. 1953" eyebrow** with bracket rules either side - sourced from the site's own
  schema data (`about-us.html`'s JSON-LD: "Founded in 1953"), not invented.
- **Scroll reveal**: the whole block now wraps in `.pi-close__inner.pi-reveal`, fading
  up into view like every other section on the page - it previously had no entrance
  animation at all.
- **Button**: lifts 3px and gains an orange glow shadow on hover; the download icon
  nudges down 3px, suggesting the file dropping - a small, literal micro-interaction
  tied to what the button actually does.

## Verification

Headless Chrome over CDP against `localhost:8080`. `.pi-reveal` confirmed `is-in` after
scrolling into view. Hover: button border/text flip to accent, glow shadow appears, icon
visibly shifted down in the screenshot. Mobile at 400px: ghost numeral and eyebrow
rescale via a new `@media (max-width: 680px)` rule, `scrollWidth == innerWidth`.
