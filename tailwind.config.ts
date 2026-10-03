import type { Config } from "tailwindcss";
import { nebulaPreset } from "./lib/nebula-design/tailwind-preset";

// Colors, radii, motion and fonts come from the shared nebula-design-system preset, which
// maps every utility onto a CSS variable (styles/news/bridge.css), so nothing here holds a
// value and every utility follows the theme and the accent.
//
// Preflight is off: the base element styles are the family's own (styles/nebula/base.css,
// ported from Nebula Hub), exactly as in the Hub, which has no Tailwind. Tailwind's reset
// would otherwise override them (its `[type='button']` rule outranks `button`).
const config: Config = {
  presets: [nebulaPreset],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  corePlugins: { preflight: false },
};

export default config;
