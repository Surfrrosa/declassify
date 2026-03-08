/* =========================================
   BROADCAST - app.js
   Redaction reveal, war day counter,
   scroll interactions.
   ========================================= */

(function () {
  'use strict';

  // --- War day counter ---
  var WAR_START = new Date('2026-02-28T00:00:00Z');

  function getWarDay() {
    var now = new Date();
    var diff = now - WAR_START;
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  var dayEl = document.getElementById('war-day');
  if (dayEl) {
    dayEl.textContent = getWarDay();
  }

  // --- Redaction reveal ---
  var hero = document.getElementById('hero');
  var revealBtn = document.getElementById('reveal-btn');

  function revealHero() {
    if (hero.classList.contains('revealed')) return;
    hero.classList.add('revealed');

    // After reveal animation, add aria-live announcement
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

  // Also reveal on scroll past hero
  var heroRevealed = false;
  window.addEventListener('scroll', function () {
    if (heroRevealed) return;
    if (window.scrollY > 100) {
      heroRevealed = true;
      revealHero();
    }
  }, { passive: true });

  // Also reveal on keypress (space, enter, arrow down)
  document.addEventListener('keydown', function (e) {
    if (hero.classList.contains('revealed')) return;
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      revealHero();
    }
  });

  // --- Scroll-driven section fade-in ---
  var sections = document.querySelectorAll('.situation, .disputed, .blackout, .operations, .action');

  // Add initial hidden state
  sections.forEach(function (section) {
    section.style.opacity = '0';
    section.style.transform = 'translateY(20px)';
    section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  });

  // Respect reduced motion
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
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  // --- Silence block: marks visualization ---
  // Renders individual marks for the 165 number to give it human weight
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
    var marksEl = document.createElement('div');
    marksEl.className = 'silence-marks';
    marksEl.setAttribute('aria-hidden', 'true');

    // Insert after the silence-number
    var numberEl = container.querySelector('.silence-number');
    if (!numberEl) return;
    numberEl.parentNode.insertBefore(marksEl, numberEl.nextSibling);

    // Hide the big number
    numberEl.style.display = 'none';

    var count = 165;
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

    // Style the marks container
    marksEl.style.cssText = 'font-family: var(--font-mono); font-size: 0.9rem; letter-spacing: 2px; line-height: 1.8; color: var(--white); max-width: 500px; margin: 0 auto var(--space-md); word-break: break-all;';

    requestAnimationFrame(addBatch);
  }
})();
