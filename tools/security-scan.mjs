// Static malware / injection scan of the site files.
//
// The clone was mirrored from WordPress sites, one of which (pilotsprayguns.com) is now serving casino
// spam, so injected content is a real risk. This looks for the usual signs of a hacked WordPress page:
//   - scripts, iframes, forms, embeds and redirects that load from domains not on the allowlist
//   - obfuscated JavaScript (eval/atob, long fromCharCode or \x runs, packed "p,a,c,k,e,d")
//   - SEO spam words (casino, betting, pharma, adult, loans) in visible text or link targets
//   - links hidden off-screen or with display:none (classic link injection)
//   - crypto miners, meta-refresh / JS redirects to other domains
//   - server-side or executable files that should never be in a static site
//
//   node tools/security-scan.mjs [--json=report.json]
// Exit code 1 when anything at "high" severity is found.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(REPO, 'pilotindia-clone');
const JSON_OUT = (process.argv.find(a => a.startsWith('--json=')) || '').slice(7);

import { trusted } from './trusted-domains.mjs';

const SPAM = /\b(casino|kasyno|slots?\s+online|online\s+slots?|jackpot|betting|sportsbook|bookmaker|1xbet|wazamba|mostbet|pin-?up\s+casino|poker\s+online|viagra|cialis|levitra|kamagra|pharmacy\s+online|payday\s+loans?|porn|xxx|escort\s+service|replica\s+watches|essay\s+writing\s+service)\b/i;
// A bare "casino" is fine in page text (currency counters are sold to casinos), so text needs a stronger signal.
const SPAM_TEXT = /\b(online\s+casino|casino\s+online|casino\s+bonus|kasyn\w*|pokies|free\s+spins|slot\s+releases|bankroll\s+management|gaming\s+platform|telegram\s+(channels?|groups?)|mms\s+video|sportsbook|1xbet|wazamba|gamdom|mostbet|viagra|cialis|payday\s+loans?|porn|escort\s+service)\b/i;
const OBFUSCATION = [
  [/eval\s*\(\s*(atob|unescape|decodeURIComponent|String\.fromCharCode|function\s*\(\s*p\s*,\s*a\s*,\s*c\s*,\s*k\s*,\s*e)/i, 'eval of decoded/packed code'],
  [/String\.fromCharCode\(\s*(\d+\s*,\s*){40,}/, 'long String.fromCharCode run'],
  [/(\\x[0-9a-f]{2}){60,}/i, 'long \\x escape run'],
  [/document\.write\s*\(\s*(unescape|atob)\s*\(/i, 'document.write of decoded content'],
  [/new\s+Function\s*\(\s*atob\s*\(/i, 'new Function(atob(...))'],
  [/\b(coinhive|cryptonight|coin-hive|webmine|cryptoloot|minero\.cc|deepminer)\b/i, 'crypto miner'],
];
const BAD_FILE = /\.(php\d?|phtml|asp|aspx|jsp|cgi|pl|py|sh|bat|cmd|ps1|exe|dll|scr|jar|htaccess|user\.ini)$/i;

const findings = [];
const add = (severity, file, kind, detail) => findings.push({ severity, file, kind, detail: String(detail).slice(0, 200) });

const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(path.join(SITE, d), { withFileTypes: true })) {
    const rel = d ? d + '/' + f.name : f.name;
    if (f.isDirectory()) walk(rel); else files.push(rel);
  }
})('');

const hostOf = u => { try { return new URL(u, 'https://local.invalid/').hostname; } catch { return ''; } };
const external = u => /^(https?:)?\/\//i.test(u.trim());
const domains = new Map();   // host -> count of code/frame references

function visibleText(html) {
  return html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ');
}

for (const rel of files) {
  if (BAD_FILE.test(rel)) add('high', rel, 'server-side/executable file', rel);
  if (/\.(bak|old|orig|swp|sql|zip|tar|gz|env)$/i.test(rel) || /(^|\/)\.[^/]+$/.test(rel)) add('medium', rel, 'leftover/backup file served publicly', rel);
  if (!/\.(html?|js|css|svg|json|xml)$/i.test(rel)) continue;
  const src = fs.readFileSync(path.join(SITE, rel), 'utf8');

  for (const [re, what] of OBFUSCATION) { const m = src.match(re); if (m) add('high', rel, what, src.slice(Math.max(0, m.index - 40), m.index + 120)); }

  if (/\.svg$/i.test(rel) && /<script|\son[a-z]+\s*=|javascript:/i.test(src)) add('high', rel, 'script inside SVG', src.match(/<script|\son[a-z]+\s*=|javascript:/i)[0]);
  if (!/\.html?$/i.test(rel)) continue;

  // code and frames from other domains
  for (const m of src.matchAll(/<(script|iframe|embed|object|frame)\b[^>]*?\s(?:src|data)\s*=\s*["']([^"']+)["']/gi)) {
    if (!external(m[2])) continue;
    const h = hostOf(m[2]); domains.set(h, (domains.get(h) || 0) + 1);
    if (!trusted(h)) add('high', rel, `<${m[1].toLowerCase()}> from untrusted domain`, m[2]);
  }
  for (const m of src.matchAll(/<form\b[^>]*\saction\s*=\s*["']([^"']+)["']/gi)) {
    if (external(m[1]) && !trusted(hostOf(m[1]))) add('high', rel, 'form posts to untrusted domain', m[1]);
  }
  // redirects
  for (const m of src.matchAll(/<meta[^>]+http-equiv\s*=\s*["']?refresh["']?[^>]*content\s*=\s*["'][^"']*url\s*=\s*([^"'>\s]+)/gi)) {
    if (external(m[1]) && !trusted(hostOf(m[1]))) add('high', rel, 'meta refresh to other domain', m[1]);
  }
  for (const m of src.matchAll(/(?:window\.|document\.|top\.)?location(?:\.href)?\s*=\s*["'](https?:\/\/[^"']+)["']/gi)) {
    if (!trusted(hostOf(m[1]))) add('high', rel, 'script redirect to other domain', m[1]);
  }
  // spam in what visitors see, and in link targets
  const text = visibleText(src);
  const sm = text.match(SPAM_TEXT);
  if (sm) add('high', rel, 'spam words in page text', text.slice(Math.max(0, sm.index - 60), sm.index + 80));
  for (const m of src.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]{0,200}?)<\/a>/gi)) {
    if (SPAM.test(m[1]) || SPAM.test(m[2].replace(/<[^>]+>/g, ''))) add('high', rel, 'spam link', m[1] + ' | ' + m[2].replace(/<[^>]+>/g, '').trim());
  }
  // links hidden from visitors but visible to search engines
  for (const m of src.matchAll(/<(div|p|span)\b[^>]*style\s*=\s*["'][^"']*(display\s*:\s*none|left\s*:\s*-\d{3,}px|text-indent\s*:\s*-\d{3,}px|font-size\s*:\s*0(px)?\b|height\s*:\s*0(px)?\s*;\s*overflow\s*:\s*hidden)[^"']*["'][^>]*>(?<inner>[\s\S]{0,600}?)<\/\1>/gi)) {
    const links = [...m.groups.inner.matchAll(/href\s*=\s*["'](https?:\/\/[^"']+)["']/gi)].map(x => x[1]).filter(u => !trusted(hostOf(u)));
    if (links.length) add('high', rel, 'hidden external links', links.slice(0, 3).join(' '));
  }
}

// ---- report
const order = { high: 0, medium: 1, low: 2 };
findings.sort((a, b) => order[a.severity] - order[b.severity] || a.kind.localeCompare(b.kind) || a.file.localeCompare(b.file));
const byKind = new Map();
for (const f of findings) { const k = f.severity + ' | ' + f.kind; byKind.set(k, (byKind.get(k) || 0) + 1); }
console.log(`scanned ${files.length} files in pilotindia-clone/`);
console.log(`external code/frame domains: ${[...domains].sort((a, b) => b[1] - a[1]).map(([h, n]) => `${h}(${n})`).join(', ') || 'none'}`);
if (!findings.length) console.log('no findings');
for (const [k, n] of byKind) console.log(`  ${String(n).padStart(4)}  ${k}`);
for (const f of findings.slice(0, 60)) console.log(`  [${f.severity}] ${f.kind}: ${f.file}\n         ${f.detail.replace(/\s+/g, ' ')}`);
if (findings.length > 60) console.log(`  ... ${findings.length - 60} more (use --json=)`);
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ domains: Object.fromEntries(domains), findings }, null, 1));
process.exitCode = findings.some(f => f.severity === 'high') ? 1 : 0;
