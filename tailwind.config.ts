import type { Config } from "tailwindcss";

// Nebula design tokens ported 1:1 from the original Nebula desktop app's
// theme.css (dark blue -> violet cosmic identity), reused here for Nebula News.
const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        nebula: {
          bg: "#0A0A0F",
          surface: "#12121F",
          card: "#1A1A2E",
          "card-alt": "#231942",
          border: "#2A2A45",
          blue: "#4C6EF5",
          "blue-bright": "#5B5FEF",
          violet: "#8B5CF6",
          "violet-bright": "#A855F7",
          success: "#34D399",
          warning: "#FBBF24",
          text: "#F1F1F6",
          "text-secondary": "#9A94B8",
        },
      },
      backgroundImage: {
        "nebula-gradient": "linear-gradient(100deg, #4C6EF5, #8B5CF6)",
        "nebula-gradient-hover": "linear-gradient(100deg, #5B5FEF, #A855F7)",
        "nebula-glow":
          "radial-gradient(700px 500px at 12% 8%, rgba(76,110,245,0.18), transparent 60%), radial-gradient(800px 600px at 88% 70%, rgba(139,92,246,0.16), transparent 60%), linear-gradient(180deg, #0A0A0F 0%, #0D0C1A 45%, #12101f 100%)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
      },
      keyframes: {
        "glow-drift": {
          from: { transform: "translate(0,0) scale(1)" },
          to: { transform: "translate(2%,-2%) scale(1.05)" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "glow-drift": "glow-drift 24s ease-in-out infinite alternate",
        "fade-up": "fade-up 420ms cubic-bezier(0.4,0,0.2,1) forwards",
      },
    },
  },
  plugins: [],
};

export default config;
