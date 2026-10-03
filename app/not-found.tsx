import Link from "next/link";
import { getDictionary, getLocale, translate } from "@/lib/i18n";
import { Icon } from "@/lib/nebula-design/Icon";
import { EmptyState } from "@/components/shell/ScreenState";

export default async function NotFound() {
  const dict = getDictionary(await getLocale());
  const t = (path: string) => translate(dict, path);
  return (
    <main className="workspace">
      <div className="workspace-inner">
        <EmptyState
          icon="compass"
          title={t("state.notFound.title")}
          body={t("state.notFound.body")}
          action={
            <Link className="button-link" href="/briefing">
              <Icon name="newspaper" size={16} />
              {t("home.briefingCta")}
            </Link>
          }
        />
      </div>
    </main>
  );
}
