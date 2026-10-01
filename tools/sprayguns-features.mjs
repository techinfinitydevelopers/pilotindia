// Restyles the "Enhance Your Craft with Pilot Paint Spray Guns" block on the
// spray-guns mirror into divider-separated columns inside a sticky, pinned panel.
//
// Modelled on the features block at vectrfl.com. Worth recording what that actually
// does, because it is not what it looks like: there is no fade or slide on those
// columns at all. Their CSS carries no transition, no opacity and no keyframes. The
// motion is `position: sticky; top: 0; height: 100vh` on the wrapper, so the panel
// pins to the viewport and holds while the page scrolls past it.
//
// Pattern only. The markup, the CSS and every word of copy are Pilot's own, read
// straight out of the existing page so nothing is invented or imported.
//
// Idempotent: it reads either the original Elementor markup or its own previous
// output, so it can be re-run safely.
//
//   node tools/sprayguns-features.mjs [siteDir]
import fs from 'node:fs';
import path from 'node:path';

const CLONE = process.argv[2] || path.join(process.cwd(), 'pilotindia-clone');
const FILE = path.join(CLONE, 'spray-guns', 'index.html');
const HEAD_ID = 'elementor-element-38b98dc';   // container holding the section heading
const GRID_ID = 'elementor-element-8c5daf2';   // container holding the five columns

let html = fs.readFileSync(FILE, 'utf8');

// walk forward from a <div ...> and return the index just past its matching </div>
function spanOf(src, startIdx) {
  const open = /<div\b/gi, close = /<\/div\s*>/gi;
  let depth = 0, i = startIdx;
  while (i < src.length) {
    open.lastIndex = i; close.lastIndex = i;
    const o = open.exec(src), c = close.exec(src);
    if (!c) return -1;
    if (o && o.index < c.index) { depth++; i = o.index + 4; }
    else { depth--; i = c.index + c[0].length; if (depth === 0) return i; }
  }
  return -1;
}

const clean = (s) => s
  .replace(/<br\s*\/?>/gi, ' ')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&#045;/g, '-')
  .replace(/&#8217;|&rsquo;/g, "'")
  .replace(/\s+/g, ' ')
  .trim();

// ---- locate whatever is currently there ------------------------------------
const headStart = html.indexOf('<div class="elementor-element ' + HEAD_ID);
const gridStart = html.indexOf('<div class="elementor-element ' + GRID_ID);
const mineStart = html.indexOf('<div class="pg-feat" id="pg-feat"');

const blockStart = gridStart >= 0 ? gridStart : mineStart;
if (blockStart < 0) { console.error('neither the Elementor grid nor a previous pg-feat block was found'); process.exit(1); }

const blockEnd = spanOf(html, blockStart);
if (blockEnd < 0) { console.error('could not match closing tag'); process.exit(1); }

// absorb the separate heading container too, when it is still standing
const replaceStart = (headStart >= 0 && headStart < blockStart) ? headStart : blockStart;
const source = html.slice(replaceStart, blockEnd);

// ---- read the content out of whichever format it is in ---------------------
let heading = '';
const h1 = source.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
if (h1) heading = clean(h1[1]);
if (!heading) heading = 'Enhance Your Craft with Pilot Paint Spray Guns';

let icons = [...source.matchAll(/bv-data-src="([^"]+\.svg)"/gi)].map(m => m[1]);
let titles = [...source.matchAll(/<h3 class="elementor-image-box-title">([\s\S]*?)<\/h3>/gi)].map(m => clean(m[1]));
let descs = [...source.matchAll(/elementor-widget-text-editor[\s\S]*?<div class="elementor-widget-container">\s*<p>([\s\S]*?)<\/p>/gi)].map(m => clean(m[1]));

if (titles.length !== 5) {                       // fall back to our own markup
  icons = [...source.matchAll(/<span class="pg-feat__icon"><img src="([^"]+)"/gi)].map(m => m[1]);
  titles = [...source.matchAll(/<h3 class="pg-feat__t">([\s\S]*?)<\/h3>/gi)].map(m => clean(m[1]));
  descs = [...source.matchAll(/<p class="pg-feat__d">([\s\S]*?)<\/p>/gi)].map(m => clean(m[1]));
  console.log('(read from previous pg-feat output)');
}

console.log('heading  :', heading);
console.log('extracted-> icons:', icons.length, 'titles:', titles.length, 'descs:', descs.length);
if (!(icons.length === 5 && titles.length === 5 && descs.length === 5)) {
  console.error('expected 5 of each, aborting without writing');
  process.exit(1);
}
titles.forEach((t, i) => console.log('  ' + (i + 1) + '. ' + t + '  [' + path.basename(icons[i]) + ']'));

// ---- rebuild ---------------------------------------------------------------
const items = titles.map((t, i) => `        <article class="pg-feat__item">
          <span class="pg-feat__icon"><img src="${icons[i]}" alt="" width="84" height="84" loading="lazy" /></span>
          <h3 class="pg-feat__t">${t}</h3>
          <p class="pg-feat__d">${descs[i]}</p>
        </article>`).join('\n');

// outer element supplies the scroll runway; the inner panel is what pins
const rebuilt = `<div class="pg-feat" id="pg-feat">
  <div class="pg-feat__pin">
    <div class="pg-feat__wrap">
      <h1 class="pg-feat__title">${heading}</h1>
      <div class="pg-feat__grid">
${items}
      </div>
    </div>
  </div>
</div>`;

html = html.slice(0, replaceStart) + rebuilt + html.slice(blockEnd);


if (!html.includes('assets/css/pg-features.css')) {
  const at = html.indexOf('</head>');
  html = html.slice(0, at) + '<link rel="stylesheet" href="assets/css/pg-features.css" />\n' + html.slice(at);
}

// Scroll reveal. The hidden start state is gated on a data attribute set before
// first paint, so the copy is never hidden when scripting is unavailable. An
// attribute rather than a class: the theme assigns documentElement.className,
// which would wipe a class outright.
if (!html.includes('data-pg-js')) {
  const hm = html.match(/<head[^>]*>/i);
  const hat = html.indexOf(hm[0]) + hm[0].length;
  html = html.slice(0, hat) + "\n<script>document.documentElement.setAttribute('data-pg-js','');<\/script>\n" + html.slice(hat);
}
if (!html.includes('assets/js/pg-features.js')) {
  const bat = html.lastIndexOf('</body>');
  html = html.slice(0, bat) + '<script src="assets/js/pg-features.js" defer><\/script>\n' + html.slice(bat);
}
fs.writeFileSync(FILE, html, 'utf8');
console.log('spray-guns feature block rebuilt as a pinned panel');
