// Folds the four satellite sites (spray-guns, airless, welding, office) into the main site so
// the clone is ONE site: one blog, one set of pages, one set of archives, one asset pool.
//
// What happens
//   pages/blog   same-named pages collapse to one copy (priority main > spray-guns > airless >
//                welding > office); every link to a removed copy is repointed to the survivor.
//   archives     category and author listings are regenerated from every post's own card, so the
//                one blog is fully listed (the old per-site listings only knew their own posts).
//   assets       identical files collapse to one; same-named files with DIFFERENT content keep both,
//                the later one renamed (-v2, -v3), and every reference is repointed.
//   landing      spray-guns/ airless/ welding/ office/ keep only their index.html, as sections.
//
// References are rewritten the way tools/flatten-sites.mjs does it: resolve against the OLD
// location, map, recompute relative to the NEW location. A reference is only touched when its
// target is a real file, so text that merely looks like a path is never corrupted.
//
//   node tools/merge-sites.mjs [siteDir]                       plan only, prints what would happen
//   node tools/merge-sites.mjs [siteDir] --apply               do it
//   options: --report=file.json   --cache=hashes.json
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const DRY2 = args.includes('--dry-rewrite');            // full rewrite + archive regeneration in memory, nothing written
const CLONE = args.find(a => !a.startsWith('--')) || path.join(process.cwd(), 'pilotindia-clone');
const REPORT = (args.find(a => a.startsWith('--report=')) || '').slice(9);
const CACHE = (args.find(a => a.startsWith('--cache=')) || '').slice(8);

const SITES = ['spray-guns', 'airless', 'welding', 'office'];
const PRIORITY = ['main', ...SITES];
const prio = (s) => PRIORITY.indexOf(s);
const CAT_PAGE = 6, AUTHOR_PAGE = 5;                      // cards per archive page, as the originals had

const P = (rel) => path.join(CLONE, rel);
const posix = path.posix;

// ---------------------------------------------------------------- inventory
const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(P(d || '.'), { withFileTypes: true })) {
    const rel = d ? d + '/' + f.name : f.name;
    if (f.isDirectory()) walk(rel); else files.push(rel);
  }
})('');
const known = new Set(files);
const knownLower = new Set(files.map(f => f.toLowerCase()));
const dirsWithIndex = new Set(files.filter(f => f.endsWith('/index.html')).map(f => f.slice(0, -11)));
dirsWithIndex.add('');

if (APPLY && !fs.existsSync(P('spray-guns/blog'))) { console.error('Nothing to merge: spray-guns/blog is gone, this looks already merged.'); process.exit(1); }

const siteOf = (rel) => { const s = rel.split('/')[0]; return SITES.includes(s) ? s : 'main'; };
const innerOf = (rel) => { const s = rel.split('/')[0]; return SITES.includes(s) ? rel.slice(s.length + 1) : rel; };

// ---------------------------------------------------------------- pages plan
const pageCopies = new Map();            // 'folder/name' -> [{site, rel}]
const landing = [];
for (const rel of files) {
  if (!rel.endsWith('.html')) continue;
  const site = siteOf(rel), inner = innerOf(rel);
  if (inner === 'index.html') { landing.push(rel); continue; }
  const m = inner.match(/^(pages|blog|category)\/(.+)$/);
  if (!m) continue;
  const key = m[1] + '/' + m[2];
  if (!pageCopies.has(key)) pageCopies.set(key, []);
  pageCopies.get(key).push({ site, rel });
}
const isArchive = (key) => key.startsWith('category/') || /^pages\/author-/.test(key);

const pageNew = new Map();               // oldRel -> newRel for pages that SURVIVE (kept or moved)
const pageRef = new Map();               // oldRel -> newRel that links to it should now point at
const pageDelete = new Set();            // duplicate pages removed
const archiveOld = [];                   // old archive pages (harvested, then removed)
const stats = { keepInPlace: 0, moved: 0, duplicatesRemoved: 0, archivesRemoved: 0, renamed: 0 };

for (const [key, copies] of pageCopies) {
  copies.sort((a, b) => prio(a.site) - prio(b.site));
  if (isArchive(key)) {
    for (const c of copies) { archiveOld.push(c.rel); pageRef.set(c.rel, key); stats.archivesRemoved++; }
    continue;
  }
  if (key === 'pages/home-old.html') {               // each site's old landing page: different pages, not duplicates
    for (const c of copies) {
      const nn = c.site === 'main' ? key : `pages/home-old-${c.site}.html`;
      pageNew.set(c.rel, nn); pageRef.set(c.rel, nn); stats.renamed++;
    }
    continue;
  }
  const [win, ...rest] = copies;
  pageNew.set(win.rel, key); pageRef.set(win.rel, key);
  win.rel === key ? stats.keepInPlace++ : stats.moved++;
  for (const c of rest) { pageDelete.add(c.rel); pageRef.set(c.rel, key); stats.duplicatesRemoved++; }
}
for (const rel of landing) { pageNew.set(rel, rel); pageRef.set(rel, rel); }

// ---------------------------------------------------------------- assets plan
const hashCache = CACHE && fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
const hashOf = (rel) => {
  const st = fs.statSync(P(rel));
  const c = hashCache[rel];
  if (c && c.size === st.size && c.mtime === st.mtimeMs) return c.h;
  const h = crypto.createHash('sha1').update(fs.readFileSync(P(rel))).digest('hex');
  hashCache[rel] = { size: st.size, mtime: st.mtimeMs, h };
  return h;
};
const assetGroups = new Map();           // lowercased inner path -> [{site, rel, inner}]
for (const rel of files) {
  const inner = innerOf(rel);
  if (!inner.startsWith('assets/')) continue;
  const k = inner.toLowerCase();
  if (!assetGroups.has(k)) assetGroups.set(k, []);
  assetGroups.get(k).push({ site: siteOf(rel), rel, inner });
}
const assetNew = new Map();              // oldRel -> newRel
const assetDelete = new Set();
const claimedDest = new Set(files.filter(f => innerOf(f) === f && f.startsWith('assets/')).map(f => f.toLowerCase()));
const astat = { unchanged: 0, moved: 0, dedupRemoved: 0, variants: 0, hashed: 0 };
const variantLog = [];
for (const [, copies] of assetGroups) {
  copies.sort((a, b) => prio(a.site) - prio(b.site));
  const multi = copies.length > 1;
  const claimed = [];                    // {h, dest}
  for (const c of copies) {
    const h = multi ? (astat.hashed++, hashOf(c.rel)) : null;
    if (!claimed.length) {
      claimed.push({ h, dest: c.inner });
      assetNew.set(c.rel, c.inner);
      c.rel === c.inner ? astat.unchanged++ : astat.moved++;
      claimedDest.add(c.inner.toLowerCase());
      continue;
    }
    const same = claimed.find(x => x.h === h);
    if (same) { assetNew.set(c.rel, same.dest); assetDelete.add(c.rel); astat.dedupRemoved++; continue; }
    const ext = posix.extname(c.inner), stem = c.inner.slice(0, c.inner.length - ext.length);
    let n = claimed.length + 1, dest;
    do { dest = `${stem}-v${n}${ext}`; n++; } while (claimedDest.has(dest.toLowerCase()));
    claimed.push({ h, dest }); claimedDest.add(dest.toLowerCase());
    assetNew.set(c.rel, dest); astat.variants++;
    variantLog.push(`${c.rel} -> ${dest}`);
  }
}
if (CACHE) fs.writeFileSync(CACHE, JSON.stringify(hashCache));

// ---------------------------------------------------------------- reference engine
const refMap = new Map([...pageRef, ...assetNew]);          // oldRel -> where references should now point
const isLocal = (u) => u && !/^(https?:|data:|mailto:|tel:|javascript:|#|\/\/|\/|\{|\[|<)/i.test(u.trim());

function makeRemapper(oldRel, newRel) {
  const oldDir = posix.dirname(oldRel), newDir = posix.dirname(newRel);
  return (raw, esc) => {
    const plain = esc ? raw.replace(/\\\//g, '/') : raw;
    if (!isLocal(plain)) return null;
    const hi = plain.search(/[#?]/);
    const bare = hi >= 0 ? plain.slice(0, hi) : plain;
    const suffix = hi >= 0 ? plain.slice(hi) : '';
    if (!bare) return null;
    let dec; try { dec = decodeURIComponent(bare); } catch { return null; }
    const joined = posix.normalize(posix.join(oldDir, dec));
    if (joined.startsWith('..')) return null;
    const t = joined.replace(/\/$/, '');
    let out;
    if (dec.endsWith('/') || dec === '.' || dec === '..') {                    // a directory link
      if (!dirsWithIndex.has(t === '.' ? '' : t)) return null;
      const rel = posix.relative(newDir, t === '.' ? '' : t);
      out = (rel || '.') + (rel ? '/' : '');
      if (out === './') out = './';
    } else {
      const target = refMap.get(t) ?? (known.has(t) ? t : null);
      if (target === null) return null;                                         // not a real file: leave the text alone
      out = posix.relative(newDir, target) || '.';
      if (bare !== dec) out = out.split('/').map(encodeURIComponent).join('/');
    }
    out += suffix;
    if (out === plain) return null;
    return esc ? out.replace(/\//g, '\\/') : out;
  };
}

const SRCSET = /^\s*[^\s,]+(\s+\d+(\.\d+)?[wx])?(\s*,\s*[^\s,]+(\s+\d+(\.\d+)?[wx])?)*\s*$/;
function rewriteMarkup(text, remap, tally) {
  // any attribute whose value is a single path, or a srcset
  text = text.replace(/(\s[\w:-]+\s*=\s*)(["'])([^"'<>]*)\2/g, (m, pre, q, val) => {
    if (/\s/.test(val.trim())) {
      if (!(/,/.test(val) && /\d[wx]\b/.test(val) && SRCSET.test(val))) return m;
      let hit = false;
      const parts = val.split(',').map(seg => {
        const t = seg.trim(); if (!t) return null;
        const sp = t.split(/\s+/);
        const r = remap(sp[0], false); if (r !== null) { hit = true; sp[0] = r; }
        return sp.join(' ');
      }).filter(Boolean);
      if (!hit) return m;
      tally.n++; return `${pre}${q}${parts.join(', ')}${q}`;
    }
    const r = remap(val, false);
    if (r === null) return m;
    tally.n++; return `${pre}${q}${r}${q}`;
  });
  // css url(...), including the &quot;-wrapped form inside style="" attributes
  text = text.replace(/(?<![\w-])(url\(\s*(?:&quot;|["'])?)([^"')&\s]+)((?:&quot;|["'])?\s*\))/gi, (m, a, val, z) => {
    const r = remap(val, false);
    if (r === null) return m;
    tally.n++; return a + r + z;
  });
  // paths inside entity-encoded JSON attributes: &quot;assets/img/x.png&quot;
  text = text.replace(/(&quot;)((?:\.\.\/)*(?:assets|blog|pages|category)\/[^&"'\s<>]+)(&quot;)/g, (m, a, val, z) => {
    const r = remap(val, false);
    if (r === null) return m;
    tally.n++; return a + r + z;
  });
  return text;
}
function rewriteScript(text, remap, tally) {
  text = text.replace(/(?<![\w.\/\\-])((?:\.\.\\\/)+[^"'`\s<>)]+|assets(?:\\\/[^"'`\s<>)\\]+)+)/g, (m) => {
    const r = remap(m, true); if (r === null) return m; tally.n++; return r;
  });
  text = text.replace(/(?<![\w.\/\\-])((?:\.\.\/)*assets\/[A-Za-z0-9_\-.\/%@~+]*[A-Za-z0-9_\-%@~+])/g, (m) => {
    const r = remap(m, false); if (r === null) return m; tally.n++; return r;
  });
  return text;
}
function rewriteHtml(html, oldRel, newRel, tally) {
  const remap = makeRemapper(oldRel, newRel);
  const parts = html.split(/(<script\b[^>]*>[\s\S]*?<\/script>)/gi);
  return parts.map(seg => {
    const m = seg.match(/^(<script\b[^>]*>)([\s\S]*?)(<\/script>)$/i);
    if (m) return rewriteMarkup(m[1], remap, tally) + rewriteScript(m[2], remap, tally) + m[3];
    return rewriteMarkup(seg, remap, tally);
  }).join('');
}
function rewriteCss(css, oldRel, newRel, tally) {
  const remap = makeRemapper(oldRel, newRel);
  return css.replace(/(url\(\s*["']?)([^"')\s]+)(["']?\s*\))/gi, (m, a, val, z) => {
    const r = remap(val, false); if (r === null) return m; tally.n++; return a + r + z;
  });
}

// ---------------------------------------------------------------- archives: harvest, then regenerate
const base = (href) => href.split('#')[0].split('?')[0].split('/').pop().replace(/\.html$/, '');
const mainRegion = (html) => { const a = html.indexOf('id="main-content"'); const b = html.indexOf('<footer class="pi-f2"'); return { a, b: b > a ? b : html.length }; };
function blockEnd(html, start) {                          // index just past the </div> matching the <div at `start`
  let d = 0; const re = /<div\b|<\/div>/g; re.lastIndex = start; let m;
  while ((m = re.exec(html))) { if (m[0] === '</div>') { if (--d === 0) return m.index + 6; } else d++; }
  return -1;
}
const cards = new Map();                                  // post slug -> card
const shells = new Map();                                 // archive stem -> {old, html}
const tallyArchive = { n: 0 };
function harvestArchives() {
  for (const rel of archiveOld.slice().sort((a, b) => prio(siteOf(a)) - prio(siteOf(b)))) {
    const html = fs.readFileSync(P(rel), 'utf8');
    const stem = innerOf(rel).replace(/^(pages|category)\//, '').replace(/\.html$/, '');
    const folder = innerOf(rel).startsWith('category/') ? 'category' : 'pages';
    if (!/-page-\d+$/.test(stem) && !shells.has(folder + '/' + stem)) shells.set(folder + '/' + stem, { old: rel, html });
    const { a, b } = mainRegion(html);
    for (const m of html.slice(a, b).matchAll(/<article\b[\s\S]*?<\/article>/g)) {
      let card = m[0];
      const link = card.match(/entry-title[^>]*>\s*<a[^>]*href="([^"]+)"/);
      if (!link) continue;
      const slug = base(link[1]);
      if (cards.has(slug)) continue;                      // already have it from a higher-priority site
      const date = (card.match(/<span class="published">([^<]+)<\/span>/) || [])[1] || '';
      const auth = card.match(/<a href="([^"]*author-[^"]*\.html)"([^>]*)rel="author"/);
      const authorSlug = auth ? base(auth[1]) : null;
      const cats = [...card.matchAll(/<a href="([^"]+)" rel="category tag">([^<]*)<\/a>/g)].map(x => base(x[1]));
      card = card.replace(/<a href="([^"]*author-[^"]*\.html)"([^>]*rel="author")/, (mm, h, rest) => `<a href="§AUTH§"${rest}`)
                 .replace(/<a href="([^"]+)" rel="category tag">/g, (mm, h) => `<a href="§CAT:${base(h)}§" rel="category tag">`);
      card = rewriteMarkup(card, makeRemapper(rel, 'category/_.html'), tallyArchive);   // archives are all one level deep
      cards.set(slug, { slug, html: card, ts: Date.parse(date) || 0, authorSlug, cats, from: rel });
    }
  }
}
function pageName(folder, stem, n) { return n === 1 ? `${stem}.html` : `${stem}-page-${n}.html`; }
function renderArchive(folder, stem, list, size) {
  const shell = shells.get(folder + '/' + stem);
  const out = [];
  if (!shell) return { out, missingShell: true };
  const pages = Math.max(1, Math.ceil(list.length / size));
  for (let n = 1; n <= pages; n++) {
    const target = `${folder}/${pageName(folder, stem, n)}`;
    let html = rewriteHtml(shell.html, shell.old, target, tallyArchive);
    const a = html.indexOf('<article');
    const lastCard = html.lastIndexOf('</article>') + 10;
    const pagStart = html.indexOf('<div class="pagination', lastCard);
    if (a < 0 || pagStart < 0) { out.push({ target, error: 'shell has no cards/pagination' }); continue; }
    const pagEnd = blockEnd(html, pagStart);
    const slice = list.slice((n - 1) * size, n * size);
    const body = slice.map(c => c.html
      .replace(/href="§AUTH§"/g, `href="${folder === 'pages' ? '' : '../pages/'}${c.authorSlug}.html"`)
      .replace(/href="§CAT:([^§]+)§"/g, (m, s) => `href="${folder === 'category' ? '' : '../category/'}${s}.html"`)).join('\n');
    const older = n < pages ? pageName(folder, stem, n + 1) : '';
    const newer = n > 1 ? pageName(folder, stem, n - 1) : '';
    const pag = `<div class="pagination clearfix">\n<div class="alignleft">${older ? `<a href="${older}" >&laquo; Older Entries</a>` : ''}</div>\n<div class="alignright">${newer ? `<a href="${newer}" >Next Entries &raquo;</a>` : ''}</div>\n</div>`;
    html = html.slice(0, a) + body + '\n' + pag + html.slice(pagEnd);
    // head: canonical / prev / next / og:url / titles
    const nm = pageName(folder, stem, n);
    html = html.replace(/<link rel="(prev|next)" href="[^"]*" \/>\s*/g, '')
               .replace(/(<link rel="canonical" href=")[^"]*(" \/>)/, `$1${nm}$2` + (newer ? `\n<link rel="prev" href="${newer}" />` : '') + (older ? `\n<link rel="next" href="${older}" />` : ''))
               .replace(/(<meta property="og:url" content=")([^"]*?)[^\/"]*\.html(")/, `$1$2${nm}$3`);
    if (folder === 'category') {
      const pageTag = n > 1 ? ` &#045; Page ${n} of ${pages}` : '';
      html = html.replace(/(<title>[^<]*?)( &#045; Page \d+ of \d+)?( &#045; Pilot India<\/title>)/, `$1${pageTag}$3`)
                 .replace(/(<meta property="og:title" content="[^"]*?)( &#045; Page \d+ of \d+)?( &#045; Pilot India")/, `$1${pageTag}$3`);
    }
    out.push({ target, html });
  }
  return { out };
}

// ---------------------------------------------------------------- plan summary
const ordered = (m) => [...m.entries()];
console.log(`pages     keep-in-place ${stats.keepInPlace} | moved to root ${stats.moved} | duplicates removed ${stats.duplicatesRemoved} | renamed ${stats.renamed} | old archive pages replaced ${stats.archivesRemoved}`);
console.log(`assets    unchanged ${astat.unchanged} | moved ${astat.moved} | identical duplicates removed ${astat.dedupRemoved} | same-name different-content renamed ${astat.variants}   (hashed ${astat.hashed})`);
console.log(`landing   ${landing.join(', ')}`);
if (DRY2) {
  console.log('\n[dry-rewrite] harvesting archive cards');
  harvestArchives();
  console.log(`  cards for ${cards.size} distinct posts, ${shells.size} archive shells (${[...shells.keys()].join(', ')})`);
  const tl = { n: 0 }; let pagesDone = 0; const errors = [];
  for (const [oldRel, newRel] of pageNew) {
    if (oldRel === 'index.html') continue;
    try { rewriteHtml(fs.readFileSync(P(oldRel), 'utf8'), oldRel, newRel, tl); pagesDone++; } catch (e) { errors.push(oldRel + ': ' + e.message); }
  }
  console.log(`  ${pagesDone} pages rewritten in memory, ${tl.n} references repointed, ${errors.length} errors`);
  errors.slice(0, 5).forEach(e => console.log('   ' + e));
  const cl = [...cards.values()].sort((a, b) => b.ts - a.ts || a.slug.localeCompare(b.slug));
  const byC = new Map(), byA = new Map();
  for (const c of cl) { for (const x of c.cats) { if (!byC.has(x)) byC.set(x, []); byC.get(x).push(c); } if (c.authorSlug) { if (!byA.has(c.authorSlug)) byA.set(c.authorSlug, []); byA.get(c.authorSlug).push(c); } }
  let total = 0;
  for (const [folder, groups, size] of [['category', byC, CAT_PAGE], ['pages', byA, AUTHOR_PAGE]])
    for (const [stem, list] of groups) { const r = renderArchive(folder, stem, list, size); total += r.out.length; console.log(`  ${folder}/${stem}: ${list.length} posts -> ${r.missingShell ? 'NO SHELL' : r.out.length + ' pages'}${r.out.some(o => o.error) ? '  ERRORS: ' + r.out.filter(o => o.error).map(o => o.error).join(';') : ''}`); }
  console.log(`  ${total} archive pages would be written`);
  const postTargets = new Set([...pageNew.values()].filter(n => n.startsWith('blog/')).map(n => n.slice(5, -5)));
  const unlisted = [...postTargets].filter(k => !cards.has(k));
  console.log(`  posts that survive: ${postTargets.size} | with an archive card: ${postTargets.size - unlisted.length} | NOT in any archive: ${unlisted.length}`);
  unlisted.slice(0, 8).forEach(k => console.log('     unlisted: ' + k));
  process.exit(0);
}
if (!APPLY) {
  console.log('\nrenamed asset collisions (first 12):\n  ' + variantLog.slice(0, 12).join('\n  '));
  if (REPORT) fs.writeFileSync(REPORT, JSON.stringify({ stats, astat, variants: variantLog, pageNew: ordered(pageNew), pageDelete: [...pageDelete], archiveOld, assetDelete: [...assetDelete] }, null, 1));
  console.log('\n(plan only: nothing was changed. Re-run with --apply to do it.)');
  process.exit(0);
}

// ---------------------------------------------------------------- apply
const t0 = Date.now();
const mk = (rel) => fs.mkdirSync(path.dirname(P(rel)), { recursive: true });
function retry(fn, what) {
  for (let i = 0; i < 6; i++) { try { return fn(); } catch (e) { if (i === 5) throw new Error(what + ': ' + e.message); Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 400); } }
}
console.log('\n[1/6] harvesting archive cards');
harvestArchives();
console.log(`      cards for ${cards.size} distinct posts, ${shells.size} archive shells`);

console.log('[2/6] rewriting and writing pages');
const tallyPages = { n: 0 };
let written = 0;
for (const [oldRel, newRel] of pageNew) {
  if (oldRel === 'index.html') continue;                                       // the home page is never touched
  const html = fs.readFileSync(P(oldRel), 'utf8');
  const out = rewriteHtml(html, oldRel, newRel, tallyPages);
  mk(newRel);
  retry(() => fs.writeFileSync(P(newRel), out, 'utf8'), 'write ' + newRel);
  written++;
}
console.log(`      ${written} pages written, ${tallyPages.n} references repointed`);

console.log('[3/6] rewriting stylesheets and moving assets');
const tallyCss = { n: 0 };
for (const [oldRel, newRel] of assetNew) {
  if (assetDelete.has(oldRel)) continue;
  if (oldRel.endsWith('.css')) {
    const css = fs.readFileSync(P(oldRel), 'utf8');
    const out = rewriteCss(css, oldRel, newRel, tallyCss);
    if (out !== css || oldRel !== newRel) { mk(newRel); retry(() => fs.writeFileSync(P(newRel), out, 'utf8'), 'write ' + newRel); if (oldRel !== newRel) retry(() => fs.unlinkSync(P(oldRel)), 'rm ' + oldRel); }
  } else if (oldRel !== newRel) {
    mk(newRel);
    if (fs.existsSync(P(newRel))) throw new Error('refusing to overwrite ' + newRel);
    retry(() => fs.renameSync(P(oldRel), P(newRel)), 'move ' + oldRel);
  }
}
console.log(`      css url() references repointed: ${tallyCss.n}`);

console.log('[4/6] removing duplicates and old archives');
let removed = 0;
for (const rel of [...pageDelete, ...archiveOld, ...assetDelete]) { if (fs.existsSync(P(rel))) { retry(() => fs.unlinkSync(P(rel)), 'rm ' + rel); removed++; } }
// pages that moved: remove the old copy once the new one exists
for (const [oldRel, newRel] of pageNew) if (oldRel !== newRel && fs.existsSync(P(oldRel))) { retry(() => fs.unlinkSync(P(oldRel)), 'rm ' + oldRel); removed++; }
console.log(`      ${removed} files removed`);

console.log('[5/6] regenerating archives');
const cardList = [...cards.values()].sort((a, b) => b.ts - a.ts || a.slug.localeCompare(b.slug));
const byCat = new Map(), byAuthor = new Map();
for (const c of cardList) {
  for (const s of c.cats) { if (!byCat.has(s)) byCat.set(s, []); byCat.get(s).push(c); }
  if (c.authorSlug) { if (!byAuthor.has(c.authorSlug)) byAuthor.set(c.authorSlug, []); byAuthor.get(c.authorSlug).push(c); }
}
const archReport = [];
let archWritten = 0;
for (const [folder, groups, size] of [['category', byCat, CAT_PAGE], ['pages', byAuthor, AUTHOR_PAGE]]) {
  for (const [stem, list] of groups) {
    const { out, missingShell } = renderArchive(folder, stem, list, size);
    if (missingShell) { archReport.push(`NO SHELL for ${folder}/${stem} (${list.length} posts)`); continue; }
    for (const o of out) { if (o.error) { archReport.push(`${o.target}: ${o.error}`); continue; } mk(o.target); retry(() => fs.writeFileSync(P(o.target), o.html, 'utf8'), 'write ' + o.target); archWritten++; }
    archReport.push(`${folder}/${stem}: ${list.length} posts -> ${out.length} pages`);
  }
}
console.log('      ' + archReport.join('\n      '));
console.log(`      ${archWritten} archive pages written`);

console.log('[6/6] tidying the empty satellite folders');
for (const s of SITES) {
  for (const sub of ['pages', 'blog', 'category', 'assets']) {
    (function prune(d) {
      if (!fs.existsSync(P(d))) return;
      for (const f of fs.readdirSync(P(d), { withFileTypes: true })) if (f.isDirectory()) prune(d + '/' + f.name);
      if (!fs.readdirSync(P(d)).length) fs.rmdirSync(P(d));
    })(s + '/' + sub);
  }
  const left = fs.existsSync(P(s + '/assets')) || fs.existsSync(P(s + '/pages')) || fs.existsSync(P(s + '/blog')) || fs.existsSync(P(s + '/category'));
  console.log(`      ${s}/ -> ${fs.readdirSync(P(s)).join(', ')}${left ? '   (NOT EMPTY - left in place)' : ''}`);
}
if (REPORT) fs.writeFileSync(REPORT, JSON.stringify({ stats, astat, variants: variantLog, archReport, cards: cards.size }, null, 1));
console.log(`\ndone in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
