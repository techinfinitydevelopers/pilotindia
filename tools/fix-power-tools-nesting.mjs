// pages/power-tools.html: each of the six product sheets (3 desktop + 3 phone) was written without its closing
// </div>s (3 each, 2 for the last), and the #pi-products wrapper without its own. The browser therefore nested every
// sheet inside the previous one and put everything after them (the "Why choose" block, the FAQ) inside the last sheet:
// the BL-25 and BL-26VS product pages showed nothing, and "Why choose" + FAQ never showed (found by the site audit,
// 2026-11-18). This closes each sheet where it ends. Idempotent (a balanced sheet gets nothing).
//   node tools/fix-power-tools-nesting.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';

const FILE = path.resolve('pilotindia-clone/pages/power-tools.html');
let html = fs.readFileSync(FILE, 'utf8');
const wrapAt = html.indexOf('<div id="pi-products">');
if (wrapAt < 0) throw new Error('#pi-products not found');
const tailAt = html.search(/<section class="(pg-why|pi-faq)"/);
if (tailAt < 0) throw new Error('tail section not found');
const secRe = /<div class="et_pb_section[^"]*\bpg-prod\b[^"]*"/g; secRe.lastIndex = wrapAt;
const starts = []; for (let m; (m = secRe.exec(html)) && m.index < tailAt;) starts.push(m.index);
const net = s => { const t = s.replace(/<!--[\s\S]*?-->/g, ''); return (t.match(/<div\b/g) || []).length - (t.match(/<\/div>/g) || []).length; };

// from the end: inserting at a later offset does not move an earlier one
let added = 0;
const wrapNet = net(html.slice(wrapAt, starts[0]));                    // the wrapper's own open tag: +1
const bounds = starts.map((st, i) => [st, i + 1 < starts.length ? starts[i + 1] : tailAt]);
const plan = bounds.map(([a, b], i) => ({ at: b, n: net(html.slice(a, b)) }));
plan[plan.length - 1].n += wrapNet;                                     // after the last sheet: also close the wrapper
for (const p of plan.slice().reverse()) {
  if (p.n <= 0) continue;
  html = html.slice(0, p.at) + '</div>'.repeat(p.n) + '\n' + html.slice(p.at);
  added += p.n;
}
console.log('sheets:', starts.length, '| closers per sheet:', plan.map(p => p.n).join(','), '| added', added);
if (!added) { console.log('already balanced'); process.exit(0); }
if (!process.argv.includes('--dry')) { fs.writeFileSync(FILE, html); console.log('written'); }
