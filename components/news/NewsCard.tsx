"use client";

import Link from "next/link";
import type { ArticleCard } from "@/types";
import { useI18n } from "@/lib/i18n/client";
import { Card } from "@/components/ui/Card";
import { CategoryTag, RegionTag } from "@/components/news/Tag";
import { timeAgo } from "@/lib/utils";

export function NewsCard({ article }: { article: ArticleCard }) {
  const { t, locale } = useI18n();

  return (
    <Card className="group flex h-full flex-col overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:border-nebula-violet/60 hover:shadow-[0_20px_45px_-24px_rgba(139,92,246,0.55)]">
      <Link href={`/article/${article.id}`} className="flex h-full flex-col">
        {article.imageUrl ? (
          <div className="aspect-[16/9] w-full overflow-hidden bg-nebula-card-alt">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.imageUrl}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              onError={(e) => {
                (e.currentTarget.parentElement as HTMLElement).style.display = "none";
              }}
            />
          </div>
        ) : null}

        <div className="flex flex-1 flex-col gap-3 p-5">
          <div className="flex flex-wrap items-center gap-1.5">
            <RegionTag region={article.region} />
            {article.categories.slice(0, 2).map((c) => (
              <CategoryTag key={c} category={c} />
            ))}
          </div>

          <h3 className="text-base font-bold leading-snug text-nebula-text group-hover:text-white">
            {article.title}
          </h3>

          {article.summary && (
            <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-nebula-text-secondary">
              {article.summary}
            </p>
          )}

          <div className="mt-auto flex items-center justify-between pt-2 text-xs text-nebula-text-secondary">
            <span className="font-medium">{article.source.name}</span>
            <span>{timeAgo(new Date(article.publishedAt), locale)}</span>
          </div>
        </div>
      </Link>
    </Card>
  );
}
