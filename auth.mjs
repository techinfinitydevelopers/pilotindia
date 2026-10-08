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

const COOKIE = 'pi_admin';
const TTL = 7 * 24 * 3600 * 1000;
// Brute-force protection for the password:
//   per IP     - at most 10 login attempts a minute; 5 wrong passwords lock that IP for 15 min,
//                and every further lock doubles (30 min, 1 h ... up to 24 h)
//   whole site - more than 20 wrong passwords in 10 minutes from anywhere pauses ALL logins for
//                10 minutes (stops attacks spread over many IPs). Signed-in sessions keep working.
const fails = new Map();      // ip -> { n, locks, until, last }
const tries = new Map();      // ip -> { n, reset }   attempts in the current minute
let recentFails = [];         // timestamps of wrong passwords, all IPs
let globalUntil = 0;
const MIN = 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of fails) if (v.until < now && now - v.last > 24 * 60 * MIN) fails.delete(k);
  for (const [k, v] of tries) if (v.reset < now) tries.delete(k);
}, 10 * MIN).unref();

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
  if (globalUntil > now) { html(429, `Sign-in is paused after too many wrong passwords. Try again in ${mins(globalUntil)} min.`); return true; }
  const f = fails.get(who);
  if (f && f.until > now) { html(429, `Too many wrong passwords. Try again in ${mins(f.until)} min.`); return true; }
  let t = tries.get(who);
  if (!t || t.reset < now) { t = { n: 0, reset: now + MIN }; tries.set(who, t); }
  if (++t.n > 10) { html(429, 'Too many attempts. Wait a minute.'); return true; }

  const form = await readForm(req).catch(() => new URLSearchParams());
  if (!sameOrigin(req) || !same(form.get('password') || '', process.env.ADMIN_PASSWORD)) {
    const g = f || { n: 0, locks: 0, until: 0, last: 0 };
    g.n++; g.last = now;
    if (g.n >= 5) { g.until = now + 15 * MIN * 2 ** Math.min(g.locks, 7); g.locks++; g.n = 0; }   // 15 min .. ~24 h
    fails.set(who, g);
    recentFails = recentFails.filter(x => x > now - 10 * MIN); recentFails.push(now);
    if (recentFails.length > 20) { globalUntil = now + 10 * MIN; recentFails = []; console.warn('admin login paused for 10 min: too many wrong passwords'); }
    console.warn(`admin login failed from ${who}`);
    await new Promise(r => setTimeout(r, 800));
    html(401, g.until > now ? `Wrong password. Locked for ${mins(g.until)} min.` : `Wrong password. ${5 - g.n} attempt(s) left.`);
    return true;
  }
  fails.delete(who);
  const exp = Date.now() + TTL;
  res.writeHead(302, {
    'Set-Cookie': `${COOKIE}=${exp}.${sign(exp)}; Path=/; Max-Age=${TTL / 1000}; HttpOnly; SameSite=Lax${secure(req) ? '; Secure' : ''}`,
    Location: '/admin/',
  }).end();
  return true;
}
