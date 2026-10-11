/**
 * Tailwind CSS configuration for CogniCode.
 *
 * Design tokens mirror the CSS variables defined in src/index.css
 * so utility classes and custom properties stay in sync.
 *
 * Created: 10/10/2026
 * Author: Abdullah (BSEF23M526)
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  // Dark mode is class-based so we can toggle it via JS
  // (document.documentElement.classList) with a ThemeContext.
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        // Brand palette
        brand: {
          indigo: "#6366F1",
          violet: "#8B5CF6",
          cyan: "#22D3EE",
        },
        // Semantic bands used for CDS display
        band: {
          low: "#10B981",
          moderate: "#F59E0B",
          high: "#EF4444",
        },
        // Surfaces (used together with CSS vars for theming)
        surface: {
          base: "var(--bg)",
          raised: "var(--bg2)",
          overlay: "var(--bg3)",
        },
      },
      borderRadius: {
        card: "14px",
        control: "9px",
      },
      boxShadow: {
        glow: "0 0 20px rgba(99,102,241,0.25)",
        "glow-lg": "0 0 32px rgba(99,102,241,0.45)",
        card: "0 40px 120px rgba(0,0,0,0.6)",
      },
      backdropBlur: {
        glass: "20px",
      },
    },
  },
  plugins: [],
};