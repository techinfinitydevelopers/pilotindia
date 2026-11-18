// Makes the QR code for the hidden catalogue page (/get-catalogue) as SVG and PNG, with no dependencies.
//   node tools/make-qr.mjs [url] [outDir]
// Default url: https://pilotindia-production.up.railway.app/get-catalogue   Default outDir: qr/ (repo root, not part of the site)
// Encoder: byte mode, error correction M (about 15% of the code can be damaged and it still scans), versions 1-6.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

// ---- Reed-Solomon over GF(256), polynomial 0x11D
function gmul(x, y) { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; } return z; }
function rsDivisor(deg) {
  const r = new Array(deg).fill(0); r[deg - 1] = 1;
  let root = 1;
  for (let i = 0; i < deg; i++) {
    for (let j = 0; j < deg; j++) { r[j] = gmul(r[j], root); if (j + 1 < deg) r[j] ^= r[j + 1]; }
    root = gmul(root, 2);
  }
  return r;
}
function rsRemainder(data, div) {
  const r = div.map(() => 0);
  for (const b of data) { const f = b ^ r.shift(); r.push(0); div.forEach((c, i) => { r[i] ^= gmul(c, f); }); }
  return r;
}

// level M: error-correction codewords per block, number of blocks, for versions 1..6
const ECC_PER_BLOCK = [0, 10, 16, 26, 18, 24, 16], BLOCKS = [0, 1, 1, 1, 2, 2, 4];
const rawModules = v => { let r = (16 * v + 128) * v + 64; if (v >= 2) { const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; } return r; };

export function qrMatrix(text) {
  const bytes = [...Buffer.from(text, 'utf8')];
  let ver = 1;
  for (; ver <= 6; ver++) { const cap = Math.floor(rawModules(ver) / 8) - ECC_PER_BLOCK[ver] * BLOCKS[ver]; if (4 + 8 + bytes.length * 8 <= cap * 8) break; }
  if (ver > 6) throw new Error('text too long for this encoder (max about 100 characters)');
  const size = ver * 4 + 17, dataCw = Math.floor(rawModules(ver) / 8) - ECC_PER_BLOCK[ver] * BLOCKS[ver];

  // bit stream: mode 0100, length (8 bits), bytes, terminator, padding
  const bits = [];
  const put = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1); };
  put(4, 4); put(bytes.length, 8); bytes.forEach(b => put(b, 8));
  put(0, Math.min(4, dataCw * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  for (let pad = 0xec; data.length < dataCw; pad ^= 0xec ^ 0x11) data.push(pad);

  // error correction per block, then interleave
  const nb = BLOCKS[ver], eccLen = ECC_PER_BLOCK[ver], raw = Math.floor(rawModules(ver) / 8);
  const shortBlocks = nb - raw % nb, shortLen = Math.floor(raw / nb), div = rsDivisor(eccLen), blocks = [];
  for (let i = 0, k = 0; i < nb; i++) {
    const len = shortLen - eccLen + (i < shortBlocks ? 0 : 1), dat = data.slice(k, k + len); k += len;
    const ecc = rsRemainder(dat, div);
    if (i < shortBlocks) dat.push(0);
    blocks.push(dat.concat(ecc));
  }
  const all = [];
  for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== shortLen - eccLen || j >= shortBlocks) all.push(b[i]); });

  // function patterns
  const mod = Array.from({ length: size }, () => new Array(size).fill(false));
  const fn = Array.from({ length: size }, () => new Array(size).fill(false));
  const setFn = (x, y, dark) => { mod[y][x] = dark; fn[y][x] = true; };
  for (let i = 0; i < size; i++) { setFn(6, i, i % 2 === 0); setFn(i, 6, i % 2 === 0); }
  const finder = (cx, cy) => {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const d = Math.max(Math.abs(dx), Math.abs(dy)), x = cx + dx, y = cy + dy;
      if (x >= 0 && x < size && y >= 0 && y < size) setFn(x, y, d !== 2 && d !== 4);
    }
  };
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
  if (ver > 1) {
    const n = Math.floor(ver / 7) + 2, step = Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2, pos = [6];
    for (let p = size - 7; pos.length < n; p -= step) pos.splice(1, 0, p);
    pos.forEach((px, i) => pos.forEach((py, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) return;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) setFn(px + dx, py + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }));
  }
  const formatBits = mask => {   // level M = 0b00
    const d = (0 << 3) | mask; let r = d;
    for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    const b = ((d << 10) | r) ^ 0x5412, bit = i => ((b >>> i) & 1) !== 0;
    for (let i = 0; i <= 5; i++) setFn(8, i, bit(i));
    setFn(8, 7, bit(6)); setFn(8, 8, bit(7)); setFn(7, 8, bit(8));
    for (let i = 9; i < 15; i++) setFn(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) setFn(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) setFn(8, size - 15 + i, bit(i));
    setFn(8, size - 8, true);
  };
  formatBits(0);   // reserves the format areas so data skips them

  // data modules, zig-zag from the bottom right
  let bi = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let v = 0; v < size; v++) for (let j = 0; j < 2; j++) {
      const x = right - j, y = ((right + 1) & 2) === 0 ? size - 1 - v : v;
      if (!fn[y][x] && bi < all.length * 8) { mod[y][x] = ((all[bi >>> 3] >>> (7 - (bi & 7))) & 1) !== 0; bi++; }
    }
  }
  const MASKS = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x, y) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => x * y % 2 + x * y % 3 === 0,
    (x, y) => (x * y % 2 + x * y % 3) % 2 === 0, (x, y) => ((x + y) % 2 + x * y % 3) % 2 === 0];
  const applyMask = m => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && MASKS[m](x, y)) mod[y][x] = !mod[y][x]; };
  const penalty = () => {   // runs of 5+, 2x2 blocks, dark/light balance (the finder-like rule is left out: it only tunes readability)
    let p = 0;
    const runs = line => { let run = 1; for (let i = 1; i < size; i++) { if (line[i] === line[i - 1]) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; } };
    for (let y = 0; y < size; y++) { runs(mod[y]); runs(mod.map(r => r[y])); }
    for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) { const c = mod[y][x]; if (c === mod[y][x + 1] && c === mod[y + 1][x] && c === mod[y + 1][x + 1]) p += 3; }
    const dark = mod.flat().filter(Boolean).length, total = size * size;
    return p + Math.floor(Math.abs(dark * 20 - total * 10) / total) * 10;
  };
  let best = 0, bestP = Infinity;
  for (let m = 0; m < 8; m++) { applyMask(m); formatBits(m); const p = penalty(); if (p < bestP) { best = m; bestP = p; } applyMask(m); }
  applyMask(best); formatBits(best);
  return mod;
}

// ---- output
export function toSvg(m, quiet = 4, px = 10) {
  const n = m.length + quiet * 2; let d = '';
  m.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x]) d += `M${x + quiet} ${y + quiet}h1v1h-1z`; });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="${n * px}" height="${n * px}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="#fff"/><path d="${d}" fill="#111114"/></svg>\n`;
}
export function toPng(m, quiet = 4, scale = 16) {
  const n = (m.length + quiet * 2) * scale, rowLen = 1 + n, raw = Buffer.alloc(rowLen * n, 0xff);
  for (let y = 0; y < n; y++) {
    raw[y * rowLen] = 0;
    const my = Math.floor(y / scale) - quiet;
    for (let x = 0; x < n; x++) { const mx = Math.floor(x / scale) - quiet; raw[y * rowLen + 1 + x] = my >= 0 && my < m.length && mx >= 0 && mx < m.length && m[my][mx] ? 0x11 : 0xff; }
  }
  const crcT = new Int32Array(256).map((_, i) => { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
  const crc = b => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (type, body) => { const t = Buffer.concat([Buffer.from(type), body]), len = Buffer.alloc(4), c = Buffer.alloc(4); len.writeUInt32BE(body.length); c.writeUInt32BE(crc(t)); return Buffer.concat([len, t, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(n, 0); ihdr.writeUInt32BE(n, 4); ihdr[8] = 8; ihdr[9] = 0;   // 8-bit grey
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const url = process.argv[2] || 'https://pilotindia-production.up.railway.app/get-catalogue';
  const out = path.resolve(process.argv[3] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'qr'));
  fs.mkdirSync(out, { recursive: true });
  const m = qrMatrix(url);
  fs.writeFileSync(path.join(out, 'catalogue-qr.svg'), toSvg(m));
  fs.writeFileSync(path.join(out, 'catalogue-qr.png'), toPng(m));
  console.log('QR for ' + url + '\n  ' + m.length + 'x' + m.length + ' modules -> ' + path.join(out, 'catalogue-qr.svg') + ' + .png');
}
