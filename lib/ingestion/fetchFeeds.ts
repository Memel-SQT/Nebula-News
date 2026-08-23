import Parser from "rss-parser";

export type FeedItem = {
  title: string;
  link: string;
  isoDate?: string;
  pubDate?: string;
  contentSnippet?: string;
  content?: string;
  imageUrl?: string;
};

const parser = new Parser({
  timeout: 15_000,
  headers: { "User-Agent": "NebulaNewsBot/1.0 (+https://nebula.news)" },
});

/** Best-effort image extraction: media:content, enclosure, then a raw <img> in the body. */
function extractImage(item: Parser.Item): string | undefined {
  const record = item as unknown as Record<string, unknown>;

  const media = record["media:content"] as { $?: { url?: string } } | undefined;
  if (media?.$?.url) return media.$.url;

  if (item.enclosure?.url) return item.enclosure.url;

  const html = item.content ?? (record["content:encoded"] as string | undefined) ?? "";
  const match = html.match(/<img[^>]+src="([^"]+)"/i);
  return match?.[1];
}

/**
 * Fetches and parses a single RSS feed. Throws on network/parse failure —
 * callers are expected to catch per-source so one broken feed doesn't stop
 * the whole ingestion run.
 */
export async function fetchFeed(feedUrl: string): Promise<FeedItem[]> {
  const feed = await parser.parseURL(feedUrl);

  return (feed.items ?? [])
    .filter((item): item is Parser.Item & { title: string; link: string } =>
      Boolean(item.title && item.link)
    )
    .map((item) => ({
      title: item.title.trim(),
      link: item.link,
      isoDate: item.isoDate,
      pubDate: item.pubDate,
      contentSnippet: item.contentSnippet,
      content: item.content,
      imageUrl: extractImage(item),
    }));
}
