import { getCollectStatus } from "@/lib/collect";
import type { Dictionary } from "@/lib/i18n";
import { translate } from "@/lib/i18n";
import type { Locale } from "@/types";
import { OfflineBanner } from "./ScreenState";

/** The offline banner, above the last known articles, when the latest collection failed for
 *  every source. Renders nothing otherwise. */
export async function CollectBanner({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const status = await getCollectStatus();
  if (!status.offline) return null;
  const date = status.lastSuccess
    ? new Intl.DateTimeFormat(locale === "en" ? "en-US" : "fr-FR", { dateStyle: "long", timeStyle: "short" }).format(status.lastSuccess)
    : null;
  return (
    <OfflineBanner
      title={translate(dict, "state.offline.title")}
      body={date ? translate(dict, "state.offline.body", { date }) : translate(dict, "state.offline.never")}
    />
  );
}
