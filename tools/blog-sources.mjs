// Works out which of the Pilot domains each blog post belongs to, and writes tools/blog-sources.json.
//   pilotindia.com            tools/real-blog-posts.txt (its live post sitemap)
//   pilotairless.com / pilotwelding.com / pilotofficeproducts.com   their live post sitemaps (fetched now)
//   pilotsprayguns.com        its post sitemap is broken (HTTP 500) and its live blog listing is now casino spam, so its real
//                             posts are the ones captured in the first crawl: blog files found on none of the other lists
// A post shared by several domains exists once in blog/ (the copies were checked to match) and carries every domain it is on.
//
//   node tools/blog-sources.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(process.cwd(), 'pilotindia-clone');
const norm = u => decodeURIComponent(u.replace(/\/+$/, '').split('/').pop()).replace(/[‐-―−]/g, '-').toLowerCase();
const disk = fs.readdirSync(path.join(ROOT, 'blog')).filter(f => f.endsWith('.html')).map(f => f.replace(/\.html$/, ''));
const isStub = s => { const t = fs.readFileSync(path.join(ROOT, 'blog', s + '.html'), 'utf8'); return t.length < 3000 && /http-equiv="refresh"/i.test(t); };
const SPAM = /casino|kasyno|bonus|pokies|slot|betting|crowngreen|neosurf|wazamba/i;

const sources = {};
const add = (slug, d) => { (sources[slug] = sources[slug] || []).includes(d) || sources[slug].push(d); };

for (const s of fs.readFileSync(path.join(process.cwd(), 'tools', 'real-blog-posts.txt'), 'utf8').split('\n').map(x => x.trim()).filter(Boolean)) add(s, 'pilotindia.com');

for (const d of ['pilotairless.com', 'pilotwelding.com', 'pilotofficeproducts.com']) {
  const xml = await (await fetch('https://' + d + '/post-sitemap.xml')).text();
  const slugs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map(m => m[1]).filter(u => !/\.(jpe?g|png|webp)$/i.test(u)).map(norm).filter(s => s && s !== 'blog');
  let missing = 0;
  for (const s of slugs) { if (disk.includes(s)) add(s, d); else missing++; }
  console.log(d.padEnd(24) + 'live posts ' + slugs.length + ' | in blog/ ' + (slugs.length - missing) + ' | missing ' + missing);
}
// pilotsprayguns.com: by elimination (see the note above)
const known = new Set(Object.keys(sources));
let sg = 0, spam = 0;
for (const s of disk) {
  if (known.has(s) || isStub(s)) continue;
  if (SPAM.test(s)) { spam++; continue; }
  add(s, 'pilotsprayguns.com'); sg++;
}
console.log('pilotsprayguns.com'.padEnd(24) + 'captured posts ' + sg + ' (casino-spam files skipped: ' + spam + ')');

const missingFromDisk = [...Object.keys(sources)].filter(s => !disk.includes(s));
fs.writeFileSync(path.join(process.cwd(), 'tools', 'blog-sources.json'), JSON.stringify(sources, null, 1) + '\n');
const per = {}; for (const ds of Object.values(sources)) for (const d of ds) per[d] = (per[d] || 0) + 1;
console.log('distinct posts: ' + Object.keys(sources).length + ' | per domain ' + JSON.stringify(per) + ' | on several domains: ' + Object.values(sources).filter(d => d.length > 1).length);
