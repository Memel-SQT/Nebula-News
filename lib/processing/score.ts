/**
 * Importance score blends two signals into a single sortable number:
 * - source weight (editorial trust, set in lib/sources/config.ts)
 * - recency (exponential decay; the half-life depends on the theme, see HALF_LIFE_HOURS in
 *   lib/themes.ts — 18h by default so tech news stays fresh)
 * Themes are not weighted against each other: the briefing picks the best of each theme
 * separately (lib/themes.ts).
 */
export function computeImportance(params: {
  sourceWeight: number;
  publishedAt: Date;
  halfLifeHours?: number;
}): number {
  const { sourceWeight, publishedAt, halfLifeHours = 18 } = params;

  const ageHours = Math.max(0, (Date.now() - publishedAt.getTime()) / 36e5);
  const recencyFactor = Math.pow(0.5, ageHours / halfLifeHours);

  return Number((sourceWeight * recencyFactor * 100).toFixed(2));
}
