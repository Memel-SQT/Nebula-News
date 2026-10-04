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
  briefingReadyNotification,
  hubAppearanceCookie,
  hubLanguage,
  themeOfCookie,
  chromeColors,
  externalTarget,
  isDockPayload,
  dockedWindowSteps,
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
  }
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
