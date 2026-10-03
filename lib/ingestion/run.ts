import { db } from "@/lib/db";
import { SOURCES } from "@/lib/sources/config";
import { fetchFeed } from "./fetchFeeds";
import { normalizeItem } from "./normalize";
import { summarizeArticle } from "@/lib/processing/summarize";
import { computeImportance } from "@/lib/processing/score";
import { BRIEFING_WINDOW_DAYS, HALF_LIFE_HOURS, pickBriefing, themesOf } from "@/lib/themes";
import { THEME_KEYS } from "@/types";

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

  // Installed databases were seeded with the former categories: the three themes are added
  // here (upsert, additive), and sources dropped from the configuration are only marked
  // inactive, so their articles stay on disk but are no longer shown.
  for (const key of THEME_KEYS) {
    await db.category.upsert({ where: { key }, update: {}, create: { key } });
  }
  await db.source.updateMany({
    where: { feedUrl: { notIn: SOURCES.map((source) => source.feedUrl) } },
    data: { active: false },
  });

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

        const categories = [sourceConfig.theme];
        const summaryText = await summarizeArticle(
          normalized.title,
          normalized.rawContent,
          normalized.language
        );
        const importanceScore = computeImportance({
          sourceWeight: sourceConfig.weight,
          publishedAt: normalized.publishedAt,
          halfLifeHours: HALF_LIFE_HOURS[sourceConfig.theme],
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

/**
 * Marks today's briefing: the best articles of each theme over the last week, from active
 * sources. The score is recomputed now (source weight × recency), since the stored one was
 * frozen when the article was inserted and would favor old articles that were fresh then.
 */
async function markBriefingPicks() {
  const since = new Date(Date.now() - BRIEFING_WINDOW_DAYS * 24 * 3600 * 1000);

  await db.article.updateMany({
    where: { isBriefingPick: true },
    data: { isBriefingPick: false },
  });

  const candidates = await db.article.findMany({
    where: {
      publishedAt: { gte: since },
      source: { active: true },
      categories: { some: { category: { key: { in: [...THEME_KEYS] } } } },
    },
    select: {
      id: true,
      sourceId: true,
      publishedAt: true,
      source: { select: { weight: true } },
      categories: { select: { category: { select: { key: true } } } },
    },
  });

  const picks = pickBriefing(
    candidates.flatMap((article) => {
      const theme = themesOf(article.categories.map((c) => c.category.key))[0];
      if (!theme) return [];
      const importanceScore = computeImportance({
        sourceWeight: article.source.weight,
        publishedAt: article.publishedAt,
        halfLifeHours: HALF_LIFE_HOURS[theme],
      });
      return [{ id: article.id, sourceId: article.sourceId, theme, importanceScore }];
    })
  );
  if (picks.length === 0) return;

  await db.article.updateMany({
    where: { id: { in: picks.map((pick) => pick.id) } },
    data: { isBriefingPick: true },
  });
}
