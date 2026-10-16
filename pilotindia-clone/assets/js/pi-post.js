/* Blog post page (styles: pi-post.css). Uses only what the post already has:
   - removes headings the editor left empty (they show as blank gaps),
   - rebuilds the meta line as: Blog / category, then author . date . reading time (the post's own author, date and category),
   - lists the post's section headings in the side rail ("Contents"), highlighting the one being read,
   - draws a thin reading-progress bar. */
(function () {
  'use strict';
  // loaded with defer, so the document is parsed when this runs. (Not readyState: the page's delayed-script loader fakes it as 'loading'.)
  function ready(fn) { if (document.body && document.getElementById('main-content')) fn(); else document.addEventListener('DOMContentLoaded', fn); }
  ready(function () {
    if (!document.body.classList.contains('single-post')) return;
    var head = document.querySelector('#left-area > article > .et_post_meta_wrapper');
    var body = document.querySelector('#left-area > article > .entry-content');
    if (!head || !body) return;

    // 1. empty headings ("<h2> </h2>")
    Array.prototype.forEach.call(body.querySelectorAll('h1, h2, h3, h4, h5, h6'), function (h) {
      if (!h.textContent.replace(/ /g, ' ').trim() && !h.querySelector('img, svg, iframe')) h.parentNode.removeChild(h);
    });

    // 2. header: crumb + meta
    var title = head.querySelector('h1.entry-title');
    var meta = head.querySelector('p.post-meta');
    if (title && meta && !head.querySelector('.bp-meta')) {
      var author = meta.querySelector('.author a, .author');
      var date = meta.querySelector('.published');
      var cats = Array.prototype.slice.call(meta.querySelectorAll('a[rel~="category"], a[rel~="tag"]'));

      var crumb = document.createElement('nav');
      crumb.className = 'bp-crumb';
      crumb.setAttribute('aria-label', 'Breadcrumb');
      var blog = document.createElement('a');
      blog.href = '/blogs';
      blog.textContent = 'Blog';
      crumb.appendChild(blog);
      cats.forEach(function (c) {
        var sep = document.createElement('span'); sep.className = 'bp-crumb__sep'; crumb.appendChild(sep);
        var a = document.createElement('a'); a.href = c.getAttribute('href'); a.className = 'bp-pill'; a.textContent = c.textContent.trim();
        crumb.appendChild(a);
      });
      head.insertBefore(crumb, title);

      var words = (body.textContent || '').trim().split(/\s+/).length;
      var mins = Math.max(1, Math.round(words / 220));
      var line = document.createElement('div');
      line.className = 'bp-meta';
      if (author) {
        var who = document.createElement('span'); who.className = 'bp-meta__who';
        var av = document.createElement('span'); av.className = 'bp-meta__av'; av.setAttribute('aria-hidden', 'true');
        av.textContent = (author.textContent.trim()[0] || 'P').toUpperCase();
        who.appendChild(av);
        var name = author.tagName === 'A' ? author.cloneNode(true) : document.createElement('span');
        if (author.tagName !== 'A') name.textContent = author.textContent.trim();
        who.appendChild(name);
        line.appendChild(who);
      }
      function dot() { var d = document.createElement('span'); d.className = 'bp-meta__dot'; d.setAttribute('aria-hidden', 'true'); line.appendChild(d); }
      if (date) { dot(); var t = document.createElement('span'); t.textContent = date.textContent.trim(); line.appendChild(t); }
      dot();
      var rt = document.createElement('span'); rt.textContent = mins + ' min read'; line.appendChild(rt);
      title.parentNode.insertBefore(line, title.nextSibling);
    }

    // 2b. under the article: "From the blog" - the three newest other posts as picture cards, read from the Blogs page
    //     (/blogs, rebuilt whenever a post is added in the admin, so this is always current). Until it loads, or if it
    //     cannot, the post's own "Recent posts" links are shown. The "Products" box is dropped.
    var side = document.getElementById('sidebar');
    if (side && !document.querySelector('.bp-more')) {
      var prod = side.querySelector('.widget_nav_menu');
      if (prod) prod.parentNode.removeChild(prod);
      var recent = side.querySelector('.widget_recent_entries');
      var here = location.pathname.replace(/\/+$/, '').split('/').pop().replace(/\.html$/, '');
      var slugOf = function (href) { try { return new URL(href, location.href).pathname.replace(/\/+$/, '').split('/').pop().replace(/\.html$/, ''); } catch (e) { return ''; } };
      var more = document.createElement('section');
      more.className = 'bp-more';
      more.setAttribute('aria-labelledby', 'bp-more-t');
      more.innerHTML = '<div class="bp-more__head"><div><p class="bp-more__eyebrow">From the blog</p><h2 class="bp-more__t" id="bp-more-t">Recent posts</h2></div>' +
        '<a class="bp-more__all" href="/blogs">All articles <span aria-hidden="true">&rarr;</span></a></div><div class="bp-more__grid"></div>';
      var grid = more.querySelector('.bp-more__grid');
      var card = function (o) {
        var a = document.createElement('a');
        a.className = 'bp-card' + (o.img ? '' : ' bp-card--text');
        a.href = o.href;
        if (o.img) { var pic = document.createElement('span'); pic.className = 'bp-card__pic'; pic.style.setProperty('--pic', 'url("' + o.img + '")'); var im = document.createElement('img'); im.src = o.img; im.alt = ''; im.loading = 'lazy'; im.decoding = 'async'; pic.appendChild(im); a.appendChild(pic); }
        var bd = document.createElement('span'); bd.className = 'bp-card__body';
        if (o.date) { var dt = document.createElement('span'); dt.className = 'bp-card__date'; dt.textContent = o.date; bd.appendChild(dt); }
        var h = document.createElement('span'); h.className = 'bp-card__t'; h.textContent = o.title; bd.appendChild(h);
        var go = document.createElement('span'); go.className = 'bp-card__go'; go.setAttribute('aria-hidden', 'true'); go.innerHTML = '&rarr;'; bd.appendChild(go);
        a.appendChild(bd);
        return a;
      };
      var fill = function (list) { grid.innerHTML = ''; list.slice(0, 3).forEach(function (o) { grid.appendChild(card(o)); }); };
      if (recent) {
        fill(Array.prototype.map.call(recent.querySelectorAll('a'), function (x) { return { href: x.getAttribute('href'), title: x.textContent.trim() }; })
          .filter(function (o) { return slugOf(o.href) !== here; }));
        recent.parentNode.removeChild(recent);
      }
      body.parentNode.insertBefore(more, body.nextSibling);
      if (window.fetch && window.DOMParser) {
        fetch('/blogs', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.text() : Promise.reject(); }).then(function (html) {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var list = Array.prototype.map.call(doc.querySelectorAll('.pi-blogs__card .pi-blogs__link'), function (a) {
            var t = a.querySelector('.pi-blogs__title'), m = a.querySelector('.pi-blogs__meta'), im = a.querySelector('img');
            return { href: a.getAttribute('href'), title: t ? t.textContent.trim() : '', date: m ? m.textContent.trim() : '', img: im ? im.getAttribute('src') : '' };
          }).filter(function (o) { return o.title && slugOf(o.href) !== here; });
          if (list.length) fill(list);
        }).catch(function () { /* keep the links */ });
      }
    }

    // 3. contents in the rail
    var rail = document.getElementById('sidebar');
    var hs = Array.prototype.filter.call(body.querySelectorAll('h2'), function (h) { return !h.closest('.pi-acc-wrap, .pi-acc') && h.textContent.trim(); });   // empty headings make empty entries
    if (rail && hs.length >= 2 && !rail.querySelector('.bp-toc')) {
      var box = document.createElement('div');
      box.className = 'et_pb_widget bp-toc';
      var top = document.createElement('div'); top.className = 'bp-toc__top';
      var tt = document.createElement('h4'); tt.className = 'bp-toc__t'; tt.textContent = 'Contents';
      var pc = document.createElement('span'); pc.className = 'bp-toc__pc'; pc.textContent = '0%';
      top.appendChild(tt); top.appendChild(pc); box.appendChild(top);
      var track = document.createElement('div'); track.className = 'bp-toc__track'; track.innerHTML = '<i></i>'; box.appendChild(track);
      var ol = document.createElement('ol');
      var links = [];
      hs.forEach(function (h, i) {
        if (!h.id) h.id = 'section-' + (i + 1) + '-' + h.textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
        var li = document.createElement('li');
        var a = document.createElement('a'); a.href = '#' + h.id; a.textContent = h.textContent.replace(/\s+/g, ' ').trim();
        li.appendChild(a); ol.appendChild(li); links.push(a);
      });
      box.appendChild(ol);
      rail.insertBefore(box, rail.firstChild);
      if ('IntersectionObserver' in window) {
        var on = null;
        var io = new IntersectionObserver(function (es) {
          es.forEach(function (e) {
            if (!e.isIntersecting) return;
            var k = hs.indexOf(e.target);
            if (on) on.classList.remove('is-on');
            on = links[k]; if (on) on.classList.add('is-on');
          });
        }, { rootMargin: '-110px 0px -65% 0px' });
        hs.forEach(function (h) { io.observe(h); });
      }
    }

    // 4. reading progress
    if (!document.querySelector('.bp-progress')) {
      var bar = document.createElement('div'); bar.className = 'bp-progress'; bar.setAttribute('aria-hidden', 'true');
      document.body.appendChild(bar);
      var raf = 0;
      var update = function () {
        raf = 0;
        var r = body.getBoundingClientRect();
        var total = r.height - window.innerHeight * 0.6;
        var p = total > 0 ? Math.min(1, Math.max(0, (-r.top + 110) / total)) : 0;
        bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
        var pcEl = document.querySelector('.bp-toc__pc'), fl = document.querySelector('.bp-toc__track i');
        if (pcEl) pcEl.textContent = Math.round(p * 100) + '%';
        if (fl) fl.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      };
      window.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
      update();
    }
  });
})();
