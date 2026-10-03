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

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  laquo: "«",
  raquo: "»",
  hellip: "…",
  ndash: "–",
  mdash: "—",
  euro: "€",
};

/** Decodes numeric (`&#8217;`, `&#x2019;`) and common named entities; unknown ones stay. */
export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const point = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(point) && point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : match;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? match;
  });
}

/** Strips HTML tags and decodes entities from RSS content so summarizers work on plain text. */
export function stripHtml(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " "))
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
