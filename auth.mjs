// Login for the admin dashboard.
//
// Locally (no ADMIN_PASSWORD) the admin stays open, as before. When ADMIN_PASSWORD is set, /admin,
// its API and the ?__cms=1 editor pages need a session cookie, issued by POST /admin/login.
// In database mode (production) the admin refuses to run without ADMIN_PASSWORD.
//
// The cookie is "<expiry>.<hmac>", signed with SESSION_SECRET (or, if unset, a key derived from
// ADMIN_PASSWORD), so changing the password logs everyone out. Sessions last 7 days.
import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
import { clientIp } from './security.mjs';
import { banFor, banDevice, recordFail, signedIn, isTrusted } from './blocklist.mjs';

const COOKIE = 'pi_admin';
const TTL = 7 * 24 * 3600 * 1000;
// Brute-force protection for the password (blocklist.mjs): bans hit the DEVICE that failed, not
// everyone sharing its IP.
//   device     - 5 wrong passwords in 24 h, a filled-in bot trap, or more than 10 attempts in a
//                minute -> that device is banned from the whole admin for 24 h
//   IP         - 20 wrong passwords from one IP in 24 h (bots discarding cookies) -> IP banned for
//                24 h, except devices that have signed in before
//   whole site - more than 20 wrong passwords in 10 minutes from anywhere pauses logins for
//                10 minutes for devices that have never signed in. Signed-in sessions keep working.
// A login attempt without the device cookie (set when the login page is opened) is refused.
const tries = new Map();      // device or ip -> { n, reset }   attempts in the current minute
let recentFails = [];         // timestamps of wrong passwords, all IPs
let globalUntil = 0;
const MIN = 60 * 1000;
setInterval(() => { const now = Date.now(); for (const [k, v] of tries) if (v.reset < now) tries.delete(k); }, 10 * MIN).unref();

export const authEnabled = () => !!process.env.ADMIN_PASSWORD;

const key = () => process.env.SESSION_SECRET || 'pi-admin:' + process.env.ADMIN_PASSWORD;
const sign = exp => createHmac('sha256', key()).update('pi-admin|' + exp).digest('hex');
const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };

// ---- device cookie: a random id, signed so it cannot be forged; lasts a year
const DEVICE = 'pi_dev';
const signDev = id => createHmac('sha256', key()).update('pi-dev|' + id).digest('hex').slice(0, 32);
export function deviceId(req) {
  const [id, mac] = String(cookies(req)[DEVICE] || '').split('.');
  return id && mac && /^[a-f0-9]{24}$/.test(id) && same(mac, signDev(id)) ? id : null;
}
const deviceCookie = (req, id) => `${DEVICE}=${id}.${signDev(id)}; Path=/admin; Max-Age=${365 * 24 * 3600}; HttpOnly; SameSite=Lax${secure(req) ? '; Secure' : ''}`;

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
<title>Admin sign in</title><link rel="stylesheet" href="/assets/css/pi-fonts.css"><style>
:root{--bg:#f3efe8;--ink:#111114;--mute:#6b6b73;--accent:#f58634}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--bg);font:15px/1.5 var(--pi-font-body);color:var(--ink);padding:16px}
form{width:100%;max-width:360px;background:#fff;border-radius:18px;padding:32px;box-shadow:0 20px 50px -30px rgba(0,0,0,.35)}
h1{font:italic 600 22px/1.2 var(--pi-font-heading);margin:0 0 6px}p{margin:0 0 22px;color:var(--mute)}
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
  const who = clientIp(req), now = Date.now(), dev = deviceId(req);
  if (banFor(who, dev)) return blockedPage(req, res), true;
  if (req.method !== 'POST') {
    // hand out the device cookie with the form
    if (!dev) res.setHeader('Set-Cookie', deviceCookie(req, randomBytes(12).toString('hex')));
    html(200, ''); return true;
  }
  const mins = t => Math.max(1, Math.ceil((t - now) / MIN));
  if (!dev) {
    // no device cookie: a bot, or cookies are off. Counts against the IP, never against other devices.
    recordFail(who, null);
    res.setHeader('Set-Cookie', deviceCookie(req, randomBytes(12).toString('hex')));
    html(400, 'Please enable cookies, reload this page and try again.'); return true;
  }
  const trustedDevice = dev && banFor(who, dev) === null && isTrusted(dev);
  if (globalUntil > now && !trustedDevice) { html(429, `Sign-in is paused after too many wrong passwords. Try again in ${mins(globalUntil)} min.`); return true; }
  let t = tries.get(dev);
  if (!t || t.reset < now) { t = { n: 0, reset: now + MIN }; tries.set(dev, t); }
  if (++t.n > 10) { banDevice(who, dev, 'login flood (more than 10 attempts in a minute)'); return blockedPage(req, res), true; }

  const form = await readForm(req).catch(() => new URLSearchParams());
  if (form.get('username')) { banDevice(who, dev, 'bot: filled the hidden trap field'); return blockedPage(req, res), true; }
  if (!sameOrigin(req) || !same(form.get('password') || '', process.env.ADMIN_PASSWORD)) {
    const r = recordFail(who, dev);
    recentFails = recentFails.filter(x => x > now - 10 * MIN); recentFails.push(now);
    if (recentFails.length > 20) { globalUntil = now + 10 * MIN; recentFails = []; console.warn('admin login paused for 10 min: too many wrong passwords'); }
    console.warn(`admin login failed from ${who} (device ${dev})`);
    await new Promise(r => setTimeout(r, 800));
    if (r.banned) return blockedPage(req, res), true;
    html(401, r.left === Infinity ? 'Wrong password.' : `Wrong password. ${r.left} attempt${r.left === 1 ? '' : 's'} left, then this device is blocked for 24 hours.`);
    return true;
  }
  signedIn(dev);
  const exp = Date.now() + TTL;
  res.writeHead(302, {
    'Set-Cookie': `${COOKIE}=${exp}.${sign(exp)}; Path=/; Max-Age=${TTL / 1000}; HttpOnly; SameSite=Lax${secure(req) ? '; Secure' : ''}`,
    Location: '/admin/',
  }).end();
  return true;
}

// A banned device (or untrusted device on a banned IP) gets this for every admin URL.
export function blockedPage(req, res) {
  const b = banFor(clientIp(req), deviceId(req));
  const until = b ? new Date(b.until).toUTCString() : '';
  if (req.url.startsWith('/admin/api/')) {
    res.writeHead(403, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end(JSON.stringify({ error: 'this device is blocked until ' + until }));
    return;
  }
  res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
    .end(page(`Too many failed sign-ins. This device is blocked until ${until}.`).replace(/<label[\s\S]*?<button[^>]*>Sign in<\/button>/, ''));
}
export const isBlocked = req => !!banFor(clientIp(req), deviceId(req));
