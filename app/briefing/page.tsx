import { getBriefingToday } from "@/lib/articles";
import { getDictionary, getLocale, translate } from "@/lib/i18n";
import { PageShell } from "@/components/layout/PageShell";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { ThemesPanel } from "@/components/news/ThemesPanel";
import { ArticleGrid } from "@/components/news/ArticleGrid";

export const revalidate = 300;

export default async function BriefingPage() {
  const locale = getLocale();
  const dict = getDictionary(locale);
  const t = (path: string, vars?: Record<string, string | number>) =>
    translate(dict, path, vars);

  const briefing = await getBriefingToday();

  return (
    <PageShell>
      <SectionHeader
        title={t("briefing.title")}
        subtitle={t("briefing.subtitle", { count: briefing.stories.length })}
      />

      <ThemesPanel themes={briefing.themes} />

      {briefing.stories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-nebula-border py-24 text-center text-nebula-text-secondary">
          {t("briefing.empty")}
        </div>
      ) : (
        <ArticleGrid articles={briefing.stories} />
      )}
    </PageShell>
  );
}
