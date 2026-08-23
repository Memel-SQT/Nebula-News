import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type {
  ArticleCard,
  ArticleFilters,
  BriefingResponse,
  CategoryKey,
  Language,
  Region,
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
  source: { select: { name: true, websiteUrl: true } },
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
    source: article.source,
    categories: article.categories.map((c) => c.category.key as CategoryKey),
  };
}

const DEFAULT_PAGE_SIZE = 24;

export async function getArticles(filters: ArticleFilters) {
  const page = filters.page ?? 1;
  const pageSize = Math.min(filters.pageSize ?? DEFAULT_PAGE_SIZE, 60);

  const where: Prisma.ArticleWhereInput = {
    region: filters.region,
    language: filters.language,
    categories: filters.category
      ? { some: { category: { key: filters.category } } }
      : undefined,
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

export async function getArticleById(id: string): Promise<ArticleCard | null> {
  const article = await db.article.findUnique({ where: { id }, select: cardSelect });
  return article ? toCard(article) : null;
}

export async function searchArticles(q: string, limit = 20) {
  if (!q.trim()) return [];
  const items = await db.article.findMany({
    where: {
      OR: [{ title: { contains: q } }, { summary: { contains: q } }],
    },
    select: cardSelect,
    orderBy: [{ publishedAt: "desc" }],
    take: limit,
  });
  return items.map(toCard);
}

const THEME_MIN_STORIES = 2;

export async function getBriefingToday(): Promise<BriefingResponse> {
  const items = await db.article.findMany({
    where: { isBriefingPick: true },
    select: cardSelect,
    orderBy: [{ importanceScore: "desc" }],
  });

  const cards = items.map(toCard);

  const categoryCounts = new Map<CategoryKey, number>();
  for (const card of cards) {
    for (const key of card.categories) {
      categoryCounts.set(key, (categoryCounts.get(key) ?? 0) + 1);
    }
  }

  const themes = [...categoryCounts.entries()]
    .filter(([, count]) => count >= THEME_MIN_STORIES)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key]) => key);

  return {
    date: new Date().toISOString().slice(0, 10),
    themes,
    stories: cards,
  };
}
