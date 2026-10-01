# pilotindia.com — static clone

Offline mirror of `https://pilotindia.com` (WordPress + Divi + Elementor, fronted by the
Airlift/`bv-*` optimizer). All HTML, CSS, JS, images, fonts and PDFs are local; no request
leaves the machine except third-party analytics beacons, which simply fail silently.

## Run it

```bash
node serve.mjs          # http://localhost:8080
node serve.mjs 3000     # any other port
```

The server maps pretty URLs too — `/about-us` resolves to `pages/about-us.html`,
`/introduction-to-spray-guns` to `blog/introduction-to-spray-guns.html`.

Opening `pilotindia-clone/index.html` directly via `file://` also mostly works (all paths are
relative), but a couple of stylesheets are rejected by the browser under `file://` — use the
server.

## Layout

```
pilotindia-clone/
├── index.html            home page
├── pages/                static pages + author archives
├── blog/                 blog posts
├── category/             category listings
├── spray-guns/           mirror of pilotsprayguns.com   -> /spray-guns
├── airless/              mirror of pilotairless.com     -> /airless
├── welding/              mirror of pilotwelding.com     -> /welding
├── office/               mirror of pilotofficeproducts.com -> /office
└── assets/   css/ js/ img/ fonts/ media/
```

710 pages in total. Each mirrored site keeps its own header, footer and styling exactly as
published; only the pilotindia pages carry the redesigned nav and footer.

## URLs

The Products menu never leaves localhost. Each satellite is just a slug on the same host:

| Menu entry | URL |
| --- | --- |
| Spray Guns | `/spray-guns` |
| Airless Spray Systems | `/airless` |
| Welding Equipments | `/welding` |
| Office Products | `/office` |

Inner pages extend the slug: `/spray-guns/evolution-series`, `/welding/gas-cutting-torches`,
`/office/paper-shredders`. Main-site pretty URLs work the same way (`/about-us`, `/contact-us`).

## Theming

Everything visual is driven by one file: **`pilotindia-clone/theme/theme.css`**.

```bash
# edit the file, save, reload the browser. No rebuild.
code pilotindia-clone/theme/theme.css
```

It sets the brand colours, the three text fonts and the corner-radius scale on `:root`.
The rest of the site no longer hardcodes those values - a rule that used to read
`color: #e09900` now reads `color: var(--pi-accent-legacy, #e09900)`, keeping the original
value as a fallback. It reaches all 710 pages, including the four mirrored product sites.

To collapse every orange on the site into the single logo orange, one line does it:

```css
--pi-accent-legacy: var(--pi-accent);
```

`theme/README.md` lists every token. Re-run `node tools/theme.mjs` after a fresh crawl to
bring new files into the system; it is idempotent and never overwrites your `theme.css`.

## What does not work offline (by design)

| Feature | Why |
| --- | --- |
| Contact form, comment posting, search | need `wp-admin/admin-ajax.php` on the live server |
| Google Analytics / gtag, Jetpack stats | external beacons, blocked/no-op |
| Elementor lazily-fetched widget assets | Elementor keeps an absolute asset base URL in inline config |

Everything else — navigation, hero slider, Divi layouts, lazy-loaded images, dropdown menus,
blog sidebar, PDF downloads — works from the local copy.

## How it was built

Three Node passes (kept in the session scratchpad):

1. **`mirror2.mjs`** — crawls from `sitemap_index.xml`, follows internal links, writes the flat
   tree, rewrites every `href`/`src`/`srcset`/`style`/`url()` to a relative local path.
2. **`fix.mjs`** — the Airlift optimizer hides script/style URLs inside inline JS as
   JSON-escaped strings (`https:\/\/pilotindia.com\/...`); this pass finds those, downloads the
   files (this is what recovers all 14 JS bundles) and rewrites them in place.
3. Verification — a reference checker plus headless-Chrome screenshots diffed against the live
   site.

Re-crawling later: the deep first-pass mirror can be handed to either script as a second
argument to serve as a binary asset cache and skip re-downloading images.
