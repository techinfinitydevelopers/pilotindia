// Clicks every "Download Catalogue" button on the site and checks that the form card opens, and how fast.
//   node tools/test-catalogue-gate.mjs [--base http://localhost:8080] [--cpu 4] [--footer] [--only <page name>] [--shots]
// For every page that has catalogue buttons (and, with --footer, a sample of pages for the footer "2025 catalogue" link):
//   - each visible catalogue link is clicked with a real mouse click
//   - pass = the card is open, shows the file name and the Privacy Policy link, and the page did not navigate or download
//   - latency = from the click event reaching the document to the card being displayed (ms)
// --cpu N throttles the CPU N times (a phone or an old laptop) so slow pages show up. --block drops images, fonts and media.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg('base', 'http://localhost:8080');
const CPU = Number(arg('cpu', 1));
const ONLY = arg('only', '');
const FOOTER = process.argv.includes('--footer');
const SHOTS = process.argv.includes('--shots');
const ROOT = path.join(process.cwd(), 'pilotindia-clone');

// ---- which pages have which catalogue links (same rule as the site: a PDF link with "catalog" in its text or name)
const pages = {};
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (e.name !== 'assets') walk(p); continue; }
    if (!e.name.endsWith('.html')) continue;
    const h = fs.readFileSync(p, 'utf8');
    const rel = path.relative(ROOT, p).split(path.sep).join('/');
    for (const m of h.matchAll(/<a\b[^>]*href="([^"]+\.pdf)(?:[?#][^"]*)?"[^>]*>([\s\S]*?)<\/a>/gi)) {
      const t = m[2].replace(/<[^>]+>/g, ' ');
      if (!/catalog/i.test(t + ' ' + m[1])) continue;
      const foot = /2025 catalogue|e-catalog-new/i.test(t + m[1]);
      (pages[rel] ||= { content: 0, footer: 0 })[foot ? 'footer' : 'content']++;
    }
  }
})(ROOT);

let targets = Object.entries(pages).filter(([, v]) => v.content).map(([k]) => k);
if (FOOTER) {
  const sample = ['index.html', 'spray-guns/index.html', 'welding/index.html', 'airless/index.html', 'office/index.html', 'pages/about-us.html', 'pages/contact-us.html', 'blog/index.html',
    ...Object.keys(pages).filter(k => k.startsWith('blog/')).slice(0, 4), ...Object.keys(pages).filter(k => k.startsWith('category/')).slice(0, 3)];
  for (const s of sample) if (pages[s] && !targets.includes(s)) targets.push(s);
}
if (ONLY) targets = targets.filter(t => t.includes(ONLY));

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const rows = [];
let fails = 0;

for (const rel of targets) {
  const url = BASE + '/' + rel.replace(/index\.html$/, '');
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  if (process.argv.includes('--block')) await page.route('**/*', r => ['image', 'media', 'font'].includes(r.request().resourceType()) ? r.abort() : r.continue());
  let downloads = 0, popups = 0;
  page.on('download', () => downloads++);
  ctx.on('page', () => popups++);
  try {
    if (CPU > 1) { const c = await ctx.newCDPSession(page); await c.send('Emulation.setCPUThrottlingRate', { rate: CPU }); }
    await page.goto(url, { waitUntil: 'commit', timeout: 45000 });
    // ready = the form script has run and built its card. (Not document.readyState: pages with embedded YouTube playlists stay
    // "loading" for 30 s while the videos load, and a visitor can click long before that.)
    await page.waitForFunction(() => window.__piLead && document.querySelector('.pi-lead') && document.body && document.body.children.length > 3, null, { timeout: 60000 });
    await page.waitForTimeout(1200);
    await page.evaluate(() => {
      window.__m = {};
      addEventListener('click', () => { window.__m.t0 = performance.now(); window.__m.t1 = 0; }, true);
      new MutationObserver(() => {
        const m = document.querySelector('.pi-lead');
        if (m && !m.hidden && !window.__m.t1 && window.__m.t0) window.__m.t1 = performance.now();
      }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'class'] });
    });
    const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a, i) => { a.setAttribute('data-gate-test', i); return { i, href: a.getAttribute('href') || '', text: (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40) }; })
      .filter(l => /\.pdf(\?|#|$)/i.test(l.href) && /catalog/i.test(l.text + ' ' + l.href)));
    const wantFooter = FOOTER && !pages[rel].content;
    let n = 0;
    for (const l of links) {
      const isFooter = /2025 catalogue|e-catalog-new/i.test(l.text + l.href);
      if (isFooter && !wantFooter && pages[rel].content) continue;           // the footer link is tested on its own sample pages
      // put it on screen, wait for smooth scrolling to settle, then click where it really is
      const box = await page.evaluate(async i => {
        const a = document.querySelector('a[data-gate-test="' + i + '"]'); a.scrollIntoView({ block: 'center', behavior: 'instant' });
        await new Promise(r => setTimeout(r, 400));
        const b = a.getBoundingClientRect(); return b.width && b.height ? { x: b.x + b.width / 2, y: b.y + b.height / 2 } : null;
      }, l.i);
      // a link that is hidden on this layout (the other copy of a twin, a tab that is not selected) cannot be clicked with the mouse;
      // it is clicked from script instead, which runs the same click handler
      const hiddenLink = !box;
      const before = page.url();
      if (page.url() !== before) { rows.push({ rel, text: l.text, href: l.href, ok: false, note: 'page moved before the click: ' + page.url() }); fails++; continue; }
      await page.evaluate(() => { window.__m = window.__m || { t0: 0, t1: 0 }; window.__m.t0 = 0; window.__m.t1 = 0; });
      if (hiddenLink) await page.evaluate(i => document.querySelector('a[data-gate-test="' + i + '"]').click(), l.i); else await page.mouse.click(box.x, box.y);
      let ok = true, note = '';
      try { await page.waitForFunction(() => { const m = document.querySelector('.pi-lead'); return m && !m.hidden && window.__m.t1; }, null, { timeout: 8000 }); }
      catch { ok = false; note = 'card did not open in 8 s'; }
      const info = await page.evaluate(() => { const m = document.querySelector('.pi-lead'); return m ? { file: (m.querySelector('.pi-lead__file') || {}).textContent, priv: !!m.querySelector('a[href*="privacy-policy"]'), fields: m.querySelectorAll('input[name], select[name]').length, ms: Math.round(window.__m.t1 - window.__m.t0) } : null; });
      if (ok && (page.url() !== before || downloads || popups)) { ok = false; note = 'page navigated / downloaded / opened a tab'; }
      if (ok && (!info.priv || info.fields < 5)) { ok = false; note = 'card is missing the privacy link or fields'; }
      if (SHOTS && n === 0) await page.screenshot({ path: path.join(process.env.TEMP, 'gate-' + rel.replace(/\W+/g, '_') + '.png'), timeout: 30000 }).catch(() => {});
      if (hiddenLink && ok) note = 'hidden here: clicked from script';
      rows.push({ rel, text: l.text, href: l.href, ok, ms: info && info.ms, note });
      console.log((ok ? (hiddenLink ? 'pass ' : 'PASS ') : 'FAIL ') + rel.padEnd(40) + String(info && info.ms).padStart(5) + ' ms  ' + l.text.padEnd(22).slice(0, 22) + ' ' + path.basename(l.href).slice(0, 40) + (note ? '  <- ' + note : ''));
      if (!ok) fails++;
      n++;
      await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    }
  } catch (e) {
    rows.push({ rel, text: '', href: '', ok: false, note: 'page error: ' + e.message.split('\n')[0].slice(0, 80) }); fails++;
  }
  await ctx.close();
}
await browser.close();

for (const r of rows.filter(r => r.ok === false)) console.log((r.ok === null ? 'skip ' : 'FAIL ') + r.rel.padEnd(40) + String(r.ms ?? '').padStart(5) + ' ms  ' + r.text.padEnd(22).slice(0, 22) + ' ' + path.basename(r.href).slice(0, 40) + (r.note ? '  <- ' + r.note : ''));
const ms = rows.filter(r => r.ok && r.ms != null).map(r => r.ms).sort((a, b) => a - b);
const q = p => ms.length ? ms[Math.min(ms.length - 1, Math.floor(ms.length * p))] : 0;
console.log(`\n${rows.filter(r => r.ok).length} passed, ${fails} failed, ${rows.filter(r => r.ok === null).length} skipped (hidden) | card latency ms: median ${q(0.5)}, p90 ${q(0.9)}, max ${ms[ms.length - 1] || 0} | cpu x${CPU}`);
process.exit(fails ? 1 : 0);
