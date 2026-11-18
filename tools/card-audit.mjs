// Model-card audit: opens every product model page (/<series>/<model>) at phone, tablet and desktop widths and checks the
// visible card for: text blocks drawn over each other (a model name split over two <h1>s once did), a title or sub-title
// cut off by its box, an empty title, and parts that stick out of the card. Model ids come from each series page.
//   node tools/card-audit.mjs [--only=currency-counters,air-brush] [--widths=390,820,1440]      (2026-11-18)
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = k => (process.argv.find(a => a.startsWith('--' + k + '=')) || '').slice(k.length + 3);
const PORT = 8097, BASE = 'http://127.0.0.1:' + PORT;
const WIDTHS = (arg('widths') || '390,820,1440').split(',').map(Number);
const env = { ...process.env, PORT: String(PORT), RATE_SITE: '1000000' }; delete env.DATABASE_URL; delete env.ADMIN_PASSWORD;
const server = spawn(process.execPath, [path.join(REPO, 'serve.mjs')], { cwd: REPO, env, stdio: 'ignore' });
process.on('exit', () => { try { server.kill(); } catch {} });
for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE + '/')).ok) break; } catch {} await new Promise(r => setTimeout(r, 250)); }

const SERIES = ['air-brush', 'currency-counters', 'currency-sorters', 'electric-series', 'electric-spray-guns', 'electro-hydraulic-series', 'evolution-series', 'gas-cutting-torches', 'gas-regulators', 'gas-welding-brazing-torches', 'legacy-series', 'paper-shredders', 'pneumatic-series', 'power-tools', 'pressure-feed-tanks', 'service-guns'];
const only = arg('only') ? arg('only').split(',') : null;
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--disable-gpu', '--renderer-process-limit=2'] });

function check() {
  const out = [];
  const sheets = [...document.querySelectorAll('.pg-prod')].filter(e => e.offsetHeight > 0);
  if (!sheets.length) return ['NOTHING VISIBLE on the model page'];
  for (const sheet of sheets) {
    const label = e => e.tagName.toLowerCase() + ' "' + (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 28) + '"';
    const vis = e => { const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; for (let x = e; x && x !== sheet; x = x.parentElement) { const c = getComputedStyle(x); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0) return false; } return true; };
    // the blocks that should never overlap one another
    const blocks = [...sheet.querySelectorAll('h1, h3, h5, p, table, ul, .pg-buy, .pg-video, .pg-areas, .pg-fig, figure')].filter(e => vis(e) && !e.closest('li, td, th, .pg-areas p') && (e.textContent.trim() || e.matches('table, .pg-video')));
    const own = blocks.filter(a => !blocks.some(b => b !== a && b.contains(a)));
    for (let i = 0; i < own.length; i++) for (let j = i + 1; j < own.length; j++) {
      const a = own[i].getBoundingClientRect(), b = own[j].getBoundingClientRect();
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (w > 6 && h > 6) out.push('overlap: ' + label(own[i]) + '  x  ' + label(own[j]) + ' (' + Math.round(w) + 'x' + Math.round(h) + ')');
    }
    for (const h of sheet.querySelectorAll('h1')) {
      if (!vis(h)) continue;
      if (!h.textContent.trim()) out.push('empty title');
      // cut off = its box clips it (overflow hidden/clip) and the text is bigger than the box; italic letters that only
      // lean past a visible box are fine
      const hc = getComputedStyle(h);
      if (/hidden|clip/.test(hc.overflowX + hc.overflowY) && (h.scrollWidth > h.clientWidth + 2 || h.scrollHeight > h.clientHeight + 4)) out.push('title cut off: ' + label(h));
      const rg = document.createRange(); rg.selectNodeContents(h); const tr = rg.getBoundingClientRect(), row = h.closest('.et_pb_row');
      if (row && tr.right > row.getBoundingClientRect().right + 2) out.push('title runs past the card: ' + label(h));
      const r = h.getBoundingClientRect(); if (r.right > innerWidth + 1 || r.left < -1) out.push('title off screen: ' + label(h));
    }
    const card = sheet.querySelector('.et_pb_row'); const cr = card && card.getBoundingClientRect();
    if (cr) for (const e of own) { const r = e.getBoundingClientRect(); if (r.right > cr.right + 2 || r.left < cr.left - 2) out.push('sticks out of the card: ' + label(e)); }
  }
  return [...new Set(out)];
}

const report = [];
for (const w of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, isMobile: w < 768, hasTouch: w < 1024 });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  const p = await ctx.newPage();
  let n = 0;
  for (const s of SERIES) {
    if (only && !only.includes(s)) continue;
    await p.goto(BASE + '/' + s, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {}); await p.waitForTimeout(900);
    const ids = await p.evaluate(() => [...document.querySelectorAll('[id^="model-"]')].map(e => e.id.replace(/^model-/, '')));
    for (const id of ids) {
      await p.goto(BASE + '/' + s + '/' + id, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {}); await p.waitForTimeout(900);
      const issues = await p.evaluate(check);
      n++; if (issues.length) report.push({ w, page: s + '/' + id, issues });
    }
  }
  console.log(w + 'px: ' + n + ' model pages checked');
  await ctx.close();
}
await browser.close(); server.kill();
console.log('\nCARDS WITH ISSUES: ' + report.length);
for (const r of report) console.log('\n' + r.page + ' @' + r.w + '\n  ' + r.issues.join('\n  '));
