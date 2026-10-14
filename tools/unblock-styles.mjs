// Flicker fix: the mirrored pages hold back their own layout CSS (Brightvolt "delayed CSS") until the first mouse move/scroll/key
// or a 4 s timer after load. Until then Elementor containers are display:inline and Divi sections are unstyled, so the page
// paints broken and then jumps. This puts the styles back where they were in the markup, as normal blocking CSS:
//   <style type="bv_inline_delayed_css">  ->  <style>
//   <template id="X"></template> for a local stylesheet in linkStyleAttrs  ->  <link rel="stylesheet" ...>
// External (https://) stylesheets stay delayed. Order is kept, so the cascade is unchanged. Idempotent.
// usage: node tools/unblock-styles.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', 'pilotindia-clone');
const dry = process.argv.includes('--dry');
const skip = new Set(['admin', 'node_modules', '.git']);

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name.endsWith('.html')) yield p;
  }
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
let pages = 0, styles = 0, links = 0, external = 0, missing = 0;
const attrKeys = new Set();

for (const file of walk(ROOT)) {
  let h = fs.readFileSync(file, 'utf8');
  if (!h.includes('bv_inline_delayed_css') && !h.includes('linkStyleAttrs')) continue;
  const o = h;
  const m = h.match(/var linkStyleAttrs = (\[.*?\]);\r?\n/s);
  if (m) {
    let list = [];
    try { list = JSON.parse(m[1]); } catch { console.log('bad json', file); }
    for (const it of list) {
      const a = it.attrs || {};
      Object.keys(a).forEach(k => attrKeys.add(k));
      if (!a.href || /^(https?:)?\/\//.test(a.href)) { external++; continue; }
      const tpl = new RegExp('<template id="' + it.bv_unique_id + '"></template>');
      if (!tpl.test(h)) { missing++; continue; }
      const tag = '<link' + Object.entries(a).map(([k, v]) => ' ' + k + '="' + esc(v) + '"').join('') + '>';
      h = h.replace(tpl, () => tag); links++;
    }
  }
  h = h.replace(/(<style\b[^>]*?)\s+type="bv_inline_delayed_css"/g, (_, a) => { styles++; return a; });
  if (h !== o) { pages++; if (!dry) fs.writeFileSync(file, h); }
}
console.log({ pages, styles, links, externalKept: external, missingTemplate: missing, attrKeys: [...attrKeys] });
