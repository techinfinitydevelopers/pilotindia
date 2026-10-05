// Puts the home page's footer (variant 2, .pi-f2) on every other page.
//
// The block is lifted verbatim from the generated home page rather than rebuilt here, so
// the two cannot drift apart: change the footer in tools/home.mjs, regenerate the home
// page, run this, and every page follows. Relative links and the logo are re-rooted for
// each page's depth. The home page itself is never rewritten.
//
//   node tools/footer2.mjs [siteDir]          write
//   node tools/footer2.mjs --dry              report only, write nothing
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const ROOT = args.find(a => !a.startsWith('--')) || path.join(process.cwd(), 'pilotindia-clone');

const homePath = path.join(ROOT, 'index.html');
const home = fs.readFileSync(homePath, 'utf8');
const fs0 = home.indexOf('<footer class="pi-f2"');
const fe0 = home.indexOf('</footer>', fs0);
if (fs0 < 0 || fe0 < 0) throw new Error('no .pi-f2 footer found on the home page');
const SOURCE = home.slice(fs0, fe0 + '</footer>'.length);

// anything that is not already absolute / a fragment / a protocol link is relative to the site root
const KEEP = /^(https?:|\/\/|mailto:|tel:|#|data:|javascript:)/i;
function reroot(block, prefix) {
  return block.replace(/\b(href|src)="([^"]*)"/g, (m, attr, val) =>
    KEEP.test(val) || val === '' ? m : `${attr}="${prefix}${val}"`);
}

const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(path.join(ROOT, d || '.'), { withFileTypes: true })) {
    const rel = d ? d + '/' + f.name : f.name;
    if (f.isDirectory()) { if (!/(^|\/)assets$/.test(rel)) walk(rel); }
    else if (f.name.endsWith('.html') && rel !== 'index.html') files.push(rel);
  }
})('');

const START = ['<footer class="pi-f2"', '<footer class="pi-footer"', '<footer id="main-footer"'];
let swapped = 0, linked = 0, none = 0;
const missing = [];

for (const rel of files) {
  const fp = path.join(ROOT, rel);
  let html = fs.readFileSync(fp, 'utf8');
  const prefix = '../'.repeat(rel.split('/').length - 1);

  const starts = START.map(m => html.indexOf(m)).filter(i => i >= 0);
  if (!starts.length) { none++; missing.push(rel); continue; }
  const s = Math.min(...starts);
  const e = html.indexOf('</footer>', s);
  if (e < 0) { none++; missing.push(rel); continue; }

  html = html.slice(0, s) + reroot(SOURCE, prefix) + html.slice(e + '</footer>'.length);
  swapped++;

  if (!html.includes('assets/css/pi-footer2.css')) {
    const head = html.lastIndexOf('</head>');
    if (head > 0) {
      html = html.slice(0, head) + `<link rel="stylesheet" href="${prefix}assets/css/pi-footer2.css" />\n` + html.slice(head);
      linked++;
    }
  }
  if (!DRY) fs.writeFileSync(fp, html, 'utf8');
}

console.log(`${DRY ? '[dry run] ' : ''}footers replaced: ${swapped}  css linked: ${linked}  skipped (no footer found): ${none}  of ${files.length}`);
if (missing.length) console.log('no footer in:\n  ' + missing.slice(0, 12).join('\n  ') + (missing.length > 12 ? `\n  ... +${missing.length - 12} more` : ''));
