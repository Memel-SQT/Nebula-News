"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/lib/nebula-design/Icon";
import { useI18n } from "@/lib/i18n/client";
import { SECTIONS, isActiveSection, type NavGroup, type NavSection } from "@/lib/navigation";
import { useAppearance } from "@/components/appearance/AppearanceProvider";

const GROUP_TITLES: Record<Exclude<NavGroup, "system">, string> = {
  briefing: "nav.group.briefing",
  themes: "nav.group.themes",
  sources: "nav.group.sources",
};

/**
 * Sidebar, ported from Nebula Hub (src/renderer/components/Sidebar.tsx, 05204fd): a floating
 * panel with the brand lockup, the sections in titled groups, then Settings, "Nebula apps"
 * (desktop), the Nebula Hub status card (desktop) and the local-only footer. Below 1100 px it
 * becomes an icon rail (labels stay as tooltips and for screen readers), below 720 px a bar at
 * the top (styles/news/hub-sidebar.css).
 */
export function Sidebar() {
  const { t } = useI18n();
  const pathname = usePathname();
  // The name and logo an installed appearance pack gives this app (Nebula Hub NEBULA_LINK.md § 18).
  const { desktop, hubConnected, pack } = useAppearance();
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "";

  const navItem = (section: NavSection) => {
    const current = isActiveSection(section, pathname);
    return (
      <Link
        key={section.href}
        href={section.href}
        className={`nav-item ${current ? "active" : ""}`}
        aria-current={current ? "page" : undefined}
        title={t(section.label)}
      >
        <span className="nav-icon"><Icon name={section.icon} size={18} /></span>
        <span className="nav-label">{t(section.label)}</span>
      </Link>
    );
  };

  const hubLabel = hubConnected ? t("sidebar.hub.connected") : t("sidebar.hub.absent");

  return (
    <aside className="sidebar nebula-surface nebula-sidebar">
      <div className="brand-lockup">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="hub-mark" src={pack.markUrl ?? "/nebula-mark.svg"} alt="" width={40} height={40} />
        <div>
          <strong>{pack.name ?? t("app.name")}</strong>
          <span>{t("app.tagline")}</span>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label={t("nav.sections")}>
        {(Object.keys(GROUP_TITLES) as Array<keyof typeof GROUP_TITLES>).map((group) => (
          <div key={group} className="nav-group" role="group" aria-labelledby={`nav-group-${group}`}>
            <p className="nav-group-title" id={`nav-group-${group}`}>{t(GROUP_TITLES[group])}</p>
            {SECTIONS.filter((section) => section.group === group).map(navItem)}
          </div>
        ))}

        <div className="nav-group nav-group-system">
          {SECTIONS.filter((section) => section.group === "system").map(navItem)}
          {desktop ? (
            // Opens Nebula Hub through nebula:// (desktop/main.js), or its download page.
            <a className="nav-item" href="nebula://hub/" target="_blank" rel="noreferrer" title={t("nav.nebulaApps")}>
              <span className="nav-icon"><Icon name="apps" size={18} /></span>
              <span className="nav-label">{t("nav.nebulaApps")}</span>
            </a>
          ) : null}
        </div>
      </nav>

      {desktop ? (
        <Link
          href="/settings#nebula"
          className={`link-card ${hubConnected ? "is-ready" : "is-starting"}`}
          title={`${t("sidebar.hub.title")} · ${hubLabel}`}
        >
          <span className="link-card-icon">
            <Icon name="orbit" size={18} />
            <i className={`status-dot ${hubConnected ? "" : "warn"}`} aria-hidden="true" />
          </span>
          <span className="link-card-text">
            <strong>{t("sidebar.hub.title")}</strong>
            <small>{hubLabel}</small>
          </span>
          <Icon name="chevronRight" size={14} className="link-card-chevron" />
        </Link>
      ) : null}

      <p className="sidebar-foot" title={t("sidebar.localNote")}>
        <Icon name="shield" size={13} />
        <span>{t("sidebar.local")}</span>
        {version ? <small className="tabular">{t("sidebar.version", { version })}</small> : null}
      </p>
    </aside>
  );
}
