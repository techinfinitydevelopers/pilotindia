// Turns every FAQ section of the site into the accordion component (assets/css/pi-accordion.css + assets/js/pi-accordion.js):
//   - the three product-page FAQs (spray-guns, office, power-tools): the Elementor nested-accordion widget
//   - the FAQ at the end of 48 blog posts: loose headings / paragraphs / lists written in the editor
// Nothing is written by hand: questions and answers are the page's own text. Question numbering ("1.", "Q1.") and the
// "Answer:" / "Ans." labels are dropped because the accordion numbers its items and the layout already says which is which;
// answer markup is tidied (editor inline styles, empty wrappers) but its words, bold, links and lists are kept.
// After each page a word-for-word check compares the original FAQ text with the accordion's; a page that does not match
// is left untouched and reported.
//
// Idempotent (a page that already has data-slot="accordion" is skipped).
//
//   node tools/faq-accordion.mjs [--dry] [--only <text in file name>] [--verbose]
import fs from 'node:fs';
import path from 'node:path';
import { parse, parseFragment, serialize, serializeOuter } from 'parse5';

const ROOT = path.join(process.cwd(), 'pilotindia-clone');
const DRY = process.argv.includes('--dry');
const VERBOSE = process.argv.includes('--verbose');
const onlyAt = process.argv.indexOf('--only');
const ONLY = onlyAt > 0 ? process.argv[onlyAt + 1] : '';

// ------------------------------------------------------------------ tree helpers
const kids = n => n.childNodes || [];
const isEl = n => !!n.tagName;
const attr = (n, name) => ((n.attrs || []).find(a => a.name === name) || {}).value || '';
const hasClass = (n, c) => (' ' + attr(n, 'class') + ' ').includes(' ' + c + ' ');
const rawText = n => n.nodeName === '#text' ? n.value : kids(n).map(rawText).join('');
const norm = s => s.replace(/[ \s]+/g, ' ').trim();
const text = n => norm(rawText(n));
const walk = (n, cb) => { cb(n); kids(n).forEach(k => walk(k, cb)); };
const find = (n, pred) => { let hit = null; walk(n, x => { if (!hit && isEl(x) && pred(x)) hit = x; }); return hit; };
const findAll = (n, pred) => { const out = []; walk(n, x => { if (isEl(x) && pred(x)) out.push(x); }); return out; };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function detach(n) { const p = n.parentNode; if (!p) return; const i = p.childNodes.indexOf(n); if (i >= 0) p.childNodes.splice(i, 1); n.parentNode = null; }
function replaceWith(n, repl) { const p = n.parentNode; const i = p.childNodes.indexOf(n); p.childNodes.splice(i, 1, ...repl); repl.forEach(r => { r.parentNode = p; }); n.parentNode = null; }
function textNode(value) { return { nodeName: '#text', value, parentNode: null }; }
function cloneOuter(n) { return parseFragment(serializeOuter(n)).childNodes; }

// ------------------------------------------------------------------ answer cleaning
const BLOCKISH = new Set(['p', 'ul', 'ol', 'li', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote']);
const KEEP = new Set(['p', 'ul', 'ol', 'li', 'b', 'strong', 'i', 'em', 'a', 'br', 'u', 'sup', 'sub']);
const MARK_RE = /^\s*(answers?|ans)\s*[.:)\-–—]*\s*/i;

function tidy(node) {
  // work on a copy of the children list: tidy() edits the tree
  for (const c of kids(node).slice()) {
    if (!isEl(c)) continue;
    tidy(c);
    const t = c.tagName;
    if (/^h[1-6]$/.test(t)) { c.tagName = 'p'; c.nodeName = 'p'; }
    // an empty bold / italic wrapper (the editor leaves <b><br></b> behind): keep only what is inside it
    if (/^(b|strong|i|em|u)$/.test(c.tagName) && !text(c)) { replaceWith(c, kids(c).slice()); continue; }
    if (c.tagName === 'p' || KEEP.has(c.tagName)) {
      c.attrs = c.tagName === 'a' ? (c.attrs || []).filter(a => ['href', 'target', 'rel'].includes(a.name)) : [];
    } else {
      // span, font, div, anything else: keep its content, drop the wrapper
      replaceWith(c, kids(c).slice());
    }
  }
}

function dropLeadingMarker(frag) {
  // remove "Answer:" / "Answers:" / "Ans." at the very start (bare text, or the whole text of a leading <b>/<strong>)
  const first = kids(frag).find(n => !(n.nodeName === '#text' && !n.value.trim()) && n.tagName !== 'br');
  if (!first) return;
  if (first.nodeName === '#text') {
    if (MARK_RE.test(first.value)) first.value = first.value.replace(MARK_RE, '');
  } else if (/^(b|strong|p)$/.test(first.tagName)) {
    const inner = kids(first).find(n => !(n.nodeName === '#text' && !n.value.trim()));
    if (inner && inner.nodeName === '#text' && MARK_RE.test(inner.value) && /^(answers?|ans)\s*[.:)\-–—]*\s*$/i.test(text(first))) detach(first);
    else if (inner && (inner.tagName === 'b' || inner.tagName === 'strong') && /^(answers?|ans)\s*[.:)\-–—]*\s*$/i.test(text(inner))) detach(inner);
    else if (inner && inner.nodeName === '#text' && MARK_RE.test(inner.value)) inner.value = inner.value.replace(MARK_RE, '');
  }
}

// a list of nodes -> clean html: loose inline runs become <p>, "br br" starts a new paragraph
function toHtml(nodes) {
  const frag = parseFragment('');
  nodes.forEach(n => { n.parentNode = frag; frag.childNodes.push(n); });
  tidy(frag);
  dropLeadingMarker(frag);
  const out = [];
  let run = [];
  const flush = () => {
    // split the run at double <br>
    let part = [];
    const emit = () => {
      const h = part.map(serializeOuter).join('').replace(/^(\s|<br\s*\/?>)+|(\s|<br\s*\/?>)+$/gi, '').replace(/(<br\s*\/?>\s*){2,}/gi, '<br>').trim();
      if (h && text(parseFragment(h)).length) out.push('<p>' + h + '</p>');
      part = [];
    };
    let br = 0;
    for (const n of run) {
      if (n.tagName === 'br') { br++; if (br >= 2) { part.pop && 0; emit(); br = 0; continue; } part.push(n); continue; }
      br = 0; part.push(n);
    }
    emit(); run = [];
  };
  for (const n of kids(frag)) {
    if (isEl(n) && (BLOCKISH.has(n.tagName))) {
      flush();
      if (n.tagName === 'p') {
        // a paragraph may itself hold "br br" breaks
        const parts = []; let cur = []; let br = 0;
        for (const c of kids(n)) { if (c.tagName === 'br') { br++; if (br >= 2) { parts.push(cur); cur = []; br = 0; continue; } cur.push(c); continue; } br = 0; cur.push(c); }
        parts.push(cur);
        for (const p of parts) { const h = p.map(serializeOuter).join('').replace(/^(\s|<br\s*\/?>)+|(\s|<br\s*\/?>)+$/gi, '').trim(); if (h && text(parseFragment(h)).length) out.push('<p>' + h + '</p>'); }
      } else if (text(n).length) out.push(serializeOuter(n));
    } else run.push(n);
  }
  flush();
  return out.join('');
}

// ------------------------------------------------------------------ question / answer extraction (blog posts)
const FAQ_HEAD = /^\s*(FAQs?|Frequently Asked Questions?)\s*(\(\s*FAQs?\s*\))?\s*:?\s*/i;
const NUM_RE = /^\s*(?:Q(?:uestion)?\s*)?\d+\s*[.)]\s*/i;

// split a block at its first <br> or answer marker: returns { q: text before, rest: nodes after } (or rest = null)
function splitBlock(block) {
  // flatten leaf order
  const leaves = [];
  walk(block, n => { if (n !== block && (n.nodeName === '#text' || n.tagName === 'br')) leaves.push(n); });
  let q = '', cut = -1;
  for (let i = 0; i < leaves.length; i++) {
    const n = leaves[i];
    if (n.tagName === 'br') { if (norm(q)) { cut = i; break; } continue; }
    const m = /\b(answers?|ans)\s*[.:]\s/i.exec(n.value + ' ');
    if (m && norm(q + n.value.slice(0, m.index))) { cut = i; q += n.value.slice(0, m.index); break; }
    q += n.value;
  }
  return { qText: norm(q), cut, leaves };
}

// the editor sometimes puts several questions in one block ("... 2. <b>How often ...</b> Answer: ..."): split such a block
// into one piece per question. A new question is a bold run that starts with the next number in sequence (2, 3, 4 ...).
function explode(el) {
  const html = serializeOuter(el);
  const first = NUM_RE.exec(text(el));
  let expect = first ? parseInt(first[0].match(/\d+/)[0], 10) + 1 : 2;
  const re = /<(b|strong)\b[^>]*>\s*(?:<br\s*\/?>\s*)*(\d{1,2})\s*[.)]\s*(?=\S|<)/gi;
  const cuts = [];
  let m;
  while ((m = re.exec(html))) { if (parseInt(m[2], 10) === expect) { cuts.push(m.index); expect++; } }
  if (!cuts.length) return [el];
  const bounds = [0, ...cuts, html.length];
  const pieces = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    const frag = parseFragment('<div>' + html.slice(bounds[i], bounds[i + 1]) + '</div>');
    const piece = frag.childNodes.find(isEl);
    if (piece && text(piece)) pieces.push(piece);
  }
  return pieces;
}

// question and inline answer of one element (a block or a list item): the question runs up to the first <br> or answer label
function qaOf(el) {
  const copy = cloneOuter(el)[0];
  const { qText, cut, leaves } = splitBlock(copy);
  if (cut < 0) return { q: text(el).replace(NUM_RE, ''), a: [] };
  const upTo = leaves.slice(0, cut + 1);
  const m = leaves[cut].nodeName === '#text' ? /\b(answers?|ans)\s*[.:]\s*/i.exec(leaves[cut].value) : null;
  const keepTail = m ? leaves[cut].value.slice(m.index + m[0].length) : '';
  upTo.forEach(l => detach(l));
  if (keepTail) { const tn = textNode(keepTail); copy.childNodes.unshift(tn); tn.parentNode = copy; }
  for (let pass = 0; pass < 3; pass++) findAll(copy, x => x !== copy && !kids(x).length && x.tagName !== 'br').forEach(detach);
  // a piece that still carries its original wrapper (<li>, <p>, <h4> ...): keep only what is inside it
  let rest = kids(copy).filter(n => !(n.nodeName === '#text' && !n.value.trim()));
  while (rest.length === 1 && isEl(rest[0]) && /^(li|p|h[1-6]|div)$/.test(rest[0].tagName)) rest = kids(rest[0]).slice();
  return { q: qText.replace(NUM_RE, '').replace(/[:\s]+$/, ''), a: text(copy) ? rest : [] };
}

function extractQa(blocks) {
  const items = [];
  const warn = [];
  let cur = null;
  const startQ = (qText, answerNodes) => { cur = { q: qText, a: answerNodes || [] }; items.push(cur); };
  for (const b of blocks) {
    if (!isEl(b)) continue;
    const t = text(b);
    if (!t) continue;
    const isList = b.tagName === 'ol';
    const li = isList ? kids(b).filter(isEl) : [];
    const numbered = NUM_RE.test(t);
    const listQ = isList && li.length && /\?/.test(text(li[0]));
    const bold = (find(b, x => x.tagName === 'b' || x.tagName === 'strong') || null);
    const firstLineQuestion = !isList && /\?\s*$/.test(splitBlock(b).qText) && splitBlock(b).qText.length > 8 && !MARK_RE.test(t);
    if (listQ) {
      li.forEach(l => explode(l).forEach(piece => { const r = qaOf(piece); startQ(r.q, r.a); }));
      continue;
    }
    if (numbered || firstLineQuestion) {
      explode(b).forEach(piece => { const r = qaOf(piece); startQ(r.q, r.a); });
      continue;
    }
    // an answer block: belongs to the open question
    if (!cur) { warn.push('answer text before any question: ' + t.slice(0, 50)); continue; }
    cur.a.push(...cloneOuter(b));
  }
  return { items, warn };
}

// ------------------------------------------------------------------ markup
function itemHtml(prefix, i, q, a, open) {
  const n = String(i + 1).padStart(2, '0');
  return `<div class="pi-acc__item" data-slot="accordion-item" data-state="${open ? 'open' : 'closed'}">` +
    `<h3 class="pi-acc__h"><button type="button" class="pi-acc__trigger" data-slot="accordion-trigger" id="${prefix}-t${i + 1}" aria-expanded="${open}" aria-controls="${prefix}-p${i + 1}">` +
    `<span class="pi-acc__n">${n}</span><span class="pi-acc__q">${esc(q)}</span>` +
    `<span class="pi-acc__chev" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></span></button></h3>` +
    `<div class="pi-acc__panel" data-slot="accordion-content" id="${prefix}-p${i + 1}" role="region" aria-labelledby="${prefix}-t${i + 1}"${open ? '' : ' inert'}>` +
    `<div class="pi-acc__inner"><div class="pi-acc__a">${a}</div></div></div></div>`;
}
const accordionHtml = (prefix, rows) => `<div class="pi-acc" data-slot="accordion" data-type="single">${rows.map((r, i) => itemHtml(prefix, i, r.q, r.a, i === 0)).join('')}</div>`;

// the words that must survive, in order: lower-case, punctuation-free, numbering and answer labels removed
const words = s => s.toLowerCase().replace(/&nbsp;/g, ' ').replace(/[’'`]/g, '').replace(/[^\p{L}\p{N}]+/g, ' ').trim().split(' ').filter(Boolean);
function stripLabels(s) { return s.replace(/\b(?:q(?:uestion)?\s*)?\d{1,2}\s*[.)]\s+/gi, ' ').replace(/\b(?:answers?|ans)\s*[.:]\s*/gi, ' '); }

function addAssets(html, rel) {
  const hasHeadJs = /data-pi-acc/.test(html);
  let out = html;
  if (!/pi-accordion\.css/.test(out)) {
    out = out.replace(/<link[^>]+pg-faq\.css[^>]*>\r?\n?/i, '');
    const at = out.search(/<\/head>/i);
    out = out.slice(0, at) + `<link rel="stylesheet" href="${rel}assets/css/pi-accordion.css?v=1" />\n` + out.slice(at);
  }
  if (!hasHeadJs) {
    const m = out.match(/<head[^>]*>/i);
    out = out.slice(0, m.index + m[0].length) + `\n<script>document.documentElement.setAttribute('data-pi-acc','');</script>` + out.slice(m.index + m[0].length);
  }
  if (!/pi-accordion\.js/.test(out)) {
    const at = out.lastIndexOf('</body>');
    out = out.slice(0, at) + `<script src="${rel}assets/js/pi-accordion.js?v=1" defer></script>\n` + out.slice(at);
  }
  return out;
}

// ------------------------------------------------------------------ product pages
function convertProductPage(file, html) {
  const doc = parse(html, { sourceCodeLocationInfo: true });
  const widget = find(doc, n => hasClass(n, 'elementor-widget-n-accordion'));
  if (!widget) return null;
  let top = widget;
  while (top.parentNode && !hasClass(top, 'e-parent')) top = top.parentNode;
  if (!hasClass(top, 'e-parent')) return { error: 'no e-parent container' };
  const heading = find(top, n => hasClass(n, 'elementor-heading-title'));
  const title = heading ? text(heading) : 'FAQs';
  const details = findAll(widget, n => n.tagName === 'details' && hasClass(n, 'e-n-accordion-item'));
  const rows = [];
  const original = [];
  for (const d of details) {
    const tn = find(d, n => hasClass(n, 'e-n-accordion-item-title-text'));
    const region = find(d, n => attr(n, 'role') === 'region');
    const q = text(tn).replace(NUM_RE, '');
    const parts = region ? findAll(region, n => hasClass(n, 'elementor-widget-container')).flatMap(c => kids(c)) : [];
    const a = toHtml(parts.map(n => cloneOuter(n)[0] || n).filter(Boolean));
    rows.push({ q, a });
    original.push(text(tn), region ? text(region) : '');
  }
  const emptyAns = rows.filter(r => !r.a).length;
  const before = words(stripLabels(original.join(' '))).join(' ');
  const after = words(stripLabels(rows.map(r => r.q + ' ' + text(parseFragment(r.a))).join(' '))).join(' ');
  const section = `<section class="pi-faq" id="faq"><div class="pi-faq__wrap"><div class="pi-faq__side"><h2 class="pi-faq__h">${esc(title)}</h2></div>${accordionHtml('pi-acc', rows)}</div></section>`;
  const loc = top.sourceCodeLocation;
  return { rows, title, emptyAns, same: before === after, before, after, replace: [loc.startOffset, loc.endOffset, section] };
}

// ------------------------------------------------------------------ blog posts
function convertPost(file, html) {
  const doc = parse(html, { sourceCodeLocationInfo: true });
  const body = find(doc, n => n.tagName === 'body');
  let hit = null;
  walk(body, node => {
    if (hit || !isEl(node) || !/^(h[1-6]|p|strong|b|div|span)$/.test(node.tagName)) return;
    const t = text(node);
    if (/^(FAQs?|Frequently Asked Questions?)\s*(\(\s*FAQs?\s*\))?\s*:?$/i.test(t)) hit = node;
  });
  if (!hit) return null;
  let blk = hit;
  while (blk.parentNode && blk.parentNode.tagName && !/^(div|article|section|body)$/.test(blk.parentNode.tagName)) blk = blk.parentNode;
  const parent = blk.parentNode;
  const sibs = kids(parent).filter(isEl);
  const start = sibs.indexOf(blk);
  const region = sibs.slice(start);
  const headText = text(hit).replace(/\s*:$/, '');
  // does the heading block hold more than the heading (the first question shares its paragraph)?
  let blocks = region.slice(1);
  let first = null;
  if (text(blk) !== text(hit) && FAQ_HEAD.test(text(blk))) {
    const copy = cloneOuter(blk)[0];
    // drop the heading word(s) from the copy
    const lead = find(copy, n => FAQ_HEAD.test(text(n)) && text(n) === text(hit));
    if (lead) { const nxt = lead.parentNode.childNodes[lead.parentNode.childNodes.indexOf(lead) + 1]; detach(lead); if (nxt && nxt.tagName === 'br') detach(nxt); first = copy; }
  }
  if (first) blocks = [first, ...blocks];
  const { items, warn } = extractQa(blocks);
  const rows = items.map(it => ({ q: it.q, a: toHtml(it.a) })).filter(r => r.q);
  const emptyAns = rows.filter(r => !r.a).length;
  const original = region.map(b => text(b)).join(' ').replace(FAQ_HEAD, ' ');
  const before = words(stripLabels(original)).join(' ');
  const after = words(stripLabels(rows.map(r => r.q + ' ' + text(parseFragment(r.a))).join(' '))).join(' ');
  const wrap = `<div class="pi-acc-wrap" id="faq"><h2 class="pi-acc-title">${esc(headText.replace(/\s*\(FAQ\)\s*$/i, '') || 'FAQs')}</h2>${accordionHtml('pi-acc', rows)}</div>`;
  const s = region[0].sourceCodeLocation.startOffset, e = region[region.length - 1].sourceCodeLocation.endOffset;
  return { rows, title: headText, emptyAns, warn, same: before === after, before, after, replace: [s, e, wrap], blocks: region.length };
}

// ------------------------------------------------------------------ run
const targets = [];
for (const dir of ['blog', 'spray-guns', 'office', 'pages']) {
  const d = path.join(ROOT, dir);
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d)) if (f.endsWith('.html')) targets.push(path.join(d, f));
}

let converted = 0, skipped = 0, problems = 0;
for (const file of targets) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  if (ONLY && !rel.includes(ONLY)) continue;
  const html = fs.readFileSync(file, 'utf8');
  if (!/FAQ|Frequently Asked|n-accordion/i.test(html) || /data-slot="accordion"/.test(html)) continue;
  const isBlog = rel.startsWith('blog/');
  let r;
  try { r = isBlog ? convertPost(file, html) : convertProductPage(file, html); } catch (e) { console.log('ERROR ' + rel + ': ' + e.message); problems++; continue; }
  if (!r) continue;
  if (r.error) { console.log('SKIP  ' + rel + ': ' + r.error); problems++; continue; }
  const bad = !r.rows.length || r.emptyAns || !r.same || (r.warn && r.warn.length);
  console.log((bad ? 'CHECK ' : 'ok    ') + rel.padEnd(100).slice(0, 100) + ' ' + r.rows.length + ' items' + (r.emptyAns ? ', ' + r.emptyAns + ' without answer' : '') + (r.same ? '' : ', TEXT DIFFERS') + (r.warn && r.warn.length ? ', ' + r.warn.join('; ') : ''));
  if (!r.same && VERBOSE) {
    const a = r.before.split(' '), b = r.after.split(' ');
    let i = 0; while (i < a.length && a[i] === b[i]) i++;
    console.log('      first difference at word ' + i + ': before "' + a.slice(Math.max(0, i - 3), i + 6).join(' ') + '" / after "' + b.slice(Math.max(0, i - 3), i + 6).join(' ') + '"');
  }
  if (bad) { problems++; continue; }
  const [s, e, repl] = r.replace;
  const relPrefix = '../';
  const out = addAssets(html.slice(0, s) + repl + html.slice(e), relPrefix);
  if (!DRY) fs.writeFileSync(file, out);
  converted++;
}
console.log((DRY ? 'would convert ' : 'converted ') + converted + ' pages; ' + problems + ' need a look');
