"use client";

import type { CategoryKey } from "@prisma/client";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

const CATEGORIES: CategoryKey[] = [
  "WORLD", "POLITICS", "ECONOMY", "TECH", "SCIENCE", "CULTURE", "ENVIRONMENT", "SPORTS", "HEALTH",
];

export function CategoryChips({
  value,
  onChange,
}: {
  value: CategoryKey | null;
  onChange: (category: CategoryKey | null) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIES.map((c) => (
        <button
          key={c}
          onClick={() => onChange(value === c ? null : c)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            value === c
              ? "border-transparent bg-nebula-gradient text-white"
              : "border-nebula-border bg-nebula-card-alt text-nebula-text-secondary hover:text-nebula-text"
          )}
        >
          {t(`categories.${c}`)}
        </button>
      ))}
    </div>
  );
}
