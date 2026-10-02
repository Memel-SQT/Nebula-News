import Link from "next/link";
import { THEME_SLUGS } from "@/types";
import { getBriefingToday } from "@/lib/articles";
import { getDictionary, getLocale, translate } from "@/lib/i18n";
import { PageShell } from "@/components/layout/PageShell";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { ArticleGrid } from "@/components/news/ArticleGrid";

export const revalidate = 300;

/** Today's briefing: one section per theme, five articles each. */
export default async function BriefingPage() {
  const locale = await getLocale();
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

      {briefing.stories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-nebula-border py-24 text-center text-nebula-text-secondary">
          {t("briefing.empty")}
        </div>
      ) : (
        <div className="flex flex-col gap-12">
          {briefing.themes.map((theme) => (
            <section key={theme} aria-labelledby={`briefing-${theme}`}>
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-nebula-violet-bright">
                    {t(`themes.${theme}.app`)}
                  </p>
                  <h2 id={`briefing-${theme}`} className="mt-1 text-xl font-bold text-nebula-text">
                    {t(`themes.${theme}.label`)}
                  </h2>
                </div>
                <Link
                  href={`/theme/${THEME_SLUGS[theme]}`}
                  className="text-sm font-medium text-nebula-text-secondary hover:text-nebula-text"
                >
                  {t("theme.seeAll")}
                </Link>
              </div>
              <ArticleGrid
                articles={briefing.stories.filter((story) => story.themes.includes(theme))}
              />
            </section>
          ))}
        </div>
      )}
    </PageShell>
  );
}
