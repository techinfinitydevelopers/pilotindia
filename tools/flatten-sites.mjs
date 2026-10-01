// Moves sites/<slug>/ up to <slug>/ so each mirrored site is reachable as
// localhost:8080/<slug> instead of localhost:8080/sites/<slug>/index.html.
//
// Every relative reference in every HTML file is resolved against its OLD location,
// mapped to the new layout, and recomputed relative to its NEW location. That covers
// links, images, srcset, css url(), and the backslash-escaped paths Airlift leaves
// inside inline JS.
//
//   node tools/flatten-sites.mjs [siteDir]
import fs from 'node:fs';
import path from 'node:path';

const CLONE = process.argv[2] || path.join(process.cwd(), 'pilotindia-clone');
const SLUGS = ['spray-guns', 'airless', 'welding', 'office'];

// old clone-relative path -> new clone-relative path
const mapPath = (p) => {
  const m = p.match(/^sites\/([^/]+)\/(.*)$/);
  return (m && SLUGS.includes(m[1])) ? m[1] + '/' + m[2] : p;
};

const htmlFiles = [];
(function walk(d) {
  for (const f of fs.readdirSync(path.join(CLONE, d || '.'), { withFileTypes: true })) {
    const rel = d ? d + '/' + f.name : f.name;
    if (f.isDirectory()) { if (!/(^|\/)assets$/.test(rel)) walk(rel); }
    else if (f.name.endsWith('.html')) htmlFiles.push(rel);
  }
})('');

const norm = (p) => path.normalize(p).split(path.sep).join('/');
const isLocal = (u) => u && !/^(https?:|data:|mailto:|tel:|javascript:|#|\/\/|\/)/i.test(u.trim());

let filesTouched = 0, refsChanged = 0;

for (const oldRel of htmlFiles) {
  const newRel = mapPath(oldRel);
  let html = fs.readFileSync(path.join(CLONE, oldRel), 'utf8');
  let changed = 0;

  // remap one reference; `esc` marks the \/-escaped variant used inside inline JS
  const remap = (raw, esc) => {
    const plain = esc ? raw.replace(/\\\//g, '/') : raw;
    if (!isLocal(plain)) return null;
    const hashIdx = plain.search(/[#?]/);
    const bare = hashIdx >= 0 ? plain.slice(0, hashIdx) : plain;
    const suffix = hashIdx >= 0 ? plain.slice(hashIdx) : '';
    if (!bare) return null;

    let oldTarget;
    try { oldTarget = norm(path.posix.join(path.posix.dirname(oldRel), decodeURIComponent(bare))); }
    catch { return null; }
    if (oldTarget.startsWith('..')) return null;          // escapes the clone, leave alone

    const newTarget = mapPath(oldTarget);
    let out = path.posix.relative(path.posix.dirname(newRel), newTarget) || '.';
    // keep the original encoding of the path we replaced
    if (bare !== decodeURIComponent(bare)) out = out.split('/').map(encodeURIComponent).join('/');
    out += suffix;
    if (out === plain) return null;
    return esc ? out.replace(/\//g, '\\/') : out;
  };

  const attrRe = /\b(href|src|data-src|data-lazy-src|poster|data-bg|data-background-image)\s*=\s*(["'])([^"']+)\2/gi;
  html = html.replace(attrRe, (m, attr, q, val) => {
    const r = remap(val, false);
    if (r === null) return m;
    changed++;
    return `${attr}=${q}${r}${q}`;
  });

  const srcsetRe = /\b(srcset|data-srcset|imagesrcset)\s*=\s*(["'])([^"']+)\2/gi;
  html = html.replace(srcsetRe, (m, attr, q, val) => {
    let hit = false;
    const parts = val.split(',').map(seg => {
      const t = seg.trim(); if (!t) return null;
      const sp = t.split(/\s+/);
      const r = remap(sp[0], false);
      if (r !== null) { hit = true; sp[0] = r; }
      return sp.join(' ');
    }).filter(Boolean);
    if (!hit) return m;
    changed++;
    return `${attr}=${q}${parts.join(', ')}${q}`;
  });

  // css url(...) in <style> blocks and style="" attributes
  html = html.replace(/(?<![\w-])url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (m, q, val) => {
    const r = remap(val, false);
    if (r === null) return m;
    changed++;
    return `url("${r}")`;
  });

  // backslash-escaped paths inside inline JS, e.g. ..\/..\/assets\/js\/x.js
  html = html.replace(/(?:\.\.\\\/)+[^"'`\s<>)]+/g, (m) => {
    const r = remap(m, true);
    if (r === null) return m;
    changed++;
    return r;
  });

  if (changed) { fs.writeFileSync(path.join(CLONE, oldRel), html, 'utf8'); filesTouched++; refsChanged += changed; }
}

console.log('rewrote ' + refsChanged + ' references across ' + filesTouched + ' files');

// now move the trees
for (const slug of SLUGS) {
  const from = path.join(CLONE, 'sites', slug);
  const to = path.join(CLONE, slug);
  if (!fs.existsSync(from)) { console.log('  skip ' + slug + ' (already moved)'); continue; }
  if (fs.existsSync(to)) { console.error('  REFUSING: ' + to + ' already exists'); continue; }
  fs.renameSync(from, to);
  console.log('  sites/' + slug + '  ->  ' + slug);
}
try { fs.rmdirSync(path.join(CLONE, 'sites')); console.log('  removed empty sites/'); } catch {}
