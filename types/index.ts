import type { CategoryKey, Language, Region } from "@prisma/client";

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
