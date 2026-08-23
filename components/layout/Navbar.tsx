"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { LanguageToggle } from "@/components/filters/LanguageToggle";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { t } = useI18n();
  const pathname = usePathname();

  const links = [
    { href: "/", label: t("nav.home") },
    { href: "/briefing", label: t("nav.briefing") },
  ];

  return (
    <header className="sticky top-0 z-20 border-b border-nebula-border/80 bg-nebula-bg/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/nebula-mark.svg"
            alt=""
            width={32}
            height={32}
            className="rounded-lg shadow-[0_8px_24px_-10px_rgba(139,92,246,0.8)]"
          />
          <span className="text-lg font-bold tracking-tight text-nebula-text">
            {t("app.name")}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium text-nebula-text-secondary transition-colors hover:text-nebula-text",
                pathname === link.href &&
                  "bg-nebula-card-alt text-nebula-text shadow-[inset_0_0_0_1px_rgba(139,92,246,0.4)]"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <LanguageToggle />
      </div>
    </header>
  );
}
