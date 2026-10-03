import type { ReactNode } from "react";
import { Icon, type IconName } from "@/lib/nebula-design/Icon";

// The screen states of Nebula Hub (src/renderer/components/ScreenState.tsx, 05204fd), without
// its i18n hook so server pages can use them too: the caller passes the texts.

/** Animated skeleton cards, never a bare spinner. */
export function Skeleton({ count = 6, label }: { count?: number; label: string }) {
  return (
    <div className="skeleton-grid" role="status" aria-live="polite" aria-busy="true">
      <span className="visually-hidden">{label}</span>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="skeleton-card nebula-surface" aria-hidden="true">
          <i className="skeleton skeleton-icon" />
          <i className="skeleton skeleton-line" />
          <i className="skeleton skeleton-line short" />
        </div>
      ))}
    </div>
  );
}

/** `compact` drops the surface when the empty state already sits inside a panel. */
export function EmptyState({
  icon,
  title,
  body,
  action,
  compact = false,
}: {
  icon: IconName;
  title: string;
  body: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  const Heading = compact ? "h3" : "h2";
  return (
    <div className={compact ? "empty-state compact" : "empty-state nebula-surface"}>
      <span className="empty-state-icon"><Icon name={icon} size={26} /></span>
      <Heading>{title}</Heading>
      <p>{body}</p>
      {action}
    </div>
  );
}

/** The last collection failed for every source: the articles shown are the last known ones. */
export function OfflineBanner({ title, body }: { title: string; body: string }) {
  return (
    <div className="state-banner offline-banner" role="status">
      <Icon name="wifi" size={18} />
      <div>
        <strong>{title}</strong>
        <span>{body}</span>
      </div>
    </div>
  );
}

export function ErrorBanner({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <div className="state-banner error-banner" role="alert">
      <Icon name="alert" size={18} />
      <div>
        <strong>{title}</strong>
        <span>{message}</span>
      </div>
      {action}
    </div>
  );
}
