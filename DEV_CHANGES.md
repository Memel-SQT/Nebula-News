# Development changes

## 2026-10-03 — 0.4.0: three themes and the Nebula family design

### Content: three themes, one per app

- General world news is gone. Nebula News follows three themes: personal growth and life
  organization (Nebula Clock), finance and financial education (Nebula Finterest), tech and
  computing (Nebula Hub).
- 29 French and English feeds, each checked with the ingestion's own parser on 2026-10-02.
  Each feed carries its theme, which replaces the keyword classifier. Outlets that block bots
  (Les Échos, Capital, Investopedia, Morningstar) are left out.
- Briefing: the five best articles of each theme over the last week, at most two per source,
  ordered round-robin across the themes. Recency half-life per theme: 96 h for personal growth,
  48 h for finance, 18 h for tech. Scores are computed again when the picks are made.
- Screens: `/theme/focus`, `/theme/finance` and `/theme/tech`, one briefing section per theme,
  and a read-only **Sources** screen (last collection of each source). The region filter is
  removed (it no longer means anything); the language filter stays.
- Nebula Link: `news.focus.today`, `news.finance.today` and `news.tech.today` widgets (public,
  WidgetV1) with their deep links. `news.headlines.today` now shows one story per theme.
- **Installed databases: no schema change.** The next ingestion adds the three theme rows and
  marks the former sources inactive. Their articles stay on disk, hidden; nothing is deleted.
  Checked on a copy of a 0.3.0 database (240 general-news articles): kept and hidden.

### Design: identical to the rest of the family

- Ported from Nebula Hub `05204fd` (headers in each file): @nebula/design (tokens, 4 themes,
  appearance model, sounds, effects, animated backgrounds, icons) and the Hub's shell (sidebar,
  dashboard grammar, screen states). Tailwind preset from nebula-design-system, mapped onto the
  @nebula/design variables (`styles/news/bridge.css`). No color value outside a token block.
- Sidebar as in the Hub: groups Briefing / Themes / Sources, 44 px entries, icon rail below
  1100 px, top bar below 720 px, then Settings, "Nebula apps" and the Nebula Hub status card
  (desktop), and the "Local, no account · Version" footer.
- Settings > Appearance: theme, language, accent, animated background, motion, sounds, reset,
  with the Hub's model, values and labels. Stored in a cookie read by the server: the page
  arrives already themed (no flash). Users of 0.3.0 had no appearance settings, so everyone
  starts on the family defaults (System theme). The language keeps its own cookie.
- Desktop: frameless window with themed `titleBarOverlay` controls. "Follow Nebula Hub's
  appearance" (on by default) applies the Hub's appearance 1:1. A "Detach" band appears in
  Hub mode (it was missing). Everything goes through cookies: still no preload, no IPC.
- Hub fonts (Aptos / Segoe UI Variable): the Google Fonts request is gone.
- New icons `newspaper` and `rss`, in the set's style. News mark redrawn on the DA rules
  (128 grid, plate `rx = 30`, halo). `desktop/icon.ico` is not regenerated yet.
- Screen states: skeletons, empty states, error (translated, no more English-only message),
  not found, and an offline banner when the last collection failed for every source.

### Fixes

- Relative times were one unit too small ("10 s" for 10 minutes, "10 min" for 10 hours).
- Feed text kept HTML entities (`I&#8217;m`, `&#160;`): numeric and common named entities
  are now decoded.
- Hydration mismatch on relative times across a minute boundary.

### Checks

- `npm test`: 33 tests (desktop rules, manifest validated by the Link SDK, themes, briefing
  picks, appearance cookie and its 1:1 match with the desktop side, collection status,
  entities, relative times, icons). `npm run typecheck` and `npm run build` pass.
- In the browser: every screen at 700×700, 1050×700, 1600×900 and 3440×1440, in Nebula
  dark/light and Glass dark/light with the Nebula, Ocean, Sunset and Aurora accents. No
  horizontal scroll; sidebar entries at 44 px (40 px on low windows, as in the Hub); nothing
  invisible with motion off.
- Desktop: unpacked build started on a throwaway profile (`--user-data-dir`, Link pointed at
  no Hub). The real profile was not touched. Frameless window rendered. The themed window
  controls and the Hub mode band were not captured (screen capture blocked) and remain to be
  checked by eye.
- No ESLint in the project (`npm run lint` would install it): lint not run.
