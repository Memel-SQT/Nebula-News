import Link from "next/link";
import { Icon } from "@/lib/nebula-design/Icon";

/** Previous / more links that keep the current filters (search params) of `basePath`. */
export function Pagination({
  basePath,
  searchParams,
  page,
  hasMore,
  previousLabel,
  moreLabel,
  totalLabel,
}: {
  basePath: string;
  searchParams: Record<string, string | undefined>;
  page: number;
  hasMore: boolean;
  previousLabel: string;
  moreLabel: string;
  totalLabel: string;
}) {
  const href = (target: number) => {
    const params = new URLSearchParams(
      Object.entries(searchParams).filter(([, v]) => v) as [string, string][]
    );
    params.set("page", String(target));
    return `${basePath}?${params.toString()}`;
  };

  return (
    <>
      {page > 1 || hasMore ? (
        <nav className="pagination" aria-label={totalLabel}>
          {page > 1 ? (
            <Link className="button-link ghost" href={href(page - 1)}>
              <Icon name="chevronLeft" size={16} />
              {previousLabel}
            </Link>
          ) : null}
          {hasMore ? (
            <Link className="button-link ghost" href={href(page + 1)}>
              {moreLabel}
              <Icon name="chevronRight" size={16} />
            </Link>
          ) : null}
        </nav>
      ) : null}
      <p className="list-total tabular">{totalLabel}</p>
    </>
  );
}
