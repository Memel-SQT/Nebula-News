"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { isThemeKey, type Language } from "@/types";
import { useI18n } from "@/lib/i18n/client";
import { ThemeChips } from "./ThemeChips";

const LANGUAGES: Language[] = ["FR", "EN"];

/** Search, article language and (on the home page) theme filters, kept in the URL. */
export function FilterBar({ showThemes = true }: { showThemes?: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const language = searchParams.get("language") as Language | null;
  const themeParam = searchParams.get("theme");
  const theme = isThemeKey(themeParam) ? themeParam : null;
  const q = searchParams.get("q") ?? "";

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete("page");
      startTransition(() => router.push(`${pathname}?${params.toString()}`));
    },
    [pathname, router, searchParams, startTransition]
  );

  return (
    <div className="mb-8 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          aria-label={t("filters.searchLabel")}
          defaultValue={q}
          onKeyDown={(e) => {
            if (e.key === "Enter") updateParam("q", e.currentTarget.value || null);
          }}
          onBlur={(e) => {
            if (e.currentTarget.value !== q) updateParam("q", e.currentTarget.value || null);
          }}
          placeholder={t("filters.search")}
          className="w-full max-w-xs rounded-lg border border-nebula-border bg-nebula-card px-4 py-2.5 text-sm text-nebula-text placeholder:text-nebula-text-secondary focus:border-nebula-violet focus:outline-none"
        />

        <select
          aria-label={t("filters.languageLabel")}
          value={language ?? ""}
          onChange={(e) => updateParam("language", e.target.value || null)}
          className="rounded-lg border border-nebula-border bg-nebula-card px-3 py-2.5 text-sm text-nebula-text focus:border-nebula-violet focus:outline-none"
        >
          <option value="">{t("filters.allLanguages")}</option>
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>
              {t(`languages.${l}`)}
            </option>
          ))}
        </select>

        {(language || theme || q) && (
          <button
            type="button"
            onClick={() => router.push(pathname)}
            className="text-sm font-medium text-nebula-text-secondary underline-offset-4 hover:text-nebula-text hover:underline"
          >
            {t("filters.clear")}
          </button>
        )}
      </div>

      {showThemes ? <ThemeChips value={theme} onChange={(next) => updateParam("theme", next)} /> : null}
    </div>
  );
}
