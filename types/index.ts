// Region/Language/Category used to be Prisma enums, but SQLite (the
// desktop build's datasource) has no native enum support, so the schema
// stores them as plain strings and this file is the single source of
// truth for the allowed values instead. Keep these in sync with
// prisma/schema.prisma's comments and lib/sources/config.ts.

export const REGIONS = ["FRANCE", "NORTH_AMERICA", "ANGLOSAXON", "GLOBAL"] as const;
export type Region = (typeof REGIONS)[number];

export const LANGUAGES = ["FR", "EN"] as const;
export type Language = (typeof LANGUAGES)[number];

// The three themes of Nebula News, one per app of the family: personal growth and life
// organization (Nebula Clock), finance and financial education (Nebula Finterest), tech and
// computing (Nebula Hub). They are stored as Category rows (by key), so the schema does not
// change: an installed database only gains these rows (lib/ingestion/run.ts). Articles from
// the former general-news sources keep their old keys (WORLD, POLITICS…) and are hidden,
// never deleted (their sources are marked inactive).
export const THEME_KEYS = ["FOCUS", "FINANCE", "TECH"] as const;
export type ThemeKey = (typeof THEME_KEYS)[number];

/** URL segment of each theme: `/theme/<slug>` and `nebula://news/theme/<slug>`. */
export const THEME_SLUGS: Record<ThemeKey, string> = {
  FOCUS: "focus",
  FINANCE: "finance",
  TECH: "tech",
};

export function isThemeKey(value: unknown): value is ThemeKey {
  return typeof value === "string" && (THEME_KEYS as readonly string[]).includes(value);
}

export function themeOfSlug(slug: string): ThemeKey | null {
  return THEME_KEYS.find((key) => THEME_SLUGS[key] === slug) ?? null;
}

export type Locale = "fr" | "en";

export type ArticleCard = {
  id: string;
  title: string;
  originalUrl: string;
  summary: string | null;
  imageUrl: string | null;
  region: Region;
  language: Language;
  publishedAt: string;
  importanceScore: number;
  isBriefingPick: boolean;
  source: { name: string; websiteUrl: string };
  themes: ThemeKey[];
};

export type BriefingResponse = {
  date: string;
  themes: ThemeKey[];
  stories: ArticleCard[];
};

export type ArticleFilters = {
  region?: Region;
  theme?: ThemeKey;
  language?: Language;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};
