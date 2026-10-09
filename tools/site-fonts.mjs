// Site-wide typography: headlines = DM Sans Italic (display), everything else = SF Pro Display Regular.
// The two stacks live in pilotindia-clone/theme/theme.css (--pi-font-heading / --pi-font-body). Most of the site already reads
// those variables; this tool rewrites the text-font declarations that were hard-coded (Arial, Myriad, Roboto, Open Sans,
// Inter, Italiana, PT Sans Narrow ...) so they read the variables too. Icon fonts, @font-face rules, `inherit`, `var(...)`
// and monospace are left alone, and <script> blocks are never touched. Re-running changes nothing.
//
//   node tools/site-fonts.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(process.cwd(), 'pilotindia-clone');
const DRY = process.argv.includes('--dry');
const BODY = 'var(--pi-font-body)', HEAD = 'var(--pi-font-heading)';

const KEEP = /awesome|fontawesome|etmodules|eicons|swiper-icons|forminator|dashicons|icon|inherit|initial|unset|var\(|monospace|courier|^\s*$/i;
const HEADLINE = /roboto slab|italiana|cormorant|pt sans narrow|dm sans|display/i;

function fixValue(v) {
  const important = /!\s*important/i.test(v);
  const bare = v.replace(/!\s*important/i, '').trim();
  if (KEEP.test(bare)) return null;
  const to = HEADLINE.test(bare) ? HEAD : BODY;
  return to + (important ? ' !important' : '');
}

// rewrite font-family declarations in a chunk of CSS (never inside @font-face)
function fixCss(css, stats) {
  const faces = [];
  const guarded = css.replace(/@font-face\s*\{[^}]*\}/gi, m => { faces.push(m); return '\u0000F' + (faces.length - 1) + '\u0000'; });
  const out = guarded.replace(/(font-family\s*:\s*)([^;}{"]*(?:"[^"]*"[^;}{"]*)*)/gi, (m, pre, val) => {
    const to = fixValue(val);
    if (to === null || val.trim() === to) return m;
    stats.n++;
    return pre + to;
  });
  return out.replace(/\u0000F(\d+)\u0000/g, (m, i) => faces[+i]);
}

// html: only <style> blocks and style="" attributes
function fixHtml(html, stats) {
  let out = html.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (m, a, css, c) => a + fixCss(css, stats) + c);
  out = out.replace(/(\sstyle\s*=\s*)(["'])([\s\S]*?)\2/gi, (m, a, q, css) => {
    if (!/font-family/i.test(css)) return m;
    // inside a double-quoted attribute the stack must not contain double quotes: our replacements have none
    return a + q + fixCss(css, stats) + q;
  });
  return out;
}

function walk(dir, files = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!['node_modules', '.git'].includes(e.name) && !p.endsWith(path.join('assets', 'fonts')) && !p.endsWith(path.join('assets', 'img'))) walk(p, files); }
    else if (/\.(html|css)$/i.test(e.name)) files.push(p);
  }
  return files;
}

let changedFiles = 0, total = 0;
for (const file of walk(ROOT)) {
  if (file.endsWith(path.join('theme', 'theme.css'))) continue;          // the stacks are defined there by hand
  const src = fs.readFileSync(file, 'utf8');
  const stats = { n: 0 };
  const out = file.endsWith('.html') ? fixHtml(src, stats) : fixCss(src, stats);
  if (out !== src) {
    changedFiles++; total += stats.n;
    if (!DRY) fs.writeFileSync(file, out);
  }
}
console.log((DRY ? 'would change ' : 'changed ') + total + ' declarations in ' + changedFiles + ' files');
