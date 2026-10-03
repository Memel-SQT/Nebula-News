import { getDictionary, getLocale, translate } from "@/lib/i18n";
import { Skeleton } from "@/components/shell/ScreenState";

export default async function Loading() {
  const dict = getDictionary(await getLocale());
  return (
    <main className="workspace">
      <div className="workspace-inner">
        <Skeleton count={6} label={translate(dict, "state.loading")} />
      </div>
    </main>
  );
}
