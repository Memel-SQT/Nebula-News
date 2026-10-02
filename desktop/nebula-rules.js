// Pure rules of the Nebula Hub integration (Nebula Link), kept apart from Electron so they are
// tested with `node --test desktop/` (see nebula-rules.test.js). Only public data is shared: the
// titles and sources of the day's top three stories, and "your briefing is ready".

const clip = (text, max) => (text.length <= max ? text : `${text.slice(0, max - 1)}…`);

const TEXTS = {
  fr: { title: "À la une", caption: (date) => `Briefing du ${date}`, readyTitle: "Votre briefing est prêt", readyBody: (count) => `${count} sujet${count > 1 ? "s" : ""} à la une aujourd'hui.` },
  en: { title: "Top stories", caption: (date) => `Briefing of ${date}`, readyTitle: "Your briefing is ready", readyBody: (count) => `${count} top stor${count > 1 ? "ies" : "y"} today.` },
};

function texts(language) {
  return TEXTS[language === "en" ? "en" : "fr"];
}

function formatDate(isoDate, language) {
  const [year, month, day] = String(isoDate).split("-").map(Number);
  if (!year || !month || !day) return String(isoDate);
  return new Intl.DateTimeFormat(language === "en" ? "en-US" : "fr-FR", { day: "numeric", month: "long" }).format(new Date(year, month - 1, day));
}

/**
 * `news.headlines.today` (WidgetV1): the first three stories of today's briefing, or null when
 * there is none yet (first launch before any ingestion).
 */
function headlinesWidget(briefing, language, now) {
  const stories = Array.isArray(briefing?.stories) ? briefing.stories : [];
  if (stories.length === 0) return null;
  const t = texts(language);
  return {
    title: t.title,
    caption: clip(t.caption(formatDate(briefing.date, language)), 80),
    items: stories.slice(0, 3).map((story) => ({
      label: clip(String(story?.title ?? "").trim() || "—", 80),
      value: clip(String(story?.source?.name ?? "").trim() || "—", 80),
    })),
    deepLink: "nebula://news/briefing",
    updatedAt: now.toISOString(),
  };
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

module.exports = { headlinesWidget, briefingReadyNotification, languageToApply, externalTarget, isDockPayload };
