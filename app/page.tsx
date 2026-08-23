import Link from "next/link";
import type { CategoryKey, Language, Region } from "@/types";
import { getArticles } from "@/lib/articles";
import { getDictionary, getLocale, translate } from "@/lib/i18n";
import { PageShell } from "@/components/layout/PageShell";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { FilterBar } from "@/components/filters/FilterBar";
import { ArticleGrid } from "@/components/news/ArticleGrid";
import { Button } from "@/components/ui/Button";

export const revalidate = 300;

export default async function HomePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const locale = getLocale();
  const dict = getDictionary(locale);
  const t = (path: string, vars?: Record<string, string | number>) =>
    translate(dict, path, vars);

  const page = searchParams.page ? Number(searchParams.page) : 1;

  const { items, hasMore, total } = await getArticles({
    region: (searchParams.region as Region) || undefined,
    category: (searchParams.category as CategoryKey) || undefined,
    language: (searchParams.language as Language) || undefined,
    q: searchParams.q || undefined,
    page,
  });

  const buildPageHref = (targetPage: number) => {
    const params = new URLSearchParams(
      Object.entries(searchParams).filter(([, v]) => v) as [string, string][]
    );
    params.set("page", String(targetPage));
    return `/?${params.toString()}`;
  };

  return (
    <PageShell>
      <SectionHeader
        title={t("home.title")}
        subtitle={t("home.subtitle")}
        action={
          <Link href="/briefing">
            <Button variant="primary">{t("home.briefingCta")}</Button>
          </Link>
        }
      />

      <FilterBar />

      <ArticleGrid articles={items} />

      <div className="mt-10 flex items-center justify-center gap-3">
        {page > 1 && (
          <Link href={buildPageHref(page - 1)}>
            <Button variant="secondary">←</Button>
          </Link>
        )}
        {hasMore && (
          <Link href={buildPageHref(page + 1)}>
            <Button variant="secondary">{t("home.loadMore")}</Button>
          </Link>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-nebula-text-secondary">
        {total} {locale === "fr" ? "articles au total" : "articles total"}
      </p>
    </PageShell>
  );
}
