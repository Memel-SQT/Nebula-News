/**
 * Appearance packs (Nebula Hub NEBULA_LINK.md § 18): extra themes that an installed Nebula app
 * shares with the family, with display names and logos. Pure rules here; the server reads the
 * packs (lib/appearance/packs-server.ts), already checked by @nebula/link (strict shape, owner
 * installed). A pack theme is drawn over the built-in theme of its scheme.
 */
export const OWN_APP_ID = "nebula.news";

/** The pack theme chosen in Settings or followed from Nebula Hub ("" = a built-in theme). */
export const PACK_THEME_COOKIE = "nebula-pack-theme";

export type PackThemeSource = {
  id: string;
  scheme: "dark" | "light";
  label: { fr: string; en?: string };
  tokens: Record<string, string>;
};

export type PackSource = {
  id: string;
  themes: PackThemeSource[];
  names: Record<string, string>;
  marks: Record<string, string>;
};

export type PackOption = { id: string; scheme: "dark" | "light"; label: { fr: string; en?: string } };

export type PackShell = {
  /** Every theme of the installed packs, offered after the built-in ones. */
  themes: PackOption[];
  /** The chosen pack theme while its pack is there, with its style sheet. */
  active: { id: string; scheme: "dark" | "light"; css: string } | null;
  /** This app's name and logo from the active pack (null: the app's own). */
  name: string | null;
  markUrl: string | null;
};

export const NO_PACKS: PackShell = { themes: [], active: null, name: null, markUrl: null };

export function packBaseTheme(scheme: "dark" | "light"): "nebula-dark" | "nebula-light" {
  return scheme === "light" ? "nebula-light" : "nebula-dark";
}

export function packLabel(label: PackOption["label"], locale: string): string {
  return (locale === "en" ? label.en : undefined) ?? label.fr;
}

/**
 * The pack theme as a style sheet keyed on data-pack-theme. `html:root[data-pack-theme][data-theme]`
 * outranks the theme blocks and the accent sheet. Names and values were checked by @nebula/link
 * (custom properties only; colours, lengths and a few CSS functions, never a quote, brace or
 * semicolon), so they cannot leave their declaration.
 */
export function packStyleSheet(theme: PackThemeSource): string {
  const body = Object.entries(theme.tokens)
    .filter(([name]) => name.startsWith("--"))
    .map(([name, value]) => `${name}:${value}`)
    .concat(`color-scheme:${theme.scheme}`)
    .join(";");
  return `html:root[data-pack-theme='${theme.id}'][data-theme]{${body}}`;
}

/** What the layout needs from the installed packs and the chosen theme. */
export function packShellOf(packs: readonly PackSource[], choice: string | undefined, svgUrl: (svg: string) => string): PackShell {
  const themes = packs.flatMap((pack) => pack.themes.map(({ id, scheme, label }) => ({ id, scheme, label })));
  for (const pack of packs) {
    const theme = choice ? pack.themes.find((candidate) => candidate.id === choice) : undefined;
    if (!theme) continue;
    const mark = pack.marks[OWN_APP_ID];
    return {
      themes,
      active: { id: theme.id, scheme: theme.scheme, css: packStyleSheet(theme) },
      name: pack.names[OWN_APP_ID] ?? null,
      markUrl: mark ? svgUrl(mark) : null,
    };
  }
  return { themes, active: null, name: null, markUrl: null };
}
