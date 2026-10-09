// Run with: npm test (node --test desktop/nebula-rules.test.js)
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { parseManifest } = require("@nebula/link");
const {
  THEMES,
  headlinesWidget,
  themeWidget,
  themeArticles,
  routeOfIntent,
  ARTICLES_PER_TAB,
  briefingReadyNotification,
  hubAppearanceCookie,
  hubLanguage,
  themeOfCookie,
  chromeColors,
  externalTarget,
  isDockPayload,
  dockedWindowSteps,
  BACKGROUND_SWITCH,
  windowTarget,
  afterRelease,
  quitWhenAllClosed,
} = require("./nebula-rules");

const briefing = {
  date: "2026-10-02",
  stories: [
    { title: "La règle des deux minutes", source: { name: "Habitudes Zen" }, themes: ["FOCUS"] },
    { title: "Livret A : ce qui change", source: { name: "La finance pour tous" }, themes: ["FINANCE"] },
    { title: "Une faille corrigée dans OpenSSH", source: { name: "Next" }, themes: ["TECH"] },
    { title: "Deep work, dix ans après", source: { name: "Cal Newport" }, themes: ["FOCUS"] },
  ],
};

test("the widget shows the first three stories with their source", () => {
  const widget = headlinesWidget(briefing, "fr", new Date("2026-10-02T08:00:00.000Z"));
  assert.equal(widget.title, "À la une");
  assert.equal(widget.caption, "Briefing du 2 octobre");
  assert.deepEqual(widget.items, [
    { label: "La règle des deux minutes", value: "Habitudes Zen" },
    { label: "Livret A : ce qui change", value: "La finance pour tous" },
    { label: "Une faille corrigée dans OpenSSH", value: "Next" },
  ]);
  assert.equal(widget.deepLink, "nebula://news/briefing");
  assert.equal(headlinesWidget(briefing, "en", new Date()).title, "Top stories");
});

test("each theme has its own widget, opening that theme", () => {
  const now = new Date("2026-10-02T08:00:00.000Z");
  const focus = themeWidget(briefing, "FOCUS", "fr", now);
  assert.equal(focus.title, "Développement personnel");
  assert.deepEqual(focus.items.map((item) => item.label), ["La règle des deux minutes", "Deep work, dix ans après"]);
  assert.equal(focus.deepLink, "nebula://news/theme/focus");
  assert.equal(themeWidget(briefing, "FINANCE", "en", now).title, "Finance");
  assert.equal(themeWidget(briefing, "TECH", "en", now).title, "Tech & computing");
  assert.equal(themeWidget(briefing, "TECH", "fr", now).deepLink, "nebula://news/theme/tech");
  // A theme without stories (or an unknown one) shows nothing rather than an empty card.
  assert.equal(themeWidget({ date: "2026-10-02", stories: briefing.stories.slice(0, 1) }, "TECH", "fr", now), null);
  assert.equal(themeWidget(briefing, "SPORTS", "fr", now), null);
  // Stories of the former general news carry no theme: never shown in a theme widget.
  assert.equal(themeWidget({ date: "2026-10-02", stories: [{ title: "x", source: { name: "y" } }] }, "TECH", "fr", now), null);
});

test("the manifest is valid and declares every theme widget and screen", () => {
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "nebula.app.json"), "utf8"));
  const parsed = parseManifest(raw);
  assert.equal(parsed.ok, true, JSON.stringify(parsed.error ?? parsed.errors ?? null));
  for (const theme of THEMES) {
    assert.ok(raw.provides.some((capability) => capability.id === theme.widget && capability.kind === "widget" && capability.sensitivity === "public"));
    assert.ok(raw.deepLinks.some((link) => link.path === `/theme/${theme.slug}`));
    assert.ok(raw.provides.some((capability) => capability.id === theme.articles && capability.kind === "query" && capability.sensitivity === "public" && capability.resultSchema === "ArticlesV1"));
  }
  assert.ok(raw.deepLinks.some((link) => link.path === "/article" && link.params.id === "text"));
});

const page = {
  items: [
    { id: "clx0abc123def456", title: "Livret A : ce qui change", summary: "<p>Le taux   baisse\nen février.</p>", publishedAt: "2026-10-09T06:00:00.000Z", source: { name: "La finance pour tous" } },
    { id: "clx0abc123def457", title: "Sans résumé", summary: null, publishedAt: "2026-10-08T06:00:00.000Z", source: { name: "Les Échos" } },
    { id: "../../etc", title: "Identifiant suspect", publishedAt: "2026-10-08T06:00:00.000Z", source: { name: "x" } },
    { id: "clx0abc123def458", title: "Date illisible", publishedAt: "hier", source: { name: "x" } },
  ],
};

test("the Nebula News tab of an app lists the latest articles of its theme (ArticlesV1)", () => {
  const now = new Date("2026-10-09T08:00:00.000Z");
  const list = themeArticles(page, "FINANCE", "fr", now);
  assert.equal(list.title, "Finance");
  assert.equal(list.updatedAt, "2026-10-09T08:00:00.000Z");
  assert.deepEqual(list.items, [
    { title: "Livret A : ce qui change", source: "La finance pour tous", publishedAt: "2026-10-09T06:00:00.000Z", summary: "Le taux baisse en février.", deepLink: "nebula://news/article?id=clx0abc123def456" },
    { title: "Sans résumé", source: "Les Échos", publishedAt: "2026-10-08T06:00:00.000Z", deepLink: "nebula://news/article?id=clx0abc123def457" },
  ]);
  // Nothing of the article's web address goes out.
  assert.ok(!JSON.stringify(list).includes("http"));
  assert.equal(themeArticles(page, "TECH", "en", now).title, "Tech & computing");
});

test("the Nebula News tab is bounded, and empty themes give nothing", () => {
  const many = { items: Array.from({ length: 30 }, (_, index) => ({ id: `clx0abc123def${String(index).padStart(3, "0")}`, title: "t".repeat(300), summary: "s".repeat(600), publishedAt: "2026-10-09T06:00:00.000Z", source: { name: "n".repeat(100) } })) };
  const list = themeArticles(many, "FOCUS", "fr", new Date());
  assert.equal(list.items.length, ARTICLES_PER_TAB);
  assert.equal(list.items[0].title.length, 200);
  assert.equal(list.items[0].source.length, 80);
  assert.equal(list.items[0].summary.length, 400);
  assert.equal(themeArticles({ items: [] }, "FOCUS", "fr", new Date()), null);
  assert.equal(themeArticles(null, "FOCUS", "fr", new Date()), null);
  assert.equal(themeArticles(page, "SPORTS", "fr", new Date()), null);
});

test("deep links open a declared screen or one article, nothing else", () => {
  assert.equal(routeOfIntent("/", {}), "/");
  assert.equal(routeOfIntent("/briefing", {}), "/briefing");
  assert.equal(routeOfIntent("/theme/finance", {}), "/theme/finance");
  assert.equal(routeOfIntent("/article", { id: "clx0abc123def456" }), "/article/clx0abc123def456");
  assert.equal(routeOfIntent("/article", { id: "../settings" }), null);
  assert.equal(routeOfIntent("/article", {}), null);
  assert.equal(routeOfIntent("/settings", {}), null);
});

test("no widget before the first briefing, and long titles are cut", () => {
  assert.equal(headlinesWidget({ date: "2026-10-02", stories: [] }, "fr", new Date()), null);
  const long = headlinesWidget({ date: "2026-10-02", stories: [{ title: "x".repeat(200), source: { name: "y" } }] }, "fr", new Date());
  assert.equal(long.items[0].label.length, 80);
});

test("the briefing is announced once a day", () => {
  const notification = briefingReadyNotification(briefing, "fr", null);
  assert.deepEqual(notification, { id: "briefing-2026-10-02", title: "Votre briefing est prêt", body: "4 articles dans vos trois thèmes aujourd'hui.", sensitivity: "public", deepLink: "nebula://news/briefing", category: "briefing" });
  assert.equal(briefingReadyNotification(briefing, "fr", "2026-10-02"), null);
  assert.equal(briefingReadyNotification({ date: "2026-10-02", stories: [] }, "fr", null), null);
});

test("the Nebula language applies only when it changes", () => {
  assert.equal(hubLanguage({ language: "en" }), "en");
  assert.equal(hubLanguage({ language: "de" }), null);
  assert.equal(hubLanguage(null), null);
});

test("the Hub appearance becomes the app's cookie, stored fields only", () => {
  const value = hubAppearanceCookie({ theme: "glass-dark", accentPreset: "ocean", background: "stars", motion: "reduced", soundEnabled: false, soundVolume: 30, customPrimary: "#8b5cf6", customSecondary: "#4c6ef5", language: "en", extra: 1 });
  const parsed = JSON.parse(decodeURIComponent(value));
  assert.equal(parsed.theme, "glass-dark");
  assert.equal(parsed.accentPreset, "ocean");
  assert.equal("language" in parsed, false);
  assert.equal("extra" in parsed, false);
  assert.equal(hubAppearanceCookie(null), null);
  assert.equal(hubAppearanceCookie({ language: "fr" }), null);
});

test("the window chrome follows the chosen theme", () => {
  assert.equal(themeOfCookie(encodeURIComponent(JSON.stringify({ theme: "nebula-light" }))), "nebula-light");
  assert.equal(themeOfCookie(undefined), "system");
  assert.equal(themeOfCookie("%7Bbroken"), "system");
  assert.deepEqual(chromeColors("nebula-light", true), { page: "#f4f3fb", ink: "#18172b" });
  assert.deepEqual(chromeColors("system", false), chromeColors("nebula-light", true));
  assert.deepEqual(chromeColors("system", true), chromeColors("nebula-dark", false));
});

test("only web pages and Nebula links leave the app", () => {
  assert.equal(externalTarget("https://www.lemonde.fr/x"), "browser");
  assert.equal(externalTarget("nebula://hub/"), "nebula");
  assert.equal(externalTarget("file:///C:/Windows/System32/calc.exe"), null);
  assert.equal(externalTarget("javascript:alert(1)"), null);
  assert.equal(externalTarget("not a url"), null);
});

test("the Hub mode payload is checked", () => {
  assert.equal(isDockPayload({ state: "released" }), true);
  assert.equal(isDockPayload({ state: "docked", visible: true, raise: false, bounds: { x: 1, y: 2, width: 3, height: 4 } }), true);
  assert.equal(isDockPayload({ state: "docked", visible: true, raise: false, bounds: { x: 1.5, y: 2, width: 3, height: 4 } }), false);
  assert.equal(isDockPayload(null), false);
});

test("Hub mode: a hidden docked window is shown and raised, a visible one only when the Hub asks (ADR-032)", () => {
  assert.deepEqual(dockedWindowSteps(false, false), { show: true, raise: true });
  assert.deepEqual(dockedWindowSteps(false, true), { show: true, raise: true });
  assert.deepEqual(dockedWindowSteps(true, true), { show: false, raise: true });
  assert.deepEqual(dockedWindowSteps(true, false), { show: false, raise: false });
});

test("extension: with the Hub, windows open inside it; without, a normal window (Nebula Hub ADR-034)", () => {
  assert.equal(BACKGROUND_SWITCH, "--background");
  assert.equal(windowTarget(true), "hub");
  assert.equal(windowTarget(false), "own-window");
});

test("extension: a release keeps the app in the background, quits it, or gives the normal window", () => {
  assert.equal(afterRelease({ hubConnected: true, background: true }), "background");
  assert.equal(afterRelease({ hubConnected: true, background: false }), "background");
  // Started by the Hub, the Hub is gone: nothing left to feed.
  assert.equal(afterRelease({ hubConnected: false, background: true }), "quit");
  // Opened by the user, the Hub is gone: the normal standalone window.
  assert.equal(afterRelease({ hubConnected: false, background: false }), "own-window");
});

test("extension: closing the last window quits only a standalone app", () => {
  assert.equal(quitWhenAllClosed({ hubConnected: false, background: false }), true);
  assert.equal(quitWhenAllClosed({ hubConnected: true, background: false }), false);
  assert.equal(quitWhenAllClosed({ hubConnected: false, background: true }), false);
});
