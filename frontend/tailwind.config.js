/**
 * Tailwind configuration for CogniCode.
 *
 * Colors, radii, shadows, and fonts resolve to the CSS custom
 * properties in src/index.css, so a single class (e.g. `bg-canvas`)
 * is correct in both light and dark themes. See /DESIGN.md.
 */

const v = (name) => `var(--${name})`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  // Theme is applied by ThemeContext via a `light` / `dark` class on <html>.
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: [v("font-sans")],
        mono: [v("font-mono")],
      },
      colors: {
        canvas: v("color-canvas"),
        sidebar: v("color-sidebar"),
        surface: {
          DEFAULT: v("color-surface"),
          2: v("color-surface-2"),
        },
        elevated: v("color-elevated"),
        hover: v("color-hover"),
        active: v("color-active"),
        overlay: v("color-overlay"),
        line: {
          DEFAULT: v("color-line"),
          subtle: v("color-line-subtle"),
          strong: v("color-line-strong"),
        },
        fg: {
          DEFAULT: v("color-fg"),
          secondary: v("color-fg-secondary"),
          muted: v("color-fg-muted"),
          inverse: v("color-fg-inverse"),
        },
        accent: {
          DEFAULT: v("color-accent"),
          hover: v("color-accent-hover"),
          fg: v("color-accent-fg"),
          soft: v("color-accent-soft"),
          on: v("color-on-accent"),
        },
        primary: {
          DEFAULT: v("color-primary"),
          hover: v("color-primary-hover"),
          on: v("color-on-primary"),
        },
        brand: v("color-brand"),
        success: { DEFAULT: v("color-success"), soft: v("color-success-soft") },
        warning: { DEFAULT: v("color-warning"), soft: v("color-warning-soft") },
        danger: {
          DEFAULT: v("color-danger"),
          hover: v("color-danger-hover"),
          soft: v("color-danger-soft"),
        },
        code: { DEFAULT: v("color-code-bg"), header: v("color-code-header") },
      },
      borderRadius: {
        sm: v("radius-sm"),
        DEFAULT: v("radius-md"),
        md: v("radius-md"),
        lg: v("radius-lg"),
        xl: v("radius-xl"),
        "2xl": v("radius-2xl"),
        "3xl": v("radius-3xl"),
      },
      boxShadow: {
        sm: v("shadow-sm"),
        composer: v("shadow-composer"),
        popover: v("shadow-popover"),
        dialog: v("shadow-dialog"),
      },
      maxWidth: {
        content: v("content-width"),
      },
      width: {
        sidebar: v("sidebar-width"),
      },
      height: {
        header: v("header-height"),
      },
      zIndex: {
        header: v("z-header"),
        sidebar: v("z-sidebar"),
        overlay: v("z-overlay"),
        modal: v("z-modal"),
        popover: v("z-popover"),
        toast: v("z-toast"),
      },
      transitionDuration: {
        fast: "120ms",
        base: "180ms",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(0.2, 0, 0, 1)",
      },
      animation: {
        "fade-in": "cc-fade-in 150ms ease-out both",
        "pop-in": "cc-pop-in 160ms cubic-bezier(0.2, 0, 0, 1) both",
        "slide-in-left": "cc-slide-in-left 200ms cubic-bezier(0.2, 0, 0, 1) both",
        shimmer: "cc-shimmer 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
