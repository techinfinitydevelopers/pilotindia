/* Visual-editor overlay. Injected into a page opened with ?__cms=1 (see admin/server.mjs).
   Every element from the page source carries data-cms="<id>". In edit mode, hovering outlines the
   thing a click would edit (text, image or background) and a click sends it to the dashboard
   instead of following links. The dashboard sends back live previews of edits. */
(function () {
  if (window.parent === window) return;            // only inside the dashboard
  var VERSION = window.__CMS_VERSION__ || '';
  var editMode = true;
  var INLINE = { B: 1, STRONG: 1, EM: 1, I: 1, U: 1, BR: 1, SPAN: 1, A: 1, SMALL: 1, SUP: 1, SUB: 1, MARK: 1, ABBR: 1, CODE: 1 };
  var TEXT_TAGS = 'h1,h2,h3,h4,h5,h6,p,li,a,span,td,th,button,figcaption,label,blockquote,strong,em,b,small,dt,dd,div';

  function post(msg) { window.parent.postMessage(Object.assign({ cms: true }, msg), '*'); }

  // ---- what can be edited
  function textish(el) {
    if (!el || !el.hasAttribute || !el.hasAttribute('data-cms')) return false;
    var t = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (!t || t.length > 3000) return false;
    var kids = el.getElementsByTagName('*');
    for (var i = 0; i < kids.length; i++) if (!INLINE[kids[i].tagName]) return false;
    return true;
  }
  function bgUrl(el) {
    var bg = getComputedStyle(el).backgroundImage;
    var m = bg && bg.match(/url\(["']?(.*?)["']?\)/);
    return m && !/^data:/.test(m[1]) ? m[1] : '';
  }
  function resolve(t) {
    if (!t || t.nodeType !== 1) return null;
    var img = t.closest('img[data-cms]');
    if (img) return { el: img, kind: 'img' };
    var x = t.closest(TEXT_TAGS);
    while (x) {
      if (textish(x)) return { el: x, kind: 'text' };
      x = x.parentElement && x.parentElement.closest(TEXT_TAGS);
    }
    for (var b = t; b && b !== document.documentElement; b = b.parentElement) {
      if (b.hasAttribute && b.hasAttribute('data-cms') && bgUrl(b)) return { el: b, kind: 'bg' };
    }
    return null;
  }
  function pathOf(u) {    // absolute URL -> site-root-relative path
    try { var a = new URL(u, location.href); return a.origin === location.origin ? a.pathname.replace(/^\/+/, '') : u; } catch (e) { return u; }
  }
  function describe(hit) {
    var el = hit.el, link = el.closest('a[data-cms]');
    var d = { type: 'pick', id: el.getAttribute('data-cms'), kind: hit.kind, tag: el.tagName.toLowerCase() };
    if (hit.kind === 'text') d.html = el.innerHTML.replace(/\sdata-cms="\d+"/g, '').trim();
    if (hit.kind === 'img') { d.src = pathOf(el.getAttribute('bv-data-src') || el.currentSrc || el.src); d.alt = el.getAttribute('alt') || ''; }
    if (hit.kind === 'bg') d.src = pathOf(bgUrl(el));
    if (link) { d.linkId = link.getAttribute('data-cms'); d.href = link.getAttribute('href') || ''; d.hrefPath = pathOf(link.href); }
    var r = el.getBoundingClientRect(); d.w = Math.round(r.width); d.h = Math.round(r.height);
    return d;
  }

  // ---- hover + selection boxes
  function box(cls) { var b = document.createElement('div'); b.className = 'cms-box ' + cls; b.innerHTML = '<span class="cms-box__tag"></span>'; document.documentElement.appendChild(b); return b; }
  var hover = box('cms-box--hover'), sel = box('cms-box--sel');
  var selected = null;
  var LABEL = { text: 'Text', img: 'Image', bg: 'Background' };
  function place(b, el, label) {
    if (!el) { b.style.display = 'none'; return; }
    var r = el.getBoundingClientRect();
    b.style.display = 'block';
    b.style.transform = 'translate(' + (r.left + scrollX) + 'px,' + (r.top + scrollY) + 'px)';
    b.style.width = r.width + 'px'; b.style.height = r.height + 'px';
    b.firstChild.textContent = label;
  }
  document.addEventListener('mousemove', function (e) {
    if (!editMode) { place(hover, null); return; }
    var hit = resolve(e.target);
    place(hover, hit && hit.el !== (selected && selected.el) ? hit.el : null, hit ? LABEL[hit.kind] : '');
  }, true);
  document.addEventListener('mouseleave', function () { place(hover, null); });
  function reposition() { if (selected) place(sel, selected.el, LABEL[selected.kind]); }
  addEventListener('scroll', reposition, { passive: true });
  addEventListener('resize', reposition);

  // in edit mode a click selects instead of navigating or submitting
  function choose(hit) {
    selected = hit; place(sel, hit.el, LABEL[hit.kind]); place(hover, null);
    post(describe(hit));
  }
  document.addEventListener('click', function (e) {
    if (!editMode) return;
    e.preventDefault(); e.stopPropagation();
    var hit = resolve(e.target);
    if (hit) choose(hit);
  }, true);
  document.addEventListener('submit', function (e) { if (editMode) e.preventDefault(); }, true);

  // ---- messages from the dashboard
  function byId(id) { return document.querySelector('[data-cms="' + id + '"]'); }
  window.addEventListener('message', function (e) {
    var m = e.data || {};
    if (!m.cms) return;
    if (m.type === 'mode') { editMode = !!m.on; document.documentElement.classList.toggle('cms-editing', editMode); if (!editMode) { place(hover, null); place(sel, null); selected = null; } }
    if (m.type === 'apply') {
      var el = byId(m.id); if (!el) return;
      if (m.op === 'html') el.innerHTML = m.value;
      if (m.op === 'img') { el.removeAttribute('srcset'); el.removeAttribute('sizes'); el.src = '/' + m.value.replace(/^\/+/, ''); }
      if (m.op === 'bg') el.style.setProperty('background-image', 'url("/' + m.value.replace(/^\/+/, '') + '")', 'important');
      if (m.op === 'href') el.setAttribute('href', m.value);
      if (m.op === 'alt') el.setAttribute('alt', m.value);
      setTimeout(reposition, 50);
    }
    if (m.type === 'deselect') { selected = null; place(sel, null); }
    // the form editor asks the page to show an element: scroll it into view and outline it
    if (m.type === 'focus') {
      var fe = byId(m.id); if (!fe) return;
      var kind = fe.tagName === 'IMG' ? 'img' : (m.kind || 'text');
      fe.scrollIntoView({ behavior: 'smooth', block: m.block || 'center' });
      selected = { el: fe, kind: kind };
      place(sel, fe, m.label || LABEL[kind]);
      [250, 600, 1000].forEach(function (t) { setTimeout(reposition, t); });
    }
    if (m.type === 'hero') {
      var hero = document.querySelector('.pg-hero[data-cms], .pi-hero[data-cms], .et_pb_section_0[data-cms], section[data-cms], .et_pb_section[data-cms]');
      if (!hero) return;
      scrollTo({ top: 0, behavior: 'smooth' });
      var img = hero.querySelector('img.pi-hero__media[data-cms]');
      choose(img ? { el: img, kind: 'img' } : bgUrl(hero) ? { el: hero, kind: 'bg' } : (resolve(hero.querySelector('h1,h2,h3')) || { el: hero, kind: 'bg' }));
    }
  });

  document.documentElement.classList.add('cms-editing');
  post({ type: 'ready', version: VERSION, path: location.pathname.replace(/^\/+/, ''), title: document.title });
})();
