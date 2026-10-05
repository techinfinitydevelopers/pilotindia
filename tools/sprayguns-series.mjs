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
//   node tools/sprayguns-series.mjs pages/evolution-series.html [more pages...]
import fs from 'node:fs';
import path from 'node:path';

const CLONE = path.join(process.cwd(), 'pilotindia-clone', 'spray-guns');
const files = process.argv.slice(2);
if (!files.length) { console.error('usage: node tools/sprayguns-series.mjs pages/<page>.html ...'); process.exit(1); }

const slug = (t) => t.toLowerCase().replace(/&amp;/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

for (const rel of files) {
  const file = path.join(CLONE, rel);
  let html = fs.readFileSync(file, 'utf8');

  // ---- tag sections -------------------------------------------------------
  const re = /<div class="(et_pb_section et_pb_section_(\d+)(?: [^"]*)?)"( id="[^"]*")?( ?)>/g;
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
    const isModel = !!h1 && /FEATURES/.test(seg);
    const desk = /et_pb_column_1_5/.test(seg);

    if (!hasRow) add.push('pg-skip');
    else if (num === 0) add.push('pg-hero');
    else if (/et_pb_menu/.test(seg) && /et_pb_sticky_module/.test(m[1])) add.push('pg-nav');
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
