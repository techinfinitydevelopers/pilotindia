// Request hardening for serve.mjs: client IP, rate limits, security headers, blocked paths, timeouts.

// The visitor's real address. Railway's edge overwrites X-Forwarded-For with the client address, so
// its LAST entry is the visitor (anything a client sends is replaced or sits before it). If another
// proxy is ever put in front (e.g. Cloudflare), set IP_HEADER to the header it fills with the real
// visitor (cf-connecting-ip), or every visitor would share the proxy's address.
// /admin/api/whoami shows what the server sees, to check this on the live site.
export function clientIp(req) {
  const custom = process.env.IP_HEADER && req.headers[process.env.IP_HEADER.toLowerCase()];
  if (custom) return String(custom).split(',')[0].trim();
  const xff = String(req.headers['x-forwarded-for'] || '').split(',').map(s => s.trim()).filter(Boolean);
  return xff.length ? xff[xff.length - 1] : String(req.socket.remoteAddress || '');
}

// ---- rate limiting: fixed one-minute windows per IP and bucket
const LIMITS = {
  site: Number(process.env.RATE_SITE || 900),        // pages + assets per minute (a page pulls in ~100 files)
  admin: Number(process.env.RATE_ADMIN || 240),      // admin dashboard + API per minute
  write: Number(process.env.RATE_WRITE || 60),       // admin saves/uploads per minute
  lead: Number(process.env.RATE_LEAD || 8),          // catalogue-download form submissions per minute
  upload: Number(process.env.RATE_UPLOAD || 20),     // admin file uploads per minute
  // site-wide (all IPs together): stops floods spread over many addresses
  'lead*': Number(process.env.RATE_LEAD_ALL || 120),
  'upload*': Number(process.env.RATE_UPLOAD_ALL || 40),
};
const hits = new Map();   // bucket|ip -> { n, reset }
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (v.reset <= now) hits.delete(k); }, 60000).unref();

// true = allowed; false = the 429 has been sent
// A bucket ending in "*" is counted for the whole site, not per IP.
export function rateLimit(req, res, bucket) {
  const key = bucket + '|' + (bucket.endsWith('*') ? '' : clientIp(req)), now = Date.now();
  let h = hits.get(key);
  if (!h || h.reset <= now) { h = { n: 0, reset: now + 60000 }; hits.set(key, h); }
  if (++h.n <= LIMITS[bucket]) return true;
  const wait = Math.ceil((h.reset - now) / 1000);
  res.writeHead(429, { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': String(wait), 'Cache-Control': 'no-store' })
    .end(`Too many requests. Try again in ${wait}s.`);
  return false;
}

// ---- headers on every response
export function securityHeaders(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  // pages rely on inline scripts, so no script-src here; this still stops framing by other sites,
  // <base> hijacking and plugin content
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self'; base-uri 'self'; object-src 'none'");
  if (req.headers['x-forwarded-proto'] === 'https') res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  if (req.url.startsWith('/admin')) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
}

// An uploaded or mirrored SVG opened directly must not be able to run script on this origin.
export const SVG_HEADERS = { 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox" };

// ---- paths that are never served: dotfiles, backups, server-side code, source maps
export function forbiddenPath(p) {
  return p.includes('\0') ||
    /(^|\/)\.[^/]/.test(p) ||
    /\.(bak|old|orig|swp|tmp|log|sql|env|php\d?|phtml|asp|aspx|jsp|cgi|sh|bat|ps1|exe|dll|map|mjs\.map)$/i.test(p);
}

// ---- slow-client protection
export function hardenServer(server) {
  server.headersTimeout = 20000;     // whole request head within 20s
  server.requestTimeout = 120000;    // whole request (uploads) within 2 min
  server.keepAliveTimeout = 5000;
  server.maxRequestsPerSocket = 1000;
}

// ==========================================================================================
// Request bodies: uploads and form posts are the only way to make the server hold data, so
// every body is bounded in size, time and concurrency before and while it is read.

// Refuses a body by its declared size before a single byte is read (413), so a client cannot
// make the server buffer a huge upload just to reject it afterwards.
export function admitBody(req, res, max) {
  const len = Number(req.headers['content-length']);
  if (Number.isFinite(len) && len > max) {
    res.writeHead(413, { 'Content-Type': 'application/json', Connection: 'close' })
      .end(JSON.stringify({ error: `too large: limit is ${Math.round(max / 1048576 * 10) / 10} MB` }));
    req.resume();
    return false;
  }
  return true;
}

// Reads a body with a byte limit AND a deadline: a client trickling bytes slowly (slow-loris)
// is cut off instead of holding the connection and memory open.
export function readLimited(req, { limit, timeoutMs = 30000 }) {
  return new Promise((resolve, reject) => {
    const chunks = []; let n = 0, done = false;
    const fail = msg => { if (done) return; done = true; clearTimeout(t); reject(Object.assign(new Error(msg), { status: 413 })); req.destroy(); };
    const t = setTimeout(() => fail('request body too slow'), timeoutMs);
    req.on('data', c => { n += c.length; if (n > limit) fail(`too large: limit is ${Math.round(limit / 1048576 * 10) / 10} MB`); else chunks.push(c); });
    req.on('end', () => { if (done) return; done = true; clearTimeout(t); resolve(Buffer.concat(chunks)); });
    req.on('error', e => { if (!done) { done = true; clearTimeout(t); reject(e); } });
  });
}

// At most UPLOAD_CONCURRENT uploads in flight site-wide and one per IP; others get 429 at once
// instead of queueing in memory.
const MAX_CONCURRENT = Number(process.env.UPLOAD_CONCURRENT || 3);
let inFlight = 0;
const inFlightIp = new Set();
export function takeUploadSlot(req) {
  const ip = clientIp(req);
  if (inFlight >= MAX_CONCURRENT || inFlightIp.has(ip)) return null;
  inFlight++; inFlightIp.add(ip);
  let released = false;
  return () => { if (!released) { released = true; inFlight--; inFlightIp.delete(ip); } };
}

// Hourly upload quota per IP (count and bytes).
const QUOTA_FILES = Number(process.env.UPLOAD_HOURLY_FILES || 60);
const QUOTA_BYTES = Number(process.env.UPLOAD_HOURLY_MB || 300) * 1048576;
const quota = new Map();   // ip -> { files, bytes, reset }
setInterval(() => { const now = Date.now(); for (const [k, v] of quota) if (v.reset <= now) quota.delete(k); }, 600000).unref();
export function uploadQuota(req, bytes) {
  const ip = clientIp(req), now = Date.now();
  let q = quota.get(ip);
  if (!q || q.reset <= now) { q = { files: 0, bytes: 0, reset: now + 3600000 }; quota.set(ip, q); }
  if (q.files + 1 > QUOTA_FILES || q.bytes + bytes > QUOTA_BYTES) {
    return `upload limit reached (${QUOTA_FILES} files / ${QUOTA_BYTES / 1048576} MB per hour), try again in ${Math.ceil((q.reset - now) / 60000)} min`;
  }
  q.files++; q.bytes += bytes;
  return null;
}

// The file must really be what its name says, and images must have sane dimensions (a tiny file
// declaring 50000 x 50000 pixels would freeze every visitor's browser).
const MAX_SIDE = Number(process.env.UPLOAD_MAX_PIXELS_SIDE || 12000);
export function checkUploadContent(ext, buf) {
  const head = buf.subarray(0, 16);
  const is = (...bytes) => bytes.every((b, i) => head[i] === b);
  const ascii = (from, str) => buf.subarray(from, from + str.length).toString('latin1') === str;
  let dims = null;
  switch (ext) {
    case '.png':
      if (!is(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'not a real PNG file';
      if (buf.length >= 24) dims = [buf.readUInt32BE(16), buf.readUInt32BE(20)];
      break;
    case '.jpg': case '.jpeg':
      if (!is(0xff, 0xd8, 0xff)) return 'not a real JPEG file';
      dims = jpegSize(buf);
      break;
    case '.gif':
      if (!ascii(0, 'GIF8')) return 'not a real GIF file';
      if (buf.length >= 10) dims = [buf.readUInt16LE(6), buf.readUInt16LE(8)];
      break;
    case '.webp':
      if (!ascii(0, 'RIFF') || !ascii(8, 'WEBP')) return 'not a real WebP file';
      break;
    case '.avif':
      if (!ascii(4, 'ftyp')) return 'not a real AVIF file';
      break;
    case '.pdf':
      if (!ascii(0, '%PDF-')) return 'not a real PDF file';
      break;
    case '.svg': {
      const text = buf.toString('utf8');
      if (!/<svg[\s>]/i.test(text)) return 'not a real SVG file';
      // scripts, event handlers, embedded HTML and external references are refused outright
      if (/<script|<foreignObject|\son[a-z]+\s*=|javascript:|<!ENTITY|xlink:href\s*=\s*["']https?:|<iframe|<embed|<object/i.test(text)) {
        return 'SVG contains scripts or external content';
      }
      break;
    }
    default: return 'only images and PDFs can be uploaded';
  }
  if (dims && (dims[0] > MAX_SIDE || dims[1] > MAX_SIDE || !dims[0] || !dims[1])) {
    return `image is ${dims[0]} x ${dims[1]} px; the limit is ${MAX_SIDE} px per side`;
  }
  return null;
}
function jpegSize(buf) {
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}
