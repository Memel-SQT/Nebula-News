import { THEME_KEYS } from "@/types";
import { getSourcesOverview } from "@/lib/collect";
import { getDictionary, getLocale, translate } from "@/lib/i18n";
import { Icon } from "@/lib/nebula-design/Icon";
import { timeAgo } from "@/lib/utils";
import { PageFrame } from "@/components/shell/PageFrame";
import { CollectBanner } from "@/components/shell/CollectBanner";
import { EmptyState } from "@/components/shell/ScreenState";

export const dynamic = "force-dynamic";

/** The followed sources, by theme, with their last collection (read only). */
export default async function SourcesPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = (path: string, vars?: Record<string, string | number>) => translate(dict, path, vars);

  const sources = await getSourcesOverview();
  const now = new Date();

  return (
    <PageFrame eyebrow={t("sources.eyebrow")} title={t("sources.title")} intro={t("sources.intro", { count: sources.length })}>
      <CollectBanner dict={dict} locale={locale} />

      {sources.length === 0 ? (
        <EmptyState icon="rss" title={t("sources.emptyTitle")} body={t("sources.empty")} />
      ) : (
        <div className="source-groups">
          {THEME_KEYS.map((theme) => {
            const rows = sources.filter((source) => source.theme === theme);
            return (
              <section key={theme} className="panel nebula-surface" aria-labelledby={`sources-${theme}`}>
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">{t(`themes.${theme}.app`)}</p>
                    <h2 id={`sources-${theme}`}>{t(`themes.${theme}.label`)}</h2>
                  </div>
                  <span className="pill">{rows.length}</span>
                </div>
                {rows.map((source) => {
                  const status = !source.last || source.last.status === "running" ? "waiting" : source.last.status === "error" ? "error" : "ok";
                  return (
                    <div key={source.id} className="source-row">
                      <div>
                        <strong title={source.name}>{source.name}</strong>
                        <small>
                          {t(`languages.${source.language}`)} · {t("sources.articles", { count: source.articles })}
                          {source.last?.at ? ` · ${timeAgo(source.last.at, locale, now)}` : ""}
                        </small>
                      </div>
                      <span className={`status-chip ${status === "error" ? "is-error" : status === "waiting" ? "is-waiting" : ""}`}>
                        {t(`sources.status.${status}`)}
                      </span>
                      {/* Opens in the browser (desktop/main.js). */}
                      <a href={source.websiteUrl} target="_blank" rel="noopener noreferrer" title={t("sources.visit", { name: source.name })} aria-label={t("sources.visit", { name: source.name })}>
                        <Icon name="external" size={15} />
                      </a>
                    </div>
                  );
                })}
              </section>
            );
          })}
        </div>
      )}
    </PageFrame>
  );
}
