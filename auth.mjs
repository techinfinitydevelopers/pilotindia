// Login for the admin dashboard.
//
// Locally (no ADMIN_PASSWORD) the admin stays open, as before. When ADMIN_PASSWORD is set, /admin,
// its API and the ?__cms=1 editor pages need a session cookie, issued by POST /admin/login.
// In database mode (production) the admin refuses to run without ADMIN_PASSWORD.
//
// The cookie is "<expiry>.<hmac>", signed with SESSION_SECRET (or, if unset, a key derived from
// ADMIN_PASSWORD), so changing the password logs everyone out. Sessions last 7 days.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { clientIp } from './security.mjs';
import { banOf, ban, recordFail, clearFails } from './blocklist.mjs';

const COOKIE = 'pi_admin';
const TTL = 7 * 24 * 3600 * 1000;
// Brute-force protection for the password (see blocklist.mjs for the 24 h IP ban):
//   per IP     - 5 wrong passwords in 24 h, a filled-in bot trap, or more than 10 attempts in a
//                minute -> the IP is banned from the whole admin for 24 h
//   whole site - more than 20 wrong passwords in 10 minutes from anywhere pauses ALL logins for
//                10 minutes (stops attacks spread over many IPs). Signed-in sessions keep working.
const tries = new Map();      // ip -> { n, reset }   attempts in the current minute
let recentFails = [];         // timestamps of wrong passwords, all IPs
let globalUntil = 0;
const MIN = 60 * 1000;
setInterval(() => { const now = Date.now(); for (const [k, v] of tries) if (v.reset < now) tries.delete(k); }, 10 * MIN).unref();

export const authEnabled = () => !!process.env.ADMIN_PASSWORD;

const key = () => process.env.SESSION_SECRET || 'pi-admin:' + process.env.ADMIN_PASSWORD;
const sign = exp => createHmac('sha256', key()).update('pi-admin|' + exp).digest('hex');
const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };

function cookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) { try { out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); } catch { /* malformed cookie: ignore */ } }
  }
  return out;
}

export function isAuthed(req) {
  if (!authEnabled()) return true;
  const [exp, mac] = String(cookies(req)[COOKIE] || '').split('.');
  return !!exp && !!mac && Number(exp) > Date.now() && same(mac, sign(exp));
}

const secure = req => req.headers['x-forwarded-proto'] === 'https' || !!req.socket.encrypted;

// A state-changing request must come from this site's own pages.
export function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;   // non-browser clients still need the cookie
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}

function readForm(req) {
  return new Promise((resolve, reject) => {
    let s = '';
    req.on('data', c => { s += c; if (s.length > 4096) { reject(new Error('too large')); req.destroy(); } });
    req.on('end', () => resolve(new URLSearchParams(s)));
    req.on('error', reject);
  });
}

const page = msg => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Admin sign in</title><style>
:root{--bg:#f3efe8;--ink:#111114;--mute:#6b6b73;--accent:#f58634}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--bg);font:15px/1.5 "Open Sans",system-ui,sans-serif;color:var(--ink);padding:16px}
form{width:100%;max-width:360px;background:#fff;border-radius:18px;padding:32px;box-shadow:0 20px 50px -30px rgba(0,0,0,.35)}
h1{font:700 22px Roboto,system-ui,sans-serif;margin:0 0 6px}p{margin:0 0 22px;color:var(--mute)}
label{display:block;font-weight:600;margin-bottom:6px}input{width:100%;padding:12px 14px;border:1px solid #ddd;border-radius:10px;font:inherit}
button{margin-top:18px;width:100%;padding:12px;border:0;border-radius:999px;background:var(--accent);color:#fff;font-weight:700;font-size:15px;cursor:pointer}
.err{color:#b42318;margin:14px 0 0}</style></head><body>
<form method="post" action="/admin/login"><h1>Pilot India admin</h1><p>Sign in to edit the site.</p>
<input name="username" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0">
<label for="pw">Password</label><input id="pw" name="password" type="password" autocomplete="current-password" autofocus required>
<button type="submit">Sign in</button>${msg ? `<p class="err">${msg}</p>` : ''}</form></body></html>`;

// Handles /admin/login and /admin/logout. Returns true when it answered the request.
export async function handleAuth(req, res) {
  const p = req.url.split('?')[0];
  if (p === '/admin/logout') {
    res.writeHead(302, { 'Set-Cookie': `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`, Location: '/admin/login' }).end();
    return true;
  }
  if (p !== '/admin/login') return false;
  const html = (code, msg) => res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }).end(page(msg));
  if (req.method !== 'POST') { html(200, ''); return true; }

  const who = clientIp(req), now = Date.now();
  const mins = t => Math.max(1, Math.ceil((t - now) / MIN));
  if (banOf(who)) return blockedPage(req, res), true;
  if (globalUntil > now) { html(429, `Sign-in is paused after too many wrong passwords. Try again in ${mins(globalUntil)} min.`); return true; }
  let t = tries.get(who);
  if (!t || t.reset < now) { t = { n: 0, reset: now + MIN }; tries.set(who, t); }
  if (++t.n > 10) { ban(who, 'login flood (more than 10 attempts in a minute)'); return blockedPage(req, res), true; }

  const form = await readForm(req).catch(() => new URLSearchParams());
  if (form.get('username')) { ban(who, 'bot: filled the hidden trap field'); return blockedPage(req, res), true; }
  if (!sameOrigin(req) || !same(form.get('password') || '', process.env.ADMIN_PASSWORD)) {
    const r = recordFail(who);
    recentFails = recentFails.filter(x => x > now - 10 * MIN); recentFails.push(now);
    if (recentFails.length > 20) { globalUntil = now + 10 * MIN; recentFails = []; console.warn('admin login paused for 10 min: too many wrong passwords'); }
    console.warn(`admin login failed from ${who}`);
    await new Promise(r => setTimeout(r, 800));
    if (r.ban) return blockedPage(req, res), true;
    html(401, r.left === Infinity ? 'Wrong password.' : `Wrong password. ${r.left} attempt${r.left === 1 ? '' : 's'} left, then this address is blocked for 24 hours.`);
    return true;
  }
  clearFails(who);
  const exp = Date.now() + TTL;
  res.writeHead(302, {
    'Set-Cookie': `${COOKIE}=${exp}.${sign(exp)}; Path=/; Max-Age=${TTL / 1000}; HttpOnly; SameSite=Lax${secure(req) ? '; Secure' : ''}`,
    Location: '/admin/',
  }).end();
  return true;
}

// A banned IP gets this for every admin URL (login, dashboard, API, editor pages).
export function blockedPage(req, res) {
  const b = banOf(clientIp(req));
  const until = b ? new Date(b.until).toUTCString() : '';
  if (req.url.startsWith('/admin/api/')) {
    res.writeHead(403, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end(JSON.stringify({ error: 'this address is blocked until ' + until }));
    return;
  }
  res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
    .end(page(`Too many failed sign-ins. This address is blocked until ${until}.`).replace(/<label[\s\S]*?<button[^>]*>Sign in<\/button>/, ''));
}
export const isBlocked = req => !!banOf(clientIp(req));
