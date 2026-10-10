import "server-only";
import { readAppearancePacks } from "@nebula/link";
import { NO_PACKS, packShellOf, type PackShell } from "./packs";

/**
 * Reads the appearance packs of installed Nebula apps for the desktop app. The folder is given by
 * desktop/main.js (`NEBULA_APPEARANCE_PACKS_DIR`, next to a test-mode Hub's session file or the
 * family's shared folder); the hosted web version has none. Never throws.
 */
export function readPackShell(choice: string | undefined): PackShell {
  const directory = process.env.NEBULA_APPEARANCE_PACKS_DIR;
  if (!directory) return NO_PACKS;
  try {
    const packs = readAppearancePacks({ directory });
    return packShellOf(packs, choice, (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`);
  } catch {
    return NO_PACKS;
  }
}
