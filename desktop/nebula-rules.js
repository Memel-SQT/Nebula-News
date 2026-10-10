// Pure rules of the Nebula Hub integration (Nebula Link), kept apart from Electron so they are
// tested with `node --test desktop/` (see nebula-rules.test.js). Only public data is shared: the
// titles and sources of the day's top three stories, the latest articles of each theme (title,
// source, date, short summary) for the "Nebula News" tab of each app, and "your briefing is ready".

const clip = (text, max) => (text.length <= max ? text : `${text.slice(0, max - 1)}…`);

const TEXTS = {
  fr: {
    title: "À la une",
    caption: (date) => `Briefing du ${date}`,
    readyTitle: "Votre briefing est prêt",
    readyBody: (count) => `${count} article${count > 1 ? "s" : ""} dans vos trois thèmes aujourd'hui.`,
    themes: { FOCUS: "Développement personnel", FINANCE: "Finance", TECH: "Tech & informatique" },
  },
  en: {
    title: "Top stories",
    caption: (date) => `Briefing of ${date}`,
    readyTitle: "Your briefing is ready",
    readyBody: (count) => `${count} article${count > 1 ? "s" : ""} across your three themes today.`,
    themes: { FOCUS: "Personal growth", FINANCE: "Finance", TECH: "Tech & computing" },
  },
};

/**
 * The three themes, one per app of the family: the widget each app (or the Hub's Home) can
 * show, and the screen it opens. Keep in step with THEME_SLUGS in types/index.ts and with
 * nebula.app.json.
 */
const THEMES = [
  { key: "FOCUS", slug: "focus", widget: "news.focus.today", articles: "news.focus.articles" },
  { key: "FINANCE", slug: "finance", widget: "news.finance.today", articles: "news.finance.articles" },
  { key: "TECH", slug: "tech", widget: "news.tech.today", articles: "news.tech.articles" },
];

/** At most this many articles in an app's "Nebula News" tab (ArticlesV1 allows 20). */
const ARTICLES_PER_TAB = 20;
/** An article id (cuid): anything else is never turned into a link or a route. */
const ARTICLE_ID = /^[a-z0-9]{6,40}$/i;

function texts(language) {
  return TEXTS[language === "en" ? "en" : "fr"];
}

function formatDate(isoDate, language) {
  const [year, month, day] = String(isoDate).split("-").map(Number);
  if (!year || !month || !day) return String(isoDate);
  return new Intl.DateTimeFormat(language === "en" ? "en-US" : "fr-FR", { day: "numeric", month: "long" }).format(new Date(year, month - 1, day));
}

function widgetOf(stories, title, briefing, language, deepLink, now) {
  if (stories.length === 0) return null;
  const t = texts(language);
  return {
    title,
    caption: clip(t.caption(formatDate(briefing.date, language)), 80),
    items: stories.slice(0, 3).map((story) => ({
      label: clip(String(story?.title ?? "").trim() || "—", 80),
      value: clip(String(story?.source?.name ?? "").trim() || "—", 80),
    })),
    deepLink,
    updatedAt: now.toISOString(),
  };
}

function storiesOf(briefing) {
  return Array.isArray(briefing?.stories) ? briefing.stories : [];
}

/**
 * `news.headlines.today` (WidgetV1): the first three stories of today's briefing (one per
 * theme, the briefing being ordered round-robin), or null when there is none yet (first launch
 * before any ingestion).
 */
function headlinesWidget(briefing, language, now) {
  return widgetOf(storiesOf(briefing), texts(language).title, briefing, language, "nebula://news/briefing", now);
}

/**
 * `news.focus.today`, `news.finance.today`, `news.tech.today` (WidgetV1): the first three
 * stories of one theme in today's briefing, for the app of that theme (Nebula Clock, Nebula
 * Finterest, Nebula Hub), or null when the theme has none.
 */
function themeWidget(briefing, themeKey, language, now) {
  const theme = THEMES.find((candidate) => candidate.key === themeKey);
  if (!theme) return null;
  const stories = storiesOf(briefing).filter((story) => Array.isArray(story?.themes) && story.themes.includes(theme.key));
  return widgetOf(stories, texts(language).themes[theme.key], briefing, language, `nebula://news/theme/${theme.slug}`, now);
}

/** Plain text of a summary: no markup, no control character, one line, bounded. */
function plainSummary(summary) {
  if (typeof summary !== "string") return null;
  const text = summary.replace(/<[^>]*>/g, " ").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return text ? clip(text, 400) : null;
}

/**
 * `news.focus.articles`, `news.finance.articles`, `news.tech.articles` (ArticlesV1): the latest
 * articles of one theme (the page of /api/articles, newest first), for the "Nebula News" tab of
 * that theme's app. Each article opens in Nebula News (`nebula://news/article?id=…`); its web
 * address never leaves the app. Null when the theme has no article yet.
 */
function themeArticles(page, themeKey, language, now) {
  const theme = THEMES.find((candidate) => candidate.key === themeKey);
  if (!theme) return null;
  const items = [];
  for (const article of Array.isArray(page?.items) ? page.items : []) {
    const id = String(article?.id ?? "");
    const publishedAt = new Date(article?.publishedAt ?? "");
    if (!ARTICLE_ID.test(id) || Number.isNaN(publishedAt.getTime())) continue;
    const item = {
      title: clip(String(article?.title ?? "").trim() || "—", 200),
      source: clip(String(article?.source?.name ?? "").trim() || "—", 80),
      publishedAt: publishedAt.toISOString(),
      deepLink: `nebula://news/article?id=${id}`,
    };
    const summary = plainSummary(article?.summary);
    if (summary) item.summary = summary;
    items.push(item);
    if (items.length === ARTICLES_PER_TAB) break;
  }
  if (items.length === 0) return null;
  return { title: texts(language).themes[theme.key], updatedAt: now.toISOString(), items };
}

/** The screen a deep link opens: a declared path, or one article by its id. */
function routeOfIntent(intentPath, params) {
  if (intentPath === "/article") return ARTICLE_ID.test(String(params?.id ?? "")) ? `/article/${params.id}` : null;
  if (intentPath === "/" || intentPath === "/briefing") return intentPath;
  const theme = THEMES.find((candidate) => `/theme/${candidate.slug}` === intentPath);
  return theme ? intentPath : null;
}

/** The "briefing ready" notification, at most once a day, when the briefing has stories. */
function briefingReadyNotification(briefing, language, lastNotifiedDate) {
  const stories = Array.isArray(briefing?.stories) ? briefing.stories.length : 0;
  if (stories === 0 || !briefing?.date || briefing.date === lastNotifiedDate) return null;
  const t = texts(language);
  return {
    id: `briefing-${briefing.date}`,
    title: t.readyTitle,
    body: t.readyBody(stories),
    sensitivity: "public",
    deepLink: "nebula://news/briefing",
    category: "briefing",
  };
}

// Cookies shared with the Next.js server (lib/appearance/shared.ts, lib/i18n/shared.ts): the
// server renders the page from them, so the window chrome and the page always agree.
const COOKIES = {
  appearance: "nebula-appearance",
  locale: "nebula-locale",
  followHub: "nebula-follow-hub",
  hubStatus: "nebula-hub-status",
  docked: "nebula-docked",
  packTheme: "nebula-pack-theme",
};

/** The fields of the family appearance the app stores (the language has its own cookie). */
const APPEARANCE_FIELDS = ["theme", "accentPreset", "customPrimary", "customSecondary", "background", "motion", "soundEnabled", "soundVolume"];

/**
 * The cookie value for the appearance Nebula Hub broadcasts (NebulaAppearance, already
 * validated by the Hub): the stored fields only, in the order serializeAppearance writes them,
 * so an unchanged appearance gives the same value and the page is not reloaded for nothing.
 * The server reads it field by field (a missing field falls back to its default).
 */
function hubAppearanceCookie(appearance) {
  if (!appearance || typeof appearance !== "object") return null;
  const picked = {};
  for (const field of APPEARANCE_FIELDS) {
    if (appearance[field] !== undefined) picked[field] = appearance[field];
  }
  return Object.keys(picked).length > 0 ? encodeURIComponent(JSON.stringify(picked)) : null;
}

/** The Hub's language, when it is one the app speaks. */
function hubLanguage(appearance) {
  return appearance?.language === "fr" || appearance?.language === "en" ? appearance.language : null;
}

const BUILT_IN_THEMES = ["nebula-dark", "nebula-light", "glass-dark", "glass-light", "system"];

/**
 * Appearance packs (Nebula Hub NEBULA_LINK.md § 18): the pack theme for a theme Nebula Hub sent.
 * The id when one of the installed packs has it, "" for a built-in theme (the pack theme is
 * left), null when the Hub sent no theme this app knows (nothing changes).
 */
function hubPackTheme(appearance, packs) {
  const theme = appearance?.theme;
  if (typeof theme !== "string") return null;
  if ((packs ?? []).some((pack) => (pack?.themes ?? []).some((candidate) => candidate?.id === theme))) return theme;
  return BUILT_IN_THEMES.includes(theme) ? "" : null;
}

/** Native window colours of a pack theme, if one of the installed packs has it. */
function packChrome(packs, themeId) {
  if (!themeId) return null;
  for (const pack of packs ?? []) {
    const theme = (pack?.themes ?? []).find((candidate) => candidate?.id === themeId);
    if (theme?.chrome) return theme.chrome;
  }
  return null;
}

/** The theme chosen in the appearance cookie ("system" when absent or unreadable). */
function themeOfCookie(raw) {
  try {
    const theme = JSON.parse(decodeURIComponent(raw ?? ""))?.theme;
    return BUILT_IN_THEMES.includes(theme) ? theme : "system";
  } catch {
    return "system";
  }
}

/** Page and ink colors of each theme, for the native window chrome. Ported from Nebula Hub
 *  05204fd (src/electron/window.ts, CHROME), itself read from tokens.css. */
const CHROME = {
  "nebula-dark": { page: "#0a0a0f", ink: "#f1f1f6" },
  "nebula-light": { page: "#f4f3fb", ink: "#18172b" },
  "glass-dark": { page: "#06060f", ink: "#f5f4ff" },
  "glass-light": { page: "#e9ebf8", ink: "#17162a" },
};

/** Window background and control colors for a chosen theme (`system` follows the OS). */
function chromeColors(theme, prefersDark) {
  const resolved = theme === "system" ? (prefersDark ? "nebula-dark" : "nebula-light") : theme;
  return CHROME[resolved] ?? CHROME["nebula-dark"];
}

/** Only http(s) pages go to the browser; nebula:// links go to Nebula Hub; nothing else opens. */
function externalTarget(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return "browser";
    if (parsed.protocol === "nebula:") return "nebula";
  } catch {
    // Not a URL: refused.
  }
  return null;
}

/** The Hub mode payload (DockV1), checked again on this side. */
function isDockPayload(value) {
  if (!value || typeof value !== "object") return false;
  if (value.state === "released") return true;
  const b = value.bounds;
  return value.state === "docked" && typeof value.visible === "boolean" && typeof value.raise === "boolean" && Boolean(b) && ["x", "y", "width", "height"].every((key) => Number.isInteger(b[key]));
}

/** The page that "Detach" (Hub mode band) navigates to; caught in will-navigate, never loaded. */
const DETACH_PATH = "/__nebula/detach";

/**
 * Hub mode (Nebula Hub ADR-032): what the docked window does for a visible `nebula.hub.dock`
 * message. It is shown again if it was hidden, and raised above the Hub when it reappears or when
 * the Hub asks for it.
 */
function dockedWindowSteps(wasVisible, raise) {
  return { show: !wasVisible, raise: raise || !wasVisible };
}

/**
 * Nebula News is an extension of the other apps (Nebula Hub ADR-034): with the Hub, it runs
 * without a window and shows itself inside the Hub; without the Hub, it is a normal app.
 */
const BACKGROUND_SWITCH = "--background";

/** Where a window asked for (deep link, second launch, intent) goes. */
function windowTarget(hubConnected) {
  return hubConnected ? "hub" : "own-window";
}

/**
 * What happens when the Hub releases the window (the Hub quits) or the link to it is lost:
 * still connected → back to the background (no window); started by the Hub in the background
 * and the Hub is gone → quit; otherwise → the normal standalone window.
 */
function afterRelease({ hubConnected, background }) {
  if (hubConnected) return "background";
  return background ? "quit" : "own-window";
}

/** Closing the last window quits the app only when it is not kept for the Hub. */
function quitWhenAllClosed({ hubConnected, background }) {
  return !hubConnected && !background;
}

module.exports = {
  THEMES,
  COOKIES,
  DETACH_PATH,
  headlinesWidget,
  themeWidget,
  themeArticles,
  routeOfIntent,
  ARTICLES_PER_TAB,
  briefingReadyNotification,
  hubAppearanceCookie,
  hubLanguage,
  hubPackTheme,
  packChrome,
  themeOfCookie,
  chromeColors,
  externalTarget,
  isDockPayload,
  dockedWindowSteps,
  BACKGROUND_SWITCH,
  windowTarget,
  afterRelease,
  quitWhenAllClosed,
};
