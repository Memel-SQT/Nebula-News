"use client";

import type { ArticleCard } from "@/types";
import { useI18n } from "@/lib/i18n/client";
import { NewsCard } from "@/components/news/NewsCard";

export function ArticleGrid({ articles }: { articles: ArticleCard[] }) {
  const { t } = useI18n();

  if (articles.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-nebula-border py-24 text-center text-nebula-text-secondary">
        {t("home.empty")}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {articles.map((article, i) => (
        <div
          key={article.id}
          className="animate-fade-up opacity-0"
          style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
        >
          <NewsCard article={article} />
        </div>
      ))}
    </div>
  );
}
