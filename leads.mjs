// Catalogue downloads behind a short form (name, email, phone), and the record of who asked.
//
// Which files are catalogues: every PDF that a page links with "catalog" in the link text or in the file name. The list is
// built from the site's own pages when the server starts.
//
// The gate is enforced on the server, not only in the browser:
//   POST /api/leads       validates the form, stores the lead, and sets a signed cookie (pi_dl) good for 30 days
//   GET  <catalogue pdf>  without a valid pi_dl cookie returns the form page instead of the PDF
// A readable companion cookie (pi_dl_ok=1) only tells the page script not to show the form again.
//
// Storage: in database mode (DATABASE_URL, production) a Postgres table `leads`; locally a JSON-lines file in data/,
// which is git-ignored - visitors' personal details must never end up in the repository.
import fs from 'node:fs';
import path from 'node:path';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { dbPool } from './store.mjs';
import { clientIp } from './security.mjs';

let REPO = '', ROOT = '';
const catalogues = new Set();          // site paths, lower case: /assets/media/x.pdf
const COOKIE = 'pi_dl', FLAG = 'pi_dl_ok';
const TTL = 30 * 24 * 3600 * 1000;
const LOCAL = () => path.join(REPO, 'data', 'leads.jsonl');
const secret = () => process.env.LEAD_SECRET || process.env.SESSION_SECRET || ('pi-leads:' + (process.env.ADMIN_PASSWORD || 'local'));

export async function initLeads(repoRoot, siteRoot) {
  REPO = repoRoot; ROOT = siteRoot;
  const pool = dbPool();
  if (pool) {
    await pool.query(`create table if not exists leads (
      id bigserial primary key,
      name text not null, email text not null, phone text not null,
      file text, page text, ip text, user_agent text,
      created_at timestamptz not null default now())`);
    await pool.query('alter table leads add column if not exists country text, add column if not exists company text');
  }
  scanCatalogues();
}

// ---- which PDFs are catalogues
export const isCatalogueLink = (href, text) => /\.pdf(\?|#|$)/i.test(href) && /catalog/i.test(String(text) + ' ' + href);
function scanCatalogues() {
  catalogues.clear();
  const walk = d => {
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, f.name);
      if (f.isDirectory()) { if (f.name !== 'assets') walk(p); continue; }
      if (!f.name.endsWith('.html')) continue;
      const html = fs.readFileSync(p, 'utf8');
      for (const m of html.matchAll(/<a\b[^>]*href="([^"]+\.pdf)(?:[?#][^"]*)?"[^>]*>([\s\S]*?)<\/a>/gi)) {
        if (/^(https?:)?\/\//i.test(m[1]) || !isCatalogueLink(m[1], m[2].replace(/<[^>]+>/g, ' '))) continue;
        const abs = path.resolve(path.dirname(p), decodeURI(m[1]));
        if (abs.startsWith(ROOT)) catalogues.add('/' + path.relative(ROOT, abs).split(path.sep).join('/').toLowerCase());
      }
    }
  };
  try { walk(ROOT); } catch (e) { console.warn('leads: catalogue scan failed: ' + e.message); }
}
export const isCatalogue = urlPath => catalogues.has(String(urlPath).toLowerCase());
export const catalogueCount = () => catalogues.size;

// ---- the access cookie
const sign = exp => createHmac('sha256', secret()).update('pi-dl|' + exp).digest('hex');
function cookieOf(req, name) {
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) { try { return decodeURIComponent(part.slice(i + 1).trim()); } catch { return ''; } }
  }
  return '';
}
export function hasAccess(req) {
  const v = cookieOf(req, COOKIE);
  const [exp, mac] = v.split('.');
  if (!exp || !mac || +exp < Date.now()) return false;
  const a = Buffer.from(mac), b = Buffer.from(sign(exp));
  return a.length === b.length && timingSafeEqual(a, b);
}

// ---- the form submission
const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
function validate(b) {
  const name = clean(b.name, 80), email = clean(b.email, 120).toLowerCase(), phone = clean(b.phone, 24);
  const country = clean(b.country, 60), company = clean(b.company, 120);
  const errors = {};
  if (name.length < 2 || !/\p{L}/u.test(name)) errors.name = 'Please enter your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = 'Please enter a valid email address.';
  const digits = phone.replace(/\D/g, '');
  if (!/^[+\d][\d\s()+-]*$/.test(phone) || digits.length < 7 || digits.length > 15) errors.phone = 'Please enter a valid phone number.';
  if (!country) errors.country = 'Please choose your country.';
  if (b.consent !== true) errors.consent = 'Please agree to the Privacy Policy to continue.';
  return { name, email, phone, country, company, errors };
}
function readJson(req, limit = 8192) {
  return new Promise((resolve, reject) => {
    let n = 0; const chunks = [];
    req.on('data', c => { n += c.length; if (n > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch { reject(new Error('bad json')); } });
    req.on('error', reject);
  });
}
const json = (res, code, obj, extra = {}) => res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra }).end(JSON.stringify(obj));

export async function handleLeadPost(req, res) {
  let b;
  try { b = await readJson(req); } catch { return json(res, 400, { ok: false, error: 'Bad request.' }); }
  // honeypot: a field people never see; bots fill it
  if (clean(b.website, 200)) return json(res, 200, { ok: true });
  const v = validate(b);
  if (Object.keys(v.errors).length) return json(res, 422, { ok: false, errors: v.errors });
  const row = {
    name: v.name, email: v.email, phone: v.phone, country: v.country, company: v.company,
    file: clean(b.file, 300), page: clean(b.page, 300),
    ip: clientIp(req), user_agent: clean(req.headers['user-agent'], 300),
    created_at: new Date().toISOString(),
  };
  try { await saveLead(row); } catch (e) { console.error('leads: save failed', e); return json(res, 500, { ok: false, error: 'Could not save your details. Please try again.' }); }
  const exp = String(Date.now() + TTL);
  const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  const age = Math.floor(TTL / 1000);
  return json(res, 200, { ok: true }, {
    'Set-Cookie': [
      `${COOKIE}=${exp}.${sign(exp)}; Path=/; Max-Age=${age}; HttpOnly; SameSite=Lax${secure}`,
      `${FLAG}=1; Path=/; Max-Age=${age}; SameSite=Lax${secure}`,
    ],
  });
}

async function saveLead(row) {
  const pool = dbPool();
  if (pool) {
    await pool.query('insert into leads (name, email, phone, country, company, file, page, ip, user_agent, created_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
      [row.name, row.email, row.phone, row.country, row.company, row.file, row.page, row.ip, row.user_agent, row.created_at]);
    return;
  }
  fs.mkdirSync(path.dirname(LOCAL()), { recursive: true });
  fs.appendFileSync(LOCAL(), JSON.stringify(row) + '\n');
}

// ---- for the admin
export async function listLeads() {
  const pool = dbPool();
  if (pool) {
    const { rows } = await pool.query('select id, name, email, phone, country, company, file, page, ip, created_at from leads order by created_at desc limit 5000');
    return rows.map(r => ({ ...r, created_at: new Date(r.created_at).toISOString() }));
  }
  if (!fs.existsSync(LOCAL())) return [];
  return fs.readFileSync(LOCAL(), 'utf8').split('\n').filter(Boolean)
    .map((l, i) => { try { return { id: i + 1, ...JSON.parse(l) }; } catch { return null; } })
    .filter(Boolean).reverse();
}
export async function leadsCsv() {
  const rows = await listLeads();
  const cell = v => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) || /^[=+\-@]/.test(s) ? '"' + s.replace(/^([=+\-@])/, "'$1").replace(/"/g, '""') + '"' : s; };
  const head = ['Date', 'Time (UTC)', 'Name', 'Email', 'Phone', 'Country', 'Company', 'Catalogue', 'Page'];
  return [head.join(',')].concat(rows.map(r => {
    const d = new Date(r.created_at);
    return [d.toISOString().slice(0, 10), d.toISOString().slice(11, 19), r.name, r.email, r.phone, r.country, r.company, r.file, r.page].map(cell).join(',');
  })).join('\r\n') + '\r\n';
}

// ---- the page shown when a catalogue PDF is opened directly without access
export function gatePage(file) {
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const name = esc(decodeURIComponent(file.split('/').pop()));
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Download catalogue - Pilot India</title><meta name="robots" content="noindex">
<link rel="stylesheet" href="/theme/theme.css"><link rel="stylesheet" href="/assets/css/pi-lead.css?v=3">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f7f5f1;font-family:var(--pi-font-body,'Open Sans',system-ui,sans-serif);color:#111114}
.pi-gate-page{max-width:520px;padding:32px 20px;text-align:center}.pi-gate-page img{height:30px;margin-bottom:18px}.pi-gate-page p{color:#4d4f55}
.pi-gate-page a{color:#111114;font-weight:600}</style></head>
<body><main class="pi-gate-page"><img src="/assets/img/pilot-logo-1-1.png" alt="Pilot India"><p>Fill in a few details to download <b>${name}</b>.</p>
<p><a href="/">Back to pilotindia.com</a></p></main>
<script>window.__PI_GATE_FILE=${JSON.stringify(file)};</script><script src="/assets/js/pi-lead.js?v=3"></script></body></html>`;
}
