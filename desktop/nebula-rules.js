// Pure rules of the Nebula Hub integration (Nebula Link), kept apart from Electron so they are
// tested with `node --test desktop/` (see nebula-rules.test.js). Only public data is shared: the
// titles and sources of the day's top three stories, and "your briefing is ready".

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
  { key: "FOCUS", slug: "focus", widget: "news.focus.today" },
  { key: "FINANCE", slug: "finance", widget: "news.finance.today" },
  { key: "TECH", slug: "tech", widget: "news.tech.today" },
];

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

/** The theme chosen in the appearance cookie ("system" when absent or unreadable). */
function themeOfCookie(raw) {
  try {
    const theme = JSON.parse(decodeURIComponent(raw ?? ""))?.theme;
    return ["nebula-dark", "nebula-light", "glass-dark", "glass-light", "system"].includes(theme) ? theme : "system";
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

module.exports = {
  THEMES,
  COOKIES,
  DETACH_PATH,
  headlinesWidget,
  themeWidget,
  briefingReadyNotification,
  hubAppearanceCookie,
  hubLanguage,
  themeOfCookie,
  chromeColors,
  externalTarget,
  isDockPayload,
  dockedWindowSteps,
};
