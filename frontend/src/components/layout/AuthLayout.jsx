/**
 * AuthLayout
 * ----------
 * Minimal, centered authentication shell matching the product's
 * conversational design language.
 */

import { Link } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import Logo from "../brand/Logo.jsx";
import IconButton from "../ui/IconButton.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";
import { ROUTES } from "../../constants/routes.js";

export default function AuthLayout({ title, subtitle, children }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex min-h-dvh-screen flex-col bg-canvas text-fg">
      {/* Top minimal bar */}
      <header className="flex h-header shrink-0 items-center justify-between px-4 md:px-6">
        <Link to={ROUTES.LANDING} className="inline-flex items-center">
          <Logo size={26} withWordmark />
        </Link>
        <IconButton
          label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          size="sm"
          onClick={toggleTheme}
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </IconButton>
      </header>

      {/* Centered auth surface */}
      <main className="flex flex-1 flex-col px-4 py-6 sm:py-10">
        <div className="my-auto mx-auto w-full max-w-[400px]">
          {(title || subtitle) && (
            <div className="mb-5 text-center">
              {title && (
                <h1 className="text-2xl font-semibold tracking-tight text-fg">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="mt-1.5 text-sm text-fg-secondary">{subtitle}</p>
              )}
            </div>
          )}

          <div className="rounded-xl border border-line-subtle bg-canvas p-5 shadow-sm sm:p-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
