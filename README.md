# Nebula News

A daily briefing on three themes, one per app of the Nebula family, aggregated
from reference French and English sources and presented in a premium, dark,
cosmic interface:

| Theme | For | Sources (examples) |
|---|---|---|
| **Personal growth** — organization, habits, focus, life balance | Nebula Clock | Cal Newport, Farnam Street, Ness Labs, Psyche, Cerveau & Psycho, Habitudes Zen |
| **Finance** — budgeting, saving, investing, financial literacy | Nebula Finterest | La finance pour tous, Finance Héros, Le Revenu, NerdWallet, Kiplinger |
| **Tech & computing** — software, AI, security, hardware | Nebula Hub | Next, Numerama, Le Monde Informatique, Ars Technica, MIT Technology Review |

General world news is gone since 0.4.0: articles from the former sources stay
in the local database but are no longer shown (see
[How ingestion works](#how-ingestion-works)).

Ships as a **Windows desktop app** — zero setup, no server to run or
database to host, just an installer. The same code also works as a
Postgres-backed hosted web app if you'd rather deploy it (see
[Running as a hosted web app](#running-as-a-hosted-web-app-instead)).

Visual identity is shared 1:1 with the [Nebula](../Nebula) desktop app: the
same black → navy → violet gradient, card system, and typography, ported from
its `theme.css` into Tailwind tokens (see [Design system](#design-system)).

## Tech stack

- **Next.js 15** (App Router, React Server Components) + **TypeScript**
- **Tailwind CSS**, hand-rolled component primitives in `components/ui`
  (no external UI kit — kept the dependency surface small and the tokens
  identical to the Nebula desktop app's theme)
- **SQLite** via **Prisma** — a single local file, no server to run. The
  desktop build keeps it under the OS per-user app-data folder, mirroring
  how the Nebula desktop app stores its own `nebula.db`
- **rss-parser** for feed ingestion; optional **Claude API** for LLM
  summarization (falls back to a built-in extractive summarizer when no key
  is set, so the app runs with zero external API keys)
- **Electron** wraps the built Next.js server (`output: "standalone"`) for
  the desktop build; **electron-builder** produces the Windows installer

Auth (Clerk/Auth.js) is *not* wired up — the `User`/`Favorite` tables in
`prisma/schema.prisma` are ready for it, but adding a full auth flow was out
of scope for a first pass. See [Adding authentication](#adding-authentication).

## Project structure

```
app/
  layout.tsx              root layout: locale, I18nProvider, Navbar, bg glow
  page.tsx                home dashboard (filters + article grid)
  briefing/page.tsx        daily briefing (one section per theme)
  theme/[theme]/page.tsx   one theme: /theme/focus, /theme/finance, /theme/tech
  article/[id]/page.tsx    article detail view
  api/
    articles/route.ts       GET  filtered article list
    briefing/today/route.ts GET  today's briefing
    search/route.ts         GET  keyword search
    ingest/route.ts          GET/POST ingestion trigger (cron / Electron scheduler / manual)
components/
  ui/          Badge, Button, Card — shared primitives
  layout/      Navbar, PageShell, SectionHeader, BgGlow
  filters/     LanguageToggle, ThemeChips, FilterBar
  news/        NewsCard, Tag, ArticleGrid, Pagination
lib/
  db.ts                    Prisma client singleton
  articles.ts              data access layer (list/search/briefing queries)
  utils.ts                 cn(), timeAgo()
  i18n/                    fr.json, en.json, dictionary + locale helpers
  sources/config.ts        the configurable source list
  ingestion/               fetchFeeds, normalize, run (orchestrator)
  processing/               score (importance), summarize
  themes.ts                the three themes: briefing picks, ordering (tested)
desktop/
  main.js                  Electron main process (spawns the server, opens the window)
  icon.ico                 app/installer icon
prisma/
  schema.prisma
  seed.ts                  seeds the three themes + sources from lib/sources/config.ts
scripts/
  run-ingestion.ts         `npm run ingest` entrypoint
  prepare-desktop-build.mjs builds the standalone server bundle for packaging
  build-template-db.mjs    builds the seeded, article-free DB shipped in the installer
  after-pack.cjs           electron-builder hook: copies the standalone server + its node_modules
types/                     shared TS types (ArticleCard, BriefingResponse, ...)
```

## Getting started (development)

### 1. Prerequisites

- Node.js 20+
- Nothing else — SQLite is a local file, no database server to install.

### 2. Install

```bash
npm install
cp .env.example .env
```

`.env` defaults to a local `prisma/dev.db` file. Optionally set
`ANTHROPIC_API_KEY` to enable LLM summaries instead of the extractive
fallback. `INGEST_SECRET` only matters if you deploy this as a hosted web
app (see below) — leave it unset for local dev.

### 3. Database

```bash
npx prisma migrate dev --name init
npm run seed
```

`npm run seed` seeds the three themes and the sources from
[`lib/sources/config.ts`](lib/sources/config.ts) into the `Source` table.

### 4. Fetch the first batch of articles

```bash
npm run ingest
```

This runs the full ingestion pipeline once (fetch → normalize → theme →
summarize → score → store) and marks the day's top stories for the
briefing. It's idempotent — run it as often as you like.

### 5. Run the app

```bash
npm run dev
```

Open http://localhost:3000.

## Building the desktop installer

```bash
npm run build:desktop
```

This runs, in order:

1. `next build` — compiles the app to `.next/standalone` (a self-contained
   Node server, no `next start`/CLI needed to run it).
2. `scripts/prepare-desktop-build.mjs` — copies `public/`, `.next/static`,
   and the generated Prisma client (incl. the native query-engine binary)
   into the standalone bundle, and strips any `.env*` files `next build`
   copied in (so a local dev secret never ships inside the installer).
3. `scripts/build-template-db.mjs` — builds `prisma/template.db`: schema
   migrated, sources/categories seeded, **zero articles**. This is what
   `desktop/main.js` copies into the user's app-data folder on first launch.
4. `electron-builder --win` — packages everything into
   `dist-desktop/Nebula-News-Setup-<version>.exe` (NSIS installer) with its
   `latest.yml` (size and SHA-512), which Nebula Hub checks before it runs
   anything — publish both on a GitHub release of this repository to make the
   app installable from the Hub. The
   `afterPack` hook (`scripts/after-pack.cjs`) copies the standalone
   server's `node_modules` into the packaged app directly, bypassing
   electron-builder's own file filter, which otherwise silently drops
   nested `node_modules` folders inside `extraResources`.

To run the unpacked app without building an installer (faster iteration):

```bash
npm run build
node scripts/prepare-desktop-build.mjs
npm run build:template-db
npm run electron:dev
```

### How the desktop app works

- **No install-time server.** `desktop/main.js` spawns
  `.next/standalone/server.js` as a plain Node child process (via
  Electron's own binary in `ELECTRON_RUN_AS_NODE` mode — no separate Node
  runtime is bundled) on a free local port bound to `127.0.0.1`, waits for
  it to respond, then opens a `BrowserWindow` on it.
- **First launch** copies the bundled `template.db` into
  `app.getPath('userData')` (e.g. `%APPDATA%\Nebula News\nebula-news.db`).
  Later launches reuse that file as-is, so ingested articles persist across
  app restarts/updates.
- **Ingestion scheduling**: since there's no cron infrastructure inside a
  desktop app, `main.js` itself calls `GET /api/ingest` on the local server
  5 seconds after startup and then every 3 hours for as long as the app is
  open. This hits the same endpoint Vercel Cron hits for the hosted-web
  deployment — the server code doesn't know or care which one triggered it.
- **No secrets shipped.** The server only ever binds to `127.0.0.1`, so
  `/api/ingest` is called unauthenticated by design (see
  `app/api/ingest/route.ts` — no `INGEST_SECRET` means open access); the
  build strips `.env*` from the packaged bundle so nothing from your local
  dev environment leaks into the installer regardless.

### Nebula Hub (optional)

When [Nebula Hub](https://github.com/Memel-SQT/Nebula-Hub) is installed, the
desktop app connects to it through Nebula Link (`desktop/nebula.js`, SDK
`@nebula/link`, manifest `nebula.app.json` shipped in `resources\`), a local
named pipe — never a network call. It only shares public data:

- the **"Top stories" widget** (`news.headlines.today`): the first three
  stories of today's briefing, one per theme, with their source;
- **one widget per theme**, for the app of that theme: `news.focus.today`
  (Nebula Clock), `news.finance.today` (Nebula Finterest) and
  `news.tech.today` (the Hub's Home). Each opens its theme
  (`nebula://news/theme/focus|finance|tech`); an app reads its widget with
  `link.query(...)` after declaring it in its own `consumes`;
- **"Your briefing is ready"** in the Hub's activity centre, once a day;
- deep links and the intent `news.open-briefing` (`nebula://news/briefing`),
  which Nebula Clock's long breaks can offer;
- the **Nebula language**, applied only when it changes in the Hub, so the
  app's own language toggle keeps working;
- the **Hub mode**: the window can open inside the Hub's window (frameless,
  placed by the Hub), and comes back to normal when released or when the Hub
  goes away.

A "Nebula apps" link in the navigation (desktop only) opens the Hub, or its
download page when it is not installed. Without the Hub nothing changes. The
pure rules are tested with `npm test` (`node --test`).

Also in the desktop shell: one instance at a time (a second launch or a deep
link goes to the running one), and the window never navigates away from the
app (links open in the browser, http(s) only; nothing else opens).

## How ingestion works

`npm run ingest` (and `GET/POST /api/ingest`) run
[`lib/ingestion/run.ts`](lib/ingestion/run.ts), which for every source in
`lib/sources/config.ts`:

1. Fetches and parses the RSS feed (`lib/ingestion/fetchFeeds.ts`).
2. Normalizes each item into a common shape — title, URL, source, region,
   language, published date, plain-text content (`lib/ingestion/normalize.ts`).
3. Skips items whose `originalUrl` already exists (dedup).
4. Tags the article with its source's theme (`FOCUS`, `FINANCE` or `TECH`):
   one feed, one theme, which is far more reliable than guessing from
   keywords.
5. Summarizes to 2-3 sentences: Claude API if `ANTHROPIC_API_KEY` is set,
   otherwise an extractive summary of the first sentences
   (`lib/processing/summarize.ts`).
6. Scores importance from source weight × recency decay
   (`lib/processing/score.ts`).
7. Stores the article and logs the run in `IngestionLog`.
8. Re-picks the briefing (`lib/themes.ts`): the five best articles of each
   theme over the last week (personal-growth and finance blogs publish
   weekly), at most two per source, scored again at pick time.

**Upgrading an installed database** (no schema change): each run adds the
three theme rows to `Category` if missing, and marks every source that is no
longer in `lib/sources/config.ts` inactive. The app only shows articles of
active sources in one of the three themes, so the articles of the former
general-news sources stay on disk, hidden, and nothing is deleted.

Feed availability is normal to fluctuate — outlets change RSS paths, and
some rate-limit or block bots unpredictably (Les Échos, Capital,
Investopedia and Morningstar were left out for that reason). Check `IngestionLog` (`npx prisma studio`) if a
source stops producing articles, and swap its `feedUrl` in
`lib/sources/config.ts` if it's genuinely gone.

### Adding a source

Add an entry to the `SOURCES` array in
[`lib/sources/config.ts`](lib/sources/config.ts):

```ts
{
  name: "Some Outlet — World",
  feedUrl: "https://example.com/rss/world.xml",
  websiteUrl: "https://example.com",
  region: "FRANCE" | "NORTH_AMERICA" | "ANGLOSAXON" | "GLOBAL",
  language: "FR" | "EN",
  theme: "FOCUS" | "FINANCE" | "TECH",
  weight: 1.0, // editorial trust weight used in importance scoring
}
```

Then run `npm run seed` (idempotent upsert) and `npm run ingest`. Removing an
entry retires the source (inactive, articles hidden), it does not delete it.

### The themes

`ThemeKey` is a plain TypeScript union in [`types/index.ts`](types/index.ts)
(`THEME_KEYS`, with their URL slugs in `THEME_SLUGS`), stored as `Category`
rows by key, so no migration is needed. Their FR/EN labels are under
`themes` in `lib/i18n/fr.json` / `lib/i18n/en.json`; the Nebula Link side
(widget ids, deep links) is `THEMES` in `desktop/nebula-rules.js` and
`nebula.app.json`, kept in step by the tests.

## Design system

Colors, gradients, and component patterns are ported directly from the
Nebula desktop app's `theme.css` into `tailwind.config.ts` /
`app/globals.css`:

| Token | Hex | Use |
|---|---|---|
| `nebula-bg` | `#0A0A0F` | page background |
| `nebula-surface` | `#12121F` | secondary surface |
| `nebula-card` | `#1A1A2E` | card background |
| `nebula-card-alt` | `#231942` | hover/alt surface, inputs |
| `nebula-border` | `#2A2A45` | borders |
| `nebula-blue` → `nebula-violet` | `#4C6EF5` → `#8B5CF6` | primary gradient (buttons, accents, "big themes") |
| `nebula-text` | `#F1F1F6` | body text |
| `nebula-text-secondary` | `#9A94B8` | muted text |

Typography is Inter (loaded via Google Fonts in `app/globals.css`), matching
the "modern sans-serif, clear hierarchy" brief. The ambient `bg-glow` drift
animation and card/button hover treatments are the same ones used in the
Nebula desktop app, just reimplemented as Tailwind utilities.

## Internationalization

FR/EN is handled by a small custom dictionary system rather than a full
i18n library — `lib/i18n/fr.json` and `lib/i18n/en.json` hold nested
dictionaries, `translate()` does dot-path + `{placeholder}` lookup
(`lib/i18n/shared.ts`), and:

- **Server** components call `getLocale()` / `getDictionary()` /
  `translate()` from `lib/i18n/index.ts` (reads the `nebula-locale` cookie).
- **Client** components use `useI18n()` from `lib/i18n/client.tsx`
  (`I18nProvider` wraps the app in `app/layout.tsx`).

The `LanguageToggle` in the navbar sets the `nebula-locale` cookie and
reloads — this only changes the **interface** language. Article content
stays in its original language; use the separate content-language filter
in the filter bar to show only FR or only EN articles.

## Running as a hosted web app instead

The desktop build is the primary target, but nothing here is
desktop-specific at the application level — swapping back to a hosted
Postgres deployment is:

1. In `prisma/schema.prisma`, change `datasource db { provider = ... }`
   from `"sqlite"` to `"postgresql"`.
2. Point `DATABASE_URL` at a real Postgres instance (Neon/Supabase/Railway/
   etc) and run `npx prisma migrate dev --name init` against it.
3. Deploy to Vercel; [`vercel.json`](vercel.json) already defines a Cron job
   hitting `/api/ingest` every 3 hours. Set `INGEST_SECRET` and a matching
   `CRON_SECRET` env var in your Vercel project — Vercel signs cron requests
   with `Authorization: Bearer $CRON_SECRET` automatically.
4. Run `npm run seed` once against production, then trigger
   `POST /api/ingest?secret=...` once manually so the site isn't empty
   while waiting for the first cron tick.

## Adding authentication

`User` and `Favorite` models already exist in `prisma/schema.prisma`. To
wire up favorites/saved briefings:

1. Add [Auth.js](https://authjs.dev) or [Clerk](https://clerk.com).
2. Point its adapter/callbacks at the `User` model (Auth.js has a
   [Prisma adapter](https://authjs.dev/getting-started/adapters/prisma)).
3. Add a favorite-toggle server action that upserts into `Favorite`, and a
   `/favorites` page that lists `Favorite.article` for the current user —
   the `nav.favorites` i18n key is already reserved in both dictionaries.
