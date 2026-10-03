"use client";

import { useState } from "react";
import Link from "next/link";
import type { ArticleCard } from "@/types";
import { Icon } from "@/lib/nebula-design/Icon";
import { useI18n } from "@/lib/i18n/client";
import { THEME_ICONS } from "@/lib/navigation";
import { timeAgo } from "@/lib/utils";

/** The 16:9 media slot: the image, or a theme tile when there is none or it fails to load
 *  (the slot keeps its size either way, so the grid never shifts). */
export function ArticleMedia({ article, eager = false }: { article: ArticleCard; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  const theme = article.themes[0];
  return (
    <div className="article-media">
      {article.imageUrl && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={article.imageUrl} alt="" loading={eager ? "eager" : "lazy"} onError={() => setFailed(true)} />
      ) : (
        <div className="article-media-fallback" aria-hidden="true">
          <span><Icon name={theme ? THEME_ICONS[theme] : "newspaper"} size={22} /></span>
        </div>
      )}
    </div>
  );
}

export function NewsCard({ article }: { article: ArticleCard }) {
  const { t, locale } = useI18n();
  const theme = article.themes[0];

  return (
    <article className="article-card">
      <Link href={`/article/${article.id}`}>
        <ArticleMedia article={article} />
        <div className="article-body">
          {theme ? (
            <span className="theme-chip">
              <Icon name={THEME_ICONS[theme]} size={12} />
              {t(`themes.${theme}.label`)}
            </span>
          ) : null}
          <h3>{article.title}</h3>
          {article.summary ? <p className="article-summary">{article.summary}</p> : null}
          <div className="article-meta">
            <strong title={article.source.name}>{article.source.name}</strong>
            {/* Relative to "now", which moves between the server render and hydration. */}
            <time dateTime={article.publishedAt} suppressHydrationWarning>
              {timeAgo(new Date(article.publishedAt), locale)}
            </time>
          </div>
        </div>
      </Link>
    </article>
  );
}
