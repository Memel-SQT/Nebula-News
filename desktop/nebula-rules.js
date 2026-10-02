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

/**
 * The language the Hub broadcasts is applied only when it changes, so a choice made in the app's
 * own toggle stays until the Nebula language really changes.
 */
function languageToApply(appearance, lastHubLanguage) {
  const language = appearance?.language;
  if (language !== "fr" && language !== "en") return null;
  return language === lastHubLanguage ? null : language;
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

module.exports = { THEMES, headlinesWidget, themeWidget, briefingReadyNotification, languageToApply, externalTarget, isDockPayload };
