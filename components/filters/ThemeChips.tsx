"use client";

import { THEME_KEYS, type ThemeKey } from "@/types";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export function ThemeChips({
  value,
  onChange,
}: {
  value: ThemeKey | null;
  onChange: (theme: ThemeKey | null) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="flex flex-wrap gap-2">
      {THEME_KEYS.map((theme) => (
        <button
          key={theme}
          type="button"
          aria-pressed={value === theme}
          onClick={() => onChange(value === theme ? null : theme)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            value === theme
              ? "border-transparent bg-nebula-gradient text-white"
              : "border-nebula-border bg-nebula-card-alt text-nebula-text-secondary hover:text-nebula-text"
          )}
        >
          {t(`themes.${theme}.label`)}
        </button>
      ))}
    </div>
  );
}
