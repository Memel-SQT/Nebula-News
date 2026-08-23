// Region/Language/Category used to be Prisma enums, but SQLite (the
// desktop build's datasource) has no native enum support, so the schema
// stores them as plain strings and this file is the single source of
// truth for the allowed values instead. Keep these in sync with
// prisma/schema.prisma's comments and lib/sources/config.ts.

export const REGIONS = ["FRANCE", "NORTH_AMERICA", "ANGLOSAXON", "GLOBAL"] as const;
export type Region = (typeof REGIONS)[number];

export const LANGUAGES = ["FR", "EN"] as const;
export type Language = (typeof LANGUAGES)[number];

export const CATEGORY_KEYS = [
  "WORLD",
  "POLITICS",
  "ECONOMY",
  "TECH",
  "SCIENCE",
  "CULTURE",
  "ENVIRONMENT",
  "SPORTS",
  "HEALTH",
] as const;
export type CategoryKey = (typeof CATEGORY_KEYS)[number];

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
  categories: CategoryKey[];
};

export type BriefingResponse = {
  date: string;
  themes: CategoryKey[];
  stories: ArticleCard[];
};

export type ArticleFilters = {
  region?: Region;
  category?: CategoryKey;
  language?: Language;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};
