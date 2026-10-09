// Request hardening for serve.mjs: client IP, rate limits, security headers, blocked paths, timeouts.

// The visitor's real address. Behind Railway's proxy the client controls everything in X-Forwarded-For
// except the LAST entry, which the proxy appends, so only that one is trusted (never the first one, and
// not X-Real-IP, which a client could send itself).
export function clientIp(req) {
  const xff = String(req.headers['x-forwarded-for'] || '').split(',').map(s => s.trim()).filter(Boolean);
  return xff.length ? xff[xff.length - 1] : String(req.socket.remoteAddress || '');
}

// ---- rate limiting: fixed one-minute windows per IP and bucket
const LIMITS = {
  site: Number(process.env.RATE_SITE || 900),        // pages + assets per minute (a page pulls in ~100 files)
  admin: Number(process.env.RATE_ADMIN || 240),      // admin dashboard + API per minute
  write: Number(process.env.RATE_WRITE || 60),       // admin saves/uploads per minute
  lead: Number(process.env.RATE_LEAD || 8),          // catalogue-download form submissions per minute
};
const hits = new Map();   // bucket|ip -> { n, reset }
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (v.reset <= now) hits.delete(k); }, 60000).unref();

// true = allowed; false = the 429 has been sent
export function rateLimit(req, res, bucket) {
  const key = bucket + '|' + clientIp(req), now = Date.now();
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
