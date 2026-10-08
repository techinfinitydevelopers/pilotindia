/**
 * Power Tools Series - Gallery & Individual Model View
 * Provides the identical grid + dedicated product page experience
 * used across Pilot India series pages (Evolution Series, Legacy Series, etc.)
 */
(function () {
  'use strict';

  function initPowerTools() {
    var hgSec = document.getElementById('pt-hg-25');
    var bl25Sec = document.getElementById('pt-bl-25');
    var bl26Sec = document.getElementById('pt-bl-26vs');

    if (!hgSec || !bl25Sec || !bl26Sec) return;

    var modelSections = [hgSec, bl25Sec, bl26Sec];
    var dividerSecs = Array.prototype.slice.call(
      document.querySelectorAll('[data-id="8349ebc"], [data-id="488c408"]')
    );

    var modelsData = [
      {
        id: 'pt-hg-25',
        slug: 'hg-25',
        name: 'HG-25',
        type: 'Heat Gun',
        typeCategory: 'Heat Gun',
        keySpecVal: '1800 W',
        keySpecLabel: 'heat gun',
        code: 'Dual Speed',
        image: '../assets/img/hg-25.jpg',
        order: 0,
        el: hgSec
      },
      {
        id: 'pt-bl-25',
        slug: 'bl-25',
        name: 'BL-25',
        type: 'Blower',
        typeCategory: 'Blower',
        keySpecVal: '600 W',
        keySpecLabel: 'blower',
        code: '120 CFM',
        image: '../assets/img/bl-25.jpg',
        order: 1,
        el: bl25Sec
      },
      {
        id: 'pt-bl-26vs',
        slug: 'bl-26vs',
        name: 'BL-26VS',
        type: 'Blower',
        typeCategory: 'Blower',
        keySpecVal: '680 W',
        keySpecLabel: 'variable speed',
        code: 'Variable Speed',
        image: '../assets/img/bl-25vs.png',
        order: 2,
        el: bl26Sec
      }
    ];

    var body = document.body;
    var baseTitle = 'Buy Industrial Power Tools India - Heat Guns & Blowers | Pilot India';
    var seriesName = 'Power Tools';

    // Helper: hydrate any Airlift lazy images in an element
    function hydrateImages(container) {
      if (!container) return;
      var imgs = container.querySelectorAll('img[bv-data-src]');
      imgs.forEach(function (img) {
        var realSrc = img.getAttribute('bv-data-src');
        if (realSrc && (!img.src || img.src.indexOf('data:image') === 0)) {
          img.src = realSrc;
        }
      });
    }

    // ── Build Gallery DOM ───────────────────────────────────────────
    var gallerySec = document.createElement('section');
    gallerySec.className = 'pg-gallery';
    gallerySec.id = 'pg-powertools-gallery';

    var head = document.createElement('div');
    head.className = 'pg-gallery__head';
    var eyebrow = document.createElement('span');
    eyebrow.className = 'pg-gallery__eyebrow';
    eyebrow.textContent = 'Pilot range';
    var title = document.createElement('h2');
    title.className = 'pg-gallery__title';
    title.textContent = seriesName;
    head.appendChild(eyebrow);
    head.appendChild(title);
    gallerySec.appendChild(head);

    // Toolbar (filter pills + search + sort)
    var bar = document.createElement('div');
    bar.className = 'pg-gallery__bar';

    var pills = document.createElement('div');
    pills.className = 'pg-gallery__pills';
    pills.setAttribute('role', 'group');
    pills.setAttribute('aria-label', 'Filter by type');

    var currentFilter = '';
    function createPill(label, filterVal) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pg-pill';
      btn.setAttribute('aria-pressed', filterVal === '' ? 'true' : 'false');
      btn.textContent = label;
      btn.addEventListener('click', function () {
        currentFilter = filterVal;
        pills.querySelectorAll('.pg-pill').forEach(function (p) {
          p.setAttribute('aria-pressed', p === btn ? 'true' : 'false');
        });
        applyGalleryFilter();
      });
      pills.appendChild(btn);
    }

    createPill('All models', '');
    createPill('Heat Guns', 'Heat Gun');
    createPill('Blowers', 'Blower');
    bar.appendChild(pills);

    var tools = document.createElement('div');
    tools.className = 'pg-gallery__tools';

    var searchLabel = document.createElement('label');
    searchLabel.className = 'pg-search';
    var searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.className = 'pg-search__input';
    searchInput.placeholder = 'Search models';
    searchInput.setAttribute('aria-label', 'Search models');
    searchLabel.appendChild(searchInput);
    tools.appendChild(searchLabel);

    var sortWrap = document.createElement('label');
    sortWrap.className = 'pg-sort';
    var sortText = document.createElement('span');
    sortText.className = 'pg-sort__label';
    sortText.textContent = 'Sort by';
    var sortSelect = document.createElement('select');
    sortSelect.className = 'pg-sort__select';
    [
      ['', 'Featured'],
      ['az', 'Name A–Z'],
      ['za', 'Name Z–A']
    ].forEach(function (opt) {
      var o = document.createElement('option');
      o.value = opt[0];
      o.textContent = opt[1];
      sortSelect.appendChild(o);
    });
    sortWrap.appendChild(sortText);
    sortWrap.appendChild(sortSelect);
    tools.appendChild(sortWrap);

    bar.appendChild(tools);
    gallerySec.appendChild(bar);

    var countText = document.createElement('p');
    countText.className = 'pg-gallery__count';
    countText.setAttribute('aria-live', 'polite');
    gallerySec.appendChild(countText);

    // Grid of cards
    var grid = document.createElement('div');
    grid.className = 'pg-gallery__grid';

    var tileElements = modelsData.map(function (m) {
      var tile = document.createElement('a');
      tile.className = 'pg-tile';
      tile.href = '?model=' + m.id;
      tile.setAttribute('data-id', m.id);
      tile.setAttribute('data-name', m.name);
      tile.setAttribute('data-type', m.typeCategory);
      tile.setAttribute('data-order', String(m.order));
      tile.setAttribute(
        'data-search',
        (m.name + ' ' + m.type + ' ' + m.keySpecVal + ' ' + m.code).toLowerCase()
      );

      var pic = document.createElement('span');
      pic.className = 'pg-tile__pic';
      var img = document.createElement('img');
      img.src = m.image;
      img.alt = m.name;
      img.loading = 'lazy';
      img.decoding = 'async';
      pic.appendChild(img);
      tile.appendChild(pic);

      var meta = document.createElement('span');
      meta.className = 'pg-tile__meta';
      var nameSpan = document.createElement('span');
      nameSpan.className = 'pg-tile__name';
      nameSpan.textContent = m.name;
      meta.appendChild(nameSpan);

      var lineSpan = document.createElement('span');
      lineSpan.className = 'pg-tile__line';
      var keySpan = document.createElement('span');
      keySpan.className = 'pg-tile__key';
      var b = document.createElement('b');
      b.textContent = m.keySpecVal;
      var specLbl = document.createElement('span');
      specLbl.textContent = ' ' + m.keySpecLabel;
      keySpan.appendChild(b);
      keySpan.appendChild(specLbl);
      lineSpan.appendChild(keySpan);

      var codeSpan = document.createElement('span');
      codeSpan.className = 'pg-tile__code';
      codeSpan.textContent = m.code;
      lineSpan.appendChild(codeSpan);

      meta.appendChild(lineSpan);
      tile.appendChild(meta);

      tile.addEventListener('click', function (e) {
        e.preventDefault();
        showModel(m.id, true);
      });

      grid.appendChild(tile);
      return tile;
    });

    gallerySec.appendChild(grid);

    // Filter & Sort Logic
    function applyGalleryFilter() {
      var query = searchInput.value.trim().toLowerCase();
      var sortMode = sortSelect.value;
      var ordered = tileElements.slice();

      if (sortMode === 'az') {
        ordered.sort(function (a, b) {
          return a.getAttribute('data-name').localeCompare(b.getAttribute('data-name'));
        });
      } else if (sortMode === 'za') {
        ordered.sort(function (a, b) {
          return b.getAttribute('data-name').localeCompare(a.getAttribute('data-name'));
        });
      } else {
        ordered.sort(function (a, b) {
          return +a.getAttribute('data-order') - +b.getAttribute('data-order');
        });
      }

      var shownCount = 0;
      ordered.forEach(function (tile) {
        grid.appendChild(tile);
        var matchesType = !currentFilter || tile.getAttribute('data-type') === currentFilter;
        var matchesSearch = !query || tile.getAttribute('data-search').indexOf(query) >= 0;
        var isVisible = matchesType && matchesSearch;
        tile.hidden = !isVisible;
        if (isVisible) shownCount++;
      });

      countText.textContent = shownCount
        ? 'Showing ' + shownCount + ' of ' + tileElements.length
        : 'No models match "' + searchInput.value.trim() + '"';
    }

    searchInput.addEventListener('input', applyGalleryFilter);
    sortSelect.addEventListener('change', applyGalleryFilter);
    applyGalleryFilter();

    // Insert Gallery right before the first product section
    hgSec.parentNode.insertBefore(gallerySec, hgSec);

    // ── Build Breadcrumb & Pager ─────────────────────────────────────
    var crumbBar = document.createElement('div');
    crumbBar.className = 'pg-crumb';
    var backBtn = document.createElement('a');
    backBtn.className = 'pg-crumb__back';
    backBtn.href = 'power-tools.html';
    backBtn.textContent = 'All ' + seriesName + ' models';
    backBtn.addEventListener('click', function (e) {
      e.preventDefault();
      showGallery(true);
    });
    var posSpan = document.createElement('span');
    posSpan.className = 'pg-crumb__pos';
    crumbBar.appendChild(backBtn);
    crumbBar.appendChild(posSpan);

    var pagerNav = document.createElement('nav');
    pagerNav.className = 'pg-pager';
    pagerNav.setAttribute('aria-label', 'Other models');

    // ── View Switching Logic ─────────────────────────────────────────
    function showGallery(updateHistory) {
      body.classList.remove('pg-view-model');
      body.classList.add('pg-view-gallery');
      document.title = baseTitle;

      gallerySec.style.display = 'block';

      if (crumbBar.parentNode) crumbBar.parentNode.removeChild(crumbBar);
      if (pagerNav.parentNode) pagerNav.parentNode.removeChild(pagerNav);

      modelSections.forEach(function (sec) {
        sec.style.display = 'none';
        sec.classList.remove('is-shown');
      });
      dividerSecs.forEach(function (sec) {
        sec.style.display = 'none';
      });

      if (updateHistory) {
        var cleanUrl = location.pathname;
        history.pushState(null, '', cleanUrl);
      }

      document.querySelectorAll('.pilot-marquee-item').forEach(function (mItem) {
        mItem.classList.remove('is-active');
      });

      // Smooth scroll up to gallery
      var hero = document.querySelector('.pilot-marquee-section') || gallerySec;
      if (hero) {
        hero.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    function showModel(targetId, updateHistory) {
      var foundIdx = -1;
      var targetModel = null;

      for (var i = 0; i < modelsData.length; i++) {
        if (
          modelsData[i].id === targetId ||
          modelsData[i].slug === targetId ||
          'pt-' + modelsData[i].slug === targetId
        ) {
          foundIdx = i;
          targetModel = modelsData[i];
          break;
        }
      }

      if (!targetModel) {
        showGallery(false);
        return;
      }

      body.classList.remove('pg-view-gallery');
      body.classList.add('pg-view-model');
      document.title = targetModel.name + ' - ' + seriesName + ' | Pilot India';

      gallerySec.style.display = 'none';

      modelSections.forEach(function (sec, idx) {
        if (idx === foundIdx) {
          sec.style.display = 'flex';
          sec.classList.add('is-shown');
          hydrateImages(sec);
        } else {
          sec.style.display = 'none';
          sec.classList.remove('is-shown');
        }
      });
      dividerSecs.forEach(function (sec) {
        sec.style.display = 'none';
      });

      // Update Breadcrumbs
      posSpan.textContent = 'Model ' + (foundIdx + 1) + ' of ' + modelsData.length;
      targetModel.el.parentNode.insertBefore(crumbBar, targetModel.el);

      // Update Pager
      pagerNav.innerHTML = '';
      var prevModel = foundIdx > 0 ? modelsData[foundIdx - 1] : null;
      var nextModel = foundIdx < modelsData.length - 1 ? modelsData[foundIdx + 1] : null;

      if (prevModel) {
        var prevLink = document.createElement('a');
        prevLink.className = 'pg-pager__link pg-pager__link--prev';
        prevLink.href = '?model=' + prevModel.id;
        prevLink.innerHTML =
          '<span class="pg-pager__dir">Previous</span><span class="pg-pager__name">' +
          prevModel.name +
          '</span>';
        prevLink.addEventListener('click', function (e) {
          e.preventDefault();
          showModel(prevModel.id, true);
        });
        pagerNav.appendChild(prevLink);
      } else {
        var gap = document.createElement('span');
        gap.className = 'pg-pager__gap';
        pagerNav.appendChild(gap);
      }

      if (nextModel) {
        var nextLink = document.createElement('a');
        nextLink.className = 'pg-pager__link pg-pager__link--next';
        nextLink.href = '?model=' + nextModel.id;
        nextLink.innerHTML =
          '<span class="pg-pager__dir">Next</span><span class="pg-pager__name">' +
          nextModel.name +
          '</span>';
        nextLink.addEventListener('click', function (e) {
          e.preventDefault();
          showModel(nextModel.id, true);
        });
        pagerNav.appendChild(nextLink);
      } else {
        var gap2 = document.createElement('span');
        gap2.className = 'pg-pager__gap';
        pagerNav.appendChild(gap2);
      }

      targetModel.el.parentNode.insertBefore(pagerNav, targetModel.el.nextSibling);

      document.querySelectorAll('.pilot-marquee-item').forEach(function (mItem) {
        var href = mItem.getAttribute('href') || '';
        var hash = href.replace(/^#/, '');
        if (hash === targetModel.id || hash === targetModel.slug || hash === ('pt-' + targetModel.slug)) {
          mItem.classList.add('is-active');
        } else {
          mItem.classList.remove('is-active');
        }
      });

      if (updateHistory) {
        var newUrl = location.pathname + '?model=' + targetModel.id;
        history.pushState(null, '', newUrl);
      }

      // Smooth scroll to top of product view
      crumbBar.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Connect Marquee items to switch directly to models
    document.querySelectorAll('.pilot-marquee-item').forEach(function (mItem) {
      mItem.addEventListener('click', function (e) {
        var href = mItem.getAttribute('href') || '';
        var hash = href.replace(/^#/, '');
        if (hash) {
          e.preventDefault();
          showModel(hash, true);
        }
      });
    });

    // Check Initial URL
    function parseInitialUrl() {
      var params = new URLSearchParams(location.search);
      var modelParam = params.get('model');
      var hashParam = location.hash ? location.hash.replace(/^#/, '') : null;
      var target = modelParam || hashParam;

      if (target) {
        showModel(target, false);
      } else {
        showGallery(false);
      }
    }

    window.addEventListener('popstate', parseInitialUrl);
    window.addEventListener('hashchange', parseInitialUrl);

    parseInitialUrl();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPowerTools);
  } else {
    initPowerTools();
  }
})();
