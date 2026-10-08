// Login for the admin dashboard.
//
// Locally (no ADMIN_PASSWORD) the admin stays open, as before. When ADMIN_PASSWORD is set, /admin,
// its API and the ?__cms=1 editor pages need a session cookie, issued by POST /admin/login.
// In database mode (production) the admin refuses to run without ADMIN_PASSWORD.
//
// The cookie is "<expiry>.<hmac>", signed with SESSION_SECRET (or, if unset, a key derived from
// ADMIN_PASSWORD), so changing the password logs everyone out. Sessions last 7 days.
import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE = 'pi_admin';
const TTL = 7 * 24 * 3600 * 1000;
const fails = new Map();   // ip -> { n, until }

export const authEnabled = () => !!process.env.ADMIN_PASSWORD;

const key = () => process.env.SESSION_SECRET || 'pi-admin:' + process.env.ADMIN_PASSWORD;
const sign = exp => createHmac('sha256', key()).update('pi-admin|' + exp).digest('hex');
const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };

function cookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function isAuthed(req) {
  if (!authEnabled()) return true;
  const [exp, mac] = String(cookies(req)[COOKIE] || '').split('.');
  return !!exp && !!mac && Number(exp) > Date.now() && same(mac, sign(exp));
}

const secure = req => req.headers['x-forwarded-proto'] === 'https' || !!req.socket.encrypted;
const ip = req => String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

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

  const who = ip(req), f = fails.get(who);
  if (f && f.until > Date.now()) { html(429, 'Too many attempts. Try again in a few minutes.'); return true; }
  const form = await readForm(req).catch(() => new URLSearchParams());
  if (!sameOrigin(req) || !same(form.get('password') || '', process.env.ADMIN_PASSWORD)) {
    const n = (f ? f.n : 0) + 1;
    fails.set(who, { n, until: n >= 5 ? Date.now() + 10 * 60 * 1000 : 0 });
    await new Promise(r => setTimeout(r, 600));
    html(401, 'Wrong password.');
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
