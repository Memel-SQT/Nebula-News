import { notFound } from "next/navigation";
import { themeOfSlug, type Language } from "@/types";
import { getArticles } from "@/lib/articles";
import { getDictionary, getLocale, translate } from "@/lib/i18n";
import { PageFrame } from "@/components/shell/PageFrame";
import { CollectBanner } from "@/components/shell/CollectBanner";
import { FilterBar } from "@/components/filters/FilterBar";
import { ArticleGrid } from "@/components/news/ArticleGrid";
import { Pagination } from "@/components/news/Pagination";

export const revalidate = 300;

/** One theme: `/theme/focus`, `/theme/finance`, `/theme/tech` (also Nebula Link deep links). */
export default async function ThemePage(props: {
  params: Promise<{ theme: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const [{ theme: slug }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const theme = themeOfSlug(slug);
  if (!theme) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = (path: string, vars?: Record<string, string | number>) => translate(dict, path, vars);

  const page = Math.max(1, Number(searchParams.page) || 1);
  const { items, hasMore, total } = await getArticles({
    theme,
    language: (searchParams.language as Language) || undefined,
    q: searchParams.q || undefined,
    page,
  });

  return (
    <PageFrame
      eyebrow={t(`themes.${theme}.app`)}
      title={t(`themes.${theme}.label`)}
      intro={t(`themes.${theme}.description`)}
    >
      <CollectBanner dict={dict} locale={locale} />

      <FilterBar showThemes={false} />

      <ArticleGrid articles={items} empty={{ title: t("themePage.emptyTitle"), body: t("themePage.empty") }} />

      <Pagination
        basePath={`/theme/${slug}`}
        searchParams={searchParams}
        page={page}
        hasMore={hasMore}
        previousLabel={t("home.previous")}
        moreLabel={t("home.loadMore")}
        totalLabel={t("home.total", { count: total })}
      />
    </PageFrame>
  );
}
