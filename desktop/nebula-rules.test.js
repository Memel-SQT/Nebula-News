// Run with: npm test (node --test desktop/nebula-rules.test.js)
const test = require("node:test");
const assert = require("node:assert/strict");
const { headlinesWidget, briefingReadyNotification, languageToApply, externalTarget, isDockPayload } = require("./nebula-rules");

const briefing = {
  date: "2026-10-02",
  stories: [
    { title: "Climat : accord à Genève", source: { name: "Le Monde" } },
    { title: "Semi-conducteurs", source: { name: "Les Échos" } },
    { title: "Ligue des champions", source: { name: "L'Équipe" } },
    { title: "Quatrième sujet", source: { name: "AFP" } },
  ],
};

test("the widget shows the first three stories with their source", () => {
  const widget = headlinesWidget(briefing, "fr", new Date("2026-10-02T08:00:00.000Z"));
  assert.equal(widget.title, "À la une");
  assert.equal(widget.caption, "Briefing du 2 octobre");
  assert.deepEqual(widget.items, [
    { label: "Climat : accord à Genève", value: "Le Monde" },
    { label: "Semi-conducteurs", value: "Les Échos" },
    { label: "Ligue des champions", value: "L'Équipe" },
  ]);
  assert.equal(widget.deepLink, "nebula://news/briefing");
  assert.equal(headlinesWidget(briefing, "en", new Date()).title, "Top stories");
});

test("no widget before the first briefing, and long titles are cut", () => {
  assert.equal(headlinesWidget({ date: "2026-10-02", stories: [] }, "fr", new Date()), null);
  const long = headlinesWidget({ date: "2026-10-02", stories: [{ title: "x".repeat(200), source: { name: "y" } }] }, "fr", new Date());
  assert.equal(long.items[0].label.length, 80);
});

test("the briefing is announced once a day", () => {
  const notification = briefingReadyNotification(briefing, "fr", null);
  assert.deepEqual(notification, { id: "briefing-2026-10-02", title: "Votre briefing est prêt", body: "4 sujets à la une aujourd'hui.", sensitivity: "public", deepLink: "nebula://news/briefing", category: "briefing" });
  assert.equal(briefingReadyNotification(briefing, "fr", "2026-10-02"), null);
  assert.equal(briefingReadyNotification({ date: "2026-10-02", stories: [] }, "fr", null), null);
});

test("the Nebula language applies only when it changes", () => {
  assert.equal(languageToApply({ language: "en" }, null), "en");
  assert.equal(languageToApply({ language: "en" }, "en"), null);
  assert.equal(languageToApply({ language: "de" }, null), null);
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
