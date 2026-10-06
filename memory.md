# Project memory — pilotindia.com static clone

## What this project is
Offline static mirror of `https://pilotindia.com`, served locally by `serve.mjs`.
Source site: WordPress 7.1 + Divi 4.27.8 + Elementor 4.2.3, behind the **Airlift** (`bv-*`)
performance plugin. Rank Math supplies the sitemaps.

## Knowledge base

### Site facts
- Sitemap index: `https://pilotindia.com/sitemap_index.xml` → `page-sitemap.xml` (9),
  `post-sitemap.xml` (83), `category-sitemap.xml` (5). `robots.txt` allows `*`.
- `sitemap.xml` and `wp-sitemap.xml` both return the homepage HTML, not XML — use
  `sitemap_index.xml`.
- Contact: +91 22 6604 7000, info@pilotindia.com, 24 Sona Udyog, Parsi Panchayat Road,
  Andheri East, Mumbai 400069.

### Gotchas hit while cloning (worth remembering)
1. **Airlift hides asset URLs from the HTML.** There are zero `<script src>` tags. Script and
   stylesheet URLs live JSON-escaped (`https:\/\/pilotindia.com\/...`) inside
   `<script id="bv-dl-scripts-list">` / `bv-dl-styles-list`. A plain attribute-rewriting
   crawler captures no JavaScript at all. `tools/fix.mjs` exists solely to recover these.
2. **`url(` regex must be anchored.** A naive `/url\(...\)/` also matches JS identifiers such
   as `bv_replace_lazyloaded_image_url(element2)`, silently corrupting bundles. Use
   `/(?<![\w-])url\(/`. This bit once and produced broken lazy-loading.
3. **Some `.css` files contain JavaScript** (`wpo-minify-header-*.css` carries the Airlift
   runtime), so CSS post-processing must be safe against JS syntax.
4. **Google Fonts URLs are extensionless** (`fonts.googleapis.com/css?family=...`). Saved as
   `.bin` they get served as octet-stream and the browser refuses them as a stylesheet — force
   a `.css` extension and key the cache on the query string, not just the pathname.
5. The live site's own about-us page is missing its Font Awesome footer icons — that is **not**
   a cloning defect; the clone reproduces it faithfully.

### Footer redesign (custom, not from the live site)
- Brand orange sampled from the logo: **#F58634**. Footer ground `#0a0a0a`, headings white,
  body `#9a9a9a`.
- Owned by `tools/footer.mjs` + `assets/css/pi-footer.css`. Re-running the script re-generates
  the footer on all 125 pages (it recognises both the original Divi block and its own output, so
  it is idempotent and safe to re-run after a fresh crawl).
- **Specificity trap:** the theme ships
  `a:-webkit-any-link{color:-webkit-link;text-decoration:underline}` — specificity (0,1,1). Any
  new anchor styling on this site must be at least that specific or links silently fall back to
  browser-default blue and underlined. Scope as `.pi-footer .x a` or `.pi-footer a.x`.
- Font Awesome is unreliable here (Airlift lazy-loads it and it fails on interior pages, on the
  live site too) — use inline SVG for icons.

### Navbar redesign + page-wide radius scale
- `tools/navbar.mjs` + `assets/css/pi-nav.css` + `assets/js/pi-nav.js` own the nav on all 125
  pages; idempotent, safe to re-run after a fresh crawl.
- **Never keep Divi's `id="main-header"` / `id="main-footer"` on replacement chrome.** Divi
  ships `#main-header{position:fixed!important;width:100%}`, so a custom bar with side margins
  becomes viewport-width *plus* the margins and overflows right. Our blocks use `id="pi-nav"`
  and `id="pi-footer"`.
- Radius scale locked page-wide: shells 15px, controls 10px, pills 999px.
- Original site contrast defect (reproduced, then fixed in the new nav):
  `#top-menu a{color:rgba(0,0,0,0.6)}` puts dark grey text on the black bar.

### Two traps when probing pages with headless Chrome here
- Injected debug scripts must not contain a literal newline inside a JS string; generating
  `join("
")` through a shell heredoc silently produces a SyntaxError and the probe writes
  nothing. Join with a visible separator instead.
- Headless Chrome on Windows clamps the window to about **504px** wide. `--window-size=420`
  yields a 504px page cropped to a 420px image, which looks exactly like a broken mobile
  layout. Test mobile at 504px or wider.

### Satellite sites mirrored into the clone
- Four sibling sites live under `pilotindia-clone/sites/`: `spray-guns` (pilotsprayguns.com),
  `airless` (pilotairless.com), `welding` (pilotwelding.com), `office` (pilotofficeproducts.com).
  Clone total 714 pages / 737 MB.
- `tools/mirror-site.mjs <slug>` crawls one satellite; `tools/crosslink.mjs` then internalises
  every absolute Pilot-domain URL across all five mirrors. Run crosslink *after* any new crawl.
- **Satellites keep their own header/footer.** `tools/navbar.mjs` and `tools/footer.mjs` skip
  `sites/` deliberately - do not remove that guard.
- **String-replacement ordering trap:** when substituting a set of matched URLs with
  `split(hit).join(out)`, sort hits longest-first. A bare `https://pilotindia.com` otherwise gets
  replaced inside `https://pilotindia.com/power-tools/` and leaves a dangling tail
  (`index.htmlpower-tools/`). This cost 1,188 broken links; `tools/repair-links.mjs` fixes that
  specific damage shape.

### Upstream defects on the live Pilot sites (do not chase these as mirror bugs)
- pilotsprayguns.com carries **injected SEO spam**: Polish casino / betting pages. The crawler
  filters them out. Worth reporting to whoever administers that site.
- pilotairless.com (108 files) and pilotwelding.com (84 files) reference images their own servers
  return 404 for, in both the `/wp-content/` and `//wp-content/` forms.

### Central theme (one file drives palette + fonts)
- `pilotindia-clone/theme/theme.css` is the single source of truth; `tools/theme.mjs` builds it
  and wires everything up. Idempotent, and it never overwrites theme.css once it exists.
- It works by **tokenising literals**, not by an override layer:
  `color:#e09900` becomes `color:var(--pi-accent-legacy,#e09900)`. Original stays as fallback.
- **Divi keeps most brand colour in per-page inline `<style>` blocks** (14 per page, ~122 KB),
  not in the external CSS. Tokenising only `.css` files themes the chrome and leaves the page
  body hardcoded. Always do both passes.
- Real brand oranges on this site: `#e09900` (legacy theme, 3457 inline uses), `#ee833e` (Divi
  section headings, only in inline CSS), `#d39000` (hover), `#ce8742`, `#ff6900`, plus the logo
  `#f58634`. `#fcb900` / `#f15b5f` are unused WordPress block-palette presets - leave them.
- Never tokenise icon fonts (Font Awesome, ETmodules, eicons) - swapping them replaces icons
  with letters. Mask `url(...)` before rewriting hexes or you corrupt `data:` SVG URIs.
- The nav/footer declare their own `--pi-ink` / `--pi-text`, which would shadow the root names,
  so they read `--pi-ink-token` etc., defined at `:root` as aliases of the friendly names.

### Home page (rebuilt 2026-09-17)
- Owned by `tools/home.mjs` + `assets/css/pi-home.css` + `assets/css/pi-footer2.css` +
  `assets/js/pi-home.js`. Idempotent: it replaces whatever sits between the nav and the footer.
- 8 sections, 8 different layout families, all content and imagery taken from Pilot's own pages
  (About Us copy and facility photos, the product slider images, real blog posts).
- Footer v2 (.pi-f2) is now on ALL pages (tools/footer2.mjs copies it from the generated home page); footer v1 is gone. The four product sites also now use the pi-nav navbar (navbar.mjs --only=...), not their old Divi header.
- Recurring trap, hit again here: any new anchor style needs specificity above (0,1,1) to beat
  the theme's `a:-webkit-any-link{text-decoration:underline}`. Scope as `.pi-home a.x`.
- Spans inside an anchor need `display:block` (or a flex-column parent) or they run inline and
  silently ignore vertical margins.

### Verification method that worked
Headless Chrome screenshots of clone vs. live, compared side by side:
`chrome.exe --headless=new --disable-gpu --no-sandbox --user-data-dir=<temp> --virtual-time-budget=20000 --window-size=1440,1700 --screenshot=<abs path> <url>`.
The `--screenshot` path must be absolute and outside the CWD-protected dirs, otherwise it fails
with `Access is denied`.

### Environment notes
- No `wget` on this machine; `curl`, `node` v22.20.0, `python` 3.13 are available.
- `mv` on the OneDrive Desktop path intermittently fails with "Device or resource busy" —
  PowerShell `Rename-Item` works.

## Design system: the four custom components

`spray-guns/index.html` is the design reference for product pages. Everything on it that is not
stock Elementor is exactly four components — so "make page X look like spray-guns" means
porting these, nothing else:

| component | what it is | where it lives |
|---|---|---|
| `pilot-marquee-*` | animated product-nav strip | inline `<style>` + HTML per page |
| `pg-feat*` | 5-column scroll-revealed feature grid | `assets/css/pg-features.css` + `assets/js/pg-features.js` |
| `luboss-*` | sticky horizontal-scroll product showcase | inline `<style>` + HTML + `<script>` per page |
| `pg-tech*` | "Technical Excellence" capability grid + themed carousel | `assets/css/pg-tech.css` + `assets/js/pg-tech.js` |

Status: welding / office / power-tools all have marquee + pg-feat. luboss is on welding (3
slides) and office (2 slides); power-tools has none by design — its products are spec sections
(tech-data tables, PDFs), there is no card block to convert. pg-tech exists on spray-guns only
so far (2026-09-21) — welding/office/airless still carry their own stock-Elementor version of
this same "Technical Excellence" block, unconverted.

### luboss gotchas
- **Hardcoded for 3 slides.** For a different count change five values: section `height`
  (320vh for 3), track `width` (300vw), JS `progress * 200`, JS activeIndex thresholds
  (0.33/0.67), JS `targetProgress` mapping. Office's 2-slide variant uses 220vh / 200vw /
  `* 100` / 0.5 / `idx===0?0:1`.
- **Must sit at div-depth 7.** It uses `position:sticky` + 100vw slides; nested deeper it lands
  inside a boxed flex container and breaks. Measure depth per page — the card block it replaces
  started at depth 8 on welding but 9 on office, so the number of trailing `</div>`s to re-emit
  differs.
- Verify the scroll math at runtime, not by grep: at end of travel the track transform should
  equal -(slides-1) x viewport width, progress bar 100%, last step active.

### Editing these Elementor exports
300KB+ files with inconsistent tabs. **String-replace edits silently fail to match** and look
like they succeeded — this burned a full round here (a page reported "done" while unchanged).
Use line-based splicing (`sed` split into part1/part2/part3 → `cat` → replace), then a
whole-file div-balance check, then an actual browser render. Greps alone are not enough: they
missed a hero image rewritten to a `.webp` path that never existed, and a block never inserted.

Scratch files: use the session scratchpad dir, **not `/tmp`** — `/tmp` writes land somewhere
unexpected on this Windows box (confirmed: files written there were unreadable by `cat`).

### Pre-existing console noise (not a regression)
6x 404 plus an `assets/css/all.css` SRI digest mismatch reproduce identically on the untouched
homepage. Don't chase them when verifying a page.


### Expand OnHover List ("What sits behind the product" section)
Modelled directly on the Framer component `https://framer.com/m/Expand-OnHover-List-LByFXR.js@OBy0vsXNMeZtHbjUoVsi`.
- Stack of hairline-divided rows (top/bottom lines `#e6e6e6`) with a bottom sweep indicator line that expands across on open.
- Typography: `PT Sans Narrow 700` uppercase for numbers (`001`, `002`, `003`, `004` at 40px) and titles (30px), transitioning from close color `#acacac` to open `#0e0e0e`.
- Description: `Inter` 16px line-height 1.55, expanding smoothly via `grid-template-rows: 0fr -> 1fr`.
- Signature image animation: floating illustration card (264x161px) with 3px border, 16px radius, and -5deg tilt, smoothly swooping in from lower left (rotated 66deg, opacity 0) on hover.
- Feathered arrow circular button (40px) that highlights and tilts arrow up-right on hover/open.
- Desktop hover, mobile/tablet accordion click toggle, and keyboard focus accessibility.
- Owned by `tools/home.mjs` + `assets/css/pi-home.css` + `assets/js/pi-home.js`.

### Measuring a Framer reference site (hover states)
Framer hover states are JS variants, so CSS `:hover` cannot be forced and `--dump-dom` only
ever shows the collapsed layout. Drive headless Chrome over the DevTools protocol instead:
launch with `--remote-debugging-port`, open the WS from `/json/list` (Node 22 has a global
`WebSocket`), `Input.dispatchMouseEvent {type:"mouseMoved"}` onto the element, wait out the
transition, then `Runtime.evaluate` `getBoundingClientRect`. `tools`-adjacent probes for this
live in the session scratchpad. This is how the expand-on-hover list was measured exactly.

### Animating row height
`height: auto` is not animatable. Two things that are, used together on the capability list:
`grid-template-rows: 0fr -> 1fr` on a wrapper whose child has `overflow:hidden` (for auto-sized
copy), and an explicit `height: 0 -> Npx` on a fixed-size image wrapper.

### Uneven collapsed bands in a row list
If one name wraps, that row is taller than the rest and the whole stack looks broken.
`white-space: nowrap` on the title plus a container wide enough for the longest name is the fix
(`.pi-cap__t`, list widened to 1100px). Restore `white-space: normal` in the mobile block.

### Capability section artwork
`assets/img/pi-cap-{manufacturing,research,distribution,exports}.svg`, hand-drawn 560x364, warm
cream card + charcoal #23262b + #f58634. Drawn rather than photographed because the asset library
has nothing for Distribution or Exports and no image-generation tool exists here.


### spray-guns: fourth custom component - pg-tech
The design-system table (three components: marquee/pg-feat/luboss) has a fourth now:
`pg-tech` (see `tools/sprayguns-technical.mjs` + `spray-guns/assets/css/pg-tech.css`),
restyling the "Technical Excellence" block - the one section that was still stock
Elementor icon-boxes. Same extraction pattern as `sprayguns-features.mjs`: locate the
original container by element id, `spanOf()` for a balanced-div slice, regex out the
copy/icons/carousel, round-trip the payload as base64 JSON in `data-pg-src` so re-runs
never re-parse Elementor markup. Reuses pg-feat's two-layer scroll reveal
(`[data-pg-js]` + IntersectionObserver, `animation-timeline: view()` on top).

### CSS Grid + JS carousel = feedback loop
A grid item's default `min-width: auto` lets it size to intrinsic content. A JS layout
library (Swiper, Slick, ...) measuring that same box, whose size depends on the
library's own layout, creates a feedback loop - here it produced a 33,553,856px slide
width and a blank carousel. Fix: `min-width: 0` on every grid track and the carousel's
own wrapper, plus `overflow: hidden` on the wrapper as a second guard. Always
sanity-check a relocated/re-parented JS widget's actual computed dimensions over CDP,
not just whether it rendered something.


### Home hero (rebuilt 2026-10-01 to an interior-studio comp)
Framed dark photo, nav floating inside the frame (home only, `body.home .pi-nav:not(.is-stuck)`,
hero `margin-top:-74px`), Italiana display-serif h1 (Google Fonts, Georgia fallback), white
"700+ Authorised dealers" card right, two glass cards bottom (Spray Guns / Manufacturing).
Hero is a grid (cards in row 3, never absolute - absolute cards overlapped the copy on short windows). Card A notch is a CSS mask, so its arrow button must be a sibling (`.pi-hero__slot`) - a mask
clips children. The right-hand card is a 4-card animated deck (`.pi-deck`, `data-depth` 0-3, `DECK` array, logic in pi-home.js; `.is-reset` = transition:none jump to the back). Hero is one viewport tall; all vertical sizes are vh-clamped plus a max-height:780px tightening block - user views at 125% scaling (~1536x730 CSS px), test that size. Nav sticky never engages site-wide (Divi `html,body{overflow-x:hidden}`) - pre-existing.


### spray-guns series pages (evolution-series revamped 2026-10-05)
`tools/sprayguns-series.mjs pages/<page>.html` tags the Divi sections and wires `pg-series.css/js` -
content untouched (text + 200 links verified identical). Divi ships each model TWICE (desktop 3-col +
mobile stacked, hidden per breakpoint), so style both. Product photos are Divi background images with
inline padding and inconsistent framing: only `contain` in a fixed-aspect tile works. Divi's
`.et_pb_row::after` clearfix must stay off for grid cards, so mobile rows need `display:flow-root`.
Sticky series menu changes page height mid-scroll: chip jumps re-settle using the bar's offsetHeight.
Only evolution-series is converted; five sibling series pages share the template.

## Site structure: ONE site (merged 2026-10-05)

The clone used to be five mirrored WordPress sites (pilotindia.com + pilotsprayguns / pilotairless /
pilotwelding / pilotofficeproducts) and 710 pages. It is now one site: 298 html pages, one blog (185
posts), one `pages/`, `category/`, `assets/`. spray-guns/ airless/ welding/ office/ hold ONLY their
`index.html` (section landings). Never again expect `spray-guns/pages/...`, `welding/blog/...` or
`<site>/assets/...` - they are gone. Page content for a product lives in `pages/<name>.html`.

- Tools: `tools/merge-sites.mjs` (plan | --dry-rewrite | --apply; one-shot, guards against re-run),
  `tools/verify-refs.mjs` (strict reference check - trust this, not check.mjs).
- Asset collisions were kept with `-v2`/`-v3` suffixes (e.g. `et-divi-dynamic-7-v2.css`), so a page that
  references one of those is deliberately pointing at its own site's variant.
- Archive pages (category/*, pages/author-*) are GENERATED output of the merge, 6 cards (category) and
  5 (author) per page; to change them regenerate, do not hand-edit each page.
- 19 pages are unreachable by clicking from the home page (WP leftovers: test, a1, home-copy, ...);
  they were deliberately NOT deleted - only agreed duplicates were.
- Footer v2 and the pi-nav navbar are on every page; the product sites no longer have their own header.


### series page look (evolution-series, redesigned 2026-10-06)
Dark showroom matching the home hero: glass cards, Italiana model names, white stage tile per gun with a
figure card read from the spec table, areas-of-application moved under the features by pg-series.js.
Run `node tools/sprayguns-series.mjs pages/<page>.html` (paths relative to pilotindia-clone). Divi traps:
its scripts/scroll fight any custom sticky or anchor scroll - see the persistent memory note.

## Work done
See `BUILD_LOG.md`.
