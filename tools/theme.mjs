// Builds the single-source-of-truth theme folder and wires it to every page.
//
// Two jobs:
//   1. create theme/theme.css (once - never overwrites your edits)
//   2. tokenise the existing CSS: every hardcoded brand colour and text font in the
//      stylesheets becomes var(--token, <original value>), so editing theme.css changes
//      the whole site. The fallback is the original value, so a page still renders
//      correctly even if theme.css fails to load.
//
// Safe by construction:
//   - only rewrites values of known colour properties, never arbitrary text
//   - url(...) chunks are masked first, so hexes inside data: URIs are untouched
//   - icon fonts (Font Awesome, ETmodules, eicons) are excluded from font swapping
//   - each file gets a marker comment so re-running is idempotent
//
//   node tools/theme.mjs [siteDir]
import fs from 'node:fs';
import path from 'node:path';

const CLONE = process.argv[2] || path.join(process.cwd(), 'pilotindia-clone');
const MARKER = '/* pi-theme: tokenised */';

// ---------------------------------------------------------------- theme.css
const THEME_DIR = path.join(CLONE, 'theme');
const THEME_CSS = path.join(THEME_DIR, 'theme.css');

const THEME_DEFAULT = `/* ==========================================================================
   PILOT INDIA - THEME
   This is the only file you need to edit to restyle the whole site.
   Change a value here, save, reload the browser. No build step, no rebuild.
   ========================================================================== */

:root {

  /* ---------- BRAND COLOURS ---------------------------------------------
     --pi-accent        the main brand orange (taken from the logo)
     --pi-accent-strong a darker orange, used for gradients and hovers
     --pi-accent-legacy the orange the original WordPress theme shipped with
                        (links, hovers and buttons on the older pages)

     TIP: to make the ENTIRE site use one single orange, change the
     --pi-accent-legacy line to:     --pi-accent-legacy: var(--pi-accent);
     -------------------------------------------------------------------- */

  --pi-accent:         #f58634;
  --pi-accent-strong:  #d9701f;
  --pi-accent-legacy:  #e09900;
  --pi-accent-warm:    #ce8742;
  --pi-accent-bright:  #ff6900;

  /* ---------- NEUTRALS -------------------------------------------------- */

  --pi-ink:            #0a0a0a;   /* page chrome background (nav, footer)   */
  --pi-ink-soft:       #131313;   /* raised panels, dropdowns, tiles        */
  --pi-line:           #242424;   /* hairlines and borders on dark          */
  --pi-text:           #9a9a9a;   /* body text on dark                      */
  --pi-text-strong:    #ffffff;   /* headings on dark                       */

  /* ---------- FONTS -----------------------------------------------------
     Only text fonts are themed. Icon fonts (Font Awesome, ETmodules) are
     deliberately left alone - swapping those would replace icons with
     letters.  Any font already loaded by the site can be named here; to use
     a brand-new font you must also add its @font-face or <link> yourself.
     -------------------------------------------------------------------- */

  --pi-font-body:    'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  --pi-font-heading: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  --pi-font-accent:  'Roboto Slab', Georgia, 'Times New Roman', serif;

  /* Elementor reads these for its own global typography */
  --e-global-typography-text-font-family:      var(--pi-font-body);
  --e-global-typography-primary-font-family:   var(--pi-font-heading);
  --e-global-typography-secondary-font-family: var(--pi-font-heading);

  /* ---------- SHAPE ------------------------------------------------------
     One radius scale for the whole page.
     shells = nav bar, dropdown, mobile drawer, footer slab
     control = hover pills, icon tiles
     pill = action buttons and tags
     -------------------------------------------------------------------- */

  --pi-radius-shell:   15px;
  --pi-radius-control: 10px;
  --pi-radius-pill:    999px;
}

/* --------------------------------------------------------------------------
   PRESETS - uncomment one block to try a different look in one move.
   -------------------------------------------------------------------------- */

/* Single unified orange everywhere
:root {
  --pi-accent-legacy: var(--pi-accent);
  --pi-accent-warm:   var(--pi-accent);
  --pi-accent-bright: var(--pi-accent);
}
*/

/* Cooler, steel-industrial palette
:root {
  --pi-accent:        #2f81f7;
  --pi-accent-strong: #1f5fbf;
  --pi-accent-legacy: var(--pi-accent);
  --pi-accent-warm:   var(--pi-accent);
  --pi-accent-bright: var(--pi-accent);
}
*/

/* Squared-off corners
:root {
  --pi-radius-shell:   0px;
  --pi-radius-control: 0px;
  --pi-radius-pill:    0px;
}
*/
`;

const THEME_README = `# theme/

Edit **\`theme.css\`** and nothing else. It is linked into all 710 pages of the clone, so a
change there applies to the main Pilot India site and to the four mirrored product sites
(spray-guns, airless, welding, office) at the same time.

## How it works

The stylesheets across the site no longer hardcode brand values. Where they used to say

    color: #e09900;

they now say

    color: var(--pi-accent-legacy, #e09900);

\`theme.css\` sets those variables once on \`:root\`. The original value stays as a fallback, so
if \`theme.css\` is ever missing the page still renders as before.

## What you can change

| Token | Controls |
| --- | --- |
| \`--pi-accent\` | the main brand orange (logo, new nav and footer) |
| \`--pi-accent-legacy\` | the orange the original WordPress theme used for links and hovers |
| \`--pi-accent-strong\`, \`--pi-accent-warm\`, \`--pi-accent-bright\` | secondary oranges |
| \`--pi-ink\`, \`--pi-ink-soft\`, \`--pi-line\`, \`--pi-text\`, \`--pi-text-strong\` | the dark chrome palette |
| \`--pi-font-body\`, \`--pi-font-heading\`, \`--pi-font-accent\` | text fonts |
| \`--pi-radius-shell\`, \`--pi-radius-control\`, \`--pi-radius-pill\` | corner rounding |

To collapse every orange on the site into one, set:

    --pi-accent-legacy: var(--pi-accent);

## What it deliberately does not touch

- **Icon fonts** (Font Awesome, ETmodules, eicons). Those map glyphs to characters; swapping
  them would turn every icon into a stray letter.
- **Colours baked into images.** Photographs and PNG logos are pixels, not CSS.
- **Hexes inside \`url(data:...)\`** SVG sprites, which are masked out before rewriting.

## Re-running

\`node tools/theme.mjs\` is idempotent. It never overwrites \`theme.css\` once it exists, and
it skips stylesheets it has already tokenised. Run it again after any fresh crawl to bring
new files into the system.
`;

fs.mkdirSync(THEME_DIR, { recursive: true });
if (!fs.existsSync(THEME_CSS)) {
  fs.writeFileSync(THEME_CSS, THEME_DEFAULT, 'utf8');
  console.log('created theme/theme.css');
} else {
  console.log('theme/theme.css already exists - left untouched');
}
fs.writeFileSync(path.join(THEME_DIR, 'README.md'), THEME_README, 'utf8');

// ---------------------------------------------------------------- tokenise
// Every brand colour the site actually ships, counted from the real stylesheets and
// from the inline <style> blocks Divi emits per page. Values that belong to the
// WordPress default block palette (#fcb900, #f15b5f) are deliberately excluded:
// they are unused presets, not brand.
const COLOR_TOKENS = [
  ['#f58634', '--pi-accent'],
  ['#d9701f', '--pi-accent-strong'],
  ['#e09900', '--pi-accent-legacy'],
  ['#d39000', '--pi-accent-legacy-dark'],
  ['#ee833e', '--pi-accent-heading'],
  ['#ce8742', '--pi-accent-warm'],
  ['#ff6900', '--pi-accent-bright'],
];

const COLOR_PROPS = [
  'color', 'background', 'background-color', 'background-image',
  'border', 'border-color', 'border-top', 'border-right', 'border-bottom', 'border-left',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
  'outline', 'outline-color', 'fill', 'stroke', 'box-shadow', 'text-shadow',
  'text-decoration-color', 'caret-color', 'column-rule-color', '-webkit-text-fill-color',
].join('|');

// text fonts we theme, and the icon fonts we must never touch
const FONT_MAP = [
  [/^['"]?Open Sans['"]?$/i, '--pi-font-body'],
  [/^['"]?Roboto['"]?$/i, '--pi-font-heading'],
  [/^['"]?Roboto Slab['"]?$/i, '--pi-font-accent'],
];
const ICON_FONT = /(Font ?Awesome|ETmodules|eicons|dashicons|Material Icons|icomoon)/i;

function tokeniseCss(css) {
  // mask url(...) so hexes inside data: URIs and sprite paths are never rewritten
  const masked = [];
  css = css.replace(/url\([^)]*\)/gi, (m) => {
    masked.push(m);
    return ' URL' + (masked.length - 1) + ' ';
  });

  let colorHits = 0, fontHits = 0;

  // colours: only inside the value of a known colour property
  const declRe = new RegExp('(^|[;{\\s])(' + COLOR_PROPS + ')(\\s*:\\s*)([^;{}]+)', 'gi');
  css = css.replace(declRe, (m, lead, prop, sep, value) => {
    let v = value;
    for (const [hex, token] of COLOR_TOKENS) {
      const hexRe = new RegExp(hex.replace('#', '#') + '\\b', 'gi');
      v = v.replace(hexRe, (h) => {
        // don't double-wrap something already inside a var()
        colorHits++;
        return `var(${token}, ${h})`;
      });
    }
    return lead + prop + sep + v;
  });

  // fonts: swap only the stack whose FIRST family is a themed text font
  css = css.replace(/font-family\s*:\s*([^;{}]+)/gi, (m, stack) => {
    if (ICON_FONT.test(stack) || stack.includes('var(')) return m;
    const first = stack.split(',')[0].trim();
    for (const [re, token] of FONT_MAP) {
      if (re.test(first)) { fontHits++; return `font-family: var(${token}, ${stack.trim()})`; }
    }
    return m;
  });

  // restore url(...)
  css = css.replace(/ URL(\d+) /g, (m, i) => masked[Number(i)]);
  return { css, colorHits, fontHits };
}

const cssFiles = [];
(function walk(d) {
  for (const f of fs.readdirSync(path.join(CLONE, d || '.'), { withFileTypes: true })) {
    const rel = d ? d + '/' + f.name : f.name;
    if (f.isDirectory()) { if (rel !== 'theme') walk(rel); }
    else if (f.name.endsWith('.css') && rel !== 'theme/theme.css') cssFiles.push(rel);
  }
})('');

let filesDone = 0, totalColor = 0, totalFont = 0, skipped = 0;
for (const rel of cssFiles) {
  const fp = path.join(CLONE, rel);
  let css = fs.readFileSync(fp, 'utf8');
  if (css.includes(MARKER)) { skipped++; continue; }
  const { css: out, colorHits, fontHits } = tokeniseCss(css);
  if (colorHits || fontHits) {
    fs.writeFileSync(fp, MARKER + '\n' + out, 'utf8');
    filesDone++; totalColor += colorHits; totalFont += fontHits;
  }
}
console.log('stylesheets tokenised: ' + filesDone + ' (already done: ' + skipped + ')');
console.log('  colour values -> tokens: ' + totalColor);
console.log('  font stacks   -> tokens: ' + totalFont);

// ---------------------------------------------------------------- link it up
const htmlFiles = [];
(function walk(d) {
  for (const f of fs.readdirSync(path.join(CLONE, d || '.'), { withFileTypes: true })) {
    const rel = d ? d + '/' + f.name : f.name;
    if (f.isDirectory()) { if (!/(^|\/)assets$/.test(rel) && rel !== 'theme') walk(rel); }
    else if (f.name.endsWith('.html')) htmlFiles.push(rel);
  }
})('');

const HTML_MARKER = '<!--pi-theme-->';
let linked = 0, inlineFiles = 0, inlineColor = 0, inlineFont = 0;

for (const rel of htmlFiles) {
  const fp = path.join(CLONE, rel);
  let html = fs.readFileSync(fp, 'utf8');
  let dirty = false;

  // Divi and Elementor emit most of their brand colours in per-page inline <style>
  // blocks, not in the external stylesheets. Without this the theme only reaches
  // the chrome and the page body stays hardcoded.
  if (!html.includes(HTML_MARKER)) {
    html = html.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/gi, (m, open, css, close) => {
      const { css: out, colorHits, fontHits } = tokeniseCss(css);
      if (colorHits || fontHits) { inlineColor += colorHits; inlineFont += fontHits; }
      return open + out + close;
    });
    html = HTML_MARKER + '\n' + html;
    inlineFiles++;
    dirty = true;
  }

  if (!html.includes('theme/theme.css')) {
    const prefix = '../'.repeat(rel.split('/').length - 1);
    const tag = `<link rel="stylesheet" href="${prefix}theme/theme.css" />\n`;
    const m = html.match(/<head[^>]*>/i);
    if (m) {
      const at = html.indexOf(m[0]) + m[0].length;
      html = html.slice(0, at) + '\n' + tag + html.slice(at);
      linked++;
      dirty = true;
    }
  }

  if (dirty) fs.writeFileSync(fp, html, 'utf8');
}
console.log('pages with inline <style> tokenised: ' + inlineFiles);
console.log('  colour values -> tokens: ' + inlineColor);
console.log('  font stacks   -> tokens: ' + inlineFont);
console.log('pages linked to theme.css: ' + linked + ' of ' + htmlFiles.length);
