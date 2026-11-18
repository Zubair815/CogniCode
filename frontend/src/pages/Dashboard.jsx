/**
 * Dashboard — student view.
 * Created: 10/10/2026
 * Updated: 10/10/2026
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Moon, Plus, RefreshCw, Sun } from "lucide-react";
import axios from "axios";

import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";
import Badge from "../components/ui/Badge.jsx";
import Logo from "../components/brand/Logo.jsx";
import StartSessionModal from "../components/chat/StartSessionModal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { chatService } from "../services/chatService.js";
import { ROUTES, chatRoute } from "../constants/routes.js";

function isCancel(err) {
  return (
    axios.isCancel?.(err) ||
    err?.name === "CanceledError" ||
    err?.code === "ERR_CANCELED"
  );
}

export default function Dashboard({ role }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [modalOpen, setModalOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const isStudent = role === "student";
  const abortRef = useRef(null);

  const loadSessions = useCallback(async () => {
    if (!isStudent) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoadingSessions(true);
    setLoadError(null);
    try {
      const data = await chatService.listMySessions({
        signal: controller.signal,
      });
      setSessions(data.sessions || []);
    } catch (err) {
      if (isCancel(err)) return;
      setLoadError(err.message || "Could not load sessions.");
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }, [isStudent]);

  useEffect(() => {
    if (!isStudent) return;
    loadSessions();
    const onFocus = () => loadSessions();
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      abortRef.current?.abort();
    };
  }, [isStudent, loadSessions]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      navigate(ROUTES.LOGIN, { replace: true });
    }
  };

  const openSession = (id) => navigate(chatRoute(id));

  return (
    <div className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text)]">
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
            <Button
              variant="secondary"
              size="sm"
              onClick={handleLogout}
              loading={loggingOut}
            >
              {loggingOut ? "Signing out…" : "Sign out"}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10 space-y-5 md:space-y-6">
        <Card>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <Badge tone={role === "instructor" ? "violet" : "info"}>
              {role}
            </Badge>
            <span className="text-xs text-[color:var(--text-muted)]">
              Welcome back
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">
            Hi {user?.name?.split(" ")[0] || "there"} 👋
          </h1>
          <p className="text-sm text-[color:var(--text-muted)] mt-2">
            {isStudent
              ? "Start a new tutoring session or continue where you left off."
              : "This is a placeholder for the instructor dashboard (Phase 6)."}
          </p>

          {isStudent && (
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={() => setModalOpen(true)}>
                <Plus size={16} /> Start new session
              </Button>
              <Button
                variant="secondary"
                onClick={loadSessions}
                disabled={loadingSessions}
              >
                <RefreshCw size={14} /> Refresh
              </Button>
            </div>
          )}
        </Card>

        {isStudent && (
          <Card title="Recent sessions">
            {loadError && (
              <p className="text-xs text-[color:var(--danger)] mb-3">{loadError}</p>
            )}

            {loadingSessions ? (
              <p className="text-sm text-[color:var(--text-muted)]">
                Loading sessions…
              </p>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-3xl mb-2">🚀</div>
                <p className="text-sm font-semibold">No sessions yet</p>
                <p className="text-xs text-[color:var(--text-muted)] mt-1">
                  Start your first session to see it here.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {sessions.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => openSession(s.id)}
                      className="w-full text-left flex items-center justify-between gap-3 px-3.5 py-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--border-2)] hover:bg-[color:var(--surface-2)] transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {s.topic}
                        </p>
                        <p className="text-[11px] text-[color:var(--text-muted)] mt-0.5">
                          Started {new Date(s.started_at).toLocaleString()}
                          {s.ended_at ? " · ended" : " · active"}
                        </p>
                      </div>
                      <Badge
                        tone={
                          s.dependency_band === "high"
                            ? "danger"
                            : s.dependency_band === "moderate"
                            ? "warning"
                            : "success"
                        }
                      >
                        {typeof s.dependency_score === "number"
                          ? s.dependency_score.toFixed(0)
                          : "—"}
                      </Badge>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        <Card title="Account">
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
          </dl>
        </Card>
      </main>

      <StartSessionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}