"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { THEME_KEYS, isThemeKey, type Language } from "@/types";
import { Icon } from "@/lib/nebula-design/Icon";
import { useI18n } from "@/lib/i18n/client";
import { THEME_ICONS } from "@/lib/navigation";

const LANGUAGES: Array<Language | null> = [null, "FR", "EN"];

/** Search, article language and (on the home page) theme filters, kept in the URL. */
export function FilterBar({ showThemes = true }: { showThemes?: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const languageParam = searchParams.get("language");
  const language = languageParam === "FR" || languageParam === "EN" ? languageParam : null;
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
    <div className="filter-bar">
      <label className="search-field">
        <Icon name="search" size={16} />
        <span className="visually-hidden">{t("filters.searchLabel")}</span>
        <input
          type="search"
          defaultValue={q}
          onKeyDown={(e) => {
            if (e.key === "Enter") updateParam("q", e.currentTarget.value || null);
          }}
          onBlur={(e) => {
            if (e.currentTarget.value !== q) updateParam("q", e.currentTarget.value || null);
          }}
          placeholder={t("filters.search")}
        />
      </label>

      <div className="segmented" role="radiogroup" aria-label={t("filters.languageLabel")}>
        {LANGUAGES.map((value) => (
          <button
            key={value ?? "all"}
            type="button"
            role="radio"
            aria-checked={language === value}
            className={language === value ? "active" : ""}
            data-sound="toggle"
            onClick={() => updateParam("language", value)}
          >
            {value ? t(`languages.${value}`) : t("filters.allLanguages")}
          </button>
        ))}
      </div>

      {showThemes ? (
        <div className="filter-chips" role="group" aria-label={t("nav.group.themes")}>
          {THEME_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={theme === key}
              className={`filter-chip ${theme === key ? "active" : ""}`}
              data-sound="toggle"
              onClick={() => updateParam("theme", theme === key ? null : key)}
            >
              <Icon name={THEME_ICONS[key]} size={14} />
              {t(`themes.${key}.label`)}
            </button>
          ))}
        </div>
      ) : null}

      {language || theme || q ? (
        <button type="button" className="ghost small filter-clear" onClick={() => router.push(pathname)}>
          <Icon name="refresh" size={14} />
          {t("filters.clear")}
        </button>
      ) : null}
    </div>
  );
}
