"use client";

import { useEffect } from "react";
import { Icon } from "@/lib/nebula-design/Icon";
import { useI18n } from "@/lib/i18n/client";
import { ErrorBanner } from "@/components/shell/ScreenState";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="workspace">
      <div className="workspace-inner">
        <ErrorBanner
          title={t("state.error.title")}
          message={t("state.error.body")}
          action={
            <button type="button" className="ghost small" onClick={reset}>
              <Icon name="refresh" size={15} />
              {t("state.retry")}
            </button>
          }
        />
      </div>
    </main>
  );
}
