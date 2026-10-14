// Visitor tracker for the admin ("User tracker"): how many people visit and where they came from.
//
// Counted on the server when a page (not an asset) is served, so it works without any script on the page:
//   visitor   a random id in a first-party cookie (pi_vid, 2 years). No IP address or name is stored.
//   session   a visit; a new one starts after 30 minutes without a page view (cookie pi_sid)
//   source    worked out once per session, from the landing page's address and the Referer header:
//             ad click ids (gclid / fbclid ...), utm_source / utm_medium / utm_campaign, else the referring site, else Direct.
// Bots, link previews, prefetches and the admin are not counted.
//
// Storage: Postgres table `visits` in database mode (production), else data/visits.jsonl (git-ignored).
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { dbPool } from './store.mjs';

let REPO = '';
const LOCAL = () => path.join(REPO, 'data', 'visits.jsonl');
const VID = 'pi_vid', SID = 'pi_sid';
const BOT = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|whatsapp|telegram|skype|discord|slack|embedly|curl|wget|python|java\/|go-http|node-fetch|axios|okhttp|monitor|uptime|pingdom|semrush|ahrefs|bingpreview/i;

export async function initVisits(repoRoot) {
  REPO = repoRoot;
  const pool = dbPool();
  if (pool) {
    await pool.query(`create table if not exists visits (
      id bigserial primary key,
      at timestamptz not null default now(),
      vid text, sid text, landing boolean,
      path text, source text, medium text, campaign text, referrer text, device text)`);
    await pool.query('create index if not exists visits_at on visits (at)');
  }
}

function cookieOf(req, name) {
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return '';
}
const okId = v => /^[a-f0-9]{16,32}$/.test(v);
const clip = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);

const SEARCH = /(^|\.)(bing\.com|yahoo\.|duckduckgo\.com|ecosia\.org|yandex\.|baidu\.com|search\.brave\.com)/i;
const META = /(^|\.)(facebook\.com|fb\.com|fb\.me|instagram\.com|messenger\.com|threads\.net)$/i;
const AI = /(^|\.)(chatgpt\.com|openai\.com|perplexity\.ai|gemini\.google\.com|copilot\.microsoft\.com|claude\.ai)$/i;

// Where a session came from. Returns { source, medium, campaign, referrer }.
export function classify(url, referer, ownHost) {
  let q;
  try { q = new URL(url, 'http://x').searchParams; } catch { q = new URLSearchParams(); }
  let host = '';
  try { host = referer ? new URL(referer).hostname.toLowerCase().replace(/^www\./, '') : ''; } catch { host = ''; }
  if (host && ownHost && host === String(ownHost).toLowerCase().replace(/^www\./, '').replace(/:\d+$/, '')) host = '';   // our own pages
  const us = clip(q.get('utm_source'), 60).toLowerCase(), um = clip(q.get('utm_medium'), 60).toLowerCase(), uc = clip(q.get('utm_campaign'), 120);
  const paid = /cpc|ppc|paid|ads?$|display|sponsored|cpm/.test(um);
  const r = (source, medium) => ({ source, medium: medium || um || '', campaign: uc, referrer: host });
  if (q.get('gclid') || q.get('gbraid') || q.get('wbraid') || (/^google/.test(us) && paid)) return r('Google Ads', um || 'cpc');
  if (/^(facebook|fb|instagram|ig|meta)/.test(us)) return r(paid ? 'Meta Ads' : 'Meta (Facebook / Instagram)', um);
  if (q.get('fbclid')) return r('Meta (Facebook / Instagram)', um || 'social');
  if (q.get('msclkid')) return r('Microsoft Ads', um || 'cpc');
  if (us) return r('Campaign: ' + us, um);
  if (!host) return r('Direct', '');
  if (/(^|\.)google\.[a-z.]+$/.test(host) && !/^(mail|docs|drive)\./.test(host)) return r('Google Search', 'organic');
  if (SEARCH.test(host)) return r('Other search engines', 'organic');
  if (META.test(host) || /^l\.facebook\.com$|^lm\.facebook\.com$/.test(host)) return r('Meta (Facebook / Instagram)', 'social');
  if (/(^|\.)linkedin\.com$|^lnkd\.in$/.test(host)) return r('LinkedIn', 'social');
  if (/(^|\.)youtube\.com$|^youtu\.be$/.test(host)) return r('YouTube', 'social');
  if (/(^|\.)(twitter\.com|x\.com)$|^t\.co$/.test(host)) return r('X (Twitter)', 'social');
  if (/(^|\.)whatsapp\.com$|^wa\.me$/.test(host)) return r('WhatsApp', 'social');
  if (AI.test(host)) return r('AI assistants', 'referral');
  return r('Other websites', 'referral');
}

const deviceOf = ua => /ipad|tablet|(android(?!.*mobile))/i.test(ua) ? 'Tablet' : /mobi|iphone|android/i.test(ua) ? 'Mobile' : 'Desktop';

// Records one page view and returns the cookies to send with the page (or [] when it is not counted).
export function trackVisit(req, pagePath) {
  try {
    if (req.method !== 'GET') return [];
    const ua = String(req.headers['user-agent'] || '');
    if (!ua || BOT.test(ua)) return [];
    const purpose = String(req.headers['sec-purpose'] || req.headers.purpose || req.headers['x-moz'] || '');
    if (/prefetch|prerender/i.test(purpose)) return [];
    if (/[?&]__cms=1/.test(req.url)) return [];

    let vid = cookieOf(req, VID), sid = cookieOf(req, SID);
    const newVisitor = !okId(vid), landing = !okId(sid);
    if (newVisitor) vid = randomBytes(12).toString('hex');
    if (landing) sid = randomBytes(12).toString('hex');
    const src = landing ? classify(req.url, req.headers.referer || req.headers.referrer, req.headers['x-forwarded-host'] || req.headers.host) : null;
    const row = {
      at: new Date().toISOString(), vid, sid, landing,
      path: clip(pagePath, 300), source: src ? src.source : null, medium: src ? src.medium : null,
      campaign: src ? src.campaign : null, referrer: src ? src.referrer : null, device: deviceOf(ua),
    };
    save(row).catch(e => console.warn('visits: save failed: ' + e.message));
    const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
    return [
      `${VID}=${vid}; Path=/; Max-Age=${2 * 365 * 24 * 3600}; HttpOnly; SameSite=Lax${secure}`,
      `${SID}=${sid}; Path=/; Max-Age=1800; HttpOnly; SameSite=Lax${secure}`,
    ];
  } catch (e) { console.warn('visits: ' + e.message); return []; }
}

async function save(row) {
  const pool = dbPool();
  if (pool) {
    await pool.query('insert into visits (at, vid, sid, landing, path, source, medium, campaign, referrer, device) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
      [row.at, row.vid, row.sid, row.landing, row.path, row.source, row.medium, row.campaign, row.referrer, row.device]);
  } else {
    fs.mkdirSync(path.dirname(LOCAL()), { recursive: true });
    await fs.promises.appendFile(LOCAL(), JSON.stringify(row) + '\n');
  }
}

async function rowsSince(since) {
  const pool = dbPool();
  if (pool) {
    const r = await pool.query('select at, vid, sid, landing, path, source, medium, campaign, referrer, device from visits where at >= $1 order by at limit 500000', [since.toISOString()]);
    return r.rows.map(x => ({ ...x, at: new Date(x.at).toISOString() }));
  }
  if (!fs.existsSync(LOCAL())) return [];
  const t = since.toISOString();
  return fs.readFileSync(LOCAL(), 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(r => r && r.at >= t);
}

// Totals and breakdowns for the last `days` days (dates in India time).
export async function visitStats(days) {
  days = Math.min(365, Math.max(1, Math.round(+days || 30)));
  const IST = 330 * 60000;
  const dayOf = iso => new Date(Date.parse(iso) + IST).toISOString().slice(0, 10);
  const todayKey = dayOf(new Date().toISOString());
  const start = new Date(Date.parse(todayKey + 'T00:00:00Z') - IST - (days - 1) * 86400000);
  const rows = await rowsSince(start);

  const perDay = new Map();
  for (let i = 0; i < days; i++) perDay.set(dayOf(new Date(start.getTime() + i * 86400000 + IST / 2).toISOString()), { date: '', views: 0, visitors: new Set(), sessions: 0 });
  const visitors = new Set(), sessions = new Set(), todayV = new Set(), active = new Set();
  const liveFrom = Date.now() - 5 * 60000;
  let lastAt = null;
  let todayViews = 0, todaySessions = 0;
  const bySource = new Map(), byCampaign = new Map(), byRef = new Map(), byPage = new Map(), byLanding = new Map(), byDevice = new Map();
  const bump = (m, k, f) => { if (!m.has(k)) m.set(k, f()); return m.get(k); };
  for (const r of rows) {
    const d = dayOf(r.at);
    const pd = perDay.get(d); if (pd) { pd.views++; pd.visitors.add(r.vid); if (r.landing) pd.sessions++; }
    visitors.add(r.vid); sessions.add(r.sid);
    if (Date.parse(r.at) >= liveFrom) active.add(r.vid);
    if (!lastAt || r.at > lastAt) lastAt = r.at;
    if (d === todayKey) { todayViews++; todayV.add(r.vid); if (r.landing) todaySessions++; }
    bump(byPage, r.path || '/', () => ({ n: 0 })).n++;
    if (r.landing) {
      const s = bump(bySource, r.source || 'Direct', () => ({ sessions: 0, visitors: new Set() })); s.sessions++; s.visitors.add(r.vid);
      if (r.campaign || /^Campaign:|Ads$/.test(r.source || '')) { const k = [r.source, r.medium || '', r.campaign || ''].join('\u0001'); bump(byCampaign, k, () => ({ n: 0 })).n++; }
      if (r.referrer) bump(byRef, r.referrer, () => ({ n: 0 })).n++;
      bump(byLanding, r.path || '/', () => ({ n: 0 })).n++;
      bump(byDevice, r.device || 'Desktop', () => ({ n: 0 })).n++;
    }
  }
  const top = (m, f, n = 12) => [...m].map(f).sort((a, b) => b.n - a.n).slice(0, n);
  return {
    days, from: dayOf(start.toISOString()), to: todayKey, storage: dbPool() ? 'postgres' : 'local',
    totals: { visitors: visitors.size, sessions: [...sessions].length, views: rows.length },
    today: { visitors: todayV.size, sessions: todaySessions, views: todayViews },
    live: { active: active.size, lastAt, now: new Date().toISOString() },   // people with a page view in the last 5 minutes
    perDay: [...perDay].map(([date, v]) => ({ date, views: v.views, visitors: v.visitors.size, sessions: v.sessions })),
    sources: [...bySource].map(([source, v]) => ({ source, sessions: v.sessions, visitors: v.visitors.size })).sort((a, b) => b.sessions - a.sessions),
    campaigns: top(byCampaign, ([k, v]) => { const [source, medium, campaign] = k.split('\u0001'); return { source, medium, campaign, n: v.n }; }, 20),
    referrers: top(byRef, ([host, v]) => ({ host, n: v.n })),
    pages: top(byPage, ([p, v]) => ({ path: p, n: v.n }), 15),
    landings: top(byLanding, ([p, v]) => ({ path: p, n: v.n }), 10),
    devices: top(byDevice, ([d, v]) => ({ device: d, n: v.n }), 3),
  };
}
