/**
 * ThemeContext
 * ------------
 * Provides dark/light theme state to the whole application.
 *
 * Behavior:
 *   - On first visit, respects the OS preference via matchMedia.
 *   - Stores the user's choice in localStorage under "cc-theme".
 *   - Applies the theme by toggling the "dark" / "light" class on
 *     <html>, which activates the CSS variables in index.css.
 *
 * Created: 10/10/2026
 * Author: Abdullah (BSEF23M526)
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "cc-theme";
const ThemeContext = createContext(null);


function getInitialTheme() {
  if (typeof window === "undefined") return "dark";

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;

  // Fall back to OS preference.
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  return prefersLight ? "light" : "dark";
}


export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  // Apply the class on <html> whenever theme changes.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme, setTheme }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}


export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside a <ThemeProvider>.");
  }
  return ctx;
}