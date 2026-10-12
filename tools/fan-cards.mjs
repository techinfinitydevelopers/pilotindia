// Shared by tools/product-fan.mjs and tools/welding-fan.mjs: the row of four capability cards under the fan gallery.
// Each card is rebuilt from the card already on the page (its icon, title and text are kept as they are); the old
// "CAPABILITY 01" tag becomes a plain number.
import { serializeOuter } from 'parse5';

const kids = n => n.childNodes || [];
const attr = (n, k) => ((n.attrs || []).find(a => a.name === k) || {}).value || '';
const hasClass = (n, c) => (' ' + attr(n, 'class') + ' ').includes(' ' + c + ' ');
const all = (n, out = []) => { out.push(n); kids(n).forEach(k => all(k, out)); return out; };
const plain = n => (n.nodeName === '#text' ? n.value : kids(n).map(plain).join('')).replace(/\s+/g, ' ').trim();
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// cardEls: the parse5 elements of the cards (any of the page's older card layouts)
export function buildCards(cardEls) {
  const cards = cardEls.map((c, i) => {
    const inside = all(c).filter(n => n.tagName);
    const icon = inside.find(e => hasClass(e, 'pg-tech__icon'));
    const title = inside.find(e => hasClass(e, 'pg-tech__title'));
    const desc = inside.find(e => hasClass(e, 'pg-tech__desc'));
    return `        <article class="pg-tech__card" tabindex="0" style="transition-delay:${i * 70}ms">
          <div class="pg-tech__card-top"><span class="pg-tech__card-no">${String(i + 1).padStart(2, '0')}</span>${icon ? serializeOuter(icon) : ''}</div>
          <h3 class="pg-tech__title">${esc(title ? plain(title) : '')}</h3>
          <p class="pg-tech__desc">${esc(desc ? plain(desc) : '')}</p>
          <span class="pg-tech__card-line" aria-hidden="true"></span>
        </article>`;
  });
  return `<div class="pg-tech__cards">\n${cards.join('\n')}\n      </div>`;
}
