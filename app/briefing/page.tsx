import Link from "next/link";
import { THEME_SLUGS } from "@/types";
import { getBriefingToday } from "@/lib/articles";
import { getDictionary, getLocale, translate } from "@/lib/i18n";
import { Icon } from "@/lib/nebula-design/Icon";
import { PageFrame } from "@/components/shell/PageFrame";
import { CollectBanner } from "@/components/shell/CollectBanner";
import { EmptyState } from "@/components/shell/ScreenState";
import { ArticleGrid } from "@/components/news/ArticleGrid";

export const revalidate = 300;

/** Today's briefing: one section per theme, five articles each. */
export default async function BriefingPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = (path: string, vars?: Record<string, string | number>) => translate(dict, path, vars);

  const briefing = await getBriefingToday();
  const date = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <PageFrame
      eyebrow={date}
      title={t("briefing.title")}
      intro={t("briefing.subtitle", { count: briefing.stories.length })}
    >
      <CollectBanner dict={dict} locale={locale} />

      {briefing.stories.length === 0 ? (
        <EmptyState icon="newspaper" title={t("briefing.emptyTitle")} body={t("briefing.empty")} />
      ) : (
        briefing.themes.map((theme) => {
          const stories = briefing.stories.filter((story) => story.themes.includes(theme));
          return (
            <section key={theme} className="briefing-section" aria-labelledby={`briefing-${theme}`}>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">{t(`themes.${theme}.app`)}</p>
                  <h2 id={`briefing-${theme}`}>{t(`themes.${theme}.label`)}</h2>
                </div>
                <div className="settings-actions">
                  <span className="pill">{stories.length}</span>
                  <Link className="button-link ghost small" href={`/theme/${THEME_SLUGS[theme]}`}>
                    {t("themePage.seeAll")}
                    <Icon name="chevronRight" size={14} />
                  </Link>
                </div>
              </div>
              <ArticleGrid articles={stories} empty={{ title: t("themePage.emptyTitle"), body: t("themePage.empty") }} />
            </section>
          );
        })
      )}
    </PageFrame>
  );
}
