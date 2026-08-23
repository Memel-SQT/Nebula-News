import type { Metadata } from "next";
import { getDictionary, getLocale } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n/client";
import { BgGlow } from "@/components/layout/BgGlow";
import { Navbar } from "@/components/layout/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Nebula News",
  description: "Your daily briefing on the world — Nebula News.",
  icons: { icon: "/nebula-mark.svg" },
  openGraph: {
    title: "Nebula News",
    description: "Your daily briefing on the world.",
    images: ["/nebula-og.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = getLocale();
  const dict = getDictionary(locale);

  return (
    <html lang={locale}>
      <body className="min-h-screen bg-nebula-bg font-sans text-nebula-text">
        <I18nProvider locale={locale} dict={dict}>
          <BgGlow />
          <Navbar />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
