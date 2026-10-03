import type { IconName } from "@/lib/nebula-design/Icon";
import { THEME_KEYS, THEME_SLUGS, type ThemeKey } from "@/types";

export type NavGroup = "briefing" | "themes" | "sources" | "system";

export type NavSection = {
  href: string;
  icon: IconName;
  /** i18n key of the label. */
  label: string;
  group: NavGroup;
};

/** Icon of each theme (sidebar, theme cards). */
export const THEME_ICONS: Record<ThemeKey, IconName> = {
  FOCUS: "sparkles",
  FINANCE: "wallet",
  TECH: "bolt",
};

/** The sections of the sidebar, in their groups (the same model as Nebula Hub's navigation.ts). */
export const SECTIONS: NavSection[] = [
  { href: "/briefing", icon: "newspaper", label: "nav.briefing", group: "briefing" },
  { href: "/", icon: "compass", label: "nav.all", group: "briefing" },
  ...THEME_KEYS.map((theme) => ({
    href: `/theme/${THEME_SLUGS[theme]}`,
    icon: THEME_ICONS[theme],
    label: `themes.${theme}.label`,
    group: "themes" as const,
  })),
  { href: "/sources", icon: "rss", label: "nav.sources", group: "sources" },
  { href: "/settings", icon: "gear", label: "nav.settings", group: "system" },
];

/** The section a path belongs to (an article page belongs to none). */
export function isActiveSection(section: NavSection, pathname: string): boolean {
  return section.href === "/" ? pathname === "/" : pathname === section.href || pathname.startsWith(`${section.href}/`);
}
