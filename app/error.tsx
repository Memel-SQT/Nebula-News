"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-nebula-violet-bright">
        Nebula News
      </p>
      <h1 className="text-2xl font-bold text-nebula-text">
        Something drifted off course.
      </h1>
      <p className="max-w-md text-sm text-nebula-text-secondary">
        We couldn&apos;t load the news right now — this usually means the
        database isn&apos;t reachable yet. Check your <code>DATABASE_URL</code>{" "}
        and that ingestion has run at least once.
      </p>
      <Button variant="secondary" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
