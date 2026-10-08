// Converts the Power Tools page (built in Elementor) to the series-page layout every other series uses.
// The series stylesheet and script (assets/css/pg-series.css, assets/js/pg-series.js) expect Divi's
// model markup: a desktop section (three columns: name + features | photo | data) and a phone section
// per model. This reads each Elementor model block (#pt-hg-25, #pt-bl-25, #pt-bl-26vs) and writes the
// same content in that markup. Nothing is invented: name, type, features, photo, spec rows, document
// links and application photos are all read from the block they replace.
//
//   node tools/power-tools-series.mjs        (idempotent: a page without Elementor model blocks is left alone)
import fs from 'node:fs';
import path from 'node:path';

const FILE = path.join(process.cwd(), 'pilotindia-clone', 'pages', 'power-tools.html');
let html = fs.readFileSync(FILE, 'utf8');

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// text content of a fragment; entities are already encoded in the source, so they are kept as they are
const text = s => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

// end offset of the element whose start tag begins at `at` (balanced <div> count)
function endOf(src, at) {
  const re = /<(\/?)div\b[^>]*>/g;
  re.lastIndex = at;
  let depth = 0, m;
  while ((m = re.exec(src))) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return re.lastIndex;
  }
  throw new Error('unbalanced markup after ' + at);
}
function startOf(src, id) {
  const i = src.indexOf(`id="${id}"`);
  return i < 0 ? -1 : src.lastIndexOf('<div', i);
}

const IDS = [...html.matchAll(/<div class="[^"]*\be-parent\b[^"]*" id="(pt-[\w-]+)"/g)].map(m => m[1]);
if (!IDS.length) { console.log('power-tools: no Elementor model blocks left, nothing to do'); process.exit(0); }

function read(seg) {
  const name = text((seg.match(/<h2 class="elementor-heading-title[^"]*">([\s\S]*?)<\/h2>/) || [])[1] || '');
  const sub = text((seg.match(/elementor-widget-text-editor"[^>]*>\s*<div class="elementor-widget-container">([\s\S]*?)<\/div>/) || [])[1] || '');
  const ul = (seg.match(/<ul class="elementor-icon-list-items">([\s\S]*?)<\/ul>/) || [])[1] || '';
  const features = [...ul.matchAll(/elementor-icon-list-text">([\s\S]*?)<\/span>/g)].map(m => text(m[1])).filter(Boolean);
  const photo = (seg.match(/elementor-widget-image[\s\S]*?<img\b[^>]*?bv-data-src="([^"]+)"/) || [])[1] || '';
  const table = (seg.match(/<table class="specs-table">([\s\S]*?)<\/table>/) || [])[1] || '';
  const specs = [...table.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(r => [...r[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(c => text(c[1])));
  const docs = [...seg.matchAll(/<a href="([^"]+)" class="pdf-link"[^>]*>([\s\S]*?)<\/a>/g)].map(m => ({ href: m[1], label: text(m[2]) }));
  const apps = [...seg.matchAll(/<div class="app-item">([\s\S]*?)<\/div>/g)].map(m => ({
    src: (m[1].match(/bv-data-src="([^"]+)"/) || [])[1] || '',
    label: text((m[1].match(/<p>([\s\S]*?)<\/p>/) || [])[1] || ''),
  }));
  if (!name || !photo || !specs.length) throw new Error('could not read a model block: ' + (name || '(no name)'));
  return { name, sub, features, photo, specs, docs, apps };
}

const models = IDS.map(id => { const a = startOf(html, id); return Object.assign({ id, at: a, end: endOf(html, a) }, read(html.slice(a, endOf(html, a)))); });

const slug = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const featureList = f => '<ul>\n' + f.map(x => `<li>\n<h6>${x}</h6>\n</li>`).join('\n') + '\n</ul>';
const specTable = s => '<table>\n<tbody>\n' + s.map(r => `<tr>\n<td>${r[0]}</td>\n<td>${r[1] || ''}</td>\n</tr>`).join('\n') + '\n</tbody>\n</table>';
const LINK = 'font-family: Arial, Helvetica, sans-serif; color: #000; font-size: 14px; top: -5px; position: relative;';
const pdfIcon = '<img src="../assets/img/pdf-1.png" decoding="async" width="42" height="40" alt="PDF">';
function appTable(apps, mob) {
  const rows = [];
  for (let i = 0; i < apps.length; i += 2) rows.push(apps.slice(i, i + 2));
  return '<table style="border: none; border-top: none;">\n<tbody>\n' + rows.map(r => '<tr>\n' + r.map(a =>
    `<td style="border-top: none;"><img src="${esc(a.src)}" decoding="async" loading="lazy" style="border-top: none; height: 80px;" alt="${esc(a.label)}">${a.label}</td>`
  ).join('\n') + '\n</tr>').join('\n') + '\n</tbody>\n</table>';
}

// section numbers no Divi rule targets
let n = 9000;
function desk(m) {
  const k = ++n;
  return `<div class="et_pb_section et_pb_section_${k} et_section_regular pg-prod pg-prod--desk" id="model-${slug(m.name)}" >
<div class="et_pb_row et_pb_row_${k} et_pb_equal_columns et_pb_gutters1">
<div class="et_pb_column et_pb_column_1_5 et_pb_css_mix_blend_mode_passthrough">
<div class="et_pb_module et_pb_text et_pb_text_align_left et_pb_bg_layout_light">
<div class="et_pb_text_inner"><h1>${m.name}</h1>
${m.sub ? `<p>${m.sub}</p>\n` : ''}<hr />
<h5><strong>FEATURES</strong></h5>
${featureList(m.features)}</div>
</div>
</div><div class="et_pb_column et_pb_column_1_5 et_pb_css_mix_blend_mode_passthrough">
<div class="et_pb_module et_pb_image">
<span class="et_pb_image_wrap "><img src="${esc(m.photo)}" decoding="async" width="1000" height="1000" alt="${esc(m.name)}"></span>
</div>
</div><div class="et_pb_column et_pb_column_3_5 et_pb_css_mix_blend_mode_passthrough et-last-child">
<div class="et_pb_module et_pb_divider et_pb_divider_position_ et_pb_space"><div class="et_pb_divider_internal"></div></div><div class="et_pb_module et_pb_text et_pb_text_align_left et_pb_bg_layout_light">
<div class="et_pb_text_inner"><h5>TECHNICAL DATA</h5></div>
</div><div class="et_pb_module et_pb_text et_pb_text_align_left et_pb_bg_layout_light">
<div class="et_pb_text_inner"><div style="width: 100%; display: flex;">
<div style="width: 100%;">
${specTable(m.specs)}
${m.docs.length ? '<table border="0">\n<tbody>\n<tr>\n' + m.docs.map(d => `<td style="padding-top: 20px;">${pdfIcon} <a style="${LINK}" href="${esc(d.href)}">${d.label}</a></td>`).join('\n') + '\n</tr>\n</tbody>\n</table>' : ''}
</div>
${m.apps.length ? `<div style="margin: 0px 20px;">\n<p>AREAS OF APPLICATION</p>\n${appTable(m.apps)}\n</div>` : ''}
</div></div>
</div>
</div>
</div>
</div>`;
}
function mob(m) {
  const k = ++n;
  return `<div class="et_pb_section et_pb_section_${k} et_section_regular pg-prod pg-prod--mob" >
<div class="et_pb_row et_pb_row_${k} et_pb_equal_columns et_pb_gutters1">
<div class="et_pb_column et_pb_column_4_4 et_pb_css_mix_blend_mode_passthrough et-last-child">
<div class="et_pb_module et_pb_text et_pb_text_align_left et_pb_bg_layout_light">
<div class="et_pb_text_inner"><div style="display: flex; width: 80%;">
<div>
<h1>${m.name}</h1>
${m.sub ? `<p>${m.sub}</p>\n` : ''}<hr />
<h5><strong>FEATURES</strong></h5>
${featureList(m.features)}
${m.apps.length ? `<p style="font-size: 12px;">AREAS OF APPLICATION</p>\n${appTable(m.apps, true)}` : ''}
</div>
<div style="width: 30%;"><img src="${esc(m.photo)}" decoding="async" style="position: absolute; right: -10px; max-width: 35%;" alt="${esc(m.name)}"></div>
</div></div>
</div><div class="et_pb_module et_pb_text et_pb_text_align_left et_pb_bg_layout_light">
<div class="et_pb_text_inner"><h5>TECHNICAL DATA</h5></div>
</div><div class="et_pb_module et_pb_text et_pb_text_align_left et_pb_bg_layout_light">
<div class="et_pb_text_inner"><div style="width: 100%; display: flex;">
<div style="width: 100%;">
${specTable(m.specs)}
${m.docs.map(d => `<p>${pdfIcon} <a style="${LINK}" href="${esc(d.href)}">${d.label}</a></p>`).join('\n')}
</div>
</div></div>
</div>
</div>
</div>
</div>`;
}

// the region from the first model block to the end of the last one, dividers between them included
const from = models[0].at, to = models[models.length - 1].end;
const out = '\n' + models.map(desk).join('\n') + '\n' + models.map(mob).join('\n') + '\n';
html = html.slice(0, from) + out + html.slice(to);

// an earlier attempt kept the Elementor blocks and drove them from a script with the model data typed
// into it; the shared series script replaces it
html = html.replace(/<style>\s*\/\* Power Tools Series View Styles \*\/[\s\S]*?<\/style>\s*/, '');
html = html.replace(/<script src="\.\.\/assets\/js\/pg-powertools\.js"[^>]*><\/script>\s*/, '');

// what tools/sprayguns-series.mjs wires into every series page
html = html.replace(/<body class="([^"]*)"/, (m, c) => /(^| )pg-series( |$)/.test(c) ? m : `<body class="${c} pg-series"`);
// no series menu on this page to take the name from (the page title is an SEO line)
if (!/<body[^>]*data-pg-series=/.test(html)) html = html.replace(/<body /, '<body data-pg-series="Power Tools" ');
if (!html.includes("setAttribute('data-pgs-js'")) html = html.replace(/<head[^>]*>/i, m => m + "\n<script>document.documentElement.setAttribute('data-pgs-js','');</script>");
if (!html.includes('pg-series.css')) html = html.replace('</head>', '<link rel="stylesheet" href="../assets/css/pg-series.css" />\n</head>');
if (!html.includes('pg-series.js')) html = html.replace('</body>', '<script src="../assets/js/pg-series.js" defer></script>\n</body>');

fs.writeFileSync(FILE, html, 'utf8');
for (const m of models) console.log(`${m.name} | ${m.sub} | features ${m.features.length} | specs ${m.specs.length} | docs ${m.docs.length} | apps ${m.apps.length} | ${m.photo}`);
console.log('power-tools: ' + models.length + ' models converted');
