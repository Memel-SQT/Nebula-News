"use client";

import type { Region } from "@prisma/client";
import { useI18n } from "@/lib/i18n/client";

const REGIONS: Region[] = ["FRANCE", "NORTH_AMERICA", "ANGLOSAXON", "GLOBAL"];

export function RegionFilter({
  value,
  onChange,
}: {
  value: Region | null;
  onChange: (region: Region | null) => void;
}) {
  const { t } = useI18n();

  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange((e.target.value as Region) || null)}
      className="rounded-lg border border-nebula-border bg-nebula-card px-3 py-2.5 text-sm text-nebula-text focus:border-nebula-violet focus:outline-none"
    >
      <option value="">{t("filters.allRegions")}</option>
      {REGIONS.map((r) => (
        <option key={r} value={r}>
          {t(`regions.${r}`)}
        </option>
      ))}
    </select>
  );
}
