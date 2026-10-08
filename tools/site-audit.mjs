// Runtime audit of the whole site in a real browser (Playwright + the installed Chrome).
//
// Starts its own copy of serve.mjs, opens every .html page under pilotindia-clone/, scrolls it so lazy
// content loads, and records what the page actually does - which static scans cannot see:
//   - every request to another domain (requests are recorded, then blocked, so nothing third-party runs)
//   - redirects of the page to another site, pop-up windows, alert/confirm dialogs, automatic downloads
//   - JavaScript errors, and same-site files that fail to load (404s)
//   - links on the page that point to an internal page that does not exist
//
//   node tools/site-audit.mjs [--only=spray-guns/index.html,...] [--json=report.json] [--concurrency=6]
// Exit code 1 when anything suspicious (untrusted domain, redirect, pop-up, dialog, download) is found.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { trusted } from './trusted-domains.mjs';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(REPO, 'pilotindia-clone');
const arg = k => (process.argv.find(a => a.startsWith('--' + k + '=')) || '').slice(k.length + 3);
const PORT = 8097;
const BASE = `http://127.0.0.1:${PORT}`;
const CONCURRENCY = Number(arg('concurrency') || 6);

// ---- pages
const pages = [];
(function walk(d) {
  for (const f of fs.readdirSync(path.join(SITE, d), { withFileTypes: true })) {
    const rel = d ? d + '/' + f.name : f.name;
    if (f.isDirectory()) { if (rel !== 'assets') walk(rel); } else if (f.name.endsWith('.html')) pages.push(rel);
  }
})('');
const only = arg('only') ? arg('only').split(',') : null;
const todo = only ? pages.filter(p => only.includes(p)) : pages;
const exists = new Set(pages);

// ---- server (no DATABASE_URL: plain files, admin open, but the audit never visits /admin)
const env = { ...process.env, PORT: String(PORT) }; delete env.DATABASE_URL; delete env.ADMIN_PASSWORD;
const server = spawn(process.execPath, [path.join(REPO, 'serve.mjs')], { cwd: REPO, env, stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((ok, fail) => {
  const t = setTimeout(() => fail(new Error('server did not start')), 30000);
  server.stdout.on('data', d => { if (String(d).includes(String(PORT))) { clearTimeout(t); ok(); } });
  server.on('exit', c => fail(new Error('server exited ' + c)));
});

const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
  .find(p => fs.existsSync(p));
const browser = await chromium.launch({ executablePath: CHROME, headless: true });

const report = { pages: todo.length, domains: {}, suspicious: [], errors: [], broken: [], deadLinks: [] };
const note = (list, page, what) => report[list].push({ page, ...what });

async function audit(rel) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, acceptDownloads: false });
  const page = await ctx.newPage();
  const url = BASE + '/' + rel.replace(/(^|\/)index\.html$/, '$1');

  await ctx.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.hostname === '127.0.0.1') return route.continue();
    const d = report.domains[u.hostname] || (report.domains[u.hostname] = { requests: 0, pages: new Set(), trusted: trusted(u.hostname) });
    d.requests++; d.pages.add(rel);
    if (!trusted(u.hostname)) note('suspicious', rel, { kind: 'request to untrusted domain', detail: u.href.slice(0, 200), type: route.request().resourceType() });
    return route.abort();
  });
  ctx.on('page', p => { note('suspicious', rel, { kind: 'pop-up window opened', detail: p.url() }); p.close().catch(() => {}); });
  page.on('dialog', d => { note('suspicious', rel, { kind: 'dialog ' + d.type(), detail: d.message().slice(0, 200) }); d.dismiss().catch(() => {}); });
  page.on('download', d => note('suspicious', rel, { kind: 'automatic download', detail: d.url() }));
  page.on('pageerror', e => note('errors', rel, { kind: 'javascript error', detail: String(e.message).slice(0, 200) }));
  page.on('response', r => {
    const u = new URL(r.url());
    if (u.hostname === '127.0.0.1' && r.status() >= 400) note('broken', rel, { kind: 'HTTP ' + r.status(), detail: u.pathname });
  });
  page.on('framenavigated', f => {
    if (f !== page.mainFrame()) return;
    const h = new URL(f.url()).hostname;
    if (h && h !== '127.0.0.1') note('suspicious', rel, { kind: 'page redirected to another site', detail: f.url() });
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForLoadState('load', { timeout: 15000 }).catch(() => {});   // heavy image pages: carry on
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(800);
    // links on the page that point to a page of this site that does not exist
    const links = await page.$$eval('a[href]', as => as.map(a => a.href));
    for (const href of new Set(links)) {
      const u = new URL(href);
      if (u.hostname !== '127.0.0.1' || !/\.html$|\/$/.test(u.pathname)) continue;
      let p = decodeURIComponent(u.pathname).replace(/^\//, ''); if (p === '' || p.endsWith('/')) p += 'index.html';
      if (!exists.has(p)) note('deadLinks', rel, { kind: 'link to missing page', detail: u.pathname });
    }
  } catch (e) {
    note('errors', rel, { kind: 'page failed to load', detail: String(e.message).split('\n')[0] });
  }
  await ctx.close();
}

const started = Date.now();
let next = 0, done = 0;
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (next < todo.length) {
    const rel = todo[next++];
    await audit(rel);
    if (++done % 25 === 0 || done === todo.length) console.log(`  ${done}/${todo.length} pages`);
  }
}));
await browser.close();
server.kill();

// ---- report
for (const d of Object.values(report.domains)) d.pages = d.pages.size;
const group = list => { const m = new Map(); for (const f of list) { const k = f.kind + ' | ' + f.detail; const g = m.get(k) || { ...f, pages: [] }; g.pages.push(f.page); m.set(k, g); } return [...m.values()].sort((a, b) => b.pages.length - a.pages.length); };
console.log(`\naudited ${todo.length} pages in ${Math.round((Date.now() - started) / 1000)}s`);
console.log('other domains the pages contact:');
for (const [h, d] of Object.entries(report.domains).sort((a, b) => b[1].requests - a[1].requests)) console.log(`  ${d.trusted ? 'ok       ' : 'UNTRUSTED'} ${h}  (${d.requests} requests on ${d.pages} pages)`);
for (const [title, list] of [['SUSPICIOUS', report.suspicious], ['javascript errors / load failures', report.errors], ['same-site files that failed', report.broken], ['links to missing pages', report.deadLinks]]) {
  const g = group(list);
  console.log(`\n${title}: ${list.length}${g.length ? ` (${g.length} distinct)` : ''}`);
  for (const x of g.slice(0, 15)) console.log(`  ${x.kind}: ${x.detail}   [${x.pages.length} page(s), e.g. ${x.pages[0]}]`);
}
if (arg('json')) fs.writeFileSync(arg('json'), JSON.stringify(report, null, 1));
process.exitCode = report.suspicious.length ? 1 : 0;
