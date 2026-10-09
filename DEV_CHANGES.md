# Development changes

## 2026-10-09 — 0.6.0: a "Nebula News" tab in each app

- **User request**: each app gets a "Nebula News" tab showing its own news (Nebula Hub ADR-036).
- `desktop/nebula-rules.js`: `THEMES` gain their `articles` capability; `themeArticles(page, themeKey, language, now)` turns a page of `/api/articles` into `ArticlesV1` (at most 20, titles 200, sources 80, summaries as plain one-line text up to 400, a `nebula://news/article?id=` link per article, articles with an unusual id or an unreadable date dropped, null when empty); `routeOfIntent` replaces the static `ROUTES` map and opens `/article/<id>` for a valid id only.
- `desktop/nebula.js`: provides `news.focus.articles`, `news.finance.articles`, `news.tech.articles` (public queries); intents and `--nebula-intent` go through `routeOfIntent`. `desktop/main.js`: the `articles` dependency reads `/api/articles?theme=<KEY>&pageSize=20` from the app's own server.
- `nebula.app.json`: the three queries (`ArticlesV1`) and the deep link `/article?id=`. `@nebula/link` 1.2.0 (the schema `ArticlesV1`); needs Nebula Hub 0.2.7 or later, which knows the schema.
- Tests: manifest declares the queries and the link; lists built, bounded, cleaned and without web address; empty themes give nothing; deep links only to declared screens or a valid article id.

## 2026-10-04 — 0.5.0: Nebula News becomes an extension of the other apps

- **User request**: News must run in the background systematically, open outside the Hub only when standalone, and make its articles appear in the apps they are meant for. It should be an extension of the other apps more than an app of its own. Hub side: Nebula Hub ADR-034 (catalog `extension`, background keeper, `/docked` route).
- **`--background`** (`BACKGROUND_SWITCH`): started by the Hub, News starts its server and Link but opens no window; closing every window no longer quits while the Hub is connected or in background mode (`quitWhenAllClosed`); a background News quits when the Hub goes away.
- **Inside the Hub only**: every window request (start, second launch, deep link, intent) goes through `showWindow`. Connected to the Hub, News asks to be placed (`link.intent('nebula.hub', '/docked', { id: 'nebula.news' })`, its own id only) and the requested screen is loaded in the docked window (`pendingRoute`). An older Hub refuses the route, and News then opens its own window. Without the Hub: the normal window, as before.
- **Release by the Hub** (`afterRelease`): still connected → back to the background (window destroyed, server and Link running); Hub gone and background → quit; otherwise → the normal window.
- The "Detach" band is removed: inside the Hub, the Hub's own bar (title, back to Home) is the one shown, and News never leaves for its own window there.
- Tests: `windowTarget`, `afterRelease`, `quitWhenAllClosed` (`desktop/nebula-rules.test.js`). Validation: typecheck, 37 tests, build.

## 2026-10-04 — 0.4.1: the window stays visible inside Nebula Hub

- **Hub mode**: the docked window could stay behind Nebula Hub ("… s'affiche ici" without the page), because Windows ignores `moveTop()` from an app without the foreground right (the Hub is active). It is now raised with `raiseDockedWindow` (`setAlwaysOnTop(true)`, `moveTop()`, `setAlwaysOnTop(false)`): on `raise`, whenever it reappears, and once its page is shown. `dockedWindowSteps` (`desktop/nebula-rules.js`, tested) decides show / raise. Nebula Hub ADR-032, applied by the Hub session from its `docs/PROMPT_DOCK_FIX.md`.
- **Full width**: `.workspace-inner` (`styles/news/hub-app.css`) loses its max width, docked in the Hub as on ultrawide screens.
- Validation: typecheck, 34 tests, `next build`. `next lint` is still not configured in this repository (it offers to create a config), unchanged.

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
