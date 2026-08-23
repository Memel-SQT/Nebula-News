"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CategoryKey, Language, Region } from "@prisma/client";
import { useI18n } from "@/lib/i18n/client";
import { RegionFilter } from "./RegionFilter";
import { CategoryChips } from "./CategoryChips";

const LANGUAGES: Language[] = ["FR", "EN"];

export function FilterBar() {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const region = searchParams.get("region") as Region | null;
  const language = searchParams.get("language") as Language | null;
  const category = searchParams.get("category") as CategoryKey | null;
  const q = searchParams.get("q") ?? "";

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      startTransition(() => router.push(`${pathname}?${params.toString()}`));
    },
    [pathname, router, searchParams, startTransition]
  );

  return (
    <div className="mb-8 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          defaultValue={q}
          onKeyDown={(e) => {
            if (e.key === "Enter") updateParam("q", e.currentTarget.value || null);
          }}
          onBlur={(e) => updateParam("q", e.currentTarget.value || null)}
          placeholder={t("filters.search")}
          className="w-full max-w-xs rounded-lg border border-nebula-border bg-nebula-card px-4 py-2.5 text-sm text-nebula-text placeholder:text-nebula-text-secondary focus:border-nebula-violet focus:outline-none"
        />

        <RegionFilter value={region} onChange={(r) => updateParam("region", r)} />

        <select
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

        {(region || language || category || q) && (
          <button
            onClick={() => router.push(pathname)}
            className="text-sm font-medium text-nebula-text-secondary underline-offset-4 hover:text-nebula-text hover:underline"
          >
            {t("filters.clear")}
          </button>
        )}
      </div>

      <CategoryChips
        value={category}
        onChange={(c) => updateParam("category", c)}
      />
    </div>
  );
}
