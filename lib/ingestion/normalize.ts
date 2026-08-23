import type { Language, Region } from "@/types";
import type { SourceConfig } from "@/lib/sources/config";
import type { FeedItem } from "./fetchFeeds";

export type NormalizedArticle = {
  title: string;
  originalUrl: string;
  sourceName: string;
  region: Region;
  language: Language;
  publishedAt: Date;
  rawContent: string;
  imageUrl: string | null;
};

/** Strips HTML tags/entities from RSS content so summarizers work on plain text. */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeItem(
  item: FeedItem,
  source: SourceConfig
): NormalizedArticle {
  const raw = item.content ?? item.contentSnippet ?? "";
  const publishedAt = item.isoDate
    ? new Date(item.isoDate)
    : item.pubDate
      ? new Date(item.pubDate)
      : new Date();

  return {
    title: stripHtml(item.title),
    originalUrl: item.link,
    sourceName: source.name,
    region: source.region,
    language: source.language,
    publishedAt: Number.isNaN(publishedAt.getTime()) ? new Date() : publishedAt,
    rawContent: stripHtml(raw),
    imageUrl: item.imageUrl ?? null,
  };
}
