// Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { NO_PACKS, packBaseTheme, packLabel, packShellOf, packStyleSheet, type PackSource } from "./packs";
// The desktop main process maps the Hub's theme and the window colours with the same packs.
import rules from "../../desktop/nebula-rules.js";

const SAMPLE: PackSource = {
  id: "sample",
  themes: [
    { id: "sample-dark", scheme: "dark", label: { fr: "Exemple nuit", en: "Sample night" }, tokens: { "--page": "#101010", "--accent": "color-mix(in srgb, #3080c0 50%, #204060)" } },
    { id: "sample-light", scheme: "light", label: { fr: "Exemple jour" }, tokens: { "--page": "#fafafa" } },
  ],
  names: { "nebula.news": "Sample News", "nebula.clock": "Sample Clock" },
  marks: { "nebula.news": "<svg></svg>" },
};

test("appearance packs: the chosen theme, with this app's name and logo", () => {
  const shell = packShellOf([SAMPLE], "sample-dark", (svg) => `data:${svg.length}`);
  assert.deepEqual(shell.themes.map((theme) => theme.id), ["sample-dark", "sample-light"]);
  assert.equal(shell.active?.id, "sample-dark");
  assert.equal(shell.name, "Sample News");
  assert.equal(shell.markUrl, "data:11");
  // No choice, or a pack that is gone: the built-in theme, the app's own name and logo.
  assert.deepEqual(packShellOf([SAMPLE], undefined, (svg) => svg).active, null);
  assert.deepEqual(packShellOf([], "sample-dark", (svg) => svg), NO_PACKS);
});

test("appearance packs: one style sheet keyed on data-pack-theme, over the theme blocks", () => {
  assert.equal(
    packStyleSheet(SAMPLE.themes[0]),
    "html:root[data-pack-theme='sample-dark'][data-theme]{--page:#101010;--accent:color-mix(in srgb, #3080c0 50%, #204060);color-scheme:dark}"
  );
  assert.equal(packBaseTheme("light"), "nebula-light");
  assert.equal(packLabel(SAMPLE.themes[0].label, "en"), "Sample night");
  assert.equal(packLabel(SAMPLE.themes[1].label, "en"), "Exemple jour");
});

test("appearance packs: the Hub's theme and the window colours (desktop/main.js)", () => {
  const packs = [{ ...SAMPLE, themes: SAMPLE.themes.map((theme) => ({ ...theme, chrome: { page: theme.tokens["--page"], ink: "#000000" } })) }];
  assert.equal(rules.hubPackTheme({ theme: "sample-dark" }, packs), "sample-dark");
  assert.equal(rules.hubPackTheme({ theme: "glass-dark" }, packs), "");
  assert.equal(rules.hubPackTheme({ theme: "sample-dark" }, []), null);
  assert.equal(rules.hubPackTheme({}, packs), null);
  assert.deepEqual(rules.packChrome(packs, "sample-light"), { page: "#fafafa", ink: "#000000" });
  assert.equal(rules.packChrome(packs, ""), null);
  assert.equal(rules.packChrome([], "sample-dark"), null);
  assert.equal(rules.COOKIES.packTheme, "nebula-pack-theme");
});
