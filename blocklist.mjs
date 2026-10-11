// Ban list for the admin login: bans the DEVICE that failed, not everyone on its IP.
//
// Each browser gets a signed device cookie on the login page (auth.mjs). Then:
//   device  - LOGIN_MAX_FAILS (5) wrong passwords from one device within 24 h, or a bot signal
//             (hidden trap field filled, login flood) -> that device is banned for LOGIN_BAN_HOURS (24)
//   IP      - backstop for bots that throw their cookie away and start over: LOGIN_IP_MAX_FAILS (20)
//             wrong passwords from one IP within 24 h -> the IP is banned for 24 h, EXCEPT devices
//             that have signed in successfully before ("trusted"), so other people's devices on a
//             shared IP (office Wi-Fi, mobile network) are not locked out by someone else
// Banned = no login and no /admin at all, even with a valid session. The public site is never affected.
//
// The list is a file in data/ (git-ignored); in production store.mjs keeps it in Postgres, so restarts
// and redeploys do not clear it. IPs in ADMIN_ALLOW_IPS (comma separated) are never banned.
// Unban: /admin/api/blocked + /admin/api/unblock, or node tools/unblock.mjs <ip | device id | --all | --list>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data', 'admin-blocklist.json');
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const DEVICE_MAX = () => Number(process.env.LOGIN_MAX_FAILS || 5);
const IP_MAX = () => Number(process.env.LOGIN_IP_MAX_FAILS || 20);
const BAN_MS = () => Number(process.env.LOGIN_BAN_HOURS || 24) * HOUR;
const allowedIp = ip => String(process.env.ADMIN_ALLOW_IPS || '').split(',').map(s => s.trim()).filter(Boolean).includes(ip);

// keys are "d:<device id>" or "ip:<address>"
let state = null;   // { bans: { key: { until, reason, at } }, fails: { key: [ts] }, trusted: { deviceId: lastLoginTs } }

function load() {
  if (state) return state;
  try { state = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { state = {}; }
  state.bans = state.bans || {}; state.fails = state.fails || {}; state.trusted = state.trusted || {};
  return state;
}
function save() {
  const now = Date.now();
  for (const [k, b] of Object.entries(state.bans)) if (b.until <= now) delete state.bans[k];
  for (const [k, list] of Object.entries(state.fails)) { const keep = list.filter(t => t > now - DAY); if (keep.length) state.fails[k] = keep; else delete state.fails[k]; }
  for (const [d, t] of Object.entries(state.trusted)) if (t < now - 365 * DAY) delete state.trusted[d];
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(state, null, 1));
}
const active = k => { const b = load().bans[k]; return b && b.until > Date.now() ? b : null; };

// The ban that applies to this device on this IP, or null.
export function banFor(ip, device) {
  if (device) { const d = active('d:' + device); if (d) return d; }
  if (allowedIp(ip)) return null;
  const i = active('ip:' + ip);
  return i && !(device && load().trusted[device]) ? i : null;
}

function banKey(key, reason) {
  const s = load(), now = Date.now();
  s.bans[key] = { until: now + BAN_MS(), reason, at: now };
  delete s.fails[key];
  console.warn(`admin: banned ${key} for ${BAN_MS() / HOUR} h (${reason})`);
}

// Bot signal: ban the device at once and weigh heavily on its IP.
export function banDevice(ip, device, reason) {
  if (allowedIp(ip)) return;
  if (device) banKey('d:' + device, reason);
  addFails('ip:' + ip, 5);
  if (load().fails['ip:' + ip].length >= IP_MAX()) banKey('ip:' + ip, `${IP_MAX()}+ failed sign-ins from this IP`);
  save();
}

function addFails(key, n) {
  const s = load(), now = Date.now();
  const list = (s.fails[key] || []).filter(t => t > now - DAY);
  for (let i = 0; i < n; i++) list.push(now);
  s.fails[key] = list;
  return list.length;
}

// Records a wrong password. Returns { banned: true } when this one tips the device (or IP) over, else { left }.
export function recordFail(ip, device) {
  if (allowedIp(ip)) return { left: Infinity };
  const ipCount = addFails('ip:' + ip, 1);
  if (ipCount >= IP_MAX()) banKey('ip:' + ip, `${ipCount} failed sign-ins from this IP`);
  let left = Infinity;
  if (device) {
    const n = addFails('d:' + device, 1);
    if (n >= DEVICE_MAX()) banKey('d:' + device, `${n} wrong passwords`);
    left = DEVICE_MAX() - n;
  }
  save();
  return banFor(ip, device) ? { banned: true } : { left };
}

export const isTrusted = device => !!(device && load().trusted[device]);

// A successful sign-in: clear the device's failures and remember it as trusted.
export function signedIn(device) {
  const s = load();
  delete s.fails['d:' + device];
  s.trusted[device] = Date.now();
  save();
}

export function listBans() {
  const s = load(), now = Date.now();
  return Object.entries(s.bans).filter(([, b]) => b.until > now)
    .map(([k, b]) => ({ type: k.startsWith('d:') ? 'device' : 'ip', id: k.slice(k.indexOf(':') + 1), until: new Date(b.until).toISOString(), reason: b.reason, since: new Date(b.at).toISOString() }))
    .sort((a, b) => b.since.localeCompare(a.since));
}

// Lifts the ban and failures for an IP or a device id; '--all' clears everything (trusted devices stay).
export function unban(id) {
  const s = load();
  if (id === '--all') { const n = Object.keys(s.bans).length; s.bans = {}; s.fails = {}; save(); return n; }
  let n = 0;
  for (const k of ['ip:' + id, 'd:' + id]) { if (s.bans[k]) n++; delete s.bans[k]; delete s.fails[k]; }
  save();
  return n;
}
