// Nebula News appearance: the family model of @nebula/design (lib/nebula-design), stored in a
// cookie so the server renders the page already themed (data-theme, data-motion,
// data-background and the accent variables on <html>): no flash, in the browser as in the
// desktop app. The language keeps its own cookie (nebula-locale, lib/i18n).
//
// Pure and isomorphic (no "server-only", no DOM): read by the root layout, the client provider
// and the tests (appearance.test.ts).
import {
  ACCENT_VARIABLES,
  accentColors,
  accentVariables,
  normalizeAppearance,
  type NebulaAppearance,
} from "@/lib/nebula-design/appearance";
import { DEFAULT_THEME, isTheme, type ResolvedTheme } from "@/lib/nebula-design/theme";

/** Everything of the family appearance except the language (nebula-locale). */
export type StoredAppearance = Omit<NebulaAppearance, "language">;

/** Written by the app (Settings) and, when it follows Nebula Hub, by desktop/main.js. */
export const APPEARANCE_COOKIE = "nebula-appearance";
/** Desktop only: "0" when the user stopped following Nebula Hub's appearance (default: follow). */
export const FOLLOW_HUB_COOKIE = "nebula-follow-hub";
/** Desktop only, written by desktop/main.js: "connected" while Nebula Hub is there. */
export const HUB_STATUS_COOKIE = "nebula-hub-status";
/** Desktop only, written by desktop/main.js: "1" while the window is shown inside Nebula Hub. */
export const DOCKED_COOKIE = "nebula-docked";

export const COOKIE_MAX_AGE = 31536000;

const RESOLVED_THEMES: readonly ResolvedTheme[] = ["nebula-dark", "nebula-light", "glass-dark", "glass-light"];

/**
 * Reads the cookie field by field: a missing, corrupt, older or hand-edited value falls back
 * to its own default without breaking the others (versions before 0.4.0 had no cookie at all,
 * so everyone starts on the family defaults).
 */
export function parseAppearance(raw: string | undefined | null): StoredAppearance {
  let value: unknown = {};
  if (raw) {
    try {
      value = JSON.parse(decodeURIComponent(raw));
    } catch {
      value = {};
    }
  }
  const record = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  return {
    theme: isTheme(record.theme) ? record.theme : DEFAULT_THEME,
    ...normalizeAppearance(record),
  };
}

/** Only the known fields, in a stable order, URI-encoded for a cookie value. */
export function serializeAppearance(appearance: StoredAppearance): string {
  const { theme, accentPreset, customPrimary, customSecondary, background, motion, soundEnabled, soundVolume } = appearance;
  return encodeURIComponent(
    JSON.stringify({ theme, accentPreset, customPrimary, customSecondary, background, motion, soundEnabled, soundVolume })
  );
}

/**
 * The accent variables for every resolved theme, as a style sheet keyed on data-theme, so the
 * right set applies before any script runs, whatever `system` resolves to. Null for the
 * default Nebula accent, which the theme blocks already carry. `html:root` outranks the theme
 * blocks of tokens.css (same selector shape, one more element).
 */
export function accentStyleSheet(appearance: StoredAppearance): string | null {
  if (appearance.accentPreset === "nebula") return null;
  const { primary, secondary } = accentColors(appearance);
  return RESOLVED_THEMES.map((theme) => {
    const variables = accentVariables(primary, secondary, theme);
    const body = ACCENT_VARIABLES.map((name) => `${name}:${variables[name]}`).join(";");
    return `html:root[data-theme='${theme}']{${body}}`;
  }).join("\n");
}

/**
 * Runs in <head> before the body is parsed: resolves `system` with the OS preference and
 * writes data-theme, so the first paint already has the right palette. The chosen theme is
 * on data-theme-choice (server-rendered).
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var r=document.documentElement;if(r.dataset.themeChoice==='system'){r.dataset.theme=window.matchMedia('(prefers-color-scheme: dark)').matches?'nebula-dark':'nebula-light';}}catch(e){}})();`;

/** A cookie string for document.cookie (client side). */
export function cookieString(name: string, value: string): string {
  return `${name}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}
