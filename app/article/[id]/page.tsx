import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticleById } from "@/lib/articles";
import { getDictionary, getLocale, translate } from "@/lib/i18n";
import { Icon } from "@/lib/nebula-design/Icon";
import { THEME_ICONS } from "@/lib/navigation";
import { ArticleMedia } from "@/components/news/NewsCard";

export const revalidate = 300;

export default async function ArticlePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = (path: string, vars?: Record<string, string | number>) => translate(dict, path, vars);

  const article = await getArticleById(params.id);
  if (!article) notFound();

  const publishedDate = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(article.publishedAt));

  return (
    <main className="workspace motion-page" aria-labelledby="page-title">
      <div className="workspace-inner article-page">
        <Link href="/" className="button-link ghost small back-link">
          <Icon name="chevronLeft" size={14} />
          {t("article.backToHome")}
        </Link>

        <article className="article-panel nebula-surface">
          <ArticleMedia article={article} eager />

          <div className="article-panel-body">
            <div className="settings-actions">
              {article.themes.map((theme) => (
                <span key={theme} className="theme-chip">
                  <Icon name={THEME_ICONS[theme]} size={12} />
                  {t(`themes.${theme}.label`)}
                </span>
              ))}
            </div>

            <h1 id="page-title">{article.title}</h1>

            <p className="article-meta-line">
              <span>
                {t("article.source")} <strong>{article.source.name}</strong>
              </span>
              <span>
                {t("article.publishedOn")} {publishedDate}
              </span>
            </p>

            {article.summary ? <p className="article-lead">{article.summary}</p> : null}

            <div className="article-actions">
              {/* Opens in the browser (desktop/main.js: http(s) only, never inside the app). */}
              <a className="button-link" href={article.originalUrl} target="_blank" rel="noopener noreferrer">
                {t("article.readOriginal")}
                <Icon name="external" size={16} />
              </a>
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}
