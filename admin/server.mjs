// Admin dashboard for the Pilot India static site - the server half.
//
// Runs inside serve.mjs (local only, no login - see admin/README.md). Every change is written
// straight into the site's HTML/CSS files, surgically: pages are parsed with parse5, which reports
// the exact source offsets of every element, so an edit replaces only the text or attribute it
// targets and the rest of the file stays byte-identical. Before any write, the previous version is
// copied to admin-backups/ (git-ignored) so every save can be restored from the dashboard.
//
// Routes (all under /admin):
//   GET  /admin/, /admin/<file>          dashboard UI (admin/*.html|css|js)
//   GET  /<page>.html?__cms=1            the page instrumented for the visual editor
//   GET  /admin/api/summary              counts + recent edits
//   GET  /admin/api/pages                every editable page, grouped
//   POST /admin/api/edit                 {path, edits:[{id, op, value}]} visual-editor edits
//   GET  /admin/api/series               series pages grouped by product line
//   GET  /admin/api/products?path=       the products on one series page
//   POST /admin/api/product              {path, id, ...fields} save one product
//   POST /admin/api/product/duplicate    {path, id}
//   POST /admin/api/product/delete       {path, id}
//   GET  /admin/api/blog                 blog posts
//   GET  /admin/api/blog/post?path=      one post
//   POST /admin/api/blog/post            {path?, title, date, summary, image, body} save or create
//   GET  /admin/api/theme  POST          theme tokens (theme/theme.css + product-area tokens)
//   GET  /admin/api/media                image library     POST /admin/api/upload?name=  (raw body)
//   POST /admin/api/restore              {path, stamp}
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'parse5';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { flush, track, dbMode } from '../store.mjs';

let ROOT = '';
let ADMIN_DIR = '';
let REPO = '';
let BACKUPS = '';

export function initAdmin(siteRoot, repoRoot) {
  ROOT = siteRoot;
  REPO = repoRoot;
  ADMIN_DIR = path.join(repoRoot, 'admin');
  BACKUPS = path.join(repoRoot, 'admin-backups');
  // fill the page cache in the background so the first dashboard load is quick
  setTimeout(() => { try { summary(); blogFiles().forEach(blogSummary); } catch (e) { /* lists will build on demand */ } }, 50);
}

// ---------------------------------------------------------------- small helpers
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };
const IMG_EXT = /\.(png|jpe?g|gif|webp|svg|avif)$/i;

// Answers only after any database writes made while handling the request have landed (store.mjs), so
// "saved" in the dashboard means saved. Without a database flush() resolves at once.
function send(res, code, obj) {
  flush().then(() => reply(res, code, obj), err => reply(res, 500, { error: 'not saved, database write failed: ' + (err.message || err) }));
}
function reply(res, code, obj) {
  const body = typeof obj === 'string' ? obj : JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': typeof obj === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}
function readBody(req, limit = 30 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > limit) { reject(new Error('upload too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
async function readJson(req) { const b = await readBody(req); return b.length ? JSON.parse(b.toString('utf8')) : {}; }

// a site-relative path ("pages/x.html") -> absolute, refusing anything outside the site
function sitePath(rel, ext = '.html') {
  if (!rel || typeof rel !== 'string') throw new Error('missing path');
  const clean = rel.replace(/\\/g, '/').replace(/^\/+/, '');
  const abs = path.resolve(ROOT, clean);
  if (!abs.startsWith(ROOT + path.sep)) throw new Error('path outside the site');
  if (ext && !abs.endsWith(ext)) throw new Error('not an ' + ext + ' file');
  return abs;
}
const relOf = abs => path.relative(ROOT, abs).split(path.sep).join('/');
const escText = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
function decode(s) {
  return String(s).replace(/&#(\d+);/g, (m, d) => String.fromCharCode(+d)).replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'").replace(/&nbsp;/g, ' ');
}
function titleOf(html) { const m = html.match(/<title>([\s\S]*?)<\/title>/i); return m ? decode(m[1]).replace(/\s+/g, ' ').trim() : ''; }

// root-relative asset path ("assets/img/x.jpg") -> path relative to the page that will reference it
function refFrom(pageAbs, rootRel) {
  if (!rootRel) return rootRel;
  if (/^(https?:|data:|mailto:|tel:|#|\/\/)/i.test(rootRel)) return rootRel;
  const target = path.resolve(ROOT, rootRel.replace(/^\/+/, ''));
  return path.relative(path.dirname(pageAbs), target).split(path.sep).join('/');
}
// a reference as written in a page -> root-relative, for showing in the dashboard
function rootRelFrom(pageAbs, ref) {
  if (!ref || /^(https?:|data:|mailto:|tel:|#|\/\/)/i.test(ref)) return ref || '';
  return relOf(path.resolve(path.dirname(pageAbs), ref.split(/[?#]/)[0]));
}

// ---------------------------------------------------------------- backups
function backupDir(rel) { return path.join(BACKUPS, rel.replace(/[\\/]/g, '__')); }
function writeWithBackup(abs, text) {
  const rel = relOf(abs);
  if (fs.existsSync(abs)) {
    const dir = backupDir(rel);
    fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.copyFileSync(abs, path.join(dir, stamp + path.extname(abs)));
  }
  fs.writeFileSync(abs, text, 'utf8');
}
function recentEdits(limit = 14) {
  if (!fs.existsSync(BACKUPS)) return [];
  const out = [];
  for (const d of fs.readdirSync(BACKUPS)) {
    const dir = path.join(BACKUPS, d);
    // only page backups (named after the page, ending .html); other folders here are one-off safety copies
    if (!fs.statSync(dir).isDirectory() || !/\.html$/.test(d)) continue;
    for (const f of fs.readdirSync(dir)) {
      const st = fs.statSync(path.join(dir, f));
      out.push({ path: d.replace(/__/g, '/'), stamp: f, time: st.mtimeMs });
    }
  }
  return out.sort((a, b) => b.time - a.time).slice(0, limit);
}

// ---------------------------------------------------------------- parse5 tree helpers
function parseDoc(html) { return parse(html, { sourceCodeLocationInfo: true }); }
const isEl = n => n && typeof n.tagName === 'string';
// every element that exists in the source, in document order; its index is its stable id
function elementsOf(doc) {
  const out = [];
  (function walk(n) {
    for (const c of n.childNodes || []) {
      if (!isEl(c)) continue;
      if (c.sourceCodeLocation && c.sourceCodeLocation.startTag) out.push(c);
      walk(c);
    }
  })(doc);
  return out;
}
function attr(el, name) { const a = (el.attrs || []).find(x => x.name === name); return a ? a.value : null; }
function hasClass(el, c) { const v = attr(el, 'class'); return !!v && (' ' + v + ' ').includes(' ' + c + ' '); }
function findAll(node, pred, out = []) {
  for (const c of node.childNodes || []) { if (isEl(c)) { if (pred(c)) out.push(c); findAll(c, pred, out); } }
  return out;
}
const find = (node, pred) => findAll(node, pred)[0] || null;
function textOf(n) {
  if (n.nodeName === '#text') return n.value;
  return (n.childNodes || []).map(textOf).join('');
}
const cleanText = n => (n ? textOf(n).replace(/\s+/g, ' ').trim() : '');
function nextElement(el) {
  const sib = el.parentNode.childNodes; const i = sib.indexOf(el);
  for (let k = i + 1; k < sib.length; k++) if (isEl(sib[k])) return sib[k];
  return null;
}
function innerRange(el) {
  const l = el.sourceCodeLocation;
  if (!l || !l.startTag || !l.endTag) return null;
  return [l.startTag.endOffset, l.endTag.startOffset];
}
function outerRange(el) { const l = el.sourceCodeLocation; return [l.startOffset, l.endOffset]; }

// rewrite attributes inside one start tag; set[name] = value | null (remove)
function startTagWith(src, el, set) {
  const st = el.sourceCodeLocation.startTag;
  let tag = src.slice(st.startOffset, st.endOffset);
  const locs = el.sourceCodeLocation.attrs || {};
  const ops = [];
  for (const [name, val] of Object.entries(set)) {
    const loc = locs[name];
    if (loc) ops.push([loc.startOffset - st.startOffset, loc.endOffset - st.startOffset, val == null ? '' : `${name}="${escAttr(val)}"`]);
    else if (val != null) { const end = tag.endsWith('/>') ? tag.length - 2 : tag.length - 1; ops.push([end, end, ` ${name}="${escAttr(val)}"`]); }
  }
  ops.sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  for (const [s, e, r] of ops) tag = tag.slice(0, s) + r + tag.slice(e);
  return [st.startOffset, st.endOffset, tag.replace(/[ \t]+(\/?>)$/, '$1').replace(/ {2,}/g, ' ')];
}

// apply [start, end, text] replacements; they must not overlap
function applyReplacements(src, reps) {
  reps.sort((a, b) => b[0] - a[0]);
  for (let i = 1; i < reps.length; i++) {
    if (reps[i][1] > reps[i - 1][0]) throw new Error('two edits touch the same part of the page; save them one at a time');
  }
  let out = src;
  for (const [s, e, t] of reps) out = out.slice(0, s) + t + out.slice(e);
  return out;
}

// keep only safe inline/structural markup from an editor
function sanitize(html, pageAbs) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<(iframe|object|embed)[\s\S]*?(<\/\1>|\/>|>)/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(data-cms|contenteditable|spellcheck|data-pi-sel)(=("[^"]*"|'[^']*'|[^\s>]+))?/gi, '')
    .replace(/(href|src)\s*=\s*"\s*javascript:[^"]*"/gi, '$1="#"')
    // images/links the editor inserted as /assets/... become relative to this page
    .replace(/\b(src|href)="\/(?!\/)([^"]+)"/g, (m, a, p) => `${a}="${refFrom(pageAbs, p)}"`);
}

function imageSet(el, src) {
  const set = { src };
  if (attr(el, 'bv-data-src') != null) set['bv-data-src'] = src;
  if (attr(el, 'data-src') != null) set['data-src'] = src;
  for (const a of ['srcset', 'sizes', 'bv-data-srcset', 'data-srcset']) if (attr(el, a) != null) set[a] = null;
  return set;
}
function styleWithBg(el, ref) {
  const style = (attr(el, 'style') || '').replace(/background-image\s*:[^;]*;?/gi, '').trim();
  return (style ? style.replace(/;?\s*$/, '; ') : '') + `background-image:url('${ref}') !important;`;
}

// ---------------------------------------------------------------- visual editor
const NO_ID = new Set(['html', 'head', 'meta', 'link', 'script', 'style', 'title', 'noscript', 'base', 'template']);
export function instrument(html) {
  const doc = parseDoc(html);
  const els = elementsOf(doc);
  const ins = [];
  els.forEach((el, i) => {
    if (NO_ID.has(el.tagName)) return;
    const st = el.sourceCodeLocation.startTag;
    const at = html[st.endOffset - 2] === '/' ? st.endOffset - 2 : st.endOffset - 1;
    ins.push([at, ` data-cms="${i}"`]);
  });
  // one pass: slicing the string once per element is quadratic on a 300 KB page
  ins.sort((a, b) => a[0] - b[0]);
  const parts = []; let last = 0;
  for (const [at, s] of ins) { parts.push(html.slice(last, at), s); last = at; }
  parts.push(html.slice(last));
  let out = parts.join('');
  // the editor sends this back with its edits; ids are only valid for this exact version of the file
  const tail = `\n<script>window.__CMS_VERSION__=${JSON.stringify(versionOf(html))};</script>\n<link rel="stylesheet" href="/admin/overlay.css" />\n<script src="/admin/overlay.js"></script>\n`;
  const b = out.lastIndexOf('</body>');
  return b >= 0 ? out.slice(0, b) + tail + out.slice(b) : out + tail;
}

function versionOf(text) { return createHash('sha1').update(text).digest('hex').slice(0, 16); }

function applyVisualEdits(pageAbs, edits, version) {
  const src = fs.readFileSync(pageAbs, 'utf8');
  if (version && version !== versionOf(src)) throw new Error('this page was changed since the editor opened it - reload the editor and redo the edit');
  const els = elementsOf(parseDoc(src));
  const attrSets = new Map();
  const reps = [];
  for (const e of edits) {
    const el = els[+e.id];
    if (!el) throw new Error('element ' + e.id + ' not found - the page changed; reload the editor');
    if (e.op === 'html' || e.op === 'text') {
      const r = innerRange(el);
      if (!r) throw new Error('this element cannot be edited as text');
      reps.push([r[0], r[1], e.op === 'text' ? escText(e.value) : sanitize(e.value, pageAbs)]);
    } else {
      const set = attrSets.get(el) || {};
      if (e.op === 'img') Object.assign(set, imageSet(el, refFrom(pageAbs, e.value)));
      else if (e.op === 'bg') set.style = styleWithBg(el, refFrom(pageAbs, e.value));
      else if (e.op === 'href') {
        const v = String(e.value || '').trim();
        if (/^(https?:|mailto:|tel:|#|\/\/)/i.test(v) || !v) set.href = v;
        else { const p = v.match(/^([^?#]*)([\s\S]*)$/); set.href = refFrom(pageAbs, p[1]) + (/\/$/.test(p[1]) ? '/' : '') + p[2]; }
      }
      else if (e.op === 'alt') set.alt = e.value;
      else if (e.op === 'attr' && /^(content|title)$/.test(e.name || '')) set[e.name] = e.value;
      else throw new Error('unknown edit ' + e.op);
      attrSets.set(el, set);
    }
  }
  for (const [el, set] of attrSets) reps.push(startTagWith(src, el, set));
  writeWithBackup(pageAbs, applyReplacements(src, reps));
}

// ---------------------------------------------------------------- page list
function walkHtml(dir, out) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) { if (f.name !== 'assets' && !f.name.startsWith('.')) walkHtml(p, out); }
    else if (f.name.endsWith('.html')) out.push(p);
  }
  return out;
}
const isStub = html => html.length < 3000 && /http-equiv="refresh"/i.test(html);
const DRAFT = /^(a1|test|testing|test-page|sample-page|home-copy|home-2|home-2-old|home-old-[a-z]+|.*-copy|hvlp-technology-2)$/;

// what the lists need from a page, cached by file time: reading ~300 pages of ~250 KB per request took seconds
const pageInfoCache = new Map();
function pageInfo(abs) {
  const mtime = fs.statSync(abs).mtimeMs;
  const hit = pageInfoCache.get(abs);
  if (hit && hit.mtime === mtime) return hit;
  const html = fs.readFileSync(abs, 'utf8');
  const info = {
    mtime,
    stub: isStub(html),
    title: titleOf(html),
    series: /class="[^"]*\bpg-series\b/.test(html),
    seriesName: seriesName(html, path.basename(abs, '.html')),
    products: (html.match(/class="[^"]*\bpg-prod--desk\b[^"]*" id="model-/g) || []).length,
  };
  pageInfoCache.set(abs, info);
  return info;
}

function listPages() {
  const out = [];
  for (const abs of walkHtml(ROOT, [])) {
    const rel = relOf(abs);
    const info = pageInfo(abs);
    if (info.stub) continue;
    const base = path.basename(rel, '.html');
    let group;
    if (rel === 'index.html') group = 'Home';
    else if (/^[^/]+\/index\.html$/.test(rel)) group = 'Product sites';
    else if (rel.startsWith('pages/') && info.series) group = 'Series & product pages';
    else if (rel.startsWith('pages/') && /^author-/.test(base)) group = 'Archives';
    else if (rel.startsWith('pages/') && DRAFT.test(base)) group = 'Drafts & old copies';
    else if (rel.startsWith('pages/')) group = 'Pages';
    else if (rel.startsWith('blog/')) group = 'Blog posts';
    else group = 'Archives';
    out.push({ path: rel, title: info.title || base, group });
  }
  return out;
}

// ---------------------------------------------------------------- page sections (form editor)
// A page is read as a list of sections, each with its editable fields (text, images, backgrounds, links), so it can be
// edited as a form beside a live preview. Ids are the same document-order element ids the visual editor uses.
const INLINE_TAGS = new Set(['b', 'strong', 'em', 'i', 'u', 'br', 'span', 'a', 'small', 'sup', 'sub', 'mark', 'abbr', 'code']);
const TEXT_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'a', 'button', 'span', 'div', 'td', 'th', 'figcaption', 'label', 'dt', 'dd', 'strong', 'em', 'b', 'small', 'blockquote', 'cite', 'summary']);
const SKIP_TAGS = new Set(['script', 'style', 'svg', 'noscript', 'template', 'iframe', 'head', 'nav', 'select', 'option', 'textarea']);
const SEC_LABELS = [['pi-hero', 'Hero'], ['pi-stats', 'Stats'], ['products', 'Product range'], ['pi-about', 'About'], ['pi-cap-sec', 'Capabilities'], ['pi-ind', 'Industries'], ['pi-ins', 'Insights'], ['pi-close', 'Closing band'],
  ['pg-hero', 'Hero'], ['pg-chain', 'Applications'], ['pg-tech', 'Technical Excellence'], ['pg-feat', 'Features'], ['pg-faq', 'FAQs']];
const titleCase = s => String(s).replace(/\b[a-z]/g, c => c.toUpperCase());
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

function isTextish(el) {
  const t = cleanText(el);
  if (!t || t.length > 1500) return false;
  return findAll(el, e => !INLINE_TAGS.has(e.tagName)).length === 0;
}
const hasChildEls = el => (el.childNodes || []).some(isEl);

// the units a page is made of: the home page's <main> sections, else the outermost section-like blocks
function sectionUnits(doc) {
  const main = find(doc, e => e.tagName === 'main' && hasClass(e, 'pi-home'));
  if (main) return main.childNodes.filter(c => isEl(c) && c.tagName === 'section');
  const isCand = e => e.tagName === 'section' || hasClass(e, 'et_pb_section') || hasClass(e, 'e-parent');
  const nested = e => { for (let p = e.parentNode; p; p = p.parentNode) if (isEl(p) && (isCand(p) || ['header', 'footer', 'nav'].includes(p.tagName))) return true; return false; };
  return findAll(doc, isCand).filter(e => !nested(e) && !hasClass(e, 'pg-skip') && !hasClass(e, 'pg-nav') && !hasClass(e, 'pg-prod--mob') && cleanText(e).length > 0);
}

function elemLabel(el, fallback) {
  for (const c of (attr(el, 'class') || '').split(/\s+/)) {
    const m = c.match(/__([a-z0-9-]+)$/i);
    if (m && m[1].length > 0) {
      // short class names read badly ("Card T", "Card Img"): spell them out
      return titleCase(m[1].replace(/-/g, ' ')).replace(/\bImg\b/, 'Image').replace(/\bT\b/, 'Title').replace(/\bD\b/, 'Text').replace(/\bN\b/, 'Number').replace(/\bGo\b/, 'Button');
    }
  }
  return fallback;
}
const TAG_LABEL = { h1: 'Title', h2: 'Title', h3: 'Subtitle', h4: 'Subtitle', h5: 'Subtitle', h6: 'Subtitle', p: 'Text', li: 'List item', a: 'Button', button: 'Button', td: 'Cell', th: 'Cell', figcaption: 'Caption', blockquote: 'Quote' };

// the repeated unit (a card, a row) a field sits in, so fields can be grouped as "Item 1, Item 2 ..."
function repeatUnit(el, sec) {
  for (let a = el.parentNode; a && a !== sec; a = a.parentNode) {
    const p = a.parentNode; const cls = attr(a, 'class');
    if (!p || !p.childNodes || !cls) continue;
    const sibs = p.childNodes.filter(n => isEl(n) && n.tagName === a.tagName && attr(n, 'class') === cls);
    if (sibs.length >= 2) return { unit: a, index: sibs.indexOf(a) + 1 };
  }
  return null;
}

function sectionFields(sec, idOf, abs, src) {
  const fields = [];
  const textOf2 = el => hasChildEls(el)
    ? { kind: 'html', value: (() => { const r = innerRange(el); return r ? src.slice(r[0], r[1]).trim() : cleanText(el); })() }
    : { kind: 'text', value: cleanText(el) };
  (function walk(node, inLink) {
    for (const c of node.childNodes || []) {
      if (!isEl(c) || SKIP_TAGS.has(c.tagName) || fields.length >= 160) continue;
      const id = idOf.get(c);
      if (id === undefined) { walk(c, inLink); continue; }
      if (c.tagName === 'img') {
        const ref = attr(c, 'bv-data-src') || attr(c, 'src');
        if (ref && !/^data:/.test(ref) && !/\.svg(\?|$)/i.test(ref)) fields.push({ id, kind: 'img', label: elemLabel(c, 'Image'), value: rootRelFrom(abs, ref), alt: attr(c, 'alt') || '', el: c });
        continue;
      }
      const bg = (attr(c, 'style') || '').match(/background-image\s*:\s*url\((['"]?)(.*?)\1\)/i);
      if (bg && bg[2] && !/^data:/.test(bg[2])) fields.push({ id, kind: 'bg', label: elemLabel(c, 'Background image'), value: rootRelFrom(abs, bg[2]), el: c });
      const href = c.tagName === 'a' ? attr(c, 'href') : null;
      if (href && !inLink && !/^javascript:/i.test(href)) {
        const textish = isTextish(c);
        const parts = href.match(/^([^?#]*)([\s\S]*)$/);
        const shown = /^(https?:|mailto:|tel:|#|\/\/)/i.test(href) || !parts[1] ? href : rootRelFrom(abs, parts[1]) + (/\/$/.test(parts[1]) ? '/' : '') + parts[2];
        fields.push(Object.assign({ id, kind: 'link', label: elemLabel(c, 'Button'), href: shown, el: c }, textish ? { text: textOf2(c) } : {}));
        if (textish) continue;
        walk(c, true); continue;
      }
      if (TEXT_TAGS.has(c.tagName) && isTextish(c)) { fields.push(Object.assign({ id, label: elemLabel(c, TAG_LABEL[c.tagName] || 'Text'), el: c }, textOf2(c))); continue; }
      walk(c, inLink);
    }
  })(sec, false);

  // group repeated units, number repeated labels inside a group
  const groups = [];
  const byUnit = new Map();
  for (const f of fields) {
    const u = repeatUnit(f.el, sec);
    const key = u ? idOf.get(u.unit) : 'top';
    if (!byUnit.has(key)) { const g = { key, title: u ? 'Item ' + u.index : '', fields: [] }; byUnit.set(key, g); groups.push(g); }
    byUnit.get(key).fields.push(f);
  }
  for (const g of groups) {
    const seen = {};
    for (const f of g.fields) seen[f.label] = (seen[f.label] || 0) + 1;
    const n = {};
    for (const f of g.fields) { if (seen[f.label] > 1) { n[f.label] = (n[f.label] || 0) + 1; f.label += ' ' + n[f.label]; } delete f.el; }
  }
  return groups;
}

function pageModel(abs) {
  const src = fs.readFileSync(abs, 'utf8');
  const doc = parseDoc(src);
  const els = elementsOf(doc);
  const idOf = new Map(els.map((e, i) => [e, i]));
  const units = sectionUnits(doc);
  const sections = units.map((u, i) => {
    const cls = (attr(u, 'class') || '').split(/\s+/).concat(attr(u, 'id') || []);
    const hit = SEC_LABELS.find(([c]) => cls.includes(c));
    const heading = find(u, e => /^h[1-6]$/.test(e.tagName) && cleanText(e));
    const label = hit ? hit[1] : heading ? clip(cleanText(heading), 38) : 'Section';
    const groups = sectionFields(u, idOf, abs, src);
    const count = groups.reduce((n, g) => n + g.fields.length, 0);
    const lead = find(u, e => ['p', 'h2', 'h1'].includes(e.tagName) && cleanText(e) && cleanText(e) !== label);
    const same = i > 0 && units[i - 1].parentNode === u.parentNode;
    const sameNext = i < units.length - 1 && units[i + 1].parentNode === u.parentNode;
    return { id: idOf.get(u), label, sub: lead ? clip(cleanText(lead), 52) : count + ' fields', count, groups, canUp: same, canDown: sameNext };
  });
  // SEO: the tags search engines and share cards read
  const titleEl = find(doc, e => e.tagName === 'title');
  const metas = findAll(doc, e => e.tagName === 'meta');
  const meta = (k, v) => metas.find(m => attr(m, k) === v) || null;
  const seo = [];
  if (titleEl) seo.push({ id: idOf.get(titleEl), op: 'text', label: 'Page title', value: cleanText(titleEl), hint: 'The title in the browser tab and in search results.' });
  for (const [k, v, label, hint] of [['name', 'description', 'Meta description', 'The short text under the title in search results (about 150 characters).'], ['property', 'og:title', 'Share title', 'The title shown when the page is shared.'], ['property', 'og:description', 'Share description', ''], ['name', 'twitter:title', 'Twitter title', ''], ['name', 'twitter:description', 'Twitter description', '']]) {
    const m = meta(k, v);
    if (m) seo.push({ id: idOf.get(m), op: 'attr', name: 'content', label, value: decode(attr(m, 'content') || ''), hint });
  }
  return { path: relOf(abs), title: titleOf(src), version: versionOf(src), generated: relOf(abs) === 'index.html', sections, seo };
}

// reorder / duplicate / remove a section
function sectionAction(abs, b) {
  const src = fs.readFileSync(abs, 'utf8');
  if (b.version && b.version !== versionOf(src)) throw new Error('this page was changed since the editor opened it - reload and try again');
  const doc = parseDoc(src);
  const units = sectionUnits(doc);
  const els = elementsOf(doc);
  const idx = units.findIndex(u => els.indexOf(u) === +b.id);
  if (idx < 0) throw new Error('section not found - reload the editor');
  const u = units[idx];
  const [s, e] = outerRange(u);
  let out;
  if (b.action === 'remove') {
    out = src.slice(0, s) + src.slice(e).replace(/^[ \t]*\r?\n/, '');
  } else if (b.action === 'duplicate') {
    let copy = src.slice(s, e);
    const st = u.sourceCodeLocation.startTag; const tag = src.slice(st.startOffset, st.endOffset);
    // the copy must not repeat the original's id
    copy = tag.replace(/\sid="[^"]*"/, '') + copy.slice(tag.length);
    out = src.slice(0, e) + '\n' + copy + src.slice(e);
  } else if (b.action === 'up' || b.action === 'down' || b.action === 'move') {
    const to = b.action === 'up' ? idx - 1 : b.action === 'down' ? idx + 1 : +b.to;
    if (!Number.isInteger(to) || to < 0 || to >= units.length) throw new Error('cannot move there');
    const lo = Math.min(idx, to), hi = Math.max(idx, to);
    for (let k = lo; k <= hi; k++) if (units[k].parentNode !== u.parentNode) throw new Error('these sections are in different containers and cannot swap places');
    const run = units.slice(lo, hi + 1);
    const blocks = run.map(x => src.slice(...outerRange(x)));
    const gaps = run.slice(1).map((x, k) => src.slice(outerRange(run[k])[1], outerRange(x)[0]));
    const order = run.map((_, k) => k);
    order.splice(idx - lo, 1); order.splice(to - lo, 0, idx - lo);
    const body = order.map((k, pos) => (pos ? gaps[pos - 1] : '') + blocks[k]).join('');
    out = src.slice(0, outerRange(run[0])[0]) + body + src.slice(outerRange(run[run.length - 1])[1]);
  } else throw new Error('unknown action ' + b.action);
  writeWithBackup(abs, out);
}

// ---------------------------------------------------------------- series + products
const LINES = [
  ['Spray Guns', ['evolution-series', 'legacy-series', 'air-brush', 'electric-spray-guns', 'service-guns', 'pressure-feed-tanks']],
  ['Airless Spray Systems', ['electric-series', 'electro-hydraulic-series', 'pneumatic-series']],
  ['Welding Equipment', ['gas-welding-brazing-torches', 'gas-cutting-torches', 'gas-regulators']],
  ['Office Products', ['currency-counters', 'paper-shredders']],
  ['Power Tools', ['power-tools']],
];
// pages that are part of another series, not a series of their own (the site menu has no entry for them)
const PART_OF = { 'currency-sorters': 'currency-counters' };
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
function seriesName(html, base) {
  const m = html.match(/<li[^>]*current-menu-item[^>]*>\s*<a[^>]*>([^<]+)<\/a>/i);
  const t = m ? decode(m[1]).trim() : base.replace(/-/g, ' ');
  return t.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase());
}
function listSeries() {
  const dir = path.join(ROOT, 'pages');
  const pages = fs.readdirSync(dir).filter(f => f.endsWith('.html')).map(f => {
    const info = pageInfo(path.join(dir, f));
    if (!info.series) return null;
    return { path: 'pages/' + f, base: f.replace(/\.html$/, ''), name: info.seriesName, products: info.products };
  }).filter(Boolean);
  for (const [part, owner] of Object.entries(PART_OF)) {
    const p = pages.find(x => x.base === part), o = pages.find(x => x.base === owner);
    if (!p || !o) continue;
    o.parts = (o.parts || []).concat({ path: p.path, name: p.name, products: p.products });
    o.products += p.products;
    pages.splice(pages.indexOf(p), 1);
  }
  const groups = LINES.map(([line, order]) => ({ line, series: order.map(b => pages.find(p => p.base === b)).filter(Boolean) }));
  const known = new Set(LINES.flatMap(l => l[1]));
  const other = pages.filter(p => !known.has(p.base));
  if (other.length) groups.push({ line: 'Other', series: other });
  return groups.filter(g => g.series.length);
}

function sectionsOf(doc) {
  const secs = findAll(doc, el => el.tagName === 'div' && hasClass(el, 'pg-prod'));
  return {
    desk: secs.filter(s => hasClass(s, 'pg-prod--desk') && attr(s, 'id')),
    mob: secs.filter(s => hasClass(s, 'pg-prod--mob')),
  };
}
// The phone copy of a model. Where a page has one phone copy per desktop copy, Divi keeps them in
// the same order, so they pair by position - that survives renaming a model. Otherwise (paper
// shredders ship 9 desktop and 4 phone copies) pair by name.
function twinOf(desk, mobs, allDesk) {
  if (allDesk && allDesk.length === mobs.length) return mobs[allDesk.indexOf(desk)] || null;
  const h = find(desk, e => e.tagName === 'h1');
  const key = norm(cleanText(h));
  return mobs.find(m => norm(cleanText(find(m, e => e.tagName === 'h1'))) === key) || null;
}
function specTable(sec) {
  for (const t of findAll(sec, e => e.tagName === 'table')) {
    if (find(t, e => e.tagName === 'img')) continue;
    const rows = findAll(t, e => e.tagName === 'tr');
    if (!rows.length) continue;
    if (rows.every(r => findAll(r, e => e.tagName === 'td').length === 2)) return { table: t, rows, grid: false };
    return { table: t, rows, grid: true };
  }
  return null;
}
function featureList(sec) {
  const firstCol = find(sec, e => hasClass(e, 'et_pb_column'));
  return find(firstCol || sec, e => e.tagName === 'ul');
}
function productImage(pageAbs, html, sec, desk) {
  if (desk) {
    const cols = findAll(sec, e => hasClass(e, 'et_pb_column') && e.parentNode && hasClass(e.parentNode, 'et_pb_row'));
    const col = cols[1] || sec;
    const mod = find(col, e => hasClass(e, 'et_pb_image'));
    if (mod) {
      const st = attr(mod, 'style') || '';
      let m = st.match(/background-image\s*:\s*url\(['"]?([^'")]+)/i);
      if (!m) {
        const cls = (attr(mod, 'class') || '').split(/\s+/).find(c => /^et_pb_image_\d+$/.test(c));
        if (cls) m = html.match(new RegExp('\\.' + cls + '\\{[^}]*?background-image:url\\(["\']?([^"\')]+)'));
      }
      if (m) return { kind: 'bg', el: mod, ref: m[1] };
      const img = find(mod, e => e.tagName === 'img');
      if (img) return { kind: 'img', el: img, ref: attr(img, 'bv-data-src') || attr(img, 'src') };
    }
    const img = find(col, e => e.tagName === 'img');
    if (img) return { kind: 'img', el: img, ref: attr(img, 'bv-data-src') || attr(img, 'src') };
    return null;
  }
  const img = find(sec, e => e.tagName === 'img' && /absolute/.test(attr(e, 'style') || ''))
    || find(sec, e => e.tagName === 'img' && !/pdf/i.test(attr(e, 'bv-data-src') || attr(e, 'src') || '') && !findParent(e, 'table'));
  return img ? { kind: 'img', el: img, ref: attr(img, 'bv-data-src') || attr(img, 'src') } : null;
}
function findParent(el, tag) { let p = el.parentNode; while (p) { if (p.tagName === tag) return p; p = p.parentNode; } return null; }

function productModel(pageAbs, html, doc, desk, mobs, allDesk) {
  const h1 = find(desk, e => e.tagName === 'h1');
  const sub = h1 && nextElement(h1);
  const ul = featureList(desk);
  const spec = specTable(desk);
  const img = productImage(pageAbs, html, desk, true);
  const downloads = findAll(desk, e => e.tagName === 'a' && /\.pdf(\?|#|$)/i.test(attr(e, 'href') || ''))
    .map(a => ({ href: rootRelFrom(pageAbs, attr(a, 'href')), label: cleanText(a) }));
  const buy = find(desk, e => e.tagName === 'a' && hasClass(e, 'et_pb_button'));
  return {
    id: attr(desk, 'id'),
    name: cleanText(h1),
    subtitle: sub && sub.tagName === 'p' ? cleanText(sub) : '',
    hasSubtitle: !!(sub && sub.tagName === 'p'),
    features: ul ? findAll(ul, e => e.tagName === 'li' && e.parentNode === ul).map(cleanText) : [],
    hasFeatures: !!ul,
    specs: spec && !spec.grid ? spec.rows.map(r => findAll(r, e => e.tagName === 'td').map(cleanText)) : [],
    specGrid: !!(spec && spec.grid),
    image: img ? rootRelFrom(pageAbs, img.ref) : '',
    downloads,
    buy: buy ? attr(buy, 'href') : null,
    hasTwin: !!twinOf(desk, mobs, allDesk),
  };
}

function listProducts(pageAbs) {
  const html = fs.readFileSync(pageAbs, 'utf8');
  const doc = parseDoc(html);
  const { desk, mob } = sectionsOf(doc);
  return { path: relOf(pageAbs), name: seriesName(html, path.basename(pageAbs, '.html')), products: desk.map(d => productModel(pageAbs, html, doc, d, mob, desk)) };
}

function featureMarkup(ul, items) {
  const first = findAll(ul, e => e.tagName === 'li')[0];
  const h6 = first && find(first, e => e.tagName === 'h6');
  return '\n' + items.map(t => h6 ? `<li>\n<h6>${escText(t)}</h6>\n</li>` : `<li>${escText(t)}</li>`).join('\n') + '\n';
}
function specMarkup(rows) {
  return '\n' + rows.map(([l, v]) => `<tr>\n<td>${escText(l)}</td>\n<td>${escText(v)}</td>\n</tr>`).join('\n') + '\n';
}

function saveProduct(pageAbs, p) {
  const html = fs.readFileSync(pageAbs, 'utf8');
  const doc = parseDoc(html);
  const { desk, mob } = sectionsOf(doc);
  const d = desk.find(s => attr(s, 'id') === p.id);
  if (!d) throw new Error('product not found');
  const twin = twinOf(d, mob, desk);
  const reps = [];
  const attrSets = new Map();
  const setAttr = (el, set) => attrSets.set(el, Object.assign(attrSets.get(el) || {}, set));

  for (const [sec, isDesk] of [[d, true], [twin, false]]) {
    if (!sec) continue;
    const h1 = find(sec, e => e.tagName === 'h1');
    if (h1 && typeof p.name === 'string' && p.name.trim() && cleanText(h1) !== p.name.trim()) { const r = innerRange(h1); if (r) reps.push([r[0], r[1], escText(p.name.trim())]); }
    const sub = h1 && nextElement(h1);
    if (sub && sub.tagName === 'p' && typeof p.subtitle === 'string' && cleanText(sub) !== p.subtitle.trim()) { const r = innerRange(sub); if (r) reps.push([r[0], r[1], escText(p.subtitle.trim())]); }
    const ul = featureList(sec);
    if (ul && Array.isArray(p.features)) {
      const cur = findAll(ul, e => e.tagName === 'li' && e.parentNode === ul).map(cleanText);
      const next = p.features.map(s => String(s).trim()).filter(Boolean);
      if (JSON.stringify(cur) !== JSON.stringify(next)) { const r = innerRange(ul); if (r) reps.push([r[0], r[1], featureMarkup(ul, next)]); }
    }
    const spec = specTable(sec);
    if (spec && !spec.grid && Array.isArray(p.specs)) {
      const cur = spec.rows.map(r => findAll(r, e => e.tagName === 'td').map(cleanText));
      const next = p.specs.map(r => [String(r[0] || '').trim(), String(r[1] || '').trim()]).filter(r => r[0] || r[1]);
      if (JSON.stringify(cur) !== JSON.stringify(next)) {
        const body = find(spec.table, e => e.tagName === 'tbody' && e.sourceCodeLocation && e.sourceCodeLocation.endTag) || spec.table;
        const r = innerRange(body); if (r) reps.push([r[0], r[1], specMarkup(next)]);
      }
    }
    if (p.image) {
      const img = productImage(pageAbs, html, sec, isDesk);
      if (img && rootRelFrom(pageAbs, img.ref) !== p.image) {
        const ref = refFrom(pageAbs, p.image);
        if (img.kind === 'bg') setAttr(img.el, { style: styleWithBg(img.el, ref) });
        else setAttr(img.el, imageSet(img.el, ref));
      }
    }
    if (Array.isArray(p.downloads)) {
      const links = findAll(sec, e => e.tagName === 'a' && /\.pdf(\?|#|$)/i.test(attr(e, 'href') || ''));
      links.forEach((a, i) => {
        const want = p.downloads[i]; if (!want) return;
        if (want.href && rootRelFrom(pageAbs, attr(a, 'href')) !== want.href) setAttr(a, { href: /^https?:/i.test(want.href) ? want.href : refFrom(pageAbs, want.href) });
        if (typeof want.label === 'string' && want.label.trim() && cleanText(a) !== want.label.trim()) { const r = innerRange(a); if (r) reps.push([r[0], r[1], escText(want.label.trim())]); }
      });
    }
    if (typeof p.buy === 'string') {
      const buy = find(sec, e => e.tagName === 'a' && hasClass(e, 'et_pb_button'));
      if (buy && attr(buy, 'href') !== p.buy) setAttr(buy, { href: p.buy });
    }
  }
  for (const [el, set] of attrSets) reps.push(startTagWith(html, el, set));
  if (!reps.length) return false;
  writeWithBackup(pageAbs, applyReplacements(html, reps));
  return true;
}

function duplicateProduct(pageAbs, id) {
  const html = fs.readFileSync(pageAbs, 'utf8');
  const doc = parseDoc(html);
  const { desk, mob } = sectionsOf(doc);
  const d = desk.find(s => attr(s, 'id') === id);
  if (!d) throw new Error('product not found');
  const twin = twinOf(d, mob, desk);
  const name = cleanText(find(d, e => e.tagName === 'h1')) + ' (copy)';
  const used = new Set(desk.map(s => attr(s, 'id')));
  let nid = id + '-copy', n = 2; while (used.has(nid)) nid = id + '-copy-' + n++;
  const rename = s => s.replace(/<h1([^>]*)>[\s\S]*?<\/h1>/i, (m, a) => `<h1${a}>${escText(name)}</h1>`);
  let deskCopy = rename(html.slice(...outerRange(d))).replace(/(<div\b[^>]*?\sid=")([^"]+)(")/, (m, a, b, c) => a + nid + c);
  const twinCopy = twin ? rename(html.slice(...outerRange(twin))) : '';
  const all = [...desk, ...mob];
  const after = Math.max(...all.map(s => s.sourceCodeLocation.endOffset));
  const out = html.slice(0, after) + '\n' + deskCopy + (twinCopy ? '\n' + twinCopy : '') + html.slice(after);
  writeWithBackup(pageAbs, out);
  return nid;
}

function deleteProduct(pageAbs, id) {
  const html = fs.readFileSync(pageAbs, 'utf8');
  const doc = parseDoc(html);
  const { desk, mob } = sectionsOf(doc);
  const d = desk.find(s => attr(s, 'id') === id);
  if (!d) throw new Error('product not found');
  const twin = twinOf(d, mob, desk);
  const reps = [[...outerRange(d), '']];
  if (twin) reps.push([...outerRange(twin), '']);
  writeWithBackup(pageAbs, applyReplacements(html, reps));
}

// ---------------------------------------------------------------- blog
function blogFiles() {
  const dir = path.join(ROOT, 'blog');
  return fs.readdirSync(dir).filter(f => f.endsWith('.html')).map(f => path.join(dir, f))
    .filter(abs => fs.statSync(abs).size >= 3000 || !isStub(fs.readFileSync(abs, 'utf8')));
}
function blogParts(doc) {
  const h1 = find(doc, e => e.tagName === 'h1' && hasClass(e, 'entry-title'));
  const published = find(doc, e => e.tagName === 'span' && hasClass(e, 'published'));
  const wrap = find(doc, e => hasClass(e, 'et_post_meta_wrapper'));
  const img = wrap ? find(wrap, e => e.tagName === 'img') : null;
  const content = find(doc, e => e.tagName === 'div' && hasClass(e, 'entry-content'));
  const title = find(doc, e => e.tagName === 'title');
  const metas = findAll(doc, e => e.tagName === 'meta');
  const meta = (k, v) => metas.find(m => attr(m, k) === v) || null;
  const canonical = find(doc, e => e.tagName === 'link' && attr(e, 'rel') === 'canonical');
  return { h1, published, img, content, title, canonical,
    ogTitle: meta('property', 'og:title'), twTitle: meta('name', 'twitter:title'),
    desc: meta('name', 'description'), ogDesc: meta('property', 'og:description'), twDesc: meta('name', 'twitter:description'),
    ogUrl: meta('property', 'og:url') };
}
function blogModel(abs) {
  const html = fs.readFileSync(abs, 'utf8');
  const P = blogParts(parseDoc(html));
  const r = P.content && innerRange(P.content);
  return {
    path: relOf(abs),
    title: cleanText(P.h1) || titleOf(html),
    date: cleanText(P.published),
    summary: P.desc ? decode(attr(P.desc, 'content') || '') : '',
    image: P.img ? rootRelFrom(abs, attr(P.img, 'bv-data-src') || attr(P.img, 'src')) : '',
    body: r ? html.slice(r[0], r[1]) : '',
    mtime: fs.statSync(abs).mtimeMs,
  };
}
// list view: a cheap regex read (parsing 179 full pages took ~10 s), cached by file time
const blogListCache = new Map();
function blogSummary(abs) {
  const mtime = fs.statSync(abs).mtimeMs;
  const hit = blogListCache.get(abs);
  if (hit && hit.mtime === mtime) return hit.data;
  const html = fs.readFileSync(abs, 'utf8');
  const pick = re => { const m = html.match(re); return m ? decode(m[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim() : ''; };
  const wrap = html.indexOf('et_post_meta_wrapper');
  const im = wrap >= 0 ? html.slice(wrap, wrap + 4000).match(/<img\b[^>]*?(?:bv-data-src|src)="([^"]+)"/) : null;
  const data = {
    path: relOf(abs),
    title: pick(/<h1[^>]*class="[^"]*\bentry-title\b[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) || titleOf(html),
    date: pick(/<span[^>]*class="[^"]*\bpublished\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i),
    summary: pick(/<meta\s+name="description"\s+content="([^"]*)"/i),
    image: im && !/^data:/.test(im[1]) ? rootRelFrom(abs, im[1]) : '',
    mtime,
  };
  blogListCache.set(abs, { mtime, data });
  return data;
}
function blogReps(abs, html, P, f, isNew) {
  const reps = []; const sets = new Map();
  const setA = (el, s) => { if (el) sets.set(el, Object.assign(sets.get(el) || {}, s)); };
  const text = (el, v) => { if (!el) return; const r = innerRange(el); if (r) reps.push([r[0], r[1], escText(v)]); };
  if (f.title) {
    text(P.h1, f.title); text(P.title, f.title + ' - Pilot India');
    setA(P.ogTitle, { content: f.title }); setA(P.twTitle, { content: f.title });
  }
  if (typeof f.date === 'string' && f.date.trim()) text(P.published, f.date.trim());
  if (typeof f.summary === 'string') { setA(P.desc, { content: f.summary }); setA(P.ogDesc, { content: f.summary }); setA(P.twDesc, { content: f.summary }); }
  if (f.image && P.img) setA(P.img, Object.assign(imageSet(P.img, refFrom(abs, f.image)), { alt: f.title || attr(P.img, 'alt') || '' }));
  if (typeof f.body === 'string' && P.content) {
    const r = innerRange(P.content);
    const body = sanitize(f.body, abs);
    if (r) reps.push([r[0], r[1], isNew ? `\n<div class="pi-post-body">\n${body}\n</div>\n` : body]);
  }
  if (isNew) {
    const self = path.basename(abs);
    setA(P.canonical, { href: self }); setA(P.ogUrl, { content: self });
  }
  for (const [el, set] of sets) reps.push(startTagWith(html, el, set));
  return reps;
}
// which Pilot domain(s) each post is on (tools/blog-sources.json, built by tools/blog-sources.mjs); the Blogs page lists these posts
const SOURCES_FILE = () => path.join(REPO, 'tools', 'blog-sources.json');
function blogSources() {
  try { return JSON.parse(fs.readFileSync(SOURCES_FILE(), 'utf8')); } catch (e) { return {}; }
}
// a post created in the admin belongs to the main site: list it on the Blogs page too
function registerPost(slug) {
  const src = blogSources();
  if (src[slug]) return;
  src[slug] = ['pilotindia.com'];
  fs.writeFileSync(SOURCES_FILE(), JSON.stringify(src, null, 1) + '\n');
  // In database mode the tool must run in this process, so its writes go through store.mjs and not to disk.
  if (dbMode()) { track(import(pathToFileURL(path.join(REPO, 'tools', 'blog-index.mjs')).href + '?t=' + Date.now())); return; }
  try { execFileSync(process.execPath, [path.join(REPO, 'tools', 'blog-index.mjs')], { cwd: REPO, stdio: 'ignore' }); } catch (e) { /* the page can be rebuilt with: node tools/blog-index.mjs */ }
}

function saveBlog(f) {
  if (f.path) {
    const abs = sitePath(f.path);
    const html = fs.readFileSync(abs, 'utf8');
    const reps = blogReps(abs, html, blogParts(parseDoc(html)), f, false);
    if (reps.length) writeWithBackup(abs, applyReplacements(html, reps));
    return relOf(abs);
  }
  // a new post: built from an existing post so it carries the site's header, footer and styles
  if (!f.title || !f.title.trim()) throw new Error('a new post needs a title');
  const slug = (f.slug || f.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
  const abs = path.join(ROOT, 'blog', slug + '.html');
  if (fs.existsSync(abs)) throw new Error('a post with this address already exists: blog/' + slug + '.html');
  const template = blogFiles().find(p => /how-to-clean-and-maintain-a-spray-gun-properly/.test(p)) || blogFiles()[0];
  const html = fs.readFileSync(template, 'utf8');
  const out = applyReplacements(html, blogReps(abs, html, blogParts(parseDoc(html)), f, true));
  fs.writeFileSync(abs, out, 'utf8');
  addToListings(abs, f, slug);
  registerPost(slug);
  return relOf(abs);
}
function addToListings(abs, f, slug) {
  const title = escText(f.title.trim());
  const cat = path.join(ROOT, 'category', 'blog.html');
  if (fs.existsSync(cat)) {
    let s = fs.readFileSync(cat, 'utf8');
    const at = s.indexOf('<div id="left-area">');
    if (at >= 0 && !s.includes(`../blog/${slug}.html`)) {
      const img = f.image ? `<a class="entry-featured-image-url" href="../blog/${slug}.html"><img src="${escAttr(refFrom(cat, f.image))}" alt="${escAttr(f.title)}" width="1080" height="675" /></a>\n` : '';
      const card = `\n<article class="et_pb_post post type-post status-publish format-standard hentry category-blog">\n${img}<h2 class="entry-title"><a href="../blog/${slug}.html">${title}</a></h2>\n<p class="post-meta"> by <span class="author vcard">PilotAdmin</span> | <span class="published">${escText(f.date || '')}</span> | <a href="blog.html" rel="category tag">Blog</a></p>\n${escText(f.summary || '')}\n</article>\n`;
      const pos = at + '<div id="left-area">'.length;
      writeWithBackup(cat, s.slice(0, pos) + card + s.slice(pos));
    }
  }
  const idx = path.join(ROOT, 'pages', 'blogs.html');
  if (fs.existsSync(idx)) {
    const s = fs.readFileSync(idx, 'utf8');
    const h = s.indexOf('Recent Posts</h4>');
    const ul = h >= 0 ? s.indexOf('<ul>', h) : -1;
    if (ul >= 0 && !s.includes(`../blog/${slug}.html`)) {
      const pos = ul + 4;
      writeWithBackup(idx, s.slice(0, pos) + `\n<li> <a href="../blog/${slug}.html">${title}</a> </li>` + s.slice(pos));
    }
  }
}

// ---------------------------------------------------------------- theme
const THEME_FILE = () => path.join(ROOT, 'theme', 'theme.css');
const SERIES_FILE = () => path.join(ROOT, 'assets', 'css', 'pg-series.css');
function blockRange(css, opener) {
  const a = css.indexOf(opener); if (a < 0) return null;
  const b = css.indexOf('}', a); return [a, b];
}
function tokensIn(css, range) {
  const out = {};
  const block = css.slice(range[0], range[1]).replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) if (!(m[1] in out)) out[m[1]] = m[2].trim();
  return out;
}
function getTheme() {
  const t = fs.readFileSync(THEME_FILE(), 'utf8');
  const s = fs.readFileSync(SERIES_FILE(), 'utf8');
  return { theme: tokensIn(t, blockRange(t, ':root {')), series: tokensIn(s, blockRange(s, '.pg-series {')) };
}
function setTokens(file, opener, values) {
  let css = fs.readFileSync(file, 'utf8');
  const r = blockRange(css, opener); if (!r) throw new Error('token block not found in ' + relOf(file));
  let block = css.slice(r[0], r[1]);
  let changed = false;
  for (const [name, val] of Object.entries(values || {})) {
    if (!/^--[\w-]+$/.test(name)) continue;
    const v = String(val).replace(/[;{}]/g, '').trim(); if (!v) continue;
    const re = new RegExp('(' + name.replace(/-/g, '\\-') + '\\s*:\\s*)([^;]+)(;)');
    if (re.test(block)) { const nb = block.replace(re, (m, a, b, c) => a + v + c); if (nb !== block) { block = nb; changed = true; } }
  }
  if (changed) writeWithBackup(file, css.slice(0, r[0]) + block + css.slice(r[1]));
  return changed;
}

// ---------------------------------------------------------------- media
function listMedia() {
  const dir = path.join(ROOT, 'assets', 'img');
  const out = [];
  (function walk(d) {
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, f.name);
      if (f.isDirectory()) walk(p);
      else if (IMG_EXT.test(f.name)) { const st = fs.statSync(p); out.push({ path: relOf(p), size: st.size, time: st.mtimeMs }); }
    }
  })(dir);
  return out.sort((a, b) => b.time - a.time);
}
function saveUpload(name, buf) {
  const ext = (path.extname(name || '') || '').toLowerCase();
  const isPdf = ext === '.pdf';
  if (!isPdf && !IMG_EXT.test(ext)) throw new Error('only images and PDFs can be uploaded');
  const base = path.basename(name, ext).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'file';
  const dir = path.join(ROOT, 'assets', isPdf ? 'media' : 'img', 'uploads');
  fs.mkdirSync(dir, { recursive: true });
  let file = base + ext, n = 2;
  while (fs.existsSync(path.join(dir, file))) file = `${base}-${n++}${ext}`;
  fs.writeFileSync(path.join(dir, file), buf);
  return relOf(path.join(dir, file));
}

// ---------------------------------------------------------------- summary
function summary() {
  const pages = listPages();
  const series = listSeries();
  const today = new Date().toDateString();
  const edits = recentEdits(500);
  return {
    counts: {
      pages: pages.filter(p => !['Archives', 'Drafts & old copies', 'Blog posts'].includes(p.group)).length,
      series: series.reduce((n, g) => n + g.series.length, 0),
      lines: series.length,
      products: series.reduce((n, g) => n + g.series.reduce((m, s) => m + s.products, 0), 0),
      posts: blogFiles().length,
      media: listMedia().length,
      editsToday: edits.filter(e => new Date(e.time).toDateString() === today).length,
    },
    // a backup can outlive its page (a removed page); the dashboard then offers neither Open nor Undo
    recent: edits.slice(0, 8).map(e => Object.assign(e, { exists: fs.existsSync(path.join(ROOT, e.path)) })),
  };
}

// ---------------------------------------------------------------- router
export async function handleAdmin(req, res) {
  const url = new URL(req.url, 'http://local');
  const p = url.pathname;
  if (!p.startsWith('/admin')) return false;
  try {
    if (!p.startsWith('/admin/api/')) {
      let file = p === '/admin' || p === '/admin/' ? 'index.html' : p.slice('/admin/'.length);
      const abs = path.resolve(ADMIN_DIR, file);
      if (!abs.startsWith(ADMIN_DIR + path.sep) || !fs.existsSync(abs) || /server\.mjs$/.test(abs)) { send(res, 404, 'not found'); return true; }
      const body = fs.readFileSync(abs);
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(abs)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(body);
      return true;
    }
    const route = req.method + ' ' + p.slice('/admin/api'.length);
    const q = k => url.searchParams.get(k);
    switch (route) {
      case 'GET /summary': return send(res, 200, Object.assign({}, summary(), { storage: dbMode() ? 'postgres' : 'local' })), true;
      case 'GET /pages': return send(res, 200, listPages()), true;
      case 'POST /edit': { const b = await readJson(req); applyVisualEdits(sitePath(b.path), b.edits || [], b.version); return send(res, 200, { ok: true }), true; }
      case 'GET /page-model': return send(res, 200, pageModel(sitePath(q('path')))), true;
      case 'POST /page/section': { const b = await readJson(req); sectionAction(sitePath(b.path), b); return send(res, 200, { ok: true }), true; }
      case 'GET /series': return send(res, 200, listSeries()), true;
      case 'GET /products': return send(res, 200, listProducts(sitePath(q('path')))), true;
      case 'POST /product': { const b = await readJson(req); const changed = saveProduct(sitePath(b.path), b); return send(res, 200, { ok: true, changed }), true; }
      case 'POST /product/duplicate': { const b = await readJson(req); return send(res, 200, { ok: true, id: duplicateProduct(sitePath(b.path), b.id) }), true; }
      case 'POST /product/delete': { const b = await readJson(req); deleteProduct(sitePath(b.path), b.id); return send(res, 200, { ok: true }), true; }
      case 'GET /blog': { const src = blogSources(); return send(res, 200, blogFiles().map(blogSummary).map(m => Object.assign({}, m, { sources: src[path.basename(m.path, '.html')] || [] })).sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0))), true; }
      case 'GET /blog/post': return send(res, 200, blogModel(sitePath(q('path')))), true;
      case 'POST /blog/post': { const b = await readJson(req); return send(res, 200, { ok: true, path: saveBlog(b) }), true; }
      case 'GET /theme': return send(res, 200, getTheme()), true;
      case 'POST /theme': {
        const b = await readJson(req);
        const a = setTokens(THEME_FILE(), ':root {', b.theme); const c = setTokens(SERIES_FILE(), '.pg-series {', b.series);
        return send(res, 200, { ok: true, changed: a || c }), true;
      }
      case 'GET /media': return send(res, 200, listMedia()), true;
      case 'POST /upload': { const buf = await readBody(req); return send(res, 200, { ok: true, path: saveUpload(q('name'), buf) }), true; }
      case 'POST /restore': {
        const b = await readJson(req);
        const abs = path.resolve(ROOT, String(b.path || ''));
        if (!abs.startsWith(ROOT + path.sep)) throw new Error('path outside the site');
        const file = path.join(backupDir(relOf(abs)), path.basename(String(b.stamp || '')));
        if (!fs.existsSync(file)) throw new Error('backup not found');
        writeWithBackup(abs, fs.readFileSync(file, 'utf8'));
        return send(res, 200, { ok: true }), true;
      }
      default: return send(res, 404, { error: 'unknown route ' + route }), true;
    }
  } catch (err) {
    send(res, 400, { error: err.message || String(err) });
    return true;
  }
}
