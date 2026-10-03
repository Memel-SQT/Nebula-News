// Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_APPEARANCE } from "../nebula-design/appearance";
import { accentStyleSheet, parseAppearance, serializeAppearance, type StoredAppearance } from "./shared";
// The desktop main process writes the same cookie when it follows Nebula Hub.
import rules from "../../desktop/nebula-rules.js";

const DEFAULTS: StoredAppearance = { theme: "system", ...DEFAULT_APPEARANCE };

test("no cookie (every version before 0.4.0) gives the family defaults", () => {
  assert.deepEqual(parseAppearance(undefined), DEFAULTS);
  assert.deepEqual(parseAppearance(""), DEFAULTS);
});

test("a corrupt cookie never breaks the app", () => {
  assert.deepEqual(parseAppearance("%7Bnot json"), DEFAULTS);
  assert.deepEqual(parseAppearance(encodeURIComponent('"a string"')), DEFAULTS);
  assert.deepEqual(parseAppearance(encodeURIComponent("[1,2]")), DEFAULTS);
});

test("each field falls back on its own, the valid ones are kept", () => {
  const parsed = parseAppearance(
    encodeURIComponent(JSON.stringify({ theme: "sepia", background: "aurora", motion: "warp", accentPreset: "sunset", soundVolume: 250, soundEnabled: false, customPrimary: "red" }))
  );
  assert.equal(parsed.theme, "system");
  assert.equal(parsed.background, "aurora");
  assert.equal(parsed.motion, DEFAULT_APPEARANCE.motion);
  assert.equal(parsed.accentPreset, "sunset");
  assert.equal(parsed.soundVolume, 100);
  assert.equal(parsed.soundEnabled, false);
  assert.equal(parsed.customPrimary, DEFAULT_APPEARANCE.customPrimary);
});

test("the cookie round-trips", () => {
  const appearance: StoredAppearance = { ...DEFAULTS, theme: "glass-light", accentPreset: "custom", customPrimary: "#10b981", customSecondary: "#06b6d4", motion: "off", background: "none", soundVolume: 20 };
  assert.deepEqual(parseAppearance(serializeAppearance(appearance)), appearance);
});

test("the desktop app writes exactly what the server would (1:1 with Nebula Hub)", () => {
  const hub = { ...DEFAULTS, theme: "nebula-light" as const, accentPreset: "ember" as const, language: "en" };
  const fromMain = rules.hubAppearanceCookie(hub);
  assert.equal(fromMain, serializeAppearance(parseAppearance(fromMain)));
  assert.equal(parseAppearance(fromMain).accentPreset, "ember");
});

test("accent variables are rendered for every theme, none for the default accent", () => {
  assert.equal(accentStyleSheet(DEFAULTS), null);
  const sheet = accentStyleSheet({ ...DEFAULTS, accentPreset: "ocean" }) ?? "";
  for (const theme of ["nebula-dark", "nebula-light", "glass-dark", "glass-light"]) {
    assert.match(sheet, new RegExp(`html:root\\[data-theme='${theme}'\\]\\{--accent:#`));
  }
  // Light themes get the darker accent (accentVariables), so text on it stays readable.
  const dark = sheet.match(/data-theme='nebula-dark'\]\{--accent:(#[0-9a-f]{6})/)?.[1];
  const light = sheet.match(/data-theme='nebula-light'\]\{--accent:(#[0-9a-f]{6})/)?.[1];
  assert.equal(dark, "#0ea5e9");
  assert.notEqual(light, dark);
});
