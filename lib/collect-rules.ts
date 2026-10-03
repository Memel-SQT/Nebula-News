// Pure rules of the collection status (tested in lib/collect-rules.test.ts).

/** Logs started this close to the most recent one belong to the same ingestion run. */
export const RUN_WINDOW_MS = 15 * 60 * 1000;

export type LogLike = { status: string; startedAt: Date };

/**
 * Offline: the most recent ingestion run is finished and every source in it failed, so what
 * the app shows are the last known articles. A run still in progress, or one where a single
 * source answered, is not offline.
 */
export function isOfflineRun(logs: readonly LogLike[]): boolean {
  if (logs.length === 0) return false;
  const latest = Math.max(...logs.map((log) => log.startedAt.getTime()));
  const run = logs.filter((log) => latest - log.startedAt.getTime() <= RUN_WINDOW_MS);
  if (run.some((log) => log.status === "running" || log.status === "success" || log.status === "partial")) return false;
  return run.every((log) => log.status === "error");
}
