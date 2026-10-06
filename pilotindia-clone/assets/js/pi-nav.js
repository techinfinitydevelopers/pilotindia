/* ==========================================================================
   Framer Dynamic Navbar — Interactive Controller
   Framer Component: https://framer.com/m/Dyanmic-Navbar-MD51bK.js@mDPLUu5eFS42KaFa2LkM
   ========================================================================== */

(function () {
  'use strict';

  function initDynamicNavbar() {
    var pill = document.getElementById('framer-dyn-pill');
    var sectionText = document.getElementById('framer-dyn-section-text');
    var sectionBadge = document.querySelector('.framer-dyn-section');
    var burger = document.querySelector('.framer-dyn-burger');
    var drawer = document.getElementById('framer-dyn-mobile-drawer');
    var dropdownParent = document.querySelector('.framer-dyn-dropdown-parent');
    var dropdown = document.querySelector('.framer-dyn-dropdown');

    if (!pill) return;

    var currentSection = '';
    var isScrolled = false;
    var scrollThreshold = 80;

    // 1. Detect scroll position and toggle Static vs Scrolled / Collapsed
    function updateScrollState() {
      var scrollY = window.pageYOffset || document.documentElement.scrollTop;
      var nowScrolled = scrollY > scrollThreshold;

      if (nowScrolled !== isScrolled) {
        isScrolled = nowScrolled;
        if (isScrolled) {
          pill.classList.add('is-scrolled', 'is-collapsed');
        } else {
          pill.classList.remove('is-scrolled', 'is-collapsed', 'is-expanded');
        }
      }
    }

    window.addEventListener('scroll', updateScrollState, { passive: true });
    updateScrollState();

    // 2. Hover to Expand when scrolled
    var hoverTimer = null;
    pill.addEventListener('mouseenter', function () {
      if (isScrolled) {
        clearTimeout(hoverTimer);
        pill.classList.remove('is-collapsed');
        pill.classList.add('is-expanded');
      }
    });

    pill.addEventListener('mouseleave', function () {
      if (isScrolled) {
        hoverTimer = setTimeout(function () {
          pill.classList.remove('is-expanded');
          pill.classList.add('is-collapsed');
        }, 150);
      }
    });

    // 3. Section Tracker with Framer spring morph animation
    function setSectionTitle(newTitle) {
      if (!newTitle || newTitle === currentSection || !sectionText) return;
      currentSection = newTitle;

      // Framer appear animation: blur(10px) -> blur(0), translateY(8px) -> translateY(0)
      sectionText.classList.add('is-animating');
      setTimeout(function () {
        sectionText.textContent = newTitle;
        requestAnimationFrame(function () {
          sectionText.classList.remove('is-animating');
        });
      }, 100);
    }

    // Identify candidate sections
    var sections = Array.from(document.querySelectorAll('section, main > div, #main-footer, .pi-f2, footer'));
    
    function getSectionName(el) {
      if (el.getAttribute('data-nav-title')) return el.getAttribute('data-nav-title');
      
      var id = el.id || '';
      var cls = el.className || '';

      if (cls.indexOf('pi-hero') !== -1) return 'Hero';
      if (cls.indexOf('pi-stats') !== -1 || cls.indexOf('pi-deck') !== -1) return '700+ Dealers';
      if (id === 'products' || cls.indexOf('pi-showcase') !== -1) return 'Products';
      if (cls.indexOf('pi-about') !== -1) return 'About Pilot';
      if (cls.indexOf('pi-cap-sec') !== -1) return 'Manufacturing';
      if (id === 'industries' || cls.indexOf('pi-ind') !== -1) return 'Industries';
      if (cls.indexOf('pi-ins') !== -1) return 'Insights';
      if (cls.indexOf('pi-close') !== -1) return 'Get in Touch';
      if (id === 'main-footer' || cls.indexOf('pi-f2') !== -1) return 'Network';

      // Fallback: search for first h1 or h2
      var h = el.querySelector('h1, h2');
      if (h) {
        var txt = (h.textContent || '').trim().replace(/\s+/g, ' ');
        if (txt.length > 25) txt = txt.slice(0, 22) + '...';
        if (txt) return txt;
      }

      if (id) {
        return id.replace(/[-_]/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
      }

      return 'Pilot India';
    }

    // Track active section via IntersectionObserver or viewport position
    if ('IntersectionObserver' in window && sections.length > 0) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.15) {
            var name = getSectionName(entry.target);
            if (name) setSectionTitle(name);
          }
        });
      }, {
        rootMargin: '-20% 0px -55% 0px',
        threshold: [0.15, 0.4]
      });

      sections.forEach(function (sec) {
        observer.observe(sec);
      });
    } else {
      // Fallback on scroll
      window.addEventListener('scroll', function () {
        var scrollPos = window.pageYOffset + 200;
        for (var i = sections.length - 1; i >= 0; i--) {
          var sec = sections[i];
          if (sec.offsetTop <= scrollPos) {
            setSectionTitle(getSectionName(sec));
            break;
          }
        }
      }, { passive: true });
    }

    // 4. Click on Section badge scrolls smoothly to current section
    if (sectionBadge) {
      sectionBadge.addEventListener('click', function () {
        // Toggle expand so user can see links easily
        pill.classList.toggle('is-expanded');
        pill.classList.toggle('is-collapsed');
      });
    }

    // 5. Mobile Burger & Drawer
    if (burger && drawer) {
      burger.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = burger.getAttribute('aria-expanded') === 'true';
        burger.setAttribute('aria-expanded', String(!open));
        drawer.classList.toggle('is-open', !open);
      });

      document.addEventListener('click', function (e) {
        if (!pill.contains(e.target) && !drawer.contains(e.target)) {
          burger.setAttribute('aria-expanded', 'false');
          drawer.classList.remove('is-open');
        }
      });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          burger.setAttribute('aria-expanded', 'false');
          drawer.classList.remove('is-open');
        }
      });
    }

    // 6. Products dropdown hover/click disclosure for touch
    if (dropdownParent && dropdown) {
      var dropdownBtn = dropdownParent.querySelector('button');
      if (dropdownBtn) {
        dropdownBtn.addEventListener('click', function (e) {
          if (window.innerWidth <= 900) return;
          e.preventDefault();
          dropdown.classList.toggle('is-open');
        });
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDynamicNavbar);
  } else {
    initDynamicNavbar();
  }
})();
