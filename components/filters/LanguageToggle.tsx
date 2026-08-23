"use client";

import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/** Toggles the interface language (FR/EN) — distinct from the article-language content filter. */
export function LanguageToggle() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-nebula-border bg-nebula-card-alt p-0.5 text-xs font-semibold">
      {(["fr", "en"] as const).map((code) => (
        <button
          key={code}
          onClick={() => setLocale(code)}
          aria-pressed={locale === code}
          className={cn(
            "rounded-full px-2.5 py-1 uppercase tracking-wide transition-colors",
            locale === code
              ? "bg-nebula-gradient text-white"
              : "text-nebula-text-secondary hover:text-nebula-text"
          )}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
