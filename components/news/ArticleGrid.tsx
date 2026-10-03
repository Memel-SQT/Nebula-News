import type { ArticleCard } from "@/types";
import { NewsCard } from "@/components/news/NewsCard";
import { EmptyState } from "@/components/shell/ScreenState";

/** Auto-fill grid of cards (a short row fills the width); entrance staggered by 40 ms, capped
 *  at six cards (news.css). */
export function ArticleGrid({
  articles,
  empty,
}: {
  articles: ArticleCard[];
  empty: { title: string; body: string; action?: React.ReactNode };
}) {
  if (articles.length === 0) {
    return <EmptyState icon="newspaper" title={empty.title} body={empty.body} action={empty.action} />;
  }

  return (
    <div className="article-grid">
      {articles.map((article) => (
        <NewsCard key={article.id} article={article} />
      ))}
    </div>
  );
}
