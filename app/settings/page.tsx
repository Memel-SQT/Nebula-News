import { getDictionary, getLocale, translate } from "@/lib/i18n";
import { PageFrame } from "@/components/shell/PageFrame";
import { SettingsPanel } from "@/components/settings/SettingsPanel";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const dict = getDictionary(await getLocale());
  const t = (path: string) => translate(dict, path);
  return (
    <PageFrame eyebrow={t("settings.eyebrow")} title={t("settings.title")} intro={t("settings.intro")}>
      <SettingsPanel />
    </PageFrame>
  );
}
