// Run with: npm test (node --import tsx --test lib/themes.test.ts)
import test from "node:test";
import assert from "node:assert/strict";
import { interleaveByTheme, pickBriefing, themesOf, themesWithStories } from "./themes";
import { isThemeKey, themeOfSlug, THEME_KEYS, THEME_SLUGS } from "../types";

test("only the three current themes are kept from stored category keys", () => {
  assert.deepEqual(themesOf(["WORLD", "TECH", "POLITICS"]), ["TECH"]);
  assert.deepEqual(themesOf(["FINANCE", "FOCUS"]), ["FOCUS", "FINANCE"]);
  assert.deepEqual(themesOf(["SPORTS"]), []);
});

test("theme slugs round-trip, and anything else is refused", () => {
  for (const key of THEME_KEYS) assert.equal(themeOfSlug(THEME_SLUGS[key]), key);
  assert.equal(themeOfSlug("sports"), null);
  assert.equal(themeOfSlug("FOCUS"), null);
  assert.equal(isThemeKey("FINANCE"), true);
  assert.equal(isThemeKey("ECONOMY"), false);
  assert.equal(isThemeKey(undefined), false);
});

test("the briefing takes the best of each theme, so tech never crowds out the others", () => {
  // Twenty tech candidates from ten sources (two each), far above the other themes.
  const tech = Array.from({ length: 20 }, (_, i) => ({ id: `t${i}`, sourceId: `s${Math.floor(i / 2)}`, theme: "TECH", importanceScore: 200 - i }));
  const focus = [
    { id: "f1", sourceId: "a", theme: "FOCUS", importanceScore: 10 },
    { id: "f2", sourceId: "b", theme: "FOCUS", importanceScore: 30 },
  ];
  const finance = [{ id: "m1", sourceId: "c", theme: "FINANCE", importanceScore: 5 }];
  const old = [{ id: "w1", sourceId: "d", theme: "WORLD", importanceScore: 999 }];

  const picks = pickBriefing([...tech, ...focus, ...finance, ...old], 5, 2);
  assert.deepEqual(picks.map((pick) => pick.id), ["f2", "f1", "m1", "t0", "t1", "t2", "t3", "t4"]);
});

test("one prolific source never fills a theme on its own", () => {
  const prolific = Array.from({ length: 8 }, (_, i) => ({ id: `p${i}`, sourceId: "psy", theme: "FOCUS", importanceScore: 100 - i }));
  const others = [
    { id: "o1", sourceId: "cal", theme: "FOCUS", importanceScore: 40 },
    { id: "o2", sourceId: "ness", theme: "FOCUS", importanceScore: 30 },
  ];
  const picks = pickBriefing([...prolific, ...others], 5, 2);
  assert.deepEqual(picks.map((pick) => pick.id), ["p0", "p1", "o1", "o2"]);
});

test("stories are interleaved across themes, best first in each", () => {
  const story = (id: string, theme: string, importanceScore: number) => ({ id, themes: [theme], importanceScore });
  const ordered = interleaveByTheme([
    story("t1", "TECH", 90),
    story("t2", "TECH", 80),
    story("t3", "TECH", 70),
    story("f1", "FOCUS", 20),
    story("m2", "FINANCE", 10),
    story("m1", "FINANCE", 40),
  ]);
  assert.deepEqual(ordered.map((s) => s.id), ["f1", "m1", "t1", "m2", "t2", "t3"]);
  assert.deepEqual(interleaveByTheme([]), []);
});

test("the briefing lists only the themes that have stories, in the family order", () => {
  assert.deepEqual(themesWithStories([{ themes: ["TECH"] }, { themes: ["FOCUS"] }]), ["FOCUS", "TECH"]);
  assert.deepEqual(themesWithStories([]), []);
});

test("an article loses half its score after its theme's half-life", async () => {
  const { computeImportance } = await import("./processing/score");
  const { HALF_LIFE_HOURS } = await import("./themes");
  const hoursAgo = (hours: number) => new Date(Date.now() - hours * 36e5);
  for (const theme of THEME_KEYS) {
    const fresh = computeImportance({ sourceWeight: 1, publishedAt: new Date(), halfLifeHours: HALF_LIFE_HOURS[theme] });
    const old = computeImportance({ sourceWeight: 1, publishedAt: hoursAgo(HALF_LIFE_HOURS[theme]), halfLifeHours: HALF_LIFE_HOURS[theme] });
    assert.ok(Math.abs(old - fresh / 2) < 0.1, theme);
  }
  // Long-lasting themes keep their articles longer than tech news.
  assert.ok(HALF_LIFE_HOURS.FOCUS > HALF_LIFE_HOURS.FINANCE && HALF_LIFE_HOURS.FINANCE > HALF_LIFE_HOURS.TECH);
});
