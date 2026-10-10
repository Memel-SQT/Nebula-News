import type { Metadata } from "next";
import { getDictionary, getLocale } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n/client";
import { getShell } from "@/lib/appearance/server";
import { THEME_BOOT_SCRIPT, accentStyleSheet } from "@/lib/appearance/shared";
import { packBaseTheme } from "@/lib/appearance/packs";
import { AppearanceProvider } from "@/components/appearance/AppearanceProvider";
import { Sidebar } from "@/components/shell/Sidebar";
// The family styles, in cascade order: tokens first (nebula-design-system rule), then the
// base elements, backgrounds, motion and controls of @nebula/design, the Hub's shell, News.
import "@/styles/nebula/tokens.css";
import "@/styles/news/bridge.css";
import "@/styles/nebula/base.css";
import "@/styles/nebula/backgrounds.css";
import "@/styles/nebula/motion.css";
import "@/styles/nebula/controls.css";
import "@/styles/news/hub-app.css";
import "@/styles/news/hub-dashboard.css";
import "@/styles/news/hub-sidebar.css";
import "@/styles/news/news.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Nebula News",
  description: "Personal growth, finance and tech, every day — Nebula News.",
  icons: { icon: "/nebula-mark.svg" },
  openGraph: {
    title: "Nebula News",
    description: "Personal growth, finance and tech, every day.",
    images: ["/nebula-og.png"],
  },
};

/**
 * The shell is rendered by the server from the request: appearance cookie (theme, motion,
 * background, accent), desktop or web, Hub mode. `system` is resolved by THEME_BOOT_SCRIPT
 * before the first paint; everything else is already in the HTML, so nothing flashes.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [locale, shell] = await Promise.all([getLocale(), getShell()]);
  const dict = getDictionary(locale);
  const { appearance } = shell;
  const accent = accentStyleSheet(appearance);
  // A theme of an installed appearance pack is drawn over the built-in theme of its scheme.
  const pack = shell.pack.active;
  const themeChoice = pack ? packBaseTheme(pack.scheme) : appearance.theme;

  return (
    <html
      lang={locale}
      data-theme={themeChoice === "system" ? undefined : themeChoice}
      data-theme-choice={themeChoice}
      data-pack-theme={pack?.id}
      data-motion={appearance.motion}
      data-background={appearance.background}
      data-docked={shell.docked ? "1" : undefined}
      // The boot script and the client provider write data-theme and the accent variables.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        {accent ? <style id="nebula-accent" dangerouslySetInnerHTML={{ __html: accent }} /> : null}
        {pack ? <style id="nebula-pack" dangerouslySetInnerHTML={{ __html: pack.css }} /> : null}
      </head>
      <body>
        <I18nProvider locale={locale} dict={dict}>
          <AppearanceProvider shell={shell}>
            {/* Desktop: the window has no native frame; this strip is the drag area and Windows
                draws the themed controls on the right (titleBarOverlay, desktop/main.js). */}
            {shell.desktop && !shell.docked ? <div className="titlebar-drag" aria-hidden="true" /> : null}
            <div className="app-shell">
              <Sidebar />
              <div className="workspace-column">
                {children}
              </div>
            </div>
          </AppearanceProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
