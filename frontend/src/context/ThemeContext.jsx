/**
 * ThemeContext
 * ------------
 * Owns the user's appearance preference: "light", "dark", or "system".
 *
 *   preference — what the user chose (persisted in localStorage "cc-theme")
 *   theme      — the resolved theme actually applied ("light" | "dark")
 *
 * The resolved theme is applied as a class on <html>, which activates
 * the token set in index.css. index.html runs the same resolution
 * before first paint so there is no flash of the wrong theme.
 *
 * Backward compatible: `theme`, `toggleTheme`, and `setTheme` keep
 * their previous meaning for existing callers.
 */

/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "cc-theme";
const PREFERENCES = ["light", "dark", "system"];
const ThemeContext = createContext(null);

function readPreference() {
  if (typeof window === "undefined") return "system";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return PREFERENCES.includes(stored) ? stored : "system";
  } catch {
    // Storage can be unavailable (privacy mode); fall back to OS preference.
    return "system";
  }
}

function systemTheme() {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(readPreference);
  const [osTheme, setOsTheme] = useState(systemTheme);

  // Follow OS changes while the preference is "system".
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e) => setOsTheme(e.matches ? "dark" : "light");
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const theme = preference === "system" ? osTheme : preference;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(theme);
  }, [theme]);

  const setPreference = useCallback((next) => {
    if (!PREFERENCES.includes(next)) return;
    setPreferenceState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Non-fatal: the choice still applies for this page view.
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setPreference(theme === "dark" ? "light" : "dark");
  }, [theme, setPreference]);

  const value = useMemo(
    () => ({
      theme,
      preference,
      setPreference,
      toggleTheme,
      // Legacy alias: setTheme("light" | "dark")
      setTheme: setPreference,
    }),
    [theme, preference, setPreference, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside a <ThemeProvider>.");
  }
  return ctx;
}
