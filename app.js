/* =========================================
   BROADCAST - app.js
   Data loader, redaction reveal, war day
   counter, scroll interactions.
   ========================================= */

(function () {
  'use strict';

  // --- Data loader ---
  // Fetches data.json and populates elements with data-bind attributes.
  // HTML elements keep their hardcoded fallback text in case fetch fails.

  function resolvePath(obj, path) {
    return path.split('.').reduce(function (o, key) {
      return o && o[key];
    }, obj);
  }

  function bindData(data) {
    document.querySelectorAll('[data-bind]').forEach(function (el) {
      var val = resolvePath(data, el.getAttribute('data-bind'));
      if (val !== undefined) el.textContent = val;
    });

    document.querySelectorAll('[data-bind-href]').forEach(function (el) {
      var val = resolvePath(data, el.getAttribute('data-bind-href'));
      if (val !== undefined) el.href = val;
    });

    if (data.meta && data.meta.warStartDate) {
      // Parse "YYYY-MM-DD" as local midnight (not UTC) so the day count
      // matches calendar.js and rolls at the visitor's local midnight.
      var p = data.meta.warStartDate.split('-');
      var start = new Date(+p[0], +p[1] - 1, +p[2]);
      var now = new Date();
      var day = Math.max(1, Math.ceil((now - start) / (1000 * 60 * 60 * 24)));
      var dayEl = document.getElementById('war-day');
      if (dayEl) dayEl.textContent = day;
    }

    if (data.meta && data.meta.lastUpdated) {
      document.querySelectorAll('.footer-updated').forEach(function (el) {
        el.textContent = 'Data updated: ' + data.meta.lastUpdated;
      });
    }

    if (data.silence && data.silence.count) {
      silenceCount = data.silence.count;
    }
  }

  // Set by bindData() from data.json. If fetch fails, stays null and
  // renderMarks bails so the HTML fallback number stays visible.
  var silenceCount = null;

  fetch('data.json')
    .then(function (r) { return r.json(); })
    .then(bindData)
    .catch(function (err) {
      console.warn('data.json fetch failed, using HTML fallbacks:', err);
    });

  // --- War day counter (fallback if data.json fails) ---
  // Local midnight, matching calendar.js. Single source of truth is
  // data.meta.warStartDate in data.json; this hardcoded fallback only
  // runs if fetch fails.
  var WAR_START = new Date(2026, 1, 28);

  function getWarDay() {
    var now = new Date();
    var diff = now - WAR_START;
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  var dayEl = document.getElementById('war-day');
  if (dayEl) {
    dayEl.textContent = getWarDay();
  }

  // --- Redaction reveal (index page only) ---
  var hero = document.getElementById('hero');
  var revealBtn = document.getElementById('reveal-btn');

  if (hero) {
    var siteNav = document.getElementById('site-nav');

    function revealHero() {
      if (hero.classList.contains('revealed')) return;
      hero.classList.add('revealed');
      if (siteNav) siteNav.classList.add('nav-inverted');

      setTimeout(function () {
        var announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        announcement.className = 'sr-only';
        announcement.textContent = 'Content revealed: The United States is at war. Simultaneous military operations across 7+ countries. No congressional authorization. No major press inside the Pentagon.';
        document.body.appendChild(announcement);
      }, 1000);
    }

    if (revealBtn) {
      revealBtn.addEventListener('click', revealHero);
    }

    var heroRevealed = false;
    window.addEventListener('scroll', function () {
      if (heroRevealed) return;
      if (window.scrollY > 100) {
        heroRevealed = true;
        revealHero();
      }
    }, { passive: true });

    document.addEventListener('keydown', function (e) {
      if (hero.classList.contains('revealed')) return;
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        revealHero();
      }
    });
  }

  // --- Scroll-driven section fade-in ---
  var sections = document.querySelectorAll('.situation, .disputed, .blackout, .operations, .action');

  var isDesktop = window.innerWidth >= 768;

  sections.forEach(function (section) {
    section.style.opacity = '0';
    section.style.transform = 'translateY(20px)';
    section.style.transition = isDesktop
      ? 'opacity 1.2s ease, transform 1.2s ease'
      : 'opacity 0.6s ease, transform 0.6s ease';
  });

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    sections.forEach(function (section) {
      section.style.opacity = '1';
      section.style.transform = 'none';
    });
  } else {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: isDesktop ? 0.2 : 0.1,
      rootMargin: isDesktop ? '0px 0px -120px 0px' : '0px 0px -50px 0px'
    });

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  // --- Silence block: marks visualization ---
  var silenceBlock = document.getElementById('silence');
  if (silenceBlock && !prefersReducedMotion) {
    var silenceObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          renderMarks(silenceBlock);
          silenceObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });

    silenceObserver.observe(silenceBlock);
  }

  function renderMarks(container) {
    if (!silenceCount) return;

    var marksEl = document.createElement('div');
    marksEl.className = 'silence-marks';
    marksEl.setAttribute('aria-hidden', 'true');

    var numberEl = container.querySelector('.silence-number');
    if (!numberEl) return;
    numberEl.parentNode.insertBefore(marksEl, numberEl.nextSibling);
    numberEl.style.display = 'none';

    var count = silenceCount;
    var i = 0;
    var batchSize = 5;

    function addBatch() {
      var frag = document.createDocumentFragment();
      for (var j = 0; j < batchSize && i < count; j++, i++) {
        var mark = document.createElement('span');
        mark.className = 'silence-mark';
        mark.textContent = '|';
        frag.appendChild(mark);
      }
      marksEl.appendChild(frag);
      if (i < count) {
        requestAnimationFrame(addBatch);
      }
    }

    marksEl.style.cssText = 'font-family: var(--font-mono); font-size: 0.9rem; letter-spacing: 2px; line-height: 1.8; color: var(--white); max-width: 500px; margin: 0 auto var(--space-md); word-break: break-all;';

    requestAnimationFrame(addBatch);
  }

  // --- War cost ticker (impact page) ---
  // Anchored to ~$29B at Day 29 (March 28, 2026).
  // Rate: ~$1B/day ($11,574/sec). Sources: CSIS, CAP.
  var costEl = document.getElementById('war-cost');
  var pageCostEl = document.getElementById('page-cost');

  if (costEl) {
    var COST_BASE = 29000000000;
    var COST_BASE_TIME = new Date('2026-03-28T00:00:00Z').getTime();
    var COST_PER_MS = 1000000000 / 86400000;
    var pageOpen = Date.now();

    function fmtCost(n) {
      var s = Math.floor(n).toString();
      var parts = [];
      for (var i = s.length; i > 0; i -= 3) {
        parts.unshift(s.substring(Math.max(0, i - 3), i));
      }
      return '$' + parts.join(',');
    }

    function tickCost() {
      var now = Date.now();
      var total = COST_BASE + (now - COST_BASE_TIME) * COST_PER_MS;
      var since = (now - pageOpen) * COST_PER_MS;
      costEl.textContent = fmtCost(total);
      if (pageCostEl) pageCostEl.textContent = fmtCost(since);
      requestAnimationFrame(tickCost);
    }

    requestAnimationFrame(tickCost);

    // Seamless ticker: repeat content until it fills the screen,
    // then clone so the loop has no gaps.
    var track = document.getElementById('ticker-track');
    if (track) {
      var content = track.querySelector('.ticker-content');
      if (content) {
        var html = content.innerHTML;
        var MAX_TICKER_REPEATS = 20; // runaway-loop guard
        var n = 0;
        while (content.offsetWidth < window.innerWidth * 2 && n < MAX_TICKER_REPEATS) {
          content.innerHTML += html;
          n++;
        }
        track.appendChild(content.cloneNode(true));
        // Set speed relative to content width (consistent px/sec)
        var pxPerSec = 60;
        track.style.animationDuration = (content.offsetWidth / pxPerSec) + 's';
      }
    }
  }
})();
