import Link from "next/link";
import { THEME_KEYS, THEME_SLUGS, isThemeKey, type Language, type ThemeKey } from "@/types";
import { getArticles, getThemeCounts } from "@/lib/articles";
import { getDictionary, getLocale, translate } from "@/lib/i18n";
import { Icon } from "@/lib/nebula-design/Icon";
import { THEME_ICONS } from "@/lib/navigation";
import { PageFrame } from "@/components/shell/PageFrame";
import { CollectBanner } from "@/components/shell/CollectBanner";
import { FilterBar } from "@/components/filters/FilterBar";
import { ArticleGrid } from "@/components/news/ArticleGrid";
import { Pagination } from "@/components/news/Pagination";

export const revalidate = 300;

/** Tone of each theme card (hub-dashboard.css): the accent, green for money, blue for tech. */
const THEME_TONES: Record<ThemeKey, string> = {
  FOCUS: "tone-accent",
  FINANCE: "tone-positive",
  TECH: "tone-gold",
};

export default async function HomePage(props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = (path: string, vars?: Record<string, string | number>) => translate(dict, path, vars);

  const page = Math.max(1, Number(searchParams.page) || 1);
  const [{ items, hasMore, total }, counts] = await Promise.all([
    getArticles({
      theme: isThemeKey(searchParams.theme) ? searchParams.theme : undefined,
      language: (searchParams.language as Language) || undefined,
      q: searchParams.q || undefined,
      page,
    }),
    getThemeCounts(),
  ]);

  return (
    <PageFrame
      eyebrow={t("home.eyebrow")}
      title={t("home.title")}
      intro={t("home.subtitle")}
      actions={
        <Link className="button-link" href="/briefing">
          <Icon name="newspaper" size={16} />
          {t("home.briefingCta")}
        </Link>
      }
    >
      <CollectBanner dict={dict} locale={locale} />

      <div className="summary-grid summary-grid-3">
        {THEME_KEYS.map((theme) => (
          <Link
            key={theme}
            href={`/theme/${THEME_SLUGS[theme]}`}
            className={`summary-card nebula-surface theme-card ${THEME_TONES[theme]}`}
          >
            <span className="card-top">
              {t(`themes.${theme}.label`)}
              <i><Icon name={THEME_ICONS[theme]} size={16} /></i>
            </span>
            <p>{t(`themes.${theme}.description`)}</p>
            <span className="theme-card-foot">
              <b className="tabular">{t("home.themeCount", { count: counts[theme] })}</b>
              <span>{t(`themes.${theme}.app`)}</span>
              <Icon name="chevronRight" size={14} />
            </span>
          </Link>
        ))}
      </div>

      <section aria-labelledby="all-articles" className="mt-10">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t("home.listEyebrow")}</p>
            <h2 id="all-articles">{t("nav.all")}</h2>
          </div>
        </div>

        <FilterBar />

        <ArticleGrid articles={items} empty={{ title: t("home.emptyTitle"), body: t("home.empty") }} />

        <Pagination
          basePath="/"
          searchParams={searchParams}
          page={page}
          hasMore={hasMore}
          previousLabel={t("home.previous")}
          moreLabel={t("home.loadMore")}
          totalLabel={t("home.total", { count: total })}
        />
      </section>
    </PageFrame>
  );
}
