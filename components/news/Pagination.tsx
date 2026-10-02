import Link from "next/link";
import { Button } from "@/components/ui/Button";

/** Previous / more links that keep the current filters (search params) of `basePath`. */
export function Pagination({
  basePath,
  searchParams,
  page,
  hasMore,
  previousLabel,
  moreLabel,
}: {
  basePath: string;
  searchParams: Record<string, string | undefined>;
  page: number;
  hasMore: boolean;
  previousLabel: string;
  moreLabel: string;
}) {
  const href = (target: number) => {
    const params = new URLSearchParams(
      Object.entries(searchParams).filter(([, v]) => v) as [string, string][]
    );
    params.set("page", String(target));
    return `${basePath}?${params.toString()}`;
  };

  return (
    <div className="mt-10 flex items-center justify-center gap-3">
      {page > 1 && (
        <Link href={href(page - 1)}>
          <Button variant="secondary">{previousLabel}</Button>
        </Link>
      )}
      {hasMore && (
        <Link href={href(page + 1)}>
          <Button variant="secondary">{moreLabel}</Button>
        </Link>
      )}
    </div>
  );
}
