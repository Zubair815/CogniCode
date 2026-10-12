/**
 * Placeholder dashboard shown after successful login.
 * Replaced with the real student/instructor dashboards
 * in later sprints.
 *
 * Created: 10/10/2026
 * Updated: 10/10/2026
 */

import { useNavigate } from "react-router-dom";
import { Moon, Sun } from "lucide-react";

import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";
import Badge from "../components/ui/Badge.jsx";
import Logo from "../components/brand/Logo.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { ROUTES } from "../constants/routes.js";

export default function Dashboard({ role }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.LOGIN, { replace: true });
  };

  return (
    <div className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text)]">
      {/* Navbar — same background as body, no border */}
      <header className="sticky top-0 z-40 bg-[color:var(--bg)]">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
          <Logo size={30} withWordmark />

          <div className="flex items-center gap-1.5 md:gap-2">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-[color:var(--text-muted)] hover:text-[color:var(--text)] hover:bg-[color:var(--surface-2)] transition-colors"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Button variant="secondary" size="sm" onClick={handleLogout}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10 space-y-5 md:space-y-6">
        <Card>
          <div className="flex items-center gap-3 mb-3">
            <Badge tone={role === "instructor" ? "violet" : "info"}>
              {role}
            </Badge>
            <span className="text-xs text-[color:var(--text-muted)]">
              Authenticated via JWT
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">
            Welcome, {user?.name || "friend"} 👋
          </h1>
          <p className="text-sm text-[color:var(--text-muted)] mt-2">
            This is a placeholder dashboard. The full experience lands in
            the next sprints — chat, hints, CDS, reflections, and analytics.
          </p>
        </Card>

        <Card title="Session">
          <dl className="text-sm space-y-2">
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-[color:var(--text-muted)]">Email</dt>
              <dd className="font-medium break-all">{user?.email}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-[color:var(--text-muted)]">Role</dt>
              <dd className="font-medium capitalize">{user?.role}</dd>
            </div>
            {user?.institution && (
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-[color:var(--text-muted)]">Institution</dt>
                <dd className="font-medium">{user.institution}</dd>
              </div>
            )}
            {user?.preferred_language && (
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-[color:var(--text-muted)]">Language</dt>
                <dd className="font-medium">{user.preferred_language}</dd>
              </div>
            )}
          </dl>
        </Card>
      </main>
    </div>
  );
}