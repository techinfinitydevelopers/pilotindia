# theme/

Edit **`theme.css`** and nothing else. It is linked into all 710 pages of the clone, so a
change there applies to the main Pilot India site and to the four mirrored product sites
(spray-guns, airless, welding, office) at the same time.

## How it works

The stylesheets across the site no longer hardcode brand values. Where they used to say

    color: #e09900;

they now say

    color: var(--pi-accent-legacy, #e09900);

`theme.css` sets those variables once on `:root`. The original value stays as a fallback, so
if `theme.css` is ever missing the page still renders as before.

## What you can change

| Token | Controls |
| --- | --- |
| `--pi-accent` | the main brand orange (logo, new nav and footer) |
| `--pi-accent-legacy` | the orange the original WordPress theme used for links and hovers |
| `--pi-accent-strong`, `--pi-accent-warm`, `--pi-accent-bright` | secondary oranges |
| `--pi-ink`, `--pi-ink-soft`, `--pi-line`, `--pi-text`, `--pi-text-strong` | the dark chrome palette |
| `--pi-font-body`, `--pi-font-heading`, `--pi-font-accent` | text fonts |
| `--pi-radius-shell`, `--pi-radius-control`, `--pi-radius-pill` | corner rounding |

To collapse every orange on the site into one, set:

    --pi-accent-legacy: var(--pi-accent);

## What it deliberately does not touch

- **Icon fonts** (Font Awesome, ETmodules, eicons). Those map glyphs to characters; swapping
  them would turn every icon into a stray letter.
- **Colours baked into images.** Photographs and PNG logos are pixels, not CSS.
- **Hexes inside `url(data:...)`** SVG sprites, which are masked out before rewriting.

## Re-running

`node tools/theme.mjs` is idempotent. It never overwrites `theme.css` once it exists, and
it skips stylesheets it has already tokenised. Run it again after any fresh crawl to bring
new files into the system.
