import { notFound } from "next/navigation";
import { themeOfSlug, type Language } from "@/types";
import { getArticles } from "@/lib/articles";
import { getDictionary, getLocale, translate } from "@/lib/i18n";
import { PageShell } from "@/components/layout/PageShell";
import { SectionHeader } from "@/components/layout/SectionHeader";
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
  const t = (path: string, vars?: Record<string, string | number>) =>
    translate(dict, path, vars);

  const page = Math.max(1, Number(searchParams.page) || 1);
  const { items, hasMore, total } = await getArticles({
    theme,
    language: (searchParams.language as Language) || undefined,
    q: searchParams.q || undefined,
    page,
  });

  return (
    <PageShell>
      <SectionHeader
        title={t(`themes.${theme}.label`)}
        subtitle={t(`themes.${theme}.description`)}
      />

      <FilterBar showThemes={false} />

      <ArticleGrid articles={items} />

      <Pagination
        basePath={`/theme/${slug}`}
        searchParams={searchParams}
        page={page}
        hasMore={hasMore}
        previousLabel={t("home.previous")}
        moreLabel={t("home.loadMore")}
      />

      <p className="mt-6 text-center text-xs text-nebula-text-secondary">
        {t("home.total", { count: total })}
      </p>
    </PageShell>
  );
}
