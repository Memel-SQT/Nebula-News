"use client";

import type { CategoryKey } from "@prisma/client";
import { useI18n } from "@/lib/i18n/client";
import { Card } from "@/components/ui/Card";

export function ThemesPanel({ themes }: { themes: CategoryKey[] }) {
  const { t } = useI18n();

  if (themes.length === 0) return null;

  return (
    <Card className="mb-8 border-nebula-violet/30 bg-nebula-violet/[0.06] p-6">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-nebula-violet-bright">
        {t("briefing.themesTitle")}
      </h2>
      <div className="flex flex-wrap gap-2.5">
        {themes.map((theme) => (
          <span
            key={theme}
            className="rounded-full bg-nebula-gradient px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_25px_-14px_rgba(139,92,246,0.8)]"
          >
            {t(`categories.${theme}`)}
          </span>
        ))}
      </div>
    </Card>
  );
}
