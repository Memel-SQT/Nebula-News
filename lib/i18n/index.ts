import "server-only";
import { cookies } from "next/headers";
import type { Locale } from "@/types";
import { dictionaries, LOCALE_COOKIE, type Dictionary, translate } from "./shared";

export const DEFAULT_LOCALE: Locale = "fr";
export { LOCALE_COOKIE, translate };
export type { Dictionary };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export function getLocale(): Locale {
  const cookie = cookies().get(LOCALE_COOKIE)?.value;
  return cookie === "en" ? "en" : DEFAULT_LOCALE;
}
