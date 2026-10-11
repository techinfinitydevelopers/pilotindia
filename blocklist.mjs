// IP blacklist for the admin login.
//
//   LOGIN_MAX_FAILS (5) wrong passwords from one IP within 24 h  -> that IP is banned
//   a bot signal (hidden trap field filled, or a login flood)      -> banned at once
//   banned = no login and no /admin at all for LOGIN_BAN_HOURS (24), even with a valid session
//
// The list is a file in data/ (git-ignored). In production store.mjs keeps it in Postgres, so a
// restart or redeploy does not clear it. IPs in ADMIN_ALLOW_IPS (comma separated) are never banned.
//
// Unban: from the admin (another device) via /admin/api/blocked, or
//   DATABASE_URL=... node tools/unblock.mjs <ip> | --all | --list
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data', 'admin-blocklist.json');
const HOUR = 3600 * 1000;
const MAX_FAILS = () => Number(process.env.LOGIN_MAX_FAILS || 5);
const BAN_MS = () => Number(process.env.LOGIN_BAN_HOURS || 24) * HOUR;
const allowed = ip => String(process.env.ADMIN_ALLOW_IPS || '').split(',').map(s => s.trim()).filter(Boolean).includes(ip);

let state = null;   // { bans: { ip: { until, reason, at } }, fails: { ip: [timestamps] } }

function load() {
  if (state) return state;
  try { state = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { state = {}; }
  state.bans = state.bans || {}; state.fails = state.fails || {};
  return state;
}
function save() {
  const now = Date.now();
  for (const [ip, b] of Object.entries(state.bans)) if (b.until <= now) delete state.bans[ip];
  for (const [ip, list] of Object.entries(state.fails)) { const keep = list.filter(t => t > now - 24 * HOUR); if (keep.length) state.fails[ip] = keep; else delete state.fails[ip]; }
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(state, null, 1));
}

// The active ban for this IP, or null.
export function banOf(ip) {
  const b = load().bans[ip];
  return b && b.until > Date.now() ? b : null;
}

export function ban(ip, reason) {
  if (!ip || allowed(ip)) return null;
  const s = load(), now = Date.now();
  s.bans[ip] = { until: now + BAN_MS(), reason, at: now };
  delete s.fails[ip];
  save();
  console.warn(`admin: banned ${ip} for ${BAN_MS() / HOUR} h (${reason})`);
  return s.bans[ip];
}

// Records a wrong password; returns { ban } when this one tips the IP over, else { left }.
export function recordFail(ip) {
  if (allowed(ip)) return { left: Infinity };
  const s = load(), now = Date.now();
  const list = (s.fails[ip] || []).filter(t => t > now - 24 * HOUR);
  list.push(now); s.fails[ip] = list;
  if (list.length >= MAX_FAILS()) return { ban: ban(ip, `${list.length} wrong passwords`) };
  save();
  return { left: MAX_FAILS() - list.length };
}

export function clearFails(ip) {
  const s = load();
  if (s.fails[ip]) { delete s.fails[ip]; save(); }
}

export function listBans() {
  const s = load(), now = Date.now();
  return Object.entries(s.bans).filter(([, b]) => b.until > now)
    .map(([ip, b]) => ({ ip, until: new Date(b.until).toISOString(), reason: b.reason, since: new Date(b.at).toISOString() }))
    .sort((a, b) => b.since.localeCompare(a.since));
}

export function unban(ip) {
  const s = load();
  if (ip === '--all') { const n = Object.keys(s.bans).length; s.bans = {}; s.fails = {}; save(); return n; }
  const had = !!s.bans[ip] || !!s.fails[ip];
  delete s.bans[ip]; delete s.fails[ip]; save();
  return had ? 1 : 0;
}
