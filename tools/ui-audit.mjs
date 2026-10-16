// Responsive / UI audit of every public page (the sitemap's clean URLs) at phone, tablet, laptop and desktop widths.
// For each page and width it records:
//   - sideways overflow: the page is wider than the screen, and the elements sticking out past the right edge
//   - broken images (loaded with no pixels) and distorted ones (drawn at a different shape than the picture, no object-fit)
//   - dead controls: links with no destination, buttons/links with no text or label
//   - text cut off: one-line text clipped by its own box without an ellipsis
//   - heading / body fonts that are not the site's (DM Sans headings, SF Pro / Inter body)
//   - phone only: tap targets smaller than 32 px
// Starts its own server (port 8098), blocks every other domain.
//   node tools/ui-audit.mjs [--only=/about-us,/products] [--widths=390,768] [--json=out.json]
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = k => (process.argv.find(a => a.startsWith('--' + k + '=')) || '').slice(k.length + 3);
const PORT = 8098, BASE = 'http://127.0.0.1:' + PORT;
const WIDTHS = (arg('widths') || '390,768,1024,1440').split(',').map(Number);

const env = { ...process.env, PORT: String(PORT), RATE_SITE: '1000000' }; delete env.DATABASE_URL; delete env.ADMIN_PASSWORD;
const server = spawn(process.execPath, [path.join(REPO, 'serve.mjs')], { cwd: REPO, env, stdio: 'ignore' });
const stop = () => { try { server.kill(); } catch {} };
process.on('exit', stop);
for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE + '/')).ok) break; } catch {} await new Promise(r => setTimeout(r, 250)); }

const xml = await (await fetch(BASE + '/sitemap.xml')).text();
let urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1]).pathname);
if (arg('only')) urls = arg('only').split(',').map(u => '/' + u.replace(/^\/+/, ''));   // 'about-us' or '/about-us'
console.log(urls.length, 'pages x', WIDTHS.join('/'), 'px');

const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--disable-gpu', '--renderer-process-limit=2'] });
const report = [];

function check(w) {
  const out = { overflow: null, wide: [], broken: [], distorted: [], dead: [], clipped: [], fonts: [], small: 0, smallEx: [] };
  const vw = document.documentElement.clientWidth;
  const name = e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const visible = e => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false; for (let x = e; x; x = x.parentElement) { const c = getComputedStyle(x); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0) return false; } return true; };
  // an ancestor that clips or scrolls sideways keeps the overflow inside it
  const contained = e => { for (let x = e.parentElement; x && x !== document.body; x = x.parentElement) { const c = getComputedStyle(x); if (/(hidden|auto|scroll|clip)/.test(c.overflowX)) return true; if (c.position === 'fixed') return true; } return false; };
  if (document.documentElement.scrollWidth > vw + 1) out.overflow = document.documentElement.scrollWidth - vw;
  for (const e of document.body.querySelectorAll('*')) {
    const r = e.getBoundingClientRect();
    if (r.width && (r.right > vw + 2 || r.left < -2) && !contained(e) && getComputedStyle(e).position !== 'fixed' && visible(e)) { out.wide.push(name(e) + ' ' + Math.round(r.left) + '..' + Math.round(r.right)); if (out.wide.length > 6) break; }
  }
  for (const img of document.querySelectorAll('img')) {
    if (!visible(img)) continue;
    const src = img.currentSrc || img.getAttribute('src') || '';
    if (!src || /^data:/.test(src)) continue;
    if (img.complete && img.naturalWidth === 0) { out.broken.push(src.slice(-70)); continue; }
    if (!img.naturalWidth) continue;
    const c = getComputedStyle(img), r = img.getBoundingClientRect();
    if (c.objectFit === 'fill' && r.width > 30 && r.height > 30) {
      const a = (r.width / r.height) / (img.naturalWidth / img.naturalHeight);
      if (a > 1.08 || a < 0.92) out.distorted.push(src.split('/').pop().slice(0, 50) + ' x' + a.toFixed(2));
    }
  }
  for (const a of document.querySelectorAll('a, button')) {
    if (!visible(a)) continue;
    if (a.getAttribute('aria-hidden') === 'true' && a.getAttribute('tabindex') === '-1') continue;   // a duplicate link kept out of reach on purpose
    const label = (a.textContent || '').trim() || a.getAttribute('aria-label') || a.getAttribute('title') || (a.querySelector('img[alt]:not([alt=""])') ? 'img' : '') || (a.querySelector('svg title') ? 'svg' : '');
    const href = a.tagName === 'A' ? a.getAttribute('href') : null;
    if (a.tagName === 'A' && (href === null || href === '' || href === '#' || /^javascript:/i.test(href)) && !a.getAttribute('role') && !a.onclick && !a.hasAttribute('data-toggle') && !/(toggle|tab|menu|trigger|close|open|prev|next|arrow)/i.test(a.className + ' ' + (a.id || ''))) out.dead.push(name(a) + ' "' + label.slice(0, 30) + '" href=' + href);
    else if (!label) out.dead.push(name(a) + ' (no text/label)');
    if (w < 768) { const r = a.getBoundingClientRect(); if ((r.width < 32 || r.height < 24) && label && !a.closest('p, li, td') ) { out.small++; if (out.smallEx.length < 4) out.smallEx.push(name(a) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); } }
  }
  for (const e of document.querySelectorAll('h1, h2, h3, h4, p, li, a, span, button, td')) {
    if (!visible(e) || !e.firstChild || e.children.length) continue;
    const c = getComputedStyle(e);
    if (c.whiteSpace === 'nowrap' && /hidden|clip/.test(c.overflow) && c.textOverflow !== 'ellipsis' && e.scrollWidth > e.clientWidth + 2) { out.clipped.push(name(e) + ' "' + e.textContent.trim().slice(0, 30) + '"'); if (out.clipped.length > 5) break; }
  }
  const fam = e => getComputedStyle(e).fontFamily.split(',')[0].replace(/"/g, '').trim().toLowerCase();
  const OK = /^(dm sans|sf pro|-apple-system|inter|pi inter|system-ui|blinkmacsystemfont|segoe ui|helvetica|arial|roboto|font awesome|fontawesome|etmodules|dashicons|eicons|swiper-icons)/;
  const seen = new Set();
  for (const e of document.querySelectorAll('h1, h2, h3, p, li, a, button, td')) {
    if (!visible(e) || !(e.textContent || '').trim()) continue;
    const f = fam(e);
    if (!OK.test(f) && !seen.has(f)) { seen.add(f); out.fonts.push(f + ' (' + name(e) + ')'); }
  }
  return out;
}

const work = [];
for (const u of urls) for (const w of WIDTHS) work.push([u, w]);
let done = 0;
async function worker() {
  const ctxs = {};
  for (;;) {
    const job = work.shift(); if (!job) break;
    const [u, w] = job;
    if (!ctxs[w]) { ctxs[w] = await browser.newContext({ viewport: { width: w, height: w < 768 ? 844 : 900 }, isMobile: w < 768, hasTouch: w < 1024, deviceScaleFactor: 1 }); await ctxs[w].route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort()); }
    const p = await ctxs[w].newPage();
    const errors = [];
    p.on('pageerror', e => errors.push(e.message.slice(0, 100)));
    p.on('response', r => { if (r.status() >= 400 && r.url().startsWith(BASE)) errors.push(r.status() + ' ' + r.url().slice(BASE.length, BASE.length + 90)); });
    try {
      await p.goto(BASE + u, { waitUntil: 'domcontentloaded', timeout: 60000 });
      // scroll through so lazy images and reveal animations run
      await p.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * 0.8) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } scrollTo(0, 0); await new Promise(r => setTimeout(r, 400)); });
      await p.waitForTimeout(800);
      const r = await p.evaluate(check, w);
      r.errors = errors;
      report.push({ url: u, w, ...r });
    } catch (e) { report.push({ url: u, w, fail: e.message.slice(0, 120) }); }
    await p.close();
    if (++done % 40 === 0) console.log(done + '/' + (done + work.length));
  }
  for (const c of Object.values(ctxs)) await c.close();
}
await Promise.all([worker(), worker()]);
await browser.close();
stop();

if (arg('json')) fs.writeFileSync(arg('json'), JSON.stringify(report, null, 1));
const sum = k => report.filter(r => r[k] && (Array.isArray(r[k]) ? r[k].length : r[k])).length;
console.log('\nSUMMARY (page x width with an issue):');
for (const k of ['overflow', 'broken', 'distorted', 'dead', 'clipped', 'fonts', 'errors', 'fail']) console.log('  ' + k.padEnd(10), sum(k));
console.log('  small taps (phone, total)', report.reduce((a, r) => a + (r.small || 0), 0));
for (const r of report) {
  const lines = [];
  if (r.fail) lines.push('FAIL ' + r.fail);
  if (r.overflow) lines.push('overflow +' + r.overflow + 'px: ' + r.wide.slice(0, 4).join(' | '));
  for (const k of ['broken', 'distorted', 'dead', 'clipped', 'fonts', 'errors']) if (r[k] && r[k].length) lines.push(k + ': ' + [...new Set(r[k])].slice(0, 5).join(' | '));
  if (lines.length) console.log('\n' + r.url + ' @' + r.w + '\n  ' + lines.join('\n  '));
}
