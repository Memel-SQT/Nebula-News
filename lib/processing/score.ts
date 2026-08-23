import type { CategoryKey } from "@prisma/client";

const CATEGORY_BOOST: Partial<Record<CategoryKey, number>> = {
  WORLD: 1.15,
  POLITICS: 1.1,
  ECONOMY: 1.05,
};

/**
 * Importance score blends three signals into a single sortable number:
 * - source weight (editorial trust, set in lib/sources/config.ts)
 * - recency (exponential decay, half-life ~18h so the briefing stays fresh)
 * - topic boost (world/politics/economy skew slightly higher for a "briefing")
 */
export function computeImportance(params: {
  sourceWeight: number;
  publishedAt: Date;
  categories: CategoryKey[];
}): number {
  const { sourceWeight, publishedAt, categories } = params;

  const ageHours = Math.max(0, (Date.now() - publishedAt.getTime()) / 36e5);
  const halfLifeHours = 18;
  const recencyFactor = Math.pow(0.5, ageHours / halfLifeHours);

  const topicFactor = Math.max(
    ...categories.map((c) => CATEGORY_BOOST[c] ?? 1),
    1
  );

  return Number((sourceWeight * recencyFactor * topicFactor * 100).toFixed(2));
}
