/* =========================================
   WAR CALENDAR
   Heatmap grid of the conflict. Each cell
   is one day. Density = event count.
   Parses events from the existing timeline
   HTML: no duplicate data source.
   ========================================= */

(function () {
  'use strict';

  var calView = document.getElementById('tl-calendar-view');
  if (!calView) return;

  var WAR_START = new Date(2026, 1, 28);
  var MONTHS = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
  };
  var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  var DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  function md(y, m, d) { return new Date(y, m, d); }

  function dkey(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  // --- Date parsing ---
  // Handles: "March 16, 2026", "March 18-19, 2026"
  // Returns array of Date objects (empty for month-only or year ranges)
  function parseDateStr(s) {
    var out = [];
    var r = s.match(/^(\w+)\s+(\d+)\s*[-\u2013]\s*(\d+),?\s*(\d{4})$/);
    if (r) {
      var m = MONTHS[r[1].toLowerCase()];
      if (m !== undefined) for (var d = +r[2]; d <= +r[3]; d++) out.push(md(+r[4], m, d));
      return out;
    }
    var sg = s.match(/^(\w+)\s+(\d+),?\s*(\d{4})$/);
    if (sg) {
      m = MONTHS[sg[1].toLowerCase()];
      if (m !== undefined) out.push(md(+sg[3], m, +sg[2]));
    }
    return out;
  }

  // --- Extract war-period events from the hidden list view ---
  function getEvents() {
    var list = document.getElementById('tl-list-view');
    if (!list) return [];
    var events = [];

    list.querySelectorAll('.tl-event').forEach(function (el) {
      var de = el.querySelector('.tl-date');
      if (!de) return;
      var dates = parseDateStr(de.textContent.trim()).filter(function (d) {
        return d >= WAR_START;
      });
      if (!dates.length) return;

      var body = el.querySelector('.tl-body');
      events.push({
        dates: dates,
        title: (el.querySelector('.tl-title') || {}).textContent || '',
        html: body ? body.innerHTML : '',
        isMajor: el.classList.contains('tl-event-major')
      });
    });
    return events;
  }

  // --- Group events by day ---
  function mapByDay(events) {
    var m = {};
    events.forEach(function (ev) {
      ev.dates.forEach(function (d) {
        var k = dkey(d);
        (m[k] = m[k] || []).push(ev);
      });
    });
    return m;
  }

  // --- Render the calendar grid ---
  function render(dayMap) {
    var now = new Date();
    var today = md(now.getFullYear(), now.getMonth(), now.getDate());
    var h = '';

    // Prelude: pre-war context
    h += '<div class="cal-prelude">' +
      '<div class="cal-prelude-label">Prelude: 2018\u20132025</div>' +
      '<p>JCPOA withdrawal. Sanctions. Assassinations. Nuclear escalation. ' +
      'The Twelve-Day War. Protests. Massacre. The chain of events that led here.</p>' +
      '<button class="cal-prelude-link" data-view="list">View full chronology</button>' +
      '</div>';

    // Grid
    h += '<div class="cal-grid">';

    // Day-of-week headers
    h += '<div class="cal-week">';
    DAY_LABELS.forEach(function (l) {
      h += '<div class="cal-day-header">' + l + '</div>';
    });
    h += '</div>';

    // Grid bounds: Sunday of war-start week through Saturday of today's week
    var sun0 = md(WAR_START.getFullYear(), WAR_START.getMonth(),
      WAR_START.getDate() - WAR_START.getDay());
    var endSat = md(today.getFullYear(), today.getMonth(),
      today.getDate() + (6 - today.getDay()));

    var curMonth = -1;
    var row = new Date(sun0);

    while (row <= endSat) {
      // Check if a new month starts in this week (within the war period)
      for (var p = 0; p < 7; p++) {
        var probe = md(row.getFullYear(), row.getMonth(), row.getDate() + p);
        if (probe >= WAR_START && probe <= today && probe.getMonth() !== curMonth) {
          curMonth = probe.getMonth();
          h += '<div class="cal-month-label">' +
            MONTH_NAMES[curMonth] + ' ' + probe.getFullYear() + '</div>';
          break;
        }
      }

      // Render the week row
      h += '<div class="cal-week">';
      for (var dow = 0; dow < 7; dow++) {
        var cd = md(row.getFullYear(), row.getMonth(), row.getDate() + dow);
        var k = dkey(cd);
        var evts = dayMap[k] || [];
        var n = evts.length;
        var major = evts.some(function (e) { return e.isMajor; });
        var inWar = cd >= WAR_START && cd <= today;
        var isToday = cd.getTime() === today.getTime();
        var den = Math.min(n, 4);
        var warDay = inWar ? Math.round((cd - WAR_START) / 86400000) + 1 : 0;

        var cls = 'cal-cell';
        cls += inWar ? ' cal-density-' + den : ' cal-cell-empty';
        if (isToday) cls += ' cal-cell-today';
        if (major) cls += ' cal-cell-major';
        if (n > 0) cls += ' cal-cell-active';

        var attr = '';
        if (inWar && n > 0) {
          attr = ' data-date="' + k + '" tabindex="0" role="button"' +
            ' aria-label="Day ' + warDay + ', ' + MONTH_NAMES[cd.getMonth()] + ' ' +
            cd.getDate() + ': ' + n + ' event' + (n > 1 ? 's' : '') + '"';
        }

        h += '<div class="' + cls + '"' + attr + '>';
        if (inWar) {
          if (major) h += '<span class="cal-bar"></span>';
        }
        h += '</div>';
      }
      h += '</div>';

      // Next week
      row = md(row.getFullYear(), row.getMonth(), row.getDate() + 7);
    }

    h += '</div>'; // .cal-grid

    // Legend
    h += '<div class="cal-legend">';
    h += '<span class="cal-legend-label">Fewer events</span>';
    for (var i = 0; i <= 4; i++) {
      h += '<span class="cal-legend-swatch cal-density-' + i + '"></span>';
    }
    h += '<span class="cal-legend-label">More events</span>';
    h += '<span class="cal-legend-sep"></span>';
    h += '<span class="cal-legend-major">' +
      '<span class="cal-legend-bar"></span> Major escalation</span>';
    h += '</div>';

    // Event detail panel (hidden until a day is selected)
    h += '<div id="cal-panel" class="cal-panel" hidden>' +
      '<div class="cal-panel-head">' +
      '<div id="cal-panel-date" class="cal-panel-date"></div>' +
      '<button class="cal-panel-close" aria-label="Close">\u00d7</button>' +
      '</div>' +
      '<div id="cal-panel-body" class="cal-panel-body"></div>' +
      '</div>';

    calView.innerHTML = h;
    wire(dayMap);
  }

  // --- Interactions ---
  function wire(dayMap) {
    var panel = document.getElementById('cal-panel');
    var pDate = document.getElementById('cal-panel-date');
    var pBody = document.getElementById('cal-panel-body');
    var sel = null;

    calView.addEventListener('click', function (e) {
      // Close button
      if (e.target.closest('.cal-panel-close')) return shut();

      // Prelude link switches to list view
      if (e.target.closest('.cal-prelude-link')) {
        var b = document.querySelector('.tl-toggle-btn[data-view="list"]');
        if (b) b.click();
        return;
      }

      // Day cell
      var cell = e.target.closest('[data-date]');
      if (!cell) return;
      var k = cell.getAttribute('data-date');

      // Toggle same cell
      if (sel === cell) return shut();

      // Select new cell
      if (sel) sel.classList.remove('cal-cell-selected');
      cell.classList.add('cal-cell-selected');
      sel = cell;

      // Populate panel
      var p = k.split('-');
      var d = md(+p[0], +p[1] - 1, +p[2]);
      var wd = Math.round((d - WAR_START) / 86400000) + 1;
      pDate.textContent = MONTH_NAMES[d.getMonth()] + ' ' + d.getDate() +
        ', ' + d.getFullYear() + ', Day ' + wd;

      pBody.innerHTML = (dayMap[k] || []).map(function (ev) {
        return '<div class="cal-event' + (ev.isMajor ? ' cal-event-major' : '') + '">' +
          '<div class="tl-body">' + ev.html + '</div></div>';
      }).join('');

      panel.hidden = false;
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    // Keyboard: Enter/Space to activate cells
    calView.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('[data-date]')) {
        e.preventDefault();
        e.target.click();
      }
    });

    function shut() {
      panel.hidden = true;
      if (sel) { sel.classList.remove('cal-cell-selected'); sel = null; }
    }
  }

  // --- View toggle ---
  document.querySelectorAll('.tl-toggle-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var view = this.getAttribute('data-view');
      document.querySelectorAll('.tl-toggle-btn').forEach(function (b) {
        b.classList.remove('tl-toggle-active');
      });
      this.classList.add('tl-toggle-active');
      calView.style.display = view === 'calendar' ? '' : 'none';
      document.getElementById('tl-list-view').style.display = view === 'list' ? '' : 'none';
    });
  });

  // --- Initialize ---
  var evts = getEvents();
  var dm = mapByDay(evts);
  render(dm);
})();
