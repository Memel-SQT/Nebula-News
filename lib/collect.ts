import { db } from "@/lib/db";
import { SOURCES } from "@/lib/sources/config";
import { isOfflineRun, RUN_WINDOW_MS } from "@/lib/collect-rules";
import type { Language, ThemeKey } from "@/types";

export type CollectStatus = {
  /** The latest ingestion run failed for every source (no network, most likely). */
  offline: boolean;
  /** When a source last answered, if ever. */
  lastSuccess: Date | null;
};

/** Read only (IngestionLog): the state behind the offline banner. */
export async function getCollectStatus(): Promise<CollectStatus> {
  const latest = await db.ingestionLog.findFirst({
    where: { source: { active: true } },
    orderBy: { startedAt: "desc" },
    select: { startedAt: true },
  });
  if (!latest) return { offline: false, lastSuccess: null };

  const [run, success] = await Promise.all([
    db.ingestionLog.findMany({
      where: { source: { active: true }, startedAt: { gte: new Date(latest.startedAt.getTime() - RUN_WINDOW_MS) } },
      select: { status: true, startedAt: true },
    }),
    db.ingestionLog.findFirst({
      where: { source: { active: true }, status: "success" },
      orderBy: { finishedAt: "desc" },
      select: { finishedAt: true },
    }),
  ]);

  return { offline: isOfflineRun(run), lastSuccess: success?.finishedAt ?? null };
}

export type SourceOverview = {
  id: string;
  name: string;
  websiteUrl: string;
  language: Language;
  theme: ThemeKey;
  articles: number;
  last: { status: string; at: Date | null } | null;
};

/** The followed sources (Sources screen), each with its last collection. Read only. */
export async function getSourcesOverview(): Promise<SourceOverview[]> {
  const themeOf = new Map(SOURCES.map((source) => [source.feedUrl, source.theme]));
  const sources = await db.source.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      feedUrl: true,
      websiteUrl: true,
      language: true,
      _count: { select: { articles: true } },
      logs: { orderBy: { startedAt: "desc" }, take: 1, select: { status: true, startedAt: true, finishedAt: true } },
    },
  });

  return sources.flatMap((source) => {
    const theme = themeOf.get(source.feedUrl);
    if (!theme) return [];
    const log = source.logs[0];
    return [
      {
        id: source.id,
        name: source.name,
        websiteUrl: source.websiteUrl,
        language: source.language as Language,
        theme,
        articles: source._count.articles,
        last: log ? { status: log.status, at: log.finishedAt ?? log.startedAt } : null,
      },
    ];
  });
}
