import "server-only";
import { cookies, headers } from "next/headers";
import {
  APPEARANCE_COOKIE,
  DOCKED_COOKIE,
  FOLLOW_HUB_COOKIE,
  HUB_STATUS_COOKIE,
  parseAppearance,
  type StoredAppearance,
} from "./shared";
import { PACK_THEME_COOKIE, type PackShell } from "./packs";
import { readPackShell } from "./packs-server";

export type Shell = {
  appearance: StoredAppearance;
  /** The Electron desktop app (the hosted web version has no Nebula Hub, no window chrome). */
  desktop: boolean;
  /** Desktop: the window is shown inside Nebula Hub (Hub mode). */
  docked: boolean;
  /** Desktop: Nebula Hub is connected through Nebula Link. */
  hubConnected: boolean;
  /** Desktop: the appearance follows Nebula Hub's (on unless the user turned it off). */
  followHub: boolean;
  /** Desktop: themes shared by installed Nebula apps, and the one chosen (Nebula Hub NEBULA_LINK.md § 18). */
  pack: PackShell;
};

/** Everything the root layout needs to render the shell, from the request alone. */
export async function getShell(): Promise<Shell> {
  const [jar, requestHeaders] = await Promise.all([cookies(), headers()]);
  const desktop = (requestHeaders.get("user-agent") ?? "").includes("Electron");
  return {
    appearance: parseAppearance(jar.get(APPEARANCE_COOKIE)?.value),
    desktop,
    docked: desktop && jar.get(DOCKED_COOKIE)?.value === "1",
    hubConnected: desktop && jar.get(HUB_STATUS_COOKIE)?.value === "connected",
    followHub: jar.get(FOLLOW_HUB_COOKIE)?.value !== "0",
    pack: readPackShell(jar.get(PACK_THEME_COOKIE)?.value || undefined),
  };
}
