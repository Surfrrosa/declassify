# Declassify

Sourced, verified reporting on the 2026 Iran war and US military operations. Static site at declassify.news, deployed on Vercel.

## Running

```bash
python -m http.server 8080
```

Open `http://localhost:8080`. No build step, no dependencies.

## Key Files

- `data.json` - single source of truth for all changing numbers
- `index.html` - dashboard (hero, situation report, contested info, blackout, operations, actions)
- `timeline.html` - chronology 2018-present
- `impact.html` - economic, environmental, humanitarian, geopolitical impact
- `app.js` - data loader, war day counter, redaction reveal, scroll effects
- `calendar.js` - war calendar heatmap (parses events from timeline HTML)
- `style.css` - design system (brutalist, black/white/gray, IBM Plex)

## Session Protocol

**Before starting any work, read the latest session log in `docs/sessions/`.**

Write a session log before ending every session. Format: `docs/sessions/YYYY-MM-DD.md`

## Update Workflow

1. Open `data.json`
2. Update changed numbers with new values and source URLs
3. If a new timeline event is needed, append to `timeline.html` following existing `tl-event` pattern
4. Update `meta.lastUpdated` in `data.json`
5. Verify locally: `python -m http.server 8080`
6. Commit and push (Vercel auto-deploys from main)

## File Structure

| File | Purpose |
|------|---------|
| `data.json` | All frequently-changing statistics (casualties, prices, markets, polls). Single source of truth for numbers. |
| `index.html` | Dashboard: situation report, contested info, blackout, operations, action items |
| `timeline.html` | Chronology: 2018-present, append-only |
| `impact.html` | Economic, environmental, humanitarian, geopolitical impact |
| `app.js` | Data loader (reads data.json via data-bind), war day counter, scroll effects, redaction reveal |
| `style.css` | Design system: brutalist, black/white/gray, IBM Plex fonts |
| `calendar.js` | War calendar heatmap: parses timeline events, renders density grid |
| `scripts/update-prices.py` | Auto-update script for oil prices (runs via GitHub Actions) |
| `.github/workflows/check-links.yml` | Daily broken link checker |
| `docs/sessions/` | Session logs |

## What Goes Where

- Numbers that change daily/weekly: `data.json`
- Timeline events: append to bottom of `tl-year` block in `timeline.html` (or add new `tl-year` div)
- Narrative blocks (supply chain, water, environment, etc.): edit HTML directly
- New stat grids: add to `data.json` + add `data-bind` attributes in HTML

## How data-bind Works

HTML elements with `data-bind="path.to.value"` are populated from `data.json` by `app.js`. Hardcoded text in HTML serves as fallback if JS or fetch fails.

```html
<div class="stat-number" data-bind="dashboard.killed.value">1,332</div>
<div class="stat-label" data-bind="dashboard.killed.label">Reported killed in Iran</div>
<a data-bind-href="dashboard.killed.sourceUrl" href="...">
  <span data-bind="dashboard.killed.sourceLabel">Al Jazeera</span>
</a>
```

Values in `data.json` are pre-formatted strings (`"1,332"` not `1332`).

## Conventions

- Every number cites its source. Source URL and label are coupled to the number in `data.json`.
- When figures are disputed, all sources are shown. No editorial judgment on which is correct.
- No editorializing. No conclusions drawn for the reader. Present facts and context.
- No emojis.
- No em dashes unless strictly necessary. Use colons or restructure the sentence.
- Source links open in new tab (`target="_blank" rel="noopener"`).
- Timeline events use class `tl-event`. Major events add `tl-event-major` (gets a left border).
- CSS classes use section-scoped patterns: `.stat-*`, `.tl-*`, `.ops-*`, `.impact-*`, `.silence-*`.
- Color palette: black, white, grays only. No red, no accent colors.

## Daily Update Checklist

Sources to check:
- [ ] [Al Jazeera death toll tracker](https://www.aljazeera.com/news/2026/3/1/us-israel-attacks-on-iran-death-toll-and-injuries-live-tracker) (casualties)
- [ ] [CENTCOM press releases](https://www.centcom.mil/MEDIA/PRESS-RELEASES/) (US casualties)
- [ ] [Military Times](https://www.militarytimes.com/) (Landstuhl, troop movements)
- [ ] [Airwars](https://airwars.org/) (strike counts)
- [ ] [CEOBS](https://ceobs.org/) (environmental tracking)
- [ ] [AAA gas prices](https://gasprices.aaa.com/) (national average)
- [ ] [CNBC oil prices](https://www.cnbc.com/quotes/@CL.1) (crude)

Weekly:
- [ ] Congressional votes or AUMF developments
- [ ] Press freedom updates (NYT lawsuit, new restrictions)
- [ ] New international positions
- [ ] Shipping/supply chain developments
- [ ] New polling data

## Known Technical Debt

### Timeline not data-driven (By design)
Timeline entries stay in HTML. They are append-only, structurally varied, and rarely edited once written. Templating from JSON would add complexity without saving time.
