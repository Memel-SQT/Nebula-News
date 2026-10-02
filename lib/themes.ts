// Pure rules of the three themes (no database, no Next.js), tested in lib/themes.test.ts.
import { THEME_KEYS, isThemeKey, type ThemeKey } from "@/types";

/** Stories per theme in the daily briefing: five each, fifteen in all. */
export const BRIEFING_PER_THEME = 5;

/** Personal-growth and finance blogs publish weekly rather than hourly, so the briefing looks
 *  back a week; the importance score still favors recent articles within each theme. */
export const BRIEFING_WINDOW_DAYS = 7;

/** Keeps only the three current themes (older articles may still carry WORLD, POLITICS…). */
export function themesOf(keys: readonly string[]): ThemeKey[] {
  return THEME_KEYS.filter((theme) => keys.includes(theme));
}

/** At most this many stories of one source in one theme of the briefing. */
export const BRIEFING_PER_SOURCE = 2;

/**
 * The briefing picks: the `perTheme` most important candidates of each theme, so a busy theme
 * (tech publishes far more) never crowds out the others, and at most `perSource` from one
 * source, so a prolific outlet never fills a theme on its own.
 */
export function pickBriefing<T extends { theme: string; sourceId: string; importanceScore: number }>(
  candidates: readonly T[],
  perTheme = BRIEFING_PER_THEME,
  perSource = BRIEFING_PER_SOURCE
): T[] {
  return THEME_KEYS.flatMap((theme) => {
    const perSourceCount = new Map<string, number>();
    const picks: T[] = [];
    const ranked = candidates
      .filter((candidate) => candidate.theme === theme)
      .sort((a, b) => b.importanceScore - a.importanceScore);
    for (const candidate of ranked) {
      if (picks.length === perTheme) break;
      const count = perSourceCount.get(candidate.sourceId) ?? 0;
      if (count === perSource) continue;
      perSourceCount.set(candidate.sourceId, count + 1);
      picks.push(candidate);
    }
    return picks;
  });
}

/**
 * Orders stories round-robin across the themes (best of each theme, then the second best of
 * each…), by importance inside a theme. The first three stories are then one per theme, which
 * is what the Nebula Hub "Top stories" widget shows.
 */
export function interleaveByTheme<T extends { themes: readonly string[]; importanceScore: number }>(
  stories: readonly T[]
): T[] {
  const queues = THEME_KEYS.map((theme) =>
    stories
      .filter((story) => story.themes.find(isThemeKey) === theme)
      .sort((a, b) => b.importanceScore - a.importanceScore)
  );
  const ordered: T[] = [];
  for (let rank = 0; queues.some((queue) => rank < queue.length); rank += 1) {
    for (const queue of queues) {
      if (rank < queue.length) ordered.push(queue[rank]);
    }
  }
  return ordered;
}

/** The themes that have at least one story, in the fixed family order. */
export function themesWithStories(stories: readonly { themes: readonly string[] }[]): ThemeKey[] {
  return THEME_KEYS.filter((theme) => stories.some((story) => story.themes.includes(theme)));
}
