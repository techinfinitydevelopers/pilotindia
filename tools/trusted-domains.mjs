// Domains the site may load code, frames or media from. Shared by tools/security-scan.mjs and tools/site-audit.mjs.
export const TRUSTED = [
  'pilotindia.com', 'pilotsprayguns.com', 'pilotairless.com', 'pilotwelding.com', 'pilotofficeproducts.com',
  'googletagmanager.com', 'google-analytics.com', 'google.com', 'gstatic.com', 'googleapis.com', 'youtube.com',
  'youtube-nocookie.com', 'ytimg.com', 'cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'unpkg.com', 'jquery.com',
  'facebook.net', 'facebook.com', 'instagram.com', 'linkedin.com', 'twitter.com', 'x.com', 'w.org', 'wordpress.org',
  'gravatar.com', 'wp.com', 'schema.org', 'airlift.net', 'bv-cdn.net', 'maps.google.com', 'cloudflare.com',
];
export const trusted = host => TRUSTED.some(d => host === d || host.endsWith('.' + d));
