import { db } from "@/lib/db";
import { SOURCES } from "@/lib/sources/config";
import { fetchFeed } from "./fetchFeeds";
import { normalizeItem } from "./normalize";
import { classifyArticle } from "@/lib/processing/classify";
import { summarizeArticle } from "@/lib/processing/summarize";
import { computeImportance } from "@/lib/processing/score";

export type IngestionSummary = {
  sourcesProcessed: number;
  sourcesFailed: number;
  itemsFetched: number;
  itemsInserted: number;
};

/** Idempotent: run as often as you like, `Source.feedUrl` and `Article.originalUrl` are unique. */
export async function runIngestion(): Promise<IngestionSummary> {
  const summary: IngestionSummary = {
    sourcesProcessed: 0,
    sourcesFailed: 0,
    itemsFetched: 0,
    itemsInserted: 0,
  };

  const categoryRecords = await db.category.findMany();
  const categoryIdByKey = new Map(categoryRecords.map((c) => [c.key, c.id]));

  for (const sourceConfig of SOURCES) {
    const source = await db.source.upsert({
      where: { feedUrl: sourceConfig.feedUrl },
      update: {
        name: sourceConfig.name,
        websiteUrl: sourceConfig.websiteUrl,
        region: sourceConfig.region,
        language: sourceConfig.language,
        weight: sourceConfig.weight,
        active: true,
      },
      create: {
        name: sourceConfig.name,
        feedUrl: sourceConfig.feedUrl,
        websiteUrl: sourceConfig.websiteUrl,
        region: sourceConfig.region,
        language: sourceConfig.language,
        weight: sourceConfig.weight,
      },
    });

    const log = await db.ingestionLog.create({
      data: { sourceId: source.id, status: "running" },
    });

    try {
      const items = await fetchFeed(source.feedUrl);
      summary.itemsFetched += items.length;

      let inserted = 0;
      for (const item of items) {
        const normalized = normalizeItem(item, sourceConfig);

        const exists = await db.article.findUnique({
          where: { originalUrl: normalized.originalUrl },
          select: { id: true },
        });
        if (exists) continue;

        const categories = classifyArticle(normalized.title, normalized.rawContent);
        const summaryText = await summarizeArticle(
          normalized.title,
          normalized.rawContent,
          normalized.language
        );
        const importanceScore = computeImportance({
          sourceWeight: sourceConfig.weight,
          publishedAt: normalized.publishedAt,
          categories,
        });

        await db.article.create({
          data: {
            title: normalized.title,
            originalUrl: normalized.originalUrl,
            sourceId: source.id,
            region: normalized.region,
            language: normalized.language,
            publishedAt: normalized.publishedAt,
            rawContent: normalized.rawContent.slice(0, 8000),
            summary: summaryText,
            imageUrl: normalized.imageUrl,
            importanceScore,
            categories: {
              create: categories
                .map((key) => categoryIdByKey.get(key))
                .filter((id): id is string => Boolean(id))
                .map((categoryId) => ({ categoryId })),
            },
          },
        });
        inserted += 1;
      }

      summary.itemsInserted += inserted;
      summary.sourcesProcessed += 1;

      await db.ingestionLog.update({
        where: { id: log.id },
        data: {
          status: "success",
          finishedAt: new Date(),
          itemsFetched: items.length,
          itemsInserted: inserted,
        },
      });
    } catch (error) {
      summary.sourcesFailed += 1;
      await db.ingestionLog.update({
        where: { id: log.id },
        data: {
          status: "error",
          finishedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  await markBriefingPicks();

  return summary;
}

/** Marks the top ~16 articles from the last 24h as today's briefing picks. */
async function markBriefingPicks(limit = 16) {
  const since = new Date(Date.now() - 24 * 3600 * 1000);

  await db.article.updateMany({
    where: { isBriefingPick: true },
    data: { isBriefingPick: false },
  });

  const top = await db.article.findMany({
    where: { publishedAt: { gte: since } },
    orderBy: { importanceScore: "desc" },
    take: limit,
    select: { id: true },
  });

  if (top.length === 0) return;

  await db.article.updateMany({
    where: { id: { in: top.map((a) => a.id) } },
    data: { isBriefingPick: true },
  });
}
