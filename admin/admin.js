/* Pilot India admin dashboard (client). Talks to /admin/api/* served by admin/server.mjs.
   Hash routes: #/ dashboard, #/pages, #/edit?path=, #/products?path=, #/blog, #/blog/edit?path=, #/media, #/theme */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  // Divi scripts inside the preview iframe call window.top.jQuery; hand them the iframe's own jQuery
  window.jQuery = function () {
    var f = document.querySelector('.frame iframe, .preview iframe');
    var j = f && f.contentWindow && f.contentWindow.jQuery;
    return j ? j.apply(this, arguments) : null;
  };
  var main = $('#view');
  var view = main;   // the current view's container; route functions get their own as a parameter

  // ---------------------------------------------------------------- helpers
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function url(p) { return !p ? '' : /^(https?:|data:|\/)/.test(p) ? p : '/' + p; }
  function api(path, body, raw) {
    var opt = body === undefined ? {} : { method: 'POST', headers: raw ? { 'Content-Type': 'application/octet-stream' } : { 'Content-Type': 'application/json' }, body: raw ? body : JSON.stringify(body) };
    return fetch('/admin/api' + path, opt).then(function (r) {
      if (r.status === 401) { location.href = '/admin/login'; throw new Error('signed out'); }
      return r.json().then(function (j) { if (!r.ok || j.error) throw new Error(j.error || ('HTTP ' + r.status)); return j; });
    });
  }
  function toast(msg, kind) {
    var t = document.createElement('div');
    t.className = 'toast' + (kind ? ' toast--' + kind : '');
    t.textContent = msg;
    $('#toasts').appendChild(t);
    setTimeout(function () { t.remove(); }, kind === 'err' ? 7000 : 3200);
  }
  function fail(e) { toast(e.message || String(e), 'err'); }
  function h(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; }
  function ago(t) {
    var s = (Date.now() - t) / 1000;
    if (s < 60) return 'just now';
    if (s < 3600) return Math.round(s / 60) + ' min ago';
    if (s < 86400) return Math.round(s / 3600) + ' h ago';
    return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function query() { var q = location.hash.split('?')[1] || ''; return new URLSearchParams(q); }
  function busy(btn, on) { if (!btn) return; btn.disabled = on; if (on) { btn.dataset.label = btn.innerHTML; btn.innerHTML = '<span class="spin"></span> Saving'; } else if (btn.dataset.label) btn.innerHTML = btn.dataset.label; }

  var I = {
    home: '<svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/></svg>',
    pages: '<svg viewBox="0 0 24 24"><path d="M6 2h9l5 5v15H6zM14 3.5V8h4.5zM8 12h8v1.6H8zm0 4h8v1.6H8z"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M3 17.3V21h3.7L17.8 9.9l-3.7-3.7zM20.7 7a1 1 0 0 0 0-1.4l-2.3-2.3a1 1 0 0 0-1.4 0l-1.8 1.8 3.7 3.7z"/></svg>',
    box: '<svg viewBox="0 0 24 24"><path d="M12 2 3 6.5v11L12 22l9-4.5v-11zm0 2.2 6.6 3.3L12 10.8 5.4 7.5zM5 9.1l6 3v7.6l-6-3zm8 10.6v-7.6l6-3v7.6z"/></svg>',
    layers: '<svg viewBox="0 0 24 24"><path d="m12 2 10 5-10 5L2 7zm-7.6 8.8L12 14.6l7.6-3.8L22 12l-10 5-10-5zm0 5L12 19.6l7.6-3.8L22 17l-10 5-10-5z"/></svg>',
    blog: '<svg viewBox="0 0 24 24"><path d="M4 3h16v18H4zm2 2v4h12V5zm0 6v2h12v-2zm0 4v2h8v-2z"/></svg>',
    image: '<svg viewBox="0 0 24 24"><path d="M3 4h18v16H3zm2 2v9.6l4-4 3 3 4-5 3 3.8V6zm4 1.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/></svg>',
    palette: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.3A5.7 5.7 0 0 0 23 9.7C23 5.4 18 2 12 2zM6.5 12a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 10.4 3.5 2.1-.8 1.3L11 13V7h2z"/></svg>',
    search: '<svg viewBox="0 0 24 24"><path d="M10 3a7 7 0 0 1 5.6 11.2l5.1 5.1-1.4 1.4-5.1-5.1A7 7 0 1 1 10 3zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10z"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7z"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4z"/></svg>',
    up: '<svg viewBox="0 0 24 24"><path d="M11 16V7.8l-3.6 3.6L6 10l6-6 6 6-1.4 1.4L13 7.8V16zM5 18h14v2H5z"/></svg>',
    ext: '<svg viewBox="0 0 24 24"><path d="M14 3h7v7h-2V6.4l-9.3 9.3-1.4-1.4L17.6 5H14V3zM5 5h6v2H5v12h12v-6h2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/></svg>',
  };

  // ---------------------------------------------------------------- sidebar + router
  var NAV = [
    ['#/', 'Dashboard', I.home],
    ['#/pages', 'Pages', I.pages],
    ['#/page?path=index.html', 'Home page', I.layers],
    ['#/edit?path=index.html', 'Visual editor', I.edit],
    ['#/products', 'Products', I.box],
    ['#/blog', 'Blog', I.blog],
    ['#/media', 'Media', I.image],
    ['#/leads', 'Leads', '<svg viewBox="0 0 24 24"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-3.3 0-8 1.7-8 5v1h16v-1c0-3.3-4.7-5-8-5z"/></svg>'],
    ['#/theme', 'Theme & UI', I.palette],
  ];
  $('#nav').innerHTML = NAV.map(function (n) { return '<a href="' + n[0] + '">' + n[2] + '<span>' + n[1] + '</span></a>'; }).join('');

  var leaveGuard = null;   // returns a message when there are unsaved changes
  var current = '';
  function route() {
    var hash = location.hash || '#/';
    if (leaveGuard && hash !== current) {
      var msg = leaveGuard();
      if (msg && !confirm(msg)) { history.replaceState(null, '', current); return; }
    }
    leaveGuard = null;
    current = hash;
    var name = hash.slice(1).split('?')[0] || '/';
    $$('#nav a').forEach(function (a) {
      var n = a.getAttribute('href').slice(1).split('?')[0];
      a.classList.toggle('is-on', n === name || (n === '/blog' && name === '/blog/edit') || (n === '/edit' && name === '/edit'));
    });
    // each view renders into its own container; a slow response from a view already left is dropped
    var mine = document.createElement('div');
    main.innerHTML = ''; main.appendChild(mine);
    mine.innerHTML = '<div class="empty"><span class="spin"></span></div>';
    view = mine;
    var fn = ROUTES[name] || ROUTES['/'];
    Promise.resolve(fn(mine)).catch(function (e) { mine.innerHTML = '<div class="empty">' + esc(e.message) + '</div>'; });
    window.scrollTo(0, 0);
  }
  addEventListener('hashchange', route);
  addEventListener('beforeunload', function (e) { if (leaveGuard && leaveGuard()) { e.preventDefault(); e.returnValue = ''; } });

  function head(title, sub, actions) {
    return '<header class="head"><div><h1>' + title + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + (actions ? '<div class="head__actions">' + actions + '</div>' : '') + '</header>';
  }

  // ---------------------------------------------------------------- media picker (modal) + upload
  function upload(file) {
    return api('/upload?name=' + encodeURIComponent(file.name), file, true).then(function (r) { toast('Uploaded ' + file.name, 'ok'); return r.path; });
  }
  function chooseFile(accept) {
    return new Promise(function (res) {
      var i = document.createElement('input'); i.type = 'file'; i.accept = accept;
      i.onchange = function () { res(i.files[0] || null); };
      i.click();
    });
  }
  var mediaCache = null;
  function media(force) { if (!mediaCache || force) mediaCache = api('/media'); return mediaCache; }
  function mediaGrid(host, items, onPick) {
    var q = '', limit = 120;
    host.innerHTML = '<div class="bar"><label class="search">' + I.search + '<input placeholder="Search ' + items.length + ' images by file name" /></label><span class="pill" data-n></span></div><div class="mgrid"></div><div class="actions" style="justify-content:center;margin-top:16px"><button class="btn btn--sm" data-more>Show more</button></div>';
    var grid = $('.mgrid', host), more = $('[data-more]', host), n = $('[data-n]', host);
    function draw() {
      var list = items.filter(function (m) { return !q || m.path.toLowerCase().indexOf(q) >= 0; });
      n.textContent = list.length + ' images';
      grid.innerHTML = list.slice(0, limit).map(function (m) {
        return '<button class="mcell" data-p="' + esc(m.path) + '" title="' + esc(m.path) + '"><span><img loading="lazy" src="' + esc(url(m.path)) + '" alt="" /></span><small>' + esc(m.path.split('/').pop()) + '</small></button>';
      }).join('') || '<div class="empty">No images match.</div>';
      more.style.display = list.length > limit ? '' : 'none';
    }
    $('input', host).addEventListener('input', function (e) { q = e.target.value.trim().toLowerCase(); limit = 120; draw(); });
    more.onclick = function () { limit += 240; draw(); };
    grid.addEventListener('click', function (e) { var b = e.target.closest('.mcell'); if (b) onPick(b.dataset.p); });
    draw();
  }
  function pickImage() {
    return new Promise(function (resolve) {
      var m = h('<div class="modal"><div class="modal__panel"><div class="modal__head"><h2>Choose an image</h2><button class="btn btn--sm" data-up>' + I.up + 'Upload new</button><button class="icon-btn" data-x>' + I.x + '</button></div><div class="modal__body"><div class="empty"><span class="spin"></span></div></div></div></div>');
      document.body.appendChild(m);
      function done(p) { m.remove(); resolve(p || null); }
      $('[data-x]', m).onclick = function () { done(null); };
      m.addEventListener('mousedown', function (e) { if (e.target === m) done(null); });
      $('[data-up]', m).onclick = function () {
        chooseFile('image/*').then(function (f) { if (f) upload(f).then(function (p) { media(true); done(p); }).catch(fail); });
      };
      media().then(function (items) { mediaGrid($('.modal__body', m), items, done); }).catch(fail);
    });
  }
  // image field: thumbnail + choose/upload; onChange(path)
  function imageField(label, value, onChange) {
    var f = h('<div class="field"><span>' + esc(label) + '</span><div class="imgpick"><span class="imgpick__thumb"></span><div class="imgpick__acts"><button type="button" class="btn btn--sm" data-pick>' + I.image + 'Choose</button><button type="button" class="btn btn--sm" data-up>' + I.up + 'Upload</button></div><small></small></div></div>');
    function set(p) {
      value = p;
      $('.imgpick__thumb', f).innerHTML = p ? '<img src="' + esc(url(p)) + '" alt="" />' : '';
      $('small', f).textContent = p || 'No image';
    }
    set(value);
    $('[data-pick]', f).onclick = function () { pickImage().then(function (p) { if (p) { set(p); onChange(p); } }); };
    $('[data-up]', f).onclick = function () { chooseFile('image/*').then(function (file) { if (file) upload(file).then(function (p) { media(true); set(p); onChange(p); }).catch(fail); }); };
    return f;
  }

  // ---------------------------------------------------------------- rich text box
  function rte(html, big) {
    var w = h('<div><div class="rte-tools">' +
      '<button type="button" data-c="bold" title="Bold">B</button>' +
      '<button type="button" data-c="italic" title="Italic"><i>I</i></button>' +
      '<button type="button" data-c="underline" title="Underline"><u>U</u></button>' +
      (big ? '<button type="button" data-c="formatBlock" data-v="h2">H2</button><button type="button" data-c="formatBlock" data-v="h3">H3</button><button type="button" data-c="formatBlock" data-v="p">P</button>' +
        '<button type="button" data-c="insertUnorderedList">• List</button><button type="button" data-c="insertOrderedList">1. List</button><button type="button" data-c="img">Image</button>' : '') +
      '<button type="button" data-c="link">Link</button>' +
      '<button type="button" data-c="removeFormat" title="Clear formatting">Clear</button>' +
      '</div><div class="rte' + (big ? ' rte--big' : '') + '" contenteditable="true"></div></div>');
    var box = $('.rte', w);
    box.innerHTML = html || '';
    $('.rte-tools', w).addEventListener('mousedown', function (e) { if (e.target.closest('button')) e.preventDefault(); });
    $('.rte-tools', w).addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      box.focus();
      var c = b.dataset.c;
      if (c === 'link') { var u = prompt('Link address (leave empty to remove the link)', 'https://'); if (u === null) return; document.execCommand(u ? 'createLink' : 'unlink', false, u); }
      else if (c === 'img') {
        var sel = window.getSelection(), range = sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
        pickImage().then(function (p) { if (!p) return; box.focus(); if (range) { sel.removeAllRanges(); sel.addRange(range); } document.execCommand('insertImage', false, url(p)); box.dispatchEvent(new Event('input')); });
        return;
      }
      else document.execCommand(c, false, b.dataset.v ? '<' + b.dataset.v + '>' : null);
      box.dispatchEvent(new Event('input'));
    });
    return { el: w, box: box, html: function () { return box.innerHTML; } };
  }

  // ================================================================ DASHBOARD
  var ROUTES = {};
  ROUTES['/'] = function (view) {
    return api('/summary').then(function (s) {
      if (s.storage === 'postgres') $('#storage').textContent = 'live site · saved to database';
      var hr = new Date().getHours();
      var hi = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
      var c = s.counts;
      function card(href, label, n, sub, ico, tone) {
        return '<a class="stat' + (tone === 'dark' ? ' stat--dark' : '') + '" href="' + href + '"><span class="stat__label">' + label + '</span><span class="stat__n">' + n + '</span><span class="stat__open">' + sub + '</span><span class="stat__ico ico--' + tone + '">' + ico + '</span></a>';
      }
      view.innerHTML = head('<span class="eyebrow">Pilot India · Admin</span>' + hi + ', Pilot', 'Edit pages, products, blog posts and the site theme. Changes are saved into the site files on this computer.',
        '<a class="btn" href="/" target="_blank">' + I.ext + 'Open site</a><a class="btn btn--primary" href="#/page?path=index.html">' + I.edit + 'Edit home page</a>') +
        '<div class="cards">' +
        card('#/pages', 'Pages', c.pages, 'Open pages', I.pages, 'indigo') +
        card('#/products', 'Series', c.series, 'Across ' + c.lines + ' product lines', I.layers, 'blue') +
        card('#/products', 'Products', c.products, 'Open products', I.box, 'green') +
        card('#/blog', 'Blog posts', c.posts, 'Across the Pilot sites', I.blog, 'amber') +
        card('#/media', 'Media', c.media, 'Images in the library', I.image, 'rose') +
        card('#/', 'Edits today', c.editsToday, 'Every save keeps a backup', I.clock, 'dark') +
        '</div>' +
        '<div class="panels"><section class="panel"><div class="panel__head"><h2>' + I.clock + 'Recent edits</h2></div>' +
        (s.recent.length ? '<ul class="list">' + s.recent.map(function (e) {
          if (!e.exists) return '<li><span><b>' + esc(e.path) + '</b><br /><small>' + ago(e.time) + '</small></span><span class="pill">Page removed</span></li>';
          return '<li><span><b>' + esc(e.path) + '</b><br /><small>' + ago(e.time) + '</small></span><span class="actions" style="margin:0"><a class="btn btn--sm" href="#/edit?path=' + encodeURIComponent(e.path) + '">Open</a><button class="btn btn--sm" data-restore="' + esc(e.path) + '|' + esc(e.stamp) + '" title="Put the page back the way it was before this edit">Undo to here</button></span></li>';
        }).join('') + '</ul>' : '<div class="empty">No edits yet. Saved changes show up here, each with an undo.</div>') +
        '</section><section class="panel panel--dark"><div class="panel__head"><h2>' + I.plus + 'Quick actions</h2></div><div class="quick">' +
        '<a class="btn" href="#/edit?path=index.html&hero=1">' + I.image + 'Change the home hero</a>' +
        '<a class="btn" href="#/products">' + I.box + 'Edit or add a product</a>' +
        '<a class="btn" href="#/blog/edit">' + I.blog + 'Write a blog post</a>' +
        '<a class="btn" href="#/theme">' + I.palette + 'Change colours and fonts</a>' +
        '<a class="btn" href="#/media">' + I.up + 'Upload images</a>' +
        '</div><p class="hint" style="margin:16px 0 0;font-size:13px">When you are done, push the changes to GitHub to publish them.</p></section></div>';
      $$('[data-restore]', view).forEach(function (b) {
        b.onclick = function () {
          var p = b.dataset.restore.split('|');
          if (!confirm('Put ' + p[0] + ' back to how it was before this edit? (The current version is backed up too.)')) return;
          api('/restore', { path: p[0], stamp: p[1] }).then(function () { toast('Restored ' + p[0], 'ok'); route(); }).catch(fail);
        };
      });
    });
  };

  // ================================================================ PAGES
  var GROUP_ORDER = ['Home', 'Product sites', 'Series & product pages', 'Pages', 'Blog posts', 'Drafts & old copies', 'Archives'];
  ROUTES['/pages'] = function (view) {
    return api('/pages').then(function (pages) {
      view.innerHTML = head('Pages', 'Pick a page to edit its text, images, links and hero.') +
        '<div class="bar"><label class="search">' + I.search + '<input placeholder="Search ' + pages.length + ' pages" /></label></div><div data-groups></div>';
      var host = $('[data-groups]', view);
      function draw(q) {
        host.innerHTML = GROUP_ORDER.map(function (g) {
          var list = pages.filter(function (p) { return p.group === g && (!q || (p.title + ' ' + p.path).toLowerCase().indexOf(q) >= 0); });
          if (!list.length) return '';
          var open = q || ['Home', 'Product sites', 'Series & product pages', 'Pages'].indexOf(g) >= 0;
          return '<details class="group"' + (open ? ' open' : '') + '><summary>' + esc(g) + ' <small>' + list.length + '</small></summary><div class="rows">' + list.map(function (p) {
            return '<a href="#/page?path=' + encodeURIComponent(p.path) + '"><span><b>' + esc(p.title.replace(/\s*[-–|]\s*Pilot India.*$/i, '')) + '</b><small>' + esc(p.path) + '</small></span><span class="pill">Edit</span></a>';
          }).join('') + '</div></details>';
        }).join('') || '<div class="empty">No pages match.</div>';
      }
      $('input', view).addEventListener('input', function (e) { draw(e.target.value.trim().toLowerCase()); });
      draw('');
    });
  };

  // ================================================================ VISUAL EDITOR
  ROUTES['/edit'] = function (view) {
    var q = query();
    var path = q.get('path') || 'index.html';
    var wantHero = q.get('hero') === '1';
    var version = '', pending = {}, picked = null;
    function count() { return Object.keys(pending).length; }
    leaveGuard = function () { return count() ? 'You have ' + count() + ' unsaved change(s) on this page. Leave without saving?' : ''; };

    view.innerHTML = '<div class="editor"><div class="editor__bar">' +
      '<div class="editor__title"><b data-title>' + esc(path) + '</b><small>' + esc(path) + '</small></div>' +
      '<div class="seg" data-mode><button class="is-on" data-v="1">Edit</button><button data-v="0">Browse</button></div>' +
      '<div class="seg" data-dev><button class="is-on" data-v="">Desktop</button><button data-v="is-tablet">Tablet</button><button data-v="is-phone">Phone</button></div>' +
      '<button class="btn btn--sm" data-hero>' + I.image + 'Hero</button>' +
      '<a class="btn btn--sm" href="/' + esc(path) + '" target="_blank">' + I.ext + 'Open</a>' +
      '<button class="btn btn--sm btn--primary" data-save disabled>Save</button>' +
      '</div><div class="editor__body"><div class="frame"><iframe title="page preview"></iframe></div><aside class="insp"></aside></div></div>';
    var frame = $('iframe', view), insp = $('.insp', view), saveBtn = $('[data-save]', view);

    function send(m) { if (frame.contentWindow) frame.contentWindow.postMessage(Object.assign({ cms: true }, m), '*'); }
    function load() { pending = {}; picked = null; refresh(); frame.src = '/' + path + '?__cms=1&t=' + Date.now(); idle(); }
    function refresh() { var n = count(); saveBtn.disabled = !n; saveBtn.textContent = n ? 'Save ' + n + ' change' + (n > 1 ? 's' : '') : 'Save'; }
    function queue(id, op, value) { pending[id + ':' + op] = { id: id, op: op, value: value }; send({ type: 'apply', id: id, op: op, value: value }); refresh(); }

    function idle() {
      insp.innerHTML = (path === 'index.html' ? '<div class="banner">The home page is built by <b>tools/home.mjs</b>. Edits saved here are lost if that tool is run again.</div>' : '') +
        '<h3>Click anything on the page</h3><p class="hint">Text, images and background pictures light up as you hover. Click one to edit it here. Changes preview live; nothing is written until you press Save.</p>' +
        '<p class="hint">Use <b>Hero</b> to jump to the top banner. Switch to <b>Browse</b> to click links normally.</p>' +
        (count() ? '<div class="banner" style="background:#eef0ff;color:#3730a3">' + count() + ' unsaved change(s). Press Save in the top bar.</div>' : '');
    }

    function linkField(p) {
      if (!p.linkId) return null;
      var f = h('<label class="field"><span>Link goes to</span><input type="text" /></label>');
      var input = $('input', f);
      var k = p.linkId + ':href';
      input.value = pending[k] ? pending[k].value : (p.hrefPath && !/^https?:/.test(p.href) ? p.hrefPath : p.href);
      input.addEventListener('change', function () { queue(p.linkId, 'href', input.value.trim()); });
      return f;
    }

    function inspect(p) {
      picked = p;
      insp.innerHTML = '';
      var title = { text: 'Text', img: 'Image', bg: 'Background image' }[p.kind] || 'Element';
      insp.appendChild(h('<div><h3>' + title + ' <span class="pill">&lt;' + esc(p.tag) + '&gt;</span></h3><p class="hint">' + p.w + ' × ' + p.h + ' px on screen</p></div>'));
      if (p.kind === 'text') {
        var k = p.id + ':html';
        var r = rte(pending[k] ? pending[k].value : p.html, false);
        insp.appendChild(r.el);
        r.box.addEventListener('input', function () { queue(p.id, 'html', r.html()); });
        insp.appendChild(h('<p class="hint" style="margin-top:8px">Type straight into the box. Use B / I / U for emphasis.</p>'));
      }
      if (p.kind === 'img' || p.kind === 'bg') {
        var op = p.kind === 'img' ? 'img' : 'bg';
        var cur = pending[p.id + ':' + op] ? pending[p.id + ':' + op].value : p.src;
        insp.appendChild(imageField(p.kind === 'img' ? 'Picture' : 'Background picture', cur, function (v) { queue(p.id, op, v); }));
        if (p.kind === 'img') {
          var alt = h('<label class="field"><span>Description (alt text, for search engines and screen readers)</span><input type="text" /></label>');
          $('input', alt).value = pending[p.id + ':alt'] ? pending[p.id + ':alt'].value : p.alt;
          $('input', alt).addEventListener('change', function (e) { queue(p.id, 'alt', e.target.value); });
          insp.appendChild(alt);
        }
      }
      var lf = linkField(p); if (lf) insp.appendChild(lf);
      var acts = h('<div class="actions"><button class="btn btn--sm" data-undo>Undo changes to this</button><button class="btn btn--sm btn--ghost" data-done>Done</button></div>');
      $('[data-undo]', acts).onclick = function () {
        var had = false;
        Object.keys(pending).forEach(function (key) { var e = pending[key]; if (e.id === p.id || e.id === p.linkId) { delete pending[key]; had = true; } });
        if (!had) return;
        if (p.kind === 'text') send({ type: 'apply', id: p.id, op: 'html', value: p.html });
        if (p.kind === 'img') { send({ type: 'apply', id: p.id, op: 'img', value: p.src }); send({ type: 'apply', id: p.id, op: 'alt', value: p.alt }); }
        if (p.kind === 'bg') send({ type: 'apply', id: p.id, op: 'bg', value: p.src });
        if (p.linkId) send({ type: 'apply', id: p.linkId, op: 'href', value: p.href });
        refresh(); inspect(p);
      };
      $('[data-done]', acts).onclick = function () { send({ type: 'deselect' }); picked = null; idle(); };
      insp.appendChild(acts);
    }

    function onMsg(e) {
      if (e.source !== frame.contentWindow) return;
      var m = e.data || {};
      if (!m.cms) return;
      if (m.type === 'ready') {
        version = m.version;
        $('[data-title]', view).textContent = (m.title || path).replace(/\s*[-–|]\s*Pilot India.*$/i, '');
        send({ type: 'mode', on: $('[data-mode] .is-on', view).dataset.v === '1' });
        if (wantHero) { wantHero = false; setTimeout(function () { send({ type: 'hero' }); }, 400); }
      }
      if (m.type === 'pick') inspect(m);
    }
    addEventListener('message', onMsg);
    var stop = setInterval(function () { if (!document.body.contains(frame)) { removeEventListener('message', onMsg); clearInterval(stop); } }, 1000);

    $('[data-mode]', view).addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      $$('[data-mode] button', view).forEach(function (x) { x.classList.toggle('is-on', x === b); });
      send({ type: 'mode', on: b.dataset.v === '1' });
      if (b.dataset.v !== '1') idle();
    });
    $('[data-dev]', view).addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      $$('[data-dev] button', view).forEach(function (x) { x.classList.toggle('is-on', x === b); });
      $('.frame', view).className = 'frame ' + b.dataset.v;
    });
    $('[data-hero]', view).onclick = function () { send({ type: 'mode', on: true }); $$('[data-mode] button', view).forEach(function (x) { x.classList.toggle('is-on', x.dataset.v === '1'); }); send({ type: 'hero' }); };
    saveBtn.onclick = function () {
      var edits = Object.keys(pending).map(function (k) { return pending[k]; });
      if (!edits.length) return;
      busy(saveBtn, true);
      api('/edit', { path: path, version: version, edits: edits })
        .then(function () { toast('Saved ' + edits.length + ' change' + (edits.length > 1 ? 's' : '') + ' to ' + path, 'ok'); busy(saveBtn, false); load(); })
        .catch(function (e) { busy(saveBtn, false); refresh(); fail(e); });
    };
    load();
  };

  // ================================================================ PAGE EDITOR (sections + form + live preview)
  ROUTES['/page'] = function (view) {
    var path = query().get('path') || 'index.html';
    var enc = encodeURIComponent(path);
    var model = null, sel = 0, tab = 'content', pending = {}, previewOn = true;
    var fieldSection = {};          // element id -> section index, so a click in the preview finds its form
    var frame, listEl, formEl, saveBtn, root;

    function count() { return Object.keys(pending).length; }
    leaveGuard = function () { return count() ? 'You have ' + count() + ' unsaved change(s) on this page. Leave without saving?' : ''; };

    function send(m) { if (frame && frame.contentWindow) frame.contentWindow.postMessage(Object.assign({ cms: true }, m), '*'); }
    function refreshSave() {
      var n = count();
      saveBtn.textContent = n ? 'Save (' + n + ')' : 'Saved';
      saveBtn.disabled = !n;
      saveBtn.classList.toggle('btn--primary', !!n);
    }
    function queue(id, op, value, name) {
      pending[id + ':' + op + (name || '')] = { id: id, op: op, value: value, name: name };
      refreshSave();
    }
    // a text change shows in the preview straight away
    function live(id, html) { send({ type: 'apply', id: id, op: 'html', value: html }); }

    // ---- loading + saving ----
    function loadFrame() { frame.src = '/' + path + '?__cms=1&t=' + Date.now(); }
    function load(newSel) {
      return api('/page-model?path=' + enc).then(function (m) {
        model = m; pending = {};
        if (typeof newSel === 'number') sel = Math.max(0, Math.min(newSel, m.sections.length - 1));
        fieldSection = {};
        m.sections.forEach(function (s, i) { s.groups.forEach(function (g) { g.fields.forEach(function (f) { fieldSection[f.id] = i; }); }); });
        paintAll();
        loadFrame();
      });
    }
    function saveAll() {
      if (!count()) return Promise.resolve(false);
      var edits = Object.keys(pending).map(function (k) { return pending[k]; });
      return api('/edit', { path: path, version: model.version, edits: edits }).then(function () { return true; });
    }
    function onSave() {
      busy(saveBtn, true);
      saveAll().then(function (did) { busy(saveBtn, false); if (did) toast('Saved to ' + path, 'ok'); return load(sel); }).catch(function (e) { busy(saveBtn, false); refreshSave(); fail(e); });
    }
    // structural change: save text edits first, re-read the page, then act on the fresh section ids
    function structural(action, to, msg, nextSel) {
      if (msg && !confirm(msg)) return;
      saveAll().then(function () { return api('/page-model?path=' + enc); }).then(function (m) {
        return api('/page/section', { path: path, version: m.version, id: m.sections[sel].id, action: action, to: to });
      }).then(function () { toast(action === 'remove' ? 'Section removed' : action === 'duplicate' ? 'Section duplicated' : 'Section moved', 'ok'); return load(nextSel); }).catch(fail);
    }

    // ---- fields ----
    function textField(label, kind, value, onChange) {
      var f;
      if (kind === 'html') {
        f = h('<div class="field"><span></span></div>');
        $('span', f).textContent = label;
        var r = rte(value, false);
        f.appendChild(r.el);
        r.box.addEventListener('input', function () { onChange(r.html()); });
      } else {
        var long = value.length > 70;
        f = h('<label class="field"><span></span>' + (long ? '<textarea rows="3"></textarea>' : '<input type="text" />') + '</label>');
        $('span', f).textContent = label;
        var input = $(long ? 'textarea' : 'input', f);
        input.value = value;
        if (long) input.rows = Math.min(8, Math.max(3, Math.ceil(value.length / 62)));
        input.addEventListener('input', function () { onChange(input.value); });
      }
      return f;
    }
    function fieldEl(f) {
      var wrap = h('<div class="pe__field" data-fid="' + f.id + '"></div>');
      if (f.kind === 'text' || f.kind === 'html') {
        wrap.appendChild(textField(f.label, f.kind, f.value, function (v) {
          queue(f.id, f.kind, v);
          live(f.id, f.kind === 'html' ? v : esc(v));
        }));
      } else if (f.kind === 'img') {
        wrap.appendChild(imageField(f.label, f.value, function (p) { queue(f.id, 'img', p); send({ type: 'apply', id: f.id, op: 'img', value: p }); }));
        var alt = h('<label class="field"><span>Alt text</span><input type="text" /></label>');
        $('input', alt).value = f.alt || '';
        $('input', alt).addEventListener('input', function (e) { queue(f.id, 'alt', e.target.value); });
        wrap.appendChild(alt);
      } else if (f.kind === 'bg') {
        wrap.appendChild(imageField(f.label, f.value, function (p) { queue(f.id, 'bg', p); send({ type: 'apply', id: f.id, op: 'bg', value: p }); }));
      } else if (f.kind === 'link') {
        if (f.text) wrap.appendChild(textField(f.label, f.text.kind, f.text.value, function (v) { queue(f.id, f.text.kind, v); live(f.id, f.text.kind === 'html' ? v : esc(v)); }));
        var lk = h('<label class="field"><span></span><input type="text" /></label>');
        $('span', lk).textContent = f.text ? 'Link for ' + f.label : f.label + ' link';
        $('input', lk).value = f.href;
        $('input', lk).addEventListener('input', function (e) { queue(f.id, 'href', e.target.value.trim()); });
        wrap.appendChild(lk);
      }
      return wrap;
    }

    // ---- painting ----
    function paintList() {
      listEl.innerHTML = '';
      model.sections.forEach(function (s, i) {
        var li = h('<li class="pe__item' + (i === sel ? ' is-on' : '') + '" draggable="true" data-i="' + i + '"><span class="pe__grip" title="Drag to reorder">&#8942;&#8942;</span><span class="pe__num">' + (i + 1) + '</span><span class="pe__lbl"><b></b><small></small></span></li>');
        $('b', li).textContent = s.label;
        $('small', li).textContent = s.sub;
        li.addEventListener('click', function () { select(i, true); });
        li.addEventListener('dragstart', function (e) { e.dataTransfer.setData('text/plain', String(i)); e.dataTransfer.effectAllowed = 'move'; li.classList.add('is-drag'); });
        li.addEventListener('dragend', function () { li.classList.remove('is-drag'); $$('.pe__item', listEl).forEach(function (x) { x.classList.remove('is-over'); }); });
        li.addEventListener('dragover', function (e) { e.preventDefault(); li.classList.add('is-over'); });
        li.addEventListener('dragleave', function () { li.classList.remove('is-over'); });
        li.addEventListener('drop', function (e) {
          e.preventDefault();
          var from = +e.dataTransfer.getData('text/plain');
          if (isNaN(from) || from === i) return;
          sel = from;
          structural('move', i, '', i);
        });
        listEl.appendChild(li);
      });
    }
    function paintForm() {
      formEl.innerHTML = '';
      if (tab === 'seo') {
        var card = h('<div class="pe__card"><div class="pe__chead"><div><h2>Search & sharing</h2><p>What search engines and link previews show for this page.</p></div></div></div>');
        model.seo.forEach(function (x) {
          var f = textField(x.label, 'text', x.value, function (v) { queue(x.id, x.op, v, x.name); });
          if (x.hint) f.appendChild(h('<small class="pe__hint"></small>')).textContent = x.hint;
          card.appendChild(f);
        });
        if (!model.seo.length) card.appendChild(h('<div class="empty">This page has no SEO tags.</div>'));
        formEl.appendChild(card);
        return;
      }
      var s = model.sections[sel];
      if (!s) { formEl.appendChild(h('<div class="empty">This page has no editable sections.</div>')); return; }
      var card2 = h('<div class="pe__card"><div class="pe__chead"><div><h2></h2><p></p></div><div class="pe__acts"><button class="btn btn--sm" data-a="up">&#8593; Up</button><button class="btn btn--sm" data-a="down">&#8595; Down</button><button class="btn btn--sm" data-a="dup">Duplicate</button></div></div><div class="pe__remove"><button class="btn btn--sm btn--danger" data-a="rm">Remove</button></div></div>');
      $('h2', card2).textContent = s.label;
      $('p', card2).textContent = s.sub;
      $('[data-a=up]', card2).disabled = !s.canUp;
      $('[data-a=down]', card2).disabled = !s.canDown;
      $('[data-a=up]', card2).onclick = function () { structural('up', null, '', sel - 1); };
      $('[data-a=down]', card2).onclick = function () { structural('down', null, '', sel + 1); };
      $('[data-a=dup]', card2).onclick = function () { structural('duplicate', null, '', sel + 1); };
      $('[data-a=rm]', card2).onclick = function () { structural('remove', null, 'Remove the "' + s.label + '" section from this page? A backup is kept and it can be undone from the dashboard.', sel); };
      if (model.generated) card2.insertBefore(h('<div class="banner">The home page is built by <b>tools/home.mjs</b>. Edits saved here are lost if that tool is run again.</div>'), card2.firstChild);
      s.groups.forEach(function (g) {
        var box = h('<div class="pe__group"></div>');
        if (g.title) box.appendChild(h('<h3 class="pe__gtitle"></h3>')).textContent = g.title;
        g.fields.forEach(function (f) { box.appendChild(fieldEl(f)); });
        card2.appendChild(box);
      });
      if (!s.count) card2.appendChild(h('<div class="empty">No editable text or images in this section.</div>'));
      formEl.appendChild(card2);
    }
    function paintAll() { $('.pe__title', root).textContent = model.title.replace(/\s*[-|].*$/, '') || path; paintList(); paintForm(); refreshSave(); }

    function select(i, scrollPreview) {
      sel = i;
      $$('.pe__item', listEl).forEach(function (x, k) { x.classList.toggle('is-on', k === i); });
      paintForm();
      formEl.scrollTop = 0;
      if (scrollPreview) { var s = model.sections[i]; if (s) send({ type: 'focus', id: s.id, block: 'start', label: s.label }); }
    }

    // a click on the page selects its section and jumps to the field
    function onMsg(e) {
      if (!frame || e.source !== frame.contentWindow) return;
      var m = e.data || {};
      if (!m.cms) return;
      if (m.type === 'ready') { var s = model.sections[sel]; if (s && sel > 0) send({ type: 'focus', id: s.id, block: 'start', label: s.label }); }
      if (m.type === 'pick' && fieldSection[m.id] !== undefined) {
        var i = fieldSection[m.id];
        if (tab !== 'content') setTab('content');
        if (i !== sel) select(i, false);
        var el = $('[data-fid="' + m.id + '"]', formEl);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('is-flash');
          setTimeout(function () { el.classList.remove('is-flash'); }, 1400);
          var inp = $('input, textarea, .rte', el); if (inp) inp.focus({ preventScroll: true });
        }
      }
    }
    addEventListener('message', onMsg);
    var gone = setInterval(function () { if (!document.body.contains(root)) { removeEventListener('message', onMsg); clearInterval(gone); } }, 1000);

    function setTab(t) {
      tab = t;
      $$('[data-tab] button', root).forEach(function (b) { b.classList.toggle('is-on', b.dataset.v === t); });
      paintForm();
    }

    // ---- shell ----
    root = h('<div class="pe"><div class="pe__bar"><a class="btn btn--sm btn--ghost" href="#/pages">&#8249; Pages</a><b class="pe__title"></b>' +
      '<div class="seg" data-tab><button class="is-on" data-v="content">Content</button><button data-v="seo">SEO</button></div>' +
      '<button class="btn btn--sm" data-toggle>Hide preview</button><a class="btn btn--sm" href="#/edit?path=' + enc + '">Visual editor</a><a class="btn btn--sm" target="_blank" href="/' + esc(path) + '">View &#8599;</a>' +
      '<button class="btn btn--sm" data-reset>Reset</button><button class="btn btn--sm" data-save disabled>Saved</button></div>' +
      '<div class="pe__body"><aside class="pe__list"><h4>Sections</h4><p>Drag a section to reorder it.</p><ol></ol></aside>' +
      '<section class="pe__form"></section>' +
      '<aside class="pe__preview"><div class="pe__phead"><b>Live preview</b><div class="seg" data-dev><button class="is-on" data-v="">Desktop</button><button data-v="is-phone">Mobile</button></div><button class="icon-btn" data-refresh title="Reload preview">&#8635;</button></div><div class="pe__pframe"><iframe title="live preview"></iframe></div></aside></div></div>');
    view.innerHTML = '';
    view.appendChild(root);
    frame = $('iframe', root); listEl = $('.pe__list ol', root); formEl = $('.pe__form', root); saveBtn = $('[data-save]', root);

    $('[data-tab]', root).addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) setTab(b.dataset.v); });
    $('[data-dev]', root).addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      $$('[data-dev] button', root).forEach(function (x) { x.classList.toggle('is-on', x === b); });
      $('.pe__pframe', root).className = 'pe__pframe ' + b.dataset.v;
    });
    $('[data-toggle]', root).onclick = function () {
      previewOn = !previewOn;
      root.classList.toggle('no-preview', !previewOn);
      this.textContent = previewOn ? 'Hide preview' : 'Show preview';
    };
    $('[data-refresh]', root).onclick = loadFrame;
    $('[data-reset]', root).onclick = function () {
      if (count() && !confirm('Discard ' + count() + ' unsaved change(s)?')) return;
      pending = {}; load(sel).catch(fail);
    };
    saveBtn.onclick = onSave;
    return load(0);
  };

  // ================================================================ PRODUCTS
  var seriesCache = null;
  ROUTES['/products'] = function (view) {
    var q = query();
    return api('/series').then(function (groups) {
      seriesCache = groups;
      var all = []; groups.forEach(function (g) { g.series.forEach(function (s) { all.push(s); }); });
      var path = q.get('path') || (all[0] && all[0].path);
      view.innerHTML = head('Products', 'Products grouped by series. Edit a product, add a new one, or remove it.') +
        '<div class="split"><nav class="series">' + groups.map(function (g) {
          return '<h4>' + esc(g.line) + '</h4>' + g.series.map(function (s) {
            return '<a href="#/products?path=' + encodeURIComponent(s.path) + '"' + (s.path === path ? ' class="is-on"' : '') + '>' + esc(s.name) + ' <small>' + s.products + '</small></a>';
          }).join('');
        }).join('') + '</nav><div data-list><div class="empty"><span class="spin"></span></div></div></div>';
      return drawSeries(path, q.get('open'));
    });
  };
  // a series can span several pages (e.g. Currency Counters + its Currency Sorters page): one block per page
  function seriesInfo(path) {
    var hit = null;
    (seriesCache || []).forEach(function (g) { g.series.forEach(function (s) { if (s.path === path) hit = s; }); });
    return hit;
  }
  function drawSeries(path, openId) {
    var host = $('[data-list]', view);
    var info = seriesInfo(path) || {};
    var pagesOf = [path].concat((info.parts || []).map(function (p) { return p.path; }));
    return Promise.all(pagesOf.map(function (pp) { return api('/products?path=' + encodeURIComponent(pp)); })).then(function (list) {
      var total = list.reduce(function (n, s) { return n + s.products.length; }, 0);
      // one page: the series title and its buttons share a row. Several pages (Currency Counters + Sorters): a title row, then a row per page.
      var single = list.length === 1;
      host.innerHTML = single ? '' : '<div class="panel__head" style="margin-bottom:16px"><h2 style="font-size:22px">' + esc(info.name || list[0].name) + ' <span class="pill">' + total + ' products</span></h2></div>';
      list.forEach(function (s, k) {
        var pp = pagesOf[k];
        var block = h('<div style="margin-bottom:26px"><div class="panel__head" style="margin-bottom:16px"><h2 style="font-size:' + (single ? '22' : '16') + 'px">' + (single ? esc(info.name || s.name) + ' <span class="pill">' + total + ' products</span>' : esc(s.name) + ' <span class="pill">' + s.products.length + '</span>') + '</h2><span class="actions" style="margin:0">' +
          '<a class="btn btn--sm" href="/' + esc(pp) + '" target="_blank">' + I.ext + 'View page</a><a class="btn btn--sm" href="#/edit?path=' + encodeURIComponent(pp) + '">' + I.edit + 'Edit page</a>' +
          (s.products.length ? '<button class="btn btn--sm btn--primary" data-add>' + I.plus + 'Add product</button>' : '') + '</span></div>' +
          '<div class="pgrid">' + (s.products.map(function (p, i) {
            return '<article class="pcard"><div class="pcard__pic">' + (p.image ? '<img loading="lazy" src="' + esc(url(p.image)) + '" alt="" />' : '') + '</div><div class="pcard__body"><b>' + esc(p.name) + '</b><small>' + esc(p.subtitle || (p.specs[0] ? p.specs[0].join(' ') : '')) + '</small>' +
              '<div class="pcard__acts"><button class="btn btn--sm btn--primary" data-edit="' + i + '">' + I.edit + 'Edit</button><a class="btn btn--sm" href="/' + esc(pp) + '?model=' + encodeURIComponent(p.id) + '" target="_blank">View</a></div></div></article>';
          }).join('') || '<div class="empty">No products on this page yet (the page says "coming soon").</div>') + '</div></div>');
        host.appendChild(block);
        $$('[data-edit]', block).forEach(function (b) { b.onclick = function () { productDrawer(pp, s.products[+b.dataset.edit], s.name, false, path); }; });
        var add = $('[data-add]', block);
        if (add) add.onclick = function () {
          var base = s.products[s.products.length - 1];
          if (!confirm('A new product is made as a copy of "' + base.name + '", which you then edit. Continue?')) return;
          api('/product/duplicate', { path: pp, id: base.id }).then(function (r) {
            toast('Product added', 'ok');
            return api('/products?path=' + encodeURIComponent(pp)).then(function (s2) {
              drawSeries(path).then(function () { var np = s2.products.filter(function (p) { return p.id === r.id; })[0]; if (np) productDrawer(pp, np, s2.name, true, path); });
            });
          }).catch(fail);
        };
        if (openId) { var p = s.products.filter(function (x) { return x.id === openId; })[0]; if (p) productDrawer(pp, p, s.name, false, path); }
      });
    });
  }

  function repeatList(items, render, make) {
    var wrap = h('<div class="repeat"></div>');
    var list = h('<div class="repeat"></div>');
    function row(v) {
      var r = render(v);
      var x = h('<button type="button" class="icon-btn" title="Remove">' + I.x + '</button>');
      x.onclick = function () { r.remove(); };
      r.appendChild(x);
      list.appendChild(r);
    }
    items.forEach(row);
    wrap.appendChild(list);
    var add = h('<button type="button" class="btn btn--sm" style="align-self:flex-start">' + I.plus + 'Add row</button>');
    add.onclick = function () { row(make()); var ins = $$('input', list); if (ins.length) ins[ins.length - (make().length || 1)].focus(); };
    wrap.appendChild(add);
    return { el: wrap, list: list };
  }

  function productDrawer(path, p, seriesName, isNew, seriesPath) {
    seriesPath = seriesPath || path;
    var dirty = false;
    var d = h('<div class="drawer"><div class="drawer__panel"><div class="drawer__head"><h2>' + esc(p.name) + '</h2>' +
      '<a class="btn btn--sm" href="/' + esc(path) + '?model=' + encodeURIComponent(p.id) + '" target="_blank">' + I.ext + 'View</a>' +
      '<button class="btn btn--sm btn--primary" data-save>Save product</button><button class="icon-btn" data-x title="Close">' + I.x + '</button></div><div class="drawer__body"></div></div></div>');
    var body = $('.drawer__body', d);
    document.body.appendChild(d);
    if (isNew) body.appendChild(h('<div class="banner">This is a new copy. Give it a name and its own details, then save.</div>'));

    var s1 = h('<section><h3>Basics</h3></section>');
    var name = h('<label class="field"><span>Product name</span><input type="text" /></label>'); $('input', name).value = p.name; s1.appendChild(name);
    var sub = null;
    if (p.hasSubtitle) { sub = h('<label class="field"><span>Subtitle / type</span><input type="text" /></label>'); $('input', sub).value = p.subtitle; s1.appendChild(sub); }
    var image = p.image;
    s1.appendChild(imageField('Product image', p.image, function (v) { image = v; dirty = true; }));
    var buy = null;
    if (p.buy !== null) { buy = h('<label class="field"><span>Buy Now link</span><input type="text" /></label>'); $('input', buy).value = p.buy; s1.appendChild(buy); }
    body.appendChild(s1);

    var feats = null;
    if (p.hasFeatures) {
      var s2 = h('<section><h3>Features</h3></section>');
      feats = repeatList(p.features, function (v) { var r = h('<div class="repeat__row"><input class="input" type="text" /></div>'); $('input', r).value = v; return r; }, function () { return ''; });
      s2.appendChild(feats.el); body.appendChild(s2);
    }
    var specs = null;
    var s3 = h('<section><h3>Specifications</h3></section>');
    if (p.specGrid) s3.appendChild(h('<p class="hint" style="color:var(--mute);margin:0">This product\'s spec table has several columns. Edit it on the page with the visual editor.</p>'));
    else if (p.specs.length) {
      specs = repeatList(p.specs, function (v) { var r = h('<div class="repeat__row repeat__row--2"><input class="input" type="text" placeholder="Label" /><input class="input" type="text" placeholder="Value" /></div>'); var ins = $$('input', r); ins[0].value = v[0] || ''; ins[1].value = v[1] || ''; return r; }, function () { return ['', '']; });
      s3.appendChild(specs.el);
    } else s3.appendChild(h('<p class="hint" style="color:var(--mute);margin:0">No spec table on this product.</p>'));
    body.appendChild(s3);

    var dls = [];
    if (p.downloads.length) {
      var s4 = h('<section><h3>Downloads</h3></section>');
      p.downloads.forEach(function (dl) {
        var r = h('<div class="field"><span>Button text and PDF</span><div class="repeat__row repeat__row--2"><input class="input" type="text" /><input class="input" type="text" /><button type="button" class="btn btn--sm">' + I.up + 'PDF</button></div></div>');
        var ins = $$('input', r); ins[0].value = dl.label; ins[1].value = dl.href;
        $('button', r).onclick = function () { chooseFile('application/pdf').then(function (f) { if (f) upload(f).then(function (pp) { ins[1].value = pp; dirty = true; }).catch(fail); }); };
        dls.push(ins); s4.appendChild(r);
      });
      body.appendChild(s4);
    }

    var s5 = h('<section><h3>Manage</h3><div class="actions"><button class="btn btn--sm" data-dup>Duplicate</button><button class="btn btn--sm btn--danger" data-del>Delete product</button></div></section>');
    body.appendChild(s5);
    body.addEventListener('input', function () { dirty = true; });

    function close() { if (dirty && !confirm('Discard unsaved changes to ' + p.name + '?')) return; d.remove(); }
    $('[data-x]', d).onclick = close;
    d.addEventListener('mousedown', function (e) { if (e.target === d) close(); });
    $('[data-save]', d).onclick = function () {
      var btn = this;
      var out = { path: path, id: p.id, name: $('input', name).value, image: image };
      if (sub) out.subtitle = $('input', sub).value;
      if (buy) out.buy = $('input', buy).value.trim();
      if (feats) out.features = $$('input', feats.list).map(function (i) { return i.value; });
      if (specs) out.specs = $$('.repeat__row', specs.list).map(function (r) { return $$('input', r).map(function (i) { return i.value; }); });
      if (dls.length) out.downloads = dls.map(function (ins) { return { label: ins[0].value, href: ins[1].value.trim() }; });
      if (!out.name.trim()) return toast('The product needs a name', 'err');
      busy(btn, true);
      api('/product', out).then(function (r) {
        busy(btn, false); dirty = false;
        toast(r.changed ? 'Saved ' + out.name : 'Nothing changed', r.changed ? 'ok' : '');
        d.remove(); drawSeries(seriesPath);
      }).catch(function (e) { busy(btn, false); fail(e); });
    };
    $('[data-dup]', s5).onclick = function () {
      api('/product/duplicate', { path: path, id: p.id }).then(function (r) { toast('Duplicated', 'ok'); d.remove(); location.hash = '#/products?path=' + encodeURIComponent(seriesPath) + '&open=' + encodeURIComponent(r.id); route(); }).catch(fail);
    };
    $('[data-del]', s5).onclick = function () {
      if (!confirm('Delete "' + p.name + '" from ' + seriesName + '? A backup is kept and the delete can be undone from the dashboard.')) return;
      api('/product/delete', { path: path, id: p.id }).then(function () { toast('Deleted ' + p.name, 'ok'); d.remove(); drawSeries(seriesPath); }).catch(fail);
    };
  }

  // ================================================================ BLOG
  ROUTES['/blog'] = function (view) {
    return api('/blog').then(function (posts) {
      var LABEL = { 'pilotindia.com': 'Pilot India', 'pilotsprayguns.com': 'Spray Guns', 'pilotairless.com': 'Airless', 'pilotwelding.com': 'Welding', 'pilotofficeproducts.com': 'Office' };
      var tab = '';
      function countOf(d) { return posts.filter(function (p) { return !d || (p.sources || []).indexOf(d) >= 0; }).length; }
      view.innerHTML = head('Blog', posts.length + ' posts across the Pilot sites. Edit one, or write a new post.', '<a class="btn btn--primary" href="#/blog/edit">' + I.plus + 'New post</a>') +
        '<div class="bar"><div class="seg" data-btab><button class="is-on" data-v="">All (' + countOf('') + ')</button>' + Object.keys(LABEL).map(function (d) { return '<button data-v="' + d + '">' + LABEL[d] + ' (' + countOf(d) + ')</button>'; }).join('') + '</div><label class="search">' + I.search + '<input placeholder="Search posts" /></label></div><div class="posts"></div>';
      var host = $('.posts', view);
      function draw(q) {
        host.innerHTML = posts.filter(function (p) { return (!tab || (p.sources || []).indexOf(tab) >= 0) && (!q || (p.title + ' ' + p.path).toLowerCase().indexOf(q) >= 0); }).map(function (p) {
          return '<div class="post">' + (p.image ? '<img loading="lazy" src="' + esc(url(p.image)) + '" alt="" />' : '<img alt="" />') +
            '<span><b>' + esc(p.title) + '</b><small>' + esc(p.date || '') + ' · ' + (p.sources || []).map(function (d) { return LABEL[d] || d; }).join(', ') + '</small></span>' +
            '<span class="actions" style="margin:0"><a class="btn btn--sm" href="/' + esc(p.path) + '" target="_blank">View</a><a class="btn btn--sm btn--primary" href="#/blog/edit?path=' + encodeURIComponent(p.path) + '">' + I.edit + 'Edit</a></span></div>';
        }).join('') || '<div class="empty">No posts match.</div>';
      }
      $('input', view).addEventListener('input', function (e) { draw(e.target.value.trim().toLowerCase()); });
      $('[data-btab]', view).addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        tab = b.dataset.v;
        $$('[data-btab] button', view).forEach(function (x) { x.classList.toggle('is-on', x === b); });
        draw($('input', view).value.trim().toLowerCase());
      });
      draw('');
    });
  };
  // the post body uses page-relative paths (../assets/..); show it with site-root paths
  function bodyForEditor(html) { return html.replace(/(\s(?:src|href)=["'])(?:\.\.\/)+/g, '$1/'); }

  ROUTES['/blog/edit'] = function (view) {
    var path = query().get('path');
    var load = path ? api('/blog/post?path=' + encodeURIComponent(path)) : Promise.resolve({ title: '', date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), summary: '', image: '', body: '<p>Start writing here.</p>' });
    return load.then(function (p) {
      var dirty = false;
      leaveGuard = function () { return dirty ? 'This post has unsaved changes. Leave without saving?' : ''; };
      view.innerHTML = head(path ? 'Edit post' : 'New post', path ? esc(path) : 'Saved as a new page in blog/ and added to the blog listings.',
        '<a class="btn" href="#/blog">Back to posts</a>' + (path ? '<a class="btn" href="/' + esc(path) + '" target="_blank">' + I.ext + 'View</a>' : '') + '<button class="btn btn--primary" data-save>' + (path ? 'Save post' : 'Publish post') + '</button>') +
        '<div class="blog-ed"><div><input class="title-in" placeholder="Post title" /><div style="height:16px"></div><div data-body></div></div><aside class="panel"><div data-side></div></aside></div>';
      var title = $('.title-in', view); title.value = p.title;
      var r = rte(bodyForEditor(p.body), true);
      $('[data-body]', view).appendChild(r.el);
      var side = $('[data-side]', view);
      var date = h('<label class="field"><span>Date shown on the post</span><input type="text" /></label>'); $('input', date).value = p.date; side.appendChild(date);
      var sum = h('<label class="field"><span>Summary (search result text)</span><textarea></textarea></label>'); $('textarea', sum).value = p.summary; side.appendChild(sum);
      var image = p.image;
      side.appendChild(imageField('Featured image', p.image, function (v) { image = v; dirty = true; }));
      view.addEventListener('input', function () { dirty = true; });
      $('[data-save]', view).onclick = function () {
        var btn = this;
        var out = { title: title.value.trim(), date: $('input', date).value, summary: $('textarea', sum).value.trim(), image: image, body: r.html() };
        if (path) out.path = path;
        if (!out.title) return toast('The post needs a title', 'err');
        busy(btn, true);
        api('/blog/post', out).then(function (res) {
          dirty = false; busy(btn, false);
          toast(path ? 'Post saved' : 'Post published at ' + res.path, 'ok');
          if (!path) location.hash = '#/blog/edit?path=' + encodeURIComponent(res.path);
        }).catch(function (e) { busy(btn, false); fail(e); });
      };
    });
  };

  // ================================================================ MEDIA
  // ================================================================ LEADS (catalogue downloads)
  ROUTES['/leads'] = function (view) {
    return api('/leads').then(function (d) {
      var leads = d.leads || [];
      function pad(n) { return n < 10 ? '0' + n : String(n); }
      function dateOf(iso) { var t = new Date(iso); return t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate()); }
      function timeOf(iso) { var t = new Date(iso); return pad(t.getHours()) + ':' + pad(t.getMinutes()) + ':' + pad(t.getSeconds()); }
      function fileOf(u) { try { return decodeURIComponent(String(u || '').split('/').pop()); } catch (e) { return u || ''; } }
      var today = dateOf(new Date().toISOString());
      view.innerHTML = head('Leads', 'People who filled the form to download a catalogue. Newest first; times are in this computer’s time zone.',
        '<a class="btn btn--primary" href="/admin/api/leads.csv"><svg viewBox="0 0 24 24"><path d="M11 4h2v8.2l3.6-3.6L18 10l-6 6-6-6 1.4-1.4 3.6 3.6zM5 18h14v2H5z"/></svg>Export CSV</a>') +
        '<div class="cards cards--leads">' +
        '<div class="stat"><span class="stat__label">Total leads</span><span class="stat__n">' + leads.length + '</span><span class="stat__open">All time</span></div>' +
        '<div class="stat"><span class="stat__label">Today</span><span class="stat__n">' + leads.filter(function (l) { return dateOf(l.created_at) === today; }).length + '</span><span class="stat__open">' + today + '</span></div>' +
        '<div class="stat"><span class="stat__label">Catalogues behind the form</span><span class="stat__n">' + (d.catalogues || 0) + '</span><span class="stat__open">Stored in ' + (d.storage === 'postgres' ? 'Postgres' : 'a local file (not in git)') + '</span></div>' +
        '</div>' +
        '<div class="bar"><label class="search">' + I.search + '<input placeholder="Search name, email, phone or catalogue" /></label><span class="pill" data-n></span></div>' +
        '<div class="leads-wrap"><table class="leads"><thead><tr><th>Date</th><th>Time</th><th>Name</th><th>Email</th><th>Phone</th><th>Catalogue</th><th>Page</th></tr></thead><tbody></tbody></table></div>';
      var body = $('tbody', view), n = $('[data-n]', view);
      function draw(q) {
        var rows = leads.filter(function (l) { return !q || [l.name, l.email, l.phone, l.file, l.page].join(' ').toLowerCase().indexOf(q) >= 0; });
        n.textContent = rows.length + ' of ' + leads.length;
        body.innerHTML = rows.map(function (l) {
          return '<tr><td>' + dateOf(l.created_at) + '</td><td>' + timeOf(l.created_at) + '</td><td>' + esc(l.name) + '</td>' +
            '<td><a href="mailto:' + esc(l.email) + '">' + esc(l.email) + '</a></td><td><a href="tel:' + esc(String(l.phone).replace(/[^\d+]/g, '')) + '">' + esc(l.phone) + '</a></td>' +
            '<td title="' + esc(l.file) + '">' + esc(fileOf(l.file)) + '</td><td>' + esc(l.page || '') + '</td></tr>';
        }).join('') || '<tr><td colspan="7" class="leads__empty">' + (leads.length ? 'No leads match.' : 'No leads yet. They appear here as soon as someone fills the catalogue form.') + '</td></tr>';
      }
      $('input', view).addEventListener('input', function (e) { draw(e.target.value.trim().toLowerCase()); });
      draw('');
    });
  };

  ROUTES['/media'] = function (view) {
    return media(true).then(function (items) {
      view.innerHTML = head('Media', 'Every image the site uses. Upload new ones here; they go to assets/img/uploads/.') +
        '<label class="drop">' + I.up + '<span>Drop images or PDFs here, or <u>browse</u></span><input type="file" multiple accept="image/*,application/pdf" hidden /></label><div data-grid></div>';
      var drop = $('.drop', view);
      function send(files) {
        var list = Array.prototype.slice.call(files);
        if (!list.length) return;
        list.reduce(function (pr, f) { return pr.then(function () { return upload(f); }); }, Promise.resolve()).then(function () { route(); }).catch(fail);
      }
      $('input', drop).onchange = function (e) { send(e.target.files); };
      ['dragenter', 'dragover'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('is-over'); }); });
      ['dragleave', 'drop'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove('is-over'); }); });
      drop.addEventListener('drop', function (e) { send(e.dataTransfer.files); });
      mediaGrid($('[data-grid]', view), items, function (p) {
        if (navigator.clipboard) navigator.clipboard.writeText(p).then(function () { toast('Copied path: ' + p); }, function () { toast(p); });
        else toast(p);
      });
    });
  };

  // ================================================================ THEME & UI
  var THEME_GROUPS = [
    ['Brand colours', 'theme', ['--pi-accent', '--pi-accent-strong', '--pi-accent-heading', '--pi-accent-bright', '--pi-accent-warm', '--pi-accent-legacy', '--pi-accent-legacy-dark']],
    ['Dark surfaces & text', 'theme', ['--pi-ink', '--pi-ink-soft', '--pi-line', '--pi-text', '--pi-text-strong', '--pi-nav-text']],
    ['Fonts', 'theme', ['--pi-font-body', '--pi-font-heading', '--pi-font-accent', '--pi-font-display']],
    ['Corners', 'theme', ['--pi-radius-shell', '--pi-radius-control', '--pi-radius-pill']],
    ['Series & product pages', 'series', ['--s-bg', '--s-ink', '--s-glass', '--s-line', '--s-text', '--s-mute', '--s-accent', '--s-serif']],
  ];
  var LABELS = {
    '--pi-accent': 'Main orange', '--pi-accent-strong': 'Orange (hover)', '--pi-accent-heading': 'Heading orange', '--pi-accent-bright': 'Bright orange', '--pi-accent-warm': 'Warm orange', '--pi-accent-legacy': 'Gold', '--pi-accent-legacy-dark': 'Gold (dark)',
    '--pi-ink': 'Page background', '--pi-ink-soft': 'Card background', '--pi-line': 'Lines', '--pi-text': 'Body text', '--pi-text-strong': 'Headings', '--pi-nav-text': 'Menu text',
    '--pi-font-body': 'Body font', '--pi-font-heading': 'Heading font', '--pi-font-accent': 'Accent font', '--pi-font-display': 'Display font',
    '--pi-radius-shell': 'Cards', '--pi-radius-control': 'Buttons & inputs', '--pi-radius-pill': 'Pills',
    '--s-bg': 'Background', '--s-ink': 'Headings', '--s-glass': 'Panels', '--s-line': 'Lines', '--s-text': 'Body text', '--s-mute': 'Muted text', '--s-accent': 'Accent', '--s-serif': 'Display font',
  };
  function hex(v) {
    v = String(v).trim();
    if (/^#[0-9a-f]{6}$/i.test(v)) return v;
    if (/^#[0-9a-f]{3}$/i.test(v)) return '#' + v.slice(1).split('').map(function (c) { return c + c; }).join('');
    return null;
  }
  ROUTES['/theme'] = function (view) {
    return api('/theme').then(function (t) {
      var orig = JSON.parse(JSON.stringify(t)), changed = { theme: {}, series: {} };
      leaveGuard = function () { return Object.keys(changed.theme).length + Object.keys(changed.series).length ? 'Theme changes are not saved yet. Leave anyway?' : ''; };
      view.innerHTML = head('Theme & UI', 'Colours, fonts and corners for the whole site. The preview updates as you change them.',
        '<button class="btn" data-reset>Reset</button><button class="btn btn--primary" data-save>Save theme</button>') +
        '<div class="theme"><div class="theme__form"></div><div class="preview"><div class="preview__bar"><div class="seg" data-pv>' +
        '<button class="is-on" data-v="index.html">Home</button><button data-v="spray-guns/index.html">Spray guns</button><button data-v="pages/evolution-series.html">Series page</button><button data-v="blog/how-to-clean-and-maintain-a-spray-gun-properly.html">Blog post</button>' +
        '</div></div><iframe title="theme preview"></iframe></div></div>';
      var form = $('.theme__form', view), frame = $('.preview iframe', view);

      THEME_GROUPS.forEach(function (g) {
        var sec = h('<section><h3>' + g[0] + '</h3></section>');
        g[2].forEach(function (name) {
          var bag = t[g[1]];
          if (!(name in bag)) return;
          var val = bag[name];
          var isFont = /font|serif/.test(name), isRadius = /radius/.test(name);
          var row = h('<div class="tok"><label>' + esc(LABELS[name] || name) + '<small>' + esc(name) + '</small></label><div class="tok__in"></div></div>');
          var box = $('.tok__in', row);
          var text = h('<input type="text" spellcheck="false" />'); text.value = val;
          if (!isFont && !isRadius && hex(val)) {
            var color = h('<input type="color" />'); color.value = hex(val);
            color.addEventListener('input', function () { text.value = color.value; set(g[1], name, color.value); });
            text.addEventListener('change', function () { if (hex(text.value)) color.value = hex(text.value); });
            box.appendChild(color);
          }
          if (isFont) { row.style.gridTemplateColumns = '1fr'; }
          text.addEventListener('input', function () { set(g[1], name, text.value); });
          box.appendChild(text);
          sec.appendChild(row);
        });
        form.appendChild(sec);
      });

      function css() {
        var a = [], b = [];
        Object.keys(changed.theme).forEach(function (k) { a.push(k + ':' + changed.theme[k] + ' !important'); });
        Object.keys(changed.series).forEach(function (k) { b.push(k + ':' + changed.series[k] + ' !important'); });
        return (a.length ? ':root{' + a.join(';') + '}' : '') + (b.length ? '.pg-series{' + b.join(';') + '}' : '');
      }
      function paint() {
        try {
          var doc = frame.contentDocument; if (!doc || !doc.body) return;
          var st = doc.getElementById('cms-theme-preview');
          if (!st) { st = doc.createElement('style'); st.id = 'cms-theme-preview'; doc.body.appendChild(st); }
          st.textContent = css();
        } catch (e) { /* preview not ready */ }
      }
      function set(bag, name, v) {
        if (String(v).trim() === orig[bag][name]) delete changed[bag][name]; else changed[bag][name] = String(v).trim();
        paint();
      }
      frame.addEventListener('load', paint);
      function show(p) { frame.src = '/' + p; }
      $('[data-pv]', view).addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        $$('[data-pv] button', view).forEach(function (x) { x.classList.toggle('is-on', x === b); });
        show(b.dataset.v);
      });
      show('index.html');
      $('[data-reset]', view).onclick = function () { changed = { theme: {}, series: {} }; leaveGuard = null; route(); };
      $('[data-save]', view).onclick = function () {
        var btn = this;
        if (!Object.keys(changed.theme).length && !Object.keys(changed.series).length) return toast('Nothing changed');
        busy(btn, true);
        api('/theme', changed).then(function () {
          busy(btn, false); toast('Theme saved', 'ok');
          Object.keys(changed.theme).forEach(function (k) { orig.theme[k] = changed.theme[k]; });
          Object.keys(changed.series).forEach(function (k) { orig.series[k] = changed.series[k]; });
          changed = { theme: {}, series: {} };
          frame.src = frame.src;
        }).catch(function (e) { busy(btn, false); fail(e); });
      };
    });
  };

  route();
})();
