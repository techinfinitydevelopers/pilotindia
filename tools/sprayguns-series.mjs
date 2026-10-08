// Revamps a spray-guns "series" page (evolution-series, legacy-series, ...) without
// touching any of its content: it only tags the existing Divi markup so the new
// stylesheet (spray-guns/assets/css/pg-series.css) and script (pg-series.js) can
// target it, and wires those two files in.
//
// What it adds, all idempotent:
//   - class "pg-series" on <body>, and a data attribute set before first paint that
//     gates the scroll-reveal start states (a data attribute, not a class: Divi
//     assigns documentElement.className and would wipe a class)
//   - section tags: pg-hero (desktop banner), pg-nav (the series menu), pg-prod +
//     pg-prod--desk / pg-prod--mob (each model; Divi ships a desktop copy and a mobile
//     copy of every model and hides one per breakpoint), pg-skip (empty spacer sections)
//   - id="model-<slug>" on each desktop model section, for the model rail
//   - the stylesheet link and script tag
//
//   node tools/sprayguns-series.mjs pages/evolution-series.html [more pages...]   (paths relative to pilotindia-clone)
import fs from 'node:fs';
import path from 'node:path';

// the four product sites were merged into one: series pages now live in pilotindia-clone/pages
const CLONE = path.join(process.cwd(), 'pilotindia-clone');
const files = process.argv.slice(2);
if (!files.length) { console.error('usage: node tools/sprayguns-series.mjs pages/<page>.html ...'); process.exit(1); }

const slug = (t) => t.toLowerCase().replace(/&amp;/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

for (const rel of files) {
  const file = path.join(CLONE, rel);
  let html = fs.readFileSync(file, 'utf8');

  // ---- split a menu section that also holds the first model ----------------
  // Service Guns keeps its series menu and its first model in one Divi section. A sticky bar made of
  // that whole section would be as tall as the model, so it is split between the menu row and the
  // product row. The new section gets a number no Divi rule targets (1000 + the old one).
  for (let guard = 0; guard < 4; guard++) {
    let split = false;
    const all = [...html.matchAll(/<div class="(et_pb_section et_pb_section_(\d+)(?: [^"]*)?)"( id="[^"]*")?( ?)>/g)];
    for (let i = 0; i < all.length && !split; i++) {
      const m = all[i];
      if (+m[2] === 0 || !/pg-nav|et_pb_sticky_module/.test(m[1])) continue;
      const end = i + 1 < all.length ? all[i + 1].index : html.indexOf('<footer', m.index);
      const seg = html.slice(m.index, end);
      if (!/et_pb_menu/.test(seg) || !/<h1>/.test(seg) || !/FEATURES|<table/.test(seg)) continue;
      const rowRe = /<div class="et_pb_row /g;
      rowRe.lastIndex = m.index + m[0].length;
      rowRe.exec(html);                          // the menu's row
      const second = rowRe.exec(html);           // the first product row
      if (!second || second.index >= end) continue;
      const piece = '</div>\n\t\t<div class="et_pb_section et_pb_section_' + (1000 + (+m[2])) + ' et_section_regular" >\n\t\t\t\t';
      html = html.slice(0, second.index) + piece + html.slice(second.index);
      split = true;
    }
    if (!split) break;
  }

  // ---- tag sections -------------------------------------------------------
  const re =/<div class="(et_pb_section et_pb_section_(\d+)(?: [^"]*)?)"( id="[^"]*")?( ?)>/g;
  const opens = [...html.matchAll(re)];
  const edits = [];
  const seen = new Map();
  const used = new Set();

  opens.forEach((m, i) => {
    const end = i + 1 < opens.length ? opens[i + 1].index : html.indexOf('<footer', m.index);
    const seg = html.slice(m.index, end > m.index ? end : m.index + 20000);
    const num = +m[2];
    const add = [];

    const hasRow = /class="et_pb_row /.test(seg);
    const h1 = (seg.match(/<h1>([^<]*)<\/h1>/) || [])[1];
    // a model has a name and either a features list or a data table (some twins and some products,
    // e.g. the currency sorters, have no FEATURES heading)
    const isModel = !!h1 && (/FEATURES/.test(seg) || /<table/.test(seg));
    const desk = /et_pb_column_1_5/.test(seg);

    if (!hasRow) add.push('pg-skip');
    else if (num === 0) add.push('pg-hero');
    else if (/et_pb_menu/.test(seg) && /pg-nav|et_pb_sticky_module/.test(m[1])) add.push('pg-nav');
    else if (isModel) {
      add.push('pg-prod', desk ? 'pg-prod--desk' : 'pg-prod--mob');
      if (desk) {
        // keep an id minted by an earlier run, so re-running never renumbers anything
        const had = (m[3] || '').match(/id="([^"]*)"/);
        let id = had ? had[1] : 'model-' + slug(h1.trim()), n = 2;
        while (!had && used.has(id)) id = 'model-' + slug(h1.trim()) + '-' + n++;
        used.add(id);
        add.push('#' + id);
      }
    }
    if (!add.length) return;
    edits.push({ at: m.index, len: m[0].length, cls: m[1], add, hadId: m[3] || '', sp: m[4] });
  });

  // apply back to front so earlier offsets stay valid
  for (const e of edits.reverse()) {
    const classes = e.add.filter(a => !a.startsWith('#'));
    const id = (e.add.find(a => a.startsWith('#')) || '').slice(1);
    let cls = e.cls;
    for (const c of classes) if (!new RegExp('(^| )' + c + '( |$)').test(cls)) cls += ' ' + c;
    // Divi's own sticky script wakes after the first scroll and forces the bar to position:fixed;
    // top:0 (under the site menu), then re-lays the page out mid-scroll. pg-series.css sticks the
    // bar itself, so Divi is told to leave it alone.
    if (classes.includes('pg-nav')) cls = cls.replace(/ ?et_pb_sticky_module/, '');
    const idAttr = e.hadId || (id ? ` id="${id}"` : '');
    const open = `<div class="${cls}"${idAttr}${e.sp}>`;
    html = html.slice(0, e.at) + open + html.slice(e.at + e.len);
  }

  // ---- body class ----------------------------------------------------------
  html = html.replace(/<body class="([^"]*)"/, (m, c) => /(^| )pg-series( |$)/.test(c) ? m : `<body class="${c} pg-series"`);

  // ---- gate attribute, set before first paint ------------------------------
  if (!html.includes("setAttribute('data-pgs-js'")) {
    html = html.replace(/<head[^>]*>/i, (m) => m + "\n<script>document.documentElement.setAttribute('data-pgs-js','');</script>");
  }

  // ---- display serif for model names (falls back to Georgia when offline) ----
  const FONT = 'https://fonts.googleapis.com/css2?family=Italiana&display=swap';
  if (!html.includes(FONT)) {
    html = html.replace('</head>', '<link rel="preconnect" href="https://fonts.googleapis.com" />\n' +
      '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n' +
      '<link rel="stylesheet" href="' + FONT + '" />\n</head>');
  }

  // ---- stylesheet + script -------------------------------------------------
  if (!html.includes('pg-series.css')) {
    html = html.replace('</head>', '<link rel="stylesheet" href="../assets/css/pg-series.css" />\n</head>');
  }
  if (!html.includes('pg-series.js')) {
    html = html.replace('</body>', '<script src="../assets/js/pg-series.js" defer></script>\n</body>');
  }

  fs.writeFileSync(file, html, 'utf8');
  const count = (c) => (html.match(new RegExp('class="[^"]*\\b' + c + '\\b', 'g')) || []).length;
  console.log(`${rel}: hero ${count('pg-hero')}, nav ${count('pg-nav')}, models desk ${count('pg-prod--desk')} / mob ${count('pg-prod--mob')}, skipped ${count('pg-skip')}`);
}
