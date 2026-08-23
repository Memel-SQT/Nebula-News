"use client";

import type { CategoryKey, Region } from "@prisma/client";
import { useI18n } from "@/lib/i18n/client";
import { Badge } from "@/components/ui/Badge";

export function CategoryTag({ category }: { category: CategoryKey }) {
  const { t } = useI18n();
  return <Badge variant="default">{t(`categories.${category}`)}</Badge>;
}

export function RegionTag({ region }: { region: Region }) {
  const { t } = useI18n();
  return <Badge variant="outline">{t(`regions.${region}`)}</Badge>;
}
