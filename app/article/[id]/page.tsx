import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticleById } from "@/lib/articles";
import { getDictionary, getLocale, translate } from "@/lib/i18n";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export const revalidate = 300;

export default async function ArticlePage({
  params,
}: {
  params: { id: string };
}) {
  const locale = getLocale();
  const dict = getDictionary(locale);
  const t = (path: string, vars?: Record<string, string | number>) =>
    translate(dict, path, vars);

  const article = await getArticleById(params.id);
  if (!article) notFound();

  const publishedDate = new Date(article.publishedAt).toLocaleDateString(
    locale === "fr" ? "fr-FR" : "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );

  return (
    <PageShell className="max-w-3xl">
      <Link
        href="/"
        className="mb-6 inline-block text-sm font-medium text-nebula-text-secondary hover:text-nebula-text"
      >
        ← {t("article.backToHome")}
      </Link>

      <Card className="overflow-hidden">
        {article.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.imageUrl}
            alt=""
            className="aspect-[16/8] w-full object-cover"
          />
        )}

        <div className="flex flex-wrap gap-1.5 p-6 pb-0">
          <span className="rounded-full border border-nebula-border px-2.5 py-1 text-xs text-nebula-text-secondary">
            {t(`regions.${article.region}`)}
          </span>
          {article.categories.map((c) => (
            <span
              key={c}
              className="rounded-full bg-nebula-card-alt px-2.5 py-1 text-xs text-nebula-text-secondary"
            >
              {t(`categories.${c}`)}
            </span>
          ))}
        </div>

        <div className="p-6">
          <h1 className="text-2xl font-extrabold leading-tight text-nebula-text sm:text-3xl">
            {article.title}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-nebula-text-secondary">
            <span>
              {t("article.source")}: <strong className="text-nebula-text">{article.source.name}</strong>
            </span>
            <span>·</span>
            <span>
              {t("article.publishedOn")} {publishedDate}
            </span>
          </div>

          {article.summary && (
            <p className="mt-6 text-base leading-relaxed text-nebula-text">
              {article.summary}
            </p>
          )}

          <a
            href={article.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-block"
          >
            <Button variant="primary">{t("article.readOriginal")} →</Button>
          </a>
        </div>
      </Card>
    </PageShell>
  );
}
