"use client";

import type { ThemeKey } from "@/types";
import { useI18n } from "@/lib/i18n/client";
import { Badge } from "@/components/ui/Badge";

export function ThemeTag({ theme }: { theme: ThemeKey }) {
  const { t } = useI18n();
  return <Badge variant="default">{t(`themes.${theme}.label`)}</Badge>;
}
