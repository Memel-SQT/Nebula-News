# Nebula News

A daily world news briefing, aggregated from neutral, reputable French and
English sources and presented in a premium, dark, cosmic interface.

Visual identity is shared 1:1 with the [Nebula](../Nebula) desktop app: the
same black → navy → violet gradient, card system, and typography, ported from
its `theme.css` into Tailwind tokens (see [Design system](#design-system)).

## Tech stack

- **Next.js 14** (App Router, React Server Components) + **TypeScript**
- **Tailwind CSS**, hand-rolled component primitives in `components/ui`
  (no external UI kit — kept the dependency surface small and the tokens
  identical to the Nebula desktop app's theme)
- **PostgreSQL** via **Prisma** (works with Supabase, Neon, Railway, or any
  managed/self-hosted Postgres)
- **rss-parser** for feed ingestion; optional **Claude API** for LLM
  summarization (falls back to a built-in extractive summarizer when no key
  is set, so the app runs with zero external API keys)
- Deploy target: **Vercel**, with **Vercel Cron** driving scheduled ingestion

Auth (Clerk/Auth.js) is *not* wired up — the `User`/`Favorite` tables in
`prisma/schema.prisma` are ready for it, but adding a full auth flow was out
of scope for a first pass. See [Adding authentication](#adding-authentication).

## Project structure

```
app/
  layout.tsx              root layout: locale, I18nProvider, Navbar, bg glow
  page.tsx                home dashboard (filters + article grid)
  briefing/page.tsx        daily briefing (themes + top stories)
  article/[id]/page.tsx    article detail view
  api/
    articles/route.ts       GET  filtered article list
    briefing/today/route.ts GET  today's briefing
    search/route.ts         GET  keyword search
    ingest/route.ts          GET/POST ingestion trigger (Vercel Cron + manual)
components/
  ui/          Badge, Button, Card — shared primitives
  layout/      Navbar, PageShell, SectionHeader, BgGlow
  filters/     LanguageToggle, RegionFilter, CategoryChips, FilterBar
  news/        NewsCard, Tag, ArticleGrid, ThemesPanel
lib/
  db.ts                    Prisma client singleton
  articles.ts              data access layer (list/search/briefing queries)
  utils.ts                 cn(), timeAgo()
  i18n/                    fr.json, en.json, dictionary + locale helpers
  sources/config.ts        the configurable source list
  ingestion/               fetchFeeds, normalize, run (orchestrator)
  processing/               classify (topics), score (importance), summarize
prisma/
  schema.prisma
  seed.ts                  seeds categories + sources from lib/sources/config.ts
scripts/
  run-ingestion.ts         `npm run ingest` entrypoint
types/                     shared TS types (ArticleCard, BriefingResponse, ...)
```

## Getting started

### 1. Prerequisites

- Node.js 20+
- A PostgreSQL database (a free [Neon](https://neon.tech) or
  [Supabase](https://supabase.com) project works well for this)

### 2. Install

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

- `DATABASE_URL` — your Postgres connection string
- `INGEST_SECRET` — any random string; protects `POST /api/ingest` from
  unauthenticated callers (Vercel Cron auth is separate, see below)
- `ANTHROPIC_API_KEY` — optional; enables LLM summaries instead of the
  extractive fallback

### 3. Database

```bash
npx prisma migrate dev --name init
npm run seed
```

`npm run seed` seeds the `Category` enum values and the source list from
[`lib/sources/config.ts`](lib/sources/config.ts) into the `Source` table.

### 4. Fetch the first batch of articles

```bash
npm run ingest
```

This runs the full ingestion pipeline once (fetch → normalize → classify →
summarize → score → store) and marks the day's top stories for the
briefing. It's idempotent — run it as often as you like.

### 5. Run the app

```bash
npm run dev
```

Open http://localhost:3000.

## How ingestion works

`npm run ingest` (and `GET/POST /api/ingest`) run
[`lib/ingestion/run.ts`](lib/ingestion/run.ts), which for every source in
`lib/sources/config.ts`:

1. Fetches and parses the RSS feed (`lib/ingestion/fetchFeeds.ts`).
2. Normalizes each item into a common shape — title, URL, source, region,
   language, published date, plain-text content (`lib/ingestion/normalize.ts`).
3. Skips items whose `originalUrl` already exists (dedup).
4. Classifies topics with a FR/EN keyword matcher
   (`lib/processing/classify.ts`) — always returns at least `WORLD`.
5. Summarizes to 2-3 sentences: Claude API if `ANTHROPIC_API_KEY` is set,
   otherwise an extractive summary of the first sentences
   (`lib/processing/summarize.ts`).
6. Scores importance from source weight × recency decay × topic boost
   (`lib/processing/score.ts`).
7. Stores the article and logs the run in `IngestionLog`.
8. Re-picks the top ~16 stories from the last 24h as `isBriefingPick`.

### Scheduling

[`vercel.json`](vercel.json) defines a Vercel Cron job hitting
`/api/ingest` every 3 hours. In your Vercel project, set a `CRON_SECRET`
env var equal to your `INGEST_SECRET` — Vercel signs cron requests with
`Authorization: Bearer $CRON_SECRET` automatically. Outside Vercel, call
`POST /api/ingest?secret=...` (or the `Authorization: Bearer` header) from
any scheduler (cron, GitHub Actions, etc.), or just run `npm run ingest`
manually/via a process manager.

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
  weight: 1.0, // editorial trust weight used in importance scoring
}
```

Then run `npm run seed` (idempotent upsert) and `npm run ingest`.

### Adding a category

Add a value to the `CategoryKey` enum in `prisma/schema.prisma`, add
FR/EN labels for it under `categories` in `lib/i18n/fr.json` /
`lib/i18n/en.json`, add matching keywords in
`lib/processing/classify.ts`, run `npx prisma migrate dev`, then `npm run seed`.

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

## Deploying to Vercel

1. Push this repo to GitHub and import it in Vercel.
2. Set `DATABASE_URL`, `INGEST_SECRET`/`CRON_SECRET` (same value), and
   optionally `ANTHROPIC_API_KEY` as environment variables.
3. Run `npx prisma migrate deploy` against the production database (e.g.
   via a one-off Vercel deployment build command, or locally pointed at
   the prod `DATABASE_URL`), then `npm run seed` once.
4. Deploy. The cron in `vercel.json` starts refreshing articles on its own
   schedule; trigger `npm run ingest` once manually right after the first
   deploy so the site isn't empty while waiting for the first cron tick.

## Adding authentication

`User` and `Favorite` models already exist in `prisma/schema.prisma`. To
wire up favorites/saved briefings:

1. Add [Auth.js](https://authjs.dev) or [Clerk](https://clerk.com).
2. Point its adapter/callbacks at the `User` model (Auth.js has a
   [Prisma adapter](https://authjs.dev/getting-started/adapters/prisma)).
3. Add a favorite-toggle server action that upserts into `Favorite`, and a
   `/favorites` page that lists `Favorite.article` for the current user —
   the `nav.favorites` i18n key is already reserved in both dictionaries.
