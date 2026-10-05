// Strict reference check: every local file reference in every page and stylesheet must
// resolve to a file that exists. Only things that look like real paths are counted (a known
// extension, or a trailing slash), so JavaScript fragments such as `url(entry.target)` do not
// raise false alarms the way tools/check.mjs does.
//
//   node tools/verify-refs.mjs [siteDir] [--json=out.json]
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const CLONE = args.find(a => !a.startsWith('--')) || path.join(process.cwd(), 'pilotindia-clone');
const JSON_OUT = (args.find(a => a.startsWith('--json=')) || '').slice(7);

const EXT = /\.(html|css|js|json|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf|eot|pdf|mp4|webm|mp3|xml|txt)$/i;
const SKIP = /^(https?:|data:|mailto:|tel:|javascript:|#|\/\/|\/|\{|\[|<)/i;

const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(path.join(CLONE, d || '.'), { withFileTypes: true })) {
    const rel = d ? d + '/' + f.name : f.name;
    if (f.isDirectory()) walk(rel); else files.push(rel);
  }
})('');
const exists = new Set(files);
const dirsWithIndex = new Set(files.filter(f => f.endsWith('/index.html')).map(f => f.slice(0, -'/index.html'.length)));
dirsWithIndex.add('');

const resolves = (fromRel, ref) => {
  let bare = ref.split('#')[0].split('?')[0].trim();
  if (!bare) return true;
  let dec; try { dec = decodeURIComponent(bare); } catch { return true; }
  const isDir = dec.endsWith('/') || dec === '.' || dec === '..';
  const target = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), dec)).replace(/\/$/, '');
  if (target.startsWith('..')) return true;                // leaves the clone: not ours to judge
  if (isDir || target === '.') return dirsWithIndex.has(target === '.' ? '' : target);
  return exists.has(target);
};

const missing = new Map();           // "ref" -> {count, example}
let checked = 0;
function note(fromRel, ref) {
  ref = ref.trim();
  if (!ref || SKIP.test(ref)) return;
  const bare = ref.split('#')[0].split('?')[0];
  if (!(EXT.test(bare) || bare.endsWith('/'))) return;
  checked++;
  if (!resolves(fromRel, ref)) {
    const key = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), (() => { try { return decodeURIComponent(bare); } catch { return bare; } })()));
    const m = missing.get(key) || { count: 0, example: fromRel };
    m.count++; missing.set(key, m);
  }
}

for (const rel of files) {
  if (rel.endsWith('.html')) {
    const html = fs.readFileSync(path.join(CLONE, rel), 'utf8');
    for (const m of html.matchAll(/\s[\w:-]+\s*=\s*"([^"]+)"|\s[\w:-]+\s*=\s*'([^']+)'/g)) {
      const v = (m[1] ?? m[2]);
      if (/\s.*,|\s\d+(\.\d+)?[wx]\b/.test(v) && /\d[wx](,|$)/.test(v)) v.split(',').forEach(s => note(rel, s.trim().split(/\s+/)[0]));  // srcset
      else if (!/\s/.test(v)) note(rel, v);
    }
    for (const m of html.matchAll(/(?<![\w-])url\(\s*["']?([^"')]+)["']?\s*\)/gi)) note(rel, m[1]);
    for (const m of html.matchAll(/(?<![\w.\/\\-])((?:\.\.\/)*assets\/[A-Za-z0-9_\-.\/%@~+]+)/g)) note(rel, m[1]);
  } else if (rel.endsWith('.css')) {
    const css = fs.readFileSync(path.join(CLONE, rel), 'utf8');
    for (const m of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) note(rel, m[1]);
  }
}

const rows = [...missing.entries()].sort((a, b) => b[1].count - a[1].count);
console.log(`files ${files.length} | references checked ${checked} | distinct missing targets ${rows.length} | missing refs ${rows.reduce((n, [, v]) => n + v.count, 0)}`);
rows.slice(0, 25).forEach(([k, v]) => console.log(String(v.count).padStart(5) + '  ' + k + '   (e.g. ' + v.example + ')'));
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(Object.fromEntries(rows), null, 1));
