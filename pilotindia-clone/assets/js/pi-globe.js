/* About Us: export globe. Dotted orthographic globe on <canvas>, India at the centre, animated arcs to every export
   country. The globe sways around India so the far ones (Africa, New Zealand) swing into view. Land comes from
   world-land-110m.json (world-atlas, topojson). Without JS / canvas the pills inside .pa-globe stay visible. */
(function () {
  var box = document.querySelector('.pa-globe');
  if (!box) return;
  var cv = box.querySelector('canvas');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var D2R = Math.PI / 180;
  var INDIA = { n: 'India', lon: 78.0, lat: 21.0 };
  var DEST = [
    { n: 'Africa', lon: 36.8, lat: -1.3, a: 'r' },
    { n: 'South Africa', lon: 28.0, lat: -26.2, a: 'r' },
    { n: 'Australia', lon: 151.2, lat: -33.9, a: 'r' },
    { n: 'Bangladesh', lon: 90.4, lat: 23.8, a: 'r' },
    { n: 'Cyprus', lon: 33.4, lat: 35.1, a: 'l' },
    { n: 'Israel', lon: 35.2, lat: 31.8, a: 'l' },
    { n: 'New Zealand', lon: 174.8, lat: -36.8, a: 'r' },
    { n: 'Philippines', lon: 121.0, lat: 14.6, a: 'r' },
    { n: 'Srilanka', lon: 79.9, lat: 6.9, a: 'r' },
    { n: 'Turkey', lon: 32.9, lat: 39.9, a: 'l' },
    { n: 'United Arab Emirates', lon: 55.3, lat: 25.2, a: 'l' }
  ];

  var acc = (getComputedStyle(box).getPropertyValue('--pa-acc') || '').trim() || '#F58634';
  var land = [];            // [lon, lat] dots
  var W = 0, H = 0, R = 0, cx = 0, cy = 0, dpr = 1;
  var running = false, t0 = performance.now(), raf = 0;

  /* ---------- topojson -> polygons ---------- */
  function decode(topo) {
    var sc = topo.transform.scale, tr = topo.transform.translate;
    var arcs = topo.arcs.map(function (a) {
      var x = 0, y = 0;
      return a.map(function (p) { x += p[0]; y += p[1]; return [x * sc[0] + tr[0], y * sc[1] + tr[1]]; });
    });
    function ring(idx) {
      var out = [];
      idx.forEach(function (i) {
        var a = i < 0 ? arcs[~i].slice().reverse() : arcs[i];
        for (var k = out.length ? 1 : 0; k < a.length; k++) out.push(a[k]);
      });
      return out;
    }
    var polys = [];
    topo.objects.land.geometries.forEach(function (g) {
      var list = g.type === 'Polygon' ? [g.arcs] : g.arcs;
      list.forEach(function (rings) { polys.push(rings.map(ring)); });
    });
    return polys;
  }

  /* ---------- projection (India centred) ---------- */
  var L0 = INDIA.lon * D2R, P0 = 18 * D2R;
  function vec(lon, lat) {
    var l = lon * D2R, p = lat * D2R;
    return [Math.cos(p) * Math.sin(l - L0), Math.cos(P0) * Math.sin(p) - Math.sin(P0) * Math.cos(p) * Math.cos(l - L0),
      Math.sin(P0) * Math.sin(p) + Math.cos(P0) * Math.cos(p) * Math.cos(l - L0)];
  }
  // rotate a unit vector about the screen's vertical axis by yaw, then project
  function proj(v, yaw, r) {
    var c = Math.cos(yaw), s = Math.sin(yaw);
    var x = v[0] * c + v[2] * s, z = -v[0] * s + v[2] * c, y = v[1];
    return [cx + x * R * r, cy - y * R * r, z];
  }
  function slerp(a, b, t) {
    var d = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])), om = Math.acos(d), so = Math.sin(om);
    if (so < 1e-5) return a;
    var f = Math.sin((1 - t) * om) / so, g = Math.sin(t * om) / so;
    return [a[0] * f + b[0] * g, a[1] * f + b[1] * g, a[2] * f + b[2] * g];
  }

  var vIndia = vec(INDIA.lon, INDIA.lat);
  DEST.forEach(function (d, i) { d.v = vec(d.lon, d.lat); d.ph = i * 0.13; d.om = Math.acos(Math.max(-1, Math.min(1, vIndia[0] * d.v[0] + vIndia[1] * d.v[1] + vIndia[2] * d.v[2]))); });

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = box.clientWidth; H = box.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    R = Math.min(W * 0.42, H * 0.43); cx = W / 2; cy = H / 2;
  }

  function label(text, x, y, side, alpha) {
    ctx.font = '600 12px Inter, system-ui, sans-serif';
    var w = ctx.measureText(text).width + 16, h = 22, lx = side === 'l' ? x - 10 - w : x + 10, ly = y - h / 2;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(14,14,14,.82)';
    ctx.beginPath(); (ctx.roundRect ? ctx.roundRect(lx, ly, w, h, 11) : ctx.rect(lx, ly, w, h)); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(text, lx + 8, y + 0.5);
    ctx.globalAlpha = 1;
  }

  function strokeLine(fn, n, yaw) {
    var open = false;
    ctx.beginPath();
    for (var i = 0; i <= n; i++) {
      var p = proj(fn(i / n), yaw, 1);
      if (p[2] > 0) { open ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); open = true; } else open = false;
    }
    ctx.stroke();
  }

  function frame(now) {
    var t = (now - t0) / 1000;
    var yaw = reduce ? 0 : Math.sin(t * 0.25) * 0.42;     // gentle sway (~ +-24 deg) keeps India near the centre
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // sphere
    var g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
    g.addColorStop(0, '#1d1d1f'); g.addColorStop(1, '#0b0b0c');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = 'rgba(245,134,52,.35)'; ctx.lineWidth = 1.2; ctx.stroke();
    var halo = ctx.createRadialGradient(cx, cy, R * 0.96, cx, cy, R * 1.16);
    halo.addColorStop(0, 'rgba(245,134,52,.16)'); halo.addColorStop(1, 'rgba(245,134,52,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, R * 1.16, 0, 6.2832); ctx.fill();

    // graticule (every 15 deg)
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,.09)';
    for (var gl = -180; gl < 180; gl += 15) { strokeLine(function (u) { return vec(gl, -90 + 180 * u); }, 90, yaw); }
    for (var gp = -75; gp <= 75; gp += 15) { strokeLine(function (u) { return vec(-180 + 360 * u, gp); }, 120, yaw); }

    // land outlines
    ctx.lineWidth = 1.15; ctx.strokeStyle = 'rgba(245,134,52,.8)'; ctx.fillStyle = 'rgba(245,134,52,.07)';
    for (var i = 0; i < land.length; i++) {
      var ring = land[i], open = false;
      ctx.beginPath();
      for (var j = 0; j < ring.length; j++) {
        var p = proj(ring[j], yaw, 1);
        if (p[2] > 0) { open ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); open = true; } else open = false;
      }
      ctx.stroke();
    }

    // arcs
    var labels = [];
    for (var k = 0; k < DEST.length; k++) {
      var d = DEST[k], lift = 0.1 + 0.2 * (d.om / Math.PI), N = 56, prev = null;
      var head = reduce ? 1 : ((t * 0.32 + d.ph) % 1.6);
      ctx.lineWidth = 1.5;
      for (var s = 0; s <= N; s++) {
        var u = s / N, v = slerp(vIndia, d.v, u), rr = 1 + lift * Math.sin(Math.PI * u);
        var q = proj(v, yaw, rr);
        if (prev && prev[2] > 0 && q[2] > 0) {
          var fade = Math.max(0, 1 - Math.abs(head - u) * 3.2);
          ctx.strokeStyle = 'rgba(245,134,52,' + (0.22 + 0.78 * fade).toFixed(3) + ')';
          ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
        }
        prev = q;
      }
      // travelling spark
      if (head <= 1) {
        var sp = proj(slerp(vIndia, d.v, head), yaw, 1 + lift * Math.sin(Math.PI * head));
        if (sp[2] > 0) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sp[0], sp[1], 2.2, 0, 6.2832); ctx.fill(); }
      }
      var dp = proj(d.v, yaw, 1);
      if (dp[2] > 0.08) {
        ctx.fillStyle = acc; ctx.beginPath(); ctx.arc(dp[0], dp[1], 3.4, 0, 6.2832); ctx.fill();
        ctx.strokeStyle = 'rgba(245,134,52,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(dp[0], dp[1], 7, 0, 6.2832); ctx.stroke();
        labels.push([d.n, dp[0], dp[1], d.a, Math.min(1, (dp[2] - 0.08) * 4)]);
      }
    }

    // India (always the centre of the sway)
    var ip = proj(vIndia, yaw, 1), pulse = reduce ? 0.5 : (t * 0.9) % 1;
    ctx.strokeStyle = 'rgba(245,134,52,' + (0.6 * (1 - pulse)).toFixed(3) + ')'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ip[0], ip[1], 6 + pulse * 22, 0, 6.2832); ctx.stroke();
    ctx.fillStyle = acc; ctx.beginPath(); ctx.arc(ip[0], ip[1], 6, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    labels.push(['India', ip[0], ip[1] - 22, 'c', 1]);

    labels.forEach(function (l) {
      if (l[3] === 'c') { ctx.font = '700 13px Inter, system-ui, sans-serif'; var w = ctx.measureText(l[0]).width + 20; ctx.fillStyle = acc; ctx.beginPath(); (ctx.roundRect ? ctx.roundRect(l[1] - w / 2, l[2] - 12, w, 24, 12) : ctx.rect(l[1] - w / 2, l[2] - 12, w, 24)); ctx.fill(); ctx.fillStyle = '#111'; ctx.textBaseline = 'middle'; ctx.fillText(l[0], l[1] - w / 2 + 10, l[2] + 0.5); }
      else label(l[0], l[1], l[2], l[3], l[4]);
    });

    if (running && !reduce) raf = requestAnimationFrame(frame);
  }

  function start() { if (running) return; running = true; raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  fetch(box.getAttribute('data-src')).then(function (r) { return r.json(); }).then(function (topo) {
    decode(topo).forEach(function (poly) { poly.forEach(function (r) { land.push(r.map(function (q) { return vec(q[0], q[1]); })); }); });
    box.classList.add('pa-globe--on');
    size();
    frame(performance.now());
    if ('IntersectionObserver' in window && !reduce) {
      new IntersectionObserver(function (e) { e[0].isIntersecting ? start() : stop(); }, { threshold: 0.05 }).observe(box);
    } else if (!reduce) start();
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { size(); if (!running) frame(performance.now()); }, 120); });
  }).catch(function () { /* pills stay visible */ });
})();
