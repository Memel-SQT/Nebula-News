"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { applyAppearance } from "@/lib/nebula-design/appearance";
import { BackgroundFx } from "@/lib/nebula-design/BackgroundFx";
import { useInterfaceEffects } from "@/lib/nebula-design/effects";
import { configureSounds } from "@/lib/nebula-design/sound";
import { DARK_QUERY, resolveTheme, type ResolvedTheme } from "@/lib/nebula-design/theme";
import {
  APPEARANCE_COOKIE,
  FOLLOW_HUB_COOKIE,
  HUB_STATUS_COOKIE,
  cookieString,
  serializeAppearance,
  type StoredAppearance,
} from "@/lib/appearance/shared";
import type { Shell } from "@/lib/appearance/server";

type AppearanceContextValue = Shell & {
  resolvedTheme: ResolvedTheme;
  setAppearance: (patch: Partial<StoredAppearance>) => void;
  setFollowHub: (follow: boolean) => void;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

function readCookie(name: string): string | undefined {
  return document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

/**
 * Holds the appearance (first rendered by the server from the cookie), applies every change
 * at once on <html> (theme, motion, background, accent variables) and saves it in the cookie,
 * then refreshes the server render so both stay identical. Also: the animated background, the
 * interface sounds and click ripples (@nebula/design), and the live Nebula Hub status that
 * desktop/main.js announces with a `nebula-hub-status` event.
 */
export function AppearanceProvider({ shell, children }: { shell: Shell; children: React.ReactNode }) {
  const router = useRouter();
  const [appearance, setStored] = useState(shell.appearance);
  const [followHub, setFollow] = useState(shell.followHub);
  const [hubConnected, setHubConnected] = useState(shell.hubConnected);
  // The server cannot know the OS preference (the boot script resolved it on <html> before the
  // first paint); the client reads it at once so hydration never repaints the other palette.
  const [prefersDark, setPrefersDark] = useState(() =>
    typeof window === "undefined" ? true : window.matchMedia(DARK_QUERY).matches
  );

  useEffect(() => setStored(shell.appearance), [shell.appearance]);

  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const onChange = () => setPrefersDark(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const resolvedTheme = resolveTheme(appearance.theme, prefersDark);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.themeChoice = appearance.theme;
    root.dataset.theme = resolvedTheme;
    applyAppearance(root, appearance, resolvedTheme);
  }, [appearance, resolvedTheme]);

  useEffect(() => {
    configureSounds({ enabled: appearance.soundEnabled, volume: appearance.soundVolume });
  }, [appearance.soundEnabled, appearance.soundVolume]);

  useInterfaceEffects(appearance.motion, resolvedTheme, ".nebula-surface");

  useEffect(() => {
    if (!shell.desktop) return;
    const onStatus = () => setHubConnected(readCookie(HUB_STATUS_COOKIE) === "connected");
    window.addEventListener("nebula-hub-status", onStatus);
    window.addEventListener("focus", onStatus);
    return () => {
      window.removeEventListener("nebula-hub-status", onStatus);
      window.removeEventListener("focus", onStatus);
    };
  }, [shell.desktop]);

  const setAppearance = useCallback(
    (patch: Partial<StoredAppearance>) => {
      setStored((current) => {
        const next = { ...current, ...patch };
        document.cookie = cookieString(APPEARANCE_COOKIE, serializeAppearance(next));
        return next;
      });
      router.refresh();
    },
    [router]
  );

  const setFollowHub = useCallback((follow: boolean) => {
    setFollow(follow);
    document.cookie = cookieString(FOLLOW_HUB_COOKIE, follow ? "1" : "0");
  }, []);

  const value = useMemo(
    () => ({ ...shell, appearance, followHub, hubConnected, resolvedTheme, setAppearance, setFollowHub }),
    [shell, appearance, followHub, hubConnected, resolvedTheme, setAppearance, setFollowHub]
  );

  return (
    <AppearanceContext.Provider value={value}>
      <BackgroundFx effect={appearance.background} motion={appearance.motion} />
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext);
  if (!ctx) throw new Error("useAppearance must be used within AppearanceProvider");
  return ctx;
}
