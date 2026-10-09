// Gives the Airless home page the same hero ending as the other three product pages: the dark scrolling strip of series
// names, in place of the original three white "series" boxes. The strip's markup and styles are copied from the welding
// page (so the four stay identical); only the links and names are Airless's own, taken from the boxes being replaced.
//
//   node tools/airless-hero.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(process.cwd(), 'pilotindia-clone');
const file = path.join(ROOT, 'airless', 'index.html');
let html = fs.readFileSync(file, 'utf8');
if (html.includes('class="pilot-marquee-section"')) { console.log('airless: strip already in place'); process.exit(0); }

function endOf(src, at) {
  const re = /<(\/?)div\b[^>]*>/g; re.lastIndex = at;
  let depth = 0, m;
  while ((m = re.exec(src))) { depth += m[1] ? -1 : 1; if (depth === 0) return re.lastIndex; }
  throw new Error('unbalanced markup after ' + at);
}

// ---- the template: welding's strip, from its comment to the end of .pilot-marquee-section ----
const w = fs.readFileSync(path.join(ROOT, 'welding', 'index.html'), 'utf8');
const t0 = w.indexOf('<!-- ── Marquee: series bar');
const sec = w.indexOf('<div class="pilot-marquee-section">', t0);
if (t0 < 0 || sec < 0) throw new Error('welding strip not found');
const t1 = endOf(w, sec);
const head = w.slice(t0, sec);                                  // comment + <style>
const trackStart = w.indexOf('<div class="pilot-marquee-track">', sec);
const itemRe = /<a href="[^"]*" class="pilot-marquee-item"><span>[\s\S]*?<\/span><\/a>/;
if (!itemRe.test(w.slice(sec, t1))) throw new Error('welding strip items not found');

// ---- Airless's own series, from the three boxes being replaced ----
const widgetAt = html.indexOf('<div class="pilot-blocks-section">');
if (widgetAt < 0) throw new Error('airless boxes not found');
const blocksEnd = endOf(html, widgetAt);
const links = [...html.slice(widgetAt, blocksEnd).matchAll(/<a href="([^"]+)" class="pilot-block[^"]*"><span>([\s\S]*?)<\/span><\/a>/g)]
  .map(m => ({ href: m[1], label: m[2].replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ').trim() }));
if (links.length !== 3) throw new Error('expected 3 series boxes, found ' + links.length);
// the menu order of the Airless series: electric, electro hydraulic, pneumatic
const order = ['electric-series', 'electro-hydraulic-series', 'pneumatic-series'];
links.sort((a, b) => order.findIndex(o => a.href.includes(o)) - order.findIndex(o => b.href.includes(o)));

const esc = s => s.replace(/&/g, '&amp;');
const item = l => `<a href="${l.href}" class="pilot-marquee-item"><span>${esc(l.label)}</span></a>\n      <span class="pilot-marquee-sep"></span>`;
const strip = head + '<div class="pilot-marquee-section">\n    <div class="pilot-marquee-track">\n      ' +
  links.map(item).join('\n      ') + '\n      <!-- duplicate for seamless loop -->\n      ' + links.map(item).join('\n      ') + '\n    </div>\n  </div>';

// ---- replace the whole Elementor html widget that held the boxes ----
const wIdx = html.lastIndexOf('<div class="elementor-element', widgetAt);
const widgetStart = html.lastIndexOf('<div class="elementor-element', html.lastIndexOf('elementor-widget-html', widgetAt));
const wEnd = endOf(html, widgetStart);
if (!(wEnd > blocksEnd)) throw new Error('widget bounds look wrong');
html = html.slice(0, widgetStart) + strip + html.slice(wEnd);
fs.writeFileSync(file, html, 'utf8');
console.log('airless hero: strip built with ' + links.map(l => l.label).join(' | '));
