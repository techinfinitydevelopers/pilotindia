// Two text fonts, nothing else: headlines = DM Sans Italic, everything else = SF Pro Display (stacks in theme/theme.css).
// tools/site-fonts.mjs already pointed every text declaration at those two variables. This finishes the job:
//   1. drops @font-face rules for any text font that is not DM Sans / PI Inter (Myriad Pro, Marina, the dead
//      `font-family: var(--pi-font-body, Open Sans)` faces, Google's Open Sans files). Icon fonts stay: they are glyphs, not text.
//   2. points the monospace rules (code, pre, Courier New, Consolas) at the body stack.
//   3. removes the Google Fonts stylesheet (Open Sans) that the Divi loader pulled in after the first interaction.
// Idempotent. usage: node tools/two-fonts.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', 'pilotindia-clone');
const dry = process.argv.includes('--dry');
const BODY = 'var(--pi-font-body)';
const ICON = /awesome|fontawesome|etmodules|eicons|dashicons|swiper|forminator|icon|dm sans|pi inter/i;
const st = { faces: 0, mono: 0, gfont: 0, tpl: 0, files: 0 };

function css(t) {
  t = t.replace(/@font-face\s*\{[^}]*\}\s*/gi, m => {
    const fam = (m.match(/font-family\s*:\s*([^;}]*)/i) || [, ''])[1];
    if (ICON.test(fam)) return m;
    st.faces++; return '';
  });
  t = t.replace(/(font-family\s*:\s*)([^;}{"]*(?:Courier|Consolas|Monaco|monospace)[^;}{"]*)/gi, (m, pre) => { st.mono++; return pre + BODY; });
  return t;
}

function html(t) {
  // the Google Fonts entry in the delayed-stylesheet list, and the empty <template> that marks its place
  t = t.replace(/\{"attrs":\{[^{}]*fonts\.googleapis\.com[^{}]*\},"bv_unique_id":"([^"]+)"\},?/g, (m, id) => {
    st.gfont++;
    t = t.replace(new RegExp('<template id="' + id + '"></template>\\s*'), () => { st.tpl++; return ''; });
    return '';
  });
  t = t.replace(/,\s*\]/g, ']');
  t = t.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (m, a, c, z) => a + css(c) + z);
  return t;
}

function* walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!['node_modules', '.git', 'img', 'fonts', 'admin'].includes(e.name)) yield* walk(p); }
    else if (/\.(html|css)$/.test(e.name)) yield p;
  }
}

for (const f of walk(ROOT)) {
  const o = fs.readFileSync(f, 'utf8');
  if (/^(\/\*[^*]*\*\/\s*)?<!DOCTYPE/i.test(o)) continue;       // html saved with a .css name; never linked
  const n = f.endsWith('.css') ? css(o) : html(o);
  if (n !== o) { st.files++; if (!dry) fs.writeFileSync(f, n); }
}
console.log(st);
