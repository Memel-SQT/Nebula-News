// Pure, isomorphic i18n helpers (no "server-only" imports) so client
// components can use them too — see index.ts for the server-only cookie/
// dictionary-loading helpers that wrap these.
import fr from "./fr.json";
import en from "./en.json";

export const dictionaries = { fr, en } as const;

export type Dictionary = typeof fr;

export const LOCALE_COOKIE = "nebula-locale";

/** Dot-path lookup with `{placeholder}` interpolation, e.g. t(dict, "home.sourceCount", { count: 12 }). */
export function translate(
  dict: Dictionary,
  path: string,
  vars?: Record<string, string | number>
): string {
  const value = path
    .split(".")
    .reduce<unknown>(
      (node, key) =>
        typeof node === "object" && node !== null
          ? (node as Record<string, unknown>)[key]
          : undefined,
      dict
    );

  if (typeof value !== "string") return path;
  if (!vars) return value;

  return Object.entries(vars).reduce(
    (str, [key, val]) => str.replaceAll(`{${key}}`, String(val)),
    value
  );
}
