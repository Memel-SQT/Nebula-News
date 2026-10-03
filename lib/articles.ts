import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { computeImportance } from "@/lib/processing/score";
import { HALF_LIFE_HOURS, interleaveByTheme, themesOf, themesWithStories } from "@/lib/themes";
import {
  THEME_KEYS,
  type ArticleCard,
  type ArticleFilters,
  type BriefingResponse,
  type Language,
  type Region,
  type ThemeKey,
} from "@/types";

const cardSelect = {
  id: true,
  title: true,
  originalUrl: true,
  summary: true,
  imageUrl: true,
  region: true,
  language: true,
  publishedAt: true,
  importanceScore: true,
  isBriefingPick: true,
  source: { select: { name: true, websiteUrl: true, weight: true } },
  categories: { select: { category: { select: { key: true } } } },
} satisfies Prisma.ArticleSelect;

type RawArticle = Prisma.ArticleGetPayload<{ select: typeof cardSelect }>;

function toCard(article: RawArticle): ArticleCard {
  return {
    id: article.id,
    title: article.title,
    originalUrl: article.originalUrl,
    summary: article.summary,
    imageUrl: article.imageUrl,
    // SQLite has no native enum type (see schema.prisma), so these columns
    // come back as plain `string` from Prisma — narrow them here, at the
    // one boundary where DB rows become app-typed ArticleCards.
    region: article.region as Region,
    language: article.language as Language,
    publishedAt: article.publishedAt.toISOString(),
    importanceScore: article.importanceScore,
    isBriefingPick: article.isBriefingPick,
    source: { name: article.source.name, websiteUrl: article.source.websiteUrl },
    themes: themesOf(article.categories.map((c) => c.category.key)),
  };
}

/** What the app shows: articles of the active sources, in one of the three themes. Articles
 *  of the former general-news sources stay in the database but never match. */
const visible = {
  source: { active: true },
  categories: { some: { category: { key: { in: [...THEME_KEYS] } } } },
} satisfies Prisma.ArticleWhereInput;

const DEFAULT_PAGE_SIZE = 24;

export async function getArticles(filters: ArticleFilters) {
  const page = filters.page ?? 1;
  const pageSize = Math.min(filters.pageSize ?? DEFAULT_PAGE_SIZE, 60);

  const where: Prisma.ArticleWhereInput = {
    AND: [
      visible,
      filters.theme ? { categories: { some: { category: { key: filters.theme } } } } : {},
    ],
    region: filters.region,
    language: filters.language,
    publishedAt:
      filters.from || filters.to
        ? {
            gte: filters.from ? new Date(filters.from) : undefined,
            lte: filters.to ? new Date(filters.to) : undefined,
          }
        : undefined,
    // SQLite's `contains` doesn't support Prisma's `mode: "insensitive"`
    // (Postgres/Mongo only) — SQLite's LIKE is already case-insensitive for
    // ASCII by default, which covers FR/EN news text well enough.
    OR: filters.q
      ? [{ title: { contains: filters.q } }, { summary: { contains: filters.q } }]
      : undefined,
  };

  const [items, total] = await Promise.all([
    db.article.findMany({
      where,
      select: cardSelect,
      orderBy: [{ publishedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.article.count({ where }),
  ]);

  return {
    items: items.map(toCard),
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  };
}

/** A single article stays reachable by its link even if its source was retired. */
export async function getArticleById(id: string): Promise<ArticleCard | null> {
  const article = await db.article.findUnique({ where: { id }, select: cardSelect });
  return article ? toCard(article) : null;
}

export async function searchArticles(q: string, limit = 20) {
  if (!q.trim()) return [];
  const items = await db.article.findMany({
    where: {
      ...visible,
      OR: [{ title: { contains: q } }, { summary: { contains: q } }],
    },
    select: cardSelect,
    orderBy: [{ publishedAt: "desc" }],
    take: limit,
  });
  return items.map(toCard);
}

/**
 * Today's briefing: the picks of the last ingestion (five per theme, lib/themes.ts), ordered
 * round-robin across the themes so the first three stories are one per theme. The score is
 * recomputed now, as when the picks were made.
 */
export async function getBriefingToday(): Promise<BriefingResponse> {
  const items = await db.article.findMany({
    where: { ...visible, isBriefingPick: true },
    select: cardSelect,
  });

  const stories = interleaveByTheme(
    items.map((item) => {
      const card = toCard(item);
      const theme = card.themes[0];
      return {
        ...card,
        importanceScore: computeImportance({
          sourceWeight: item.source.weight,
          publishedAt: item.publishedAt,
          halfLifeHours: theme ? HALF_LIFE_HOURS[theme] : undefined,
        }),
      };
    })
  );

  return {
    date: new Date().toISOString().slice(0, 10),
    themes: themesWithStories(stories),
    stories,
  };
}

/** How many visible articles each theme has (home page cards). */
export async function getThemeCounts(): Promise<Record<ThemeKey, number>> {
  const counts = await Promise.all(
    THEME_KEYS.map((theme) =>
      db.article.count({
        where: { source: { active: true }, categories: { some: { category: { key: theme } } } },
      })
    )
  );
  return Object.fromEntries(THEME_KEYS.map((theme, index) => [theme, counts[index]])) as Record<ThemeKey, number>;
}
