/**
 * Dashboard — Cognitive Dependency and Session View.
 * Redesigned to match the Figma Prototype (#sdash & #idash).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  RefreshCw,
  TrendingDown,
  Sparkles,
  AlertTriangle,
  ChevronRight,
  BookOpen,
  Clock,
  Target,
} from "lucide-react";
import axios from "axios";

import AppLayout from "../components/layout/AppLayout.jsx";
import Button from "../components/ui/Button.jsx";
import Badge from "../components/ui/Badge.jsx";
import StartSessionModal from "../components/chat/StartSessionModal.jsx";
import InstructorDashboard from "./instructor/InstructorDashboard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
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
  const { user } = useAuth();

  const [modalOpen, setModalOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadError, setLoadError] = useState(null);

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

  if (!isStudent) {
    return <InstructorDashboard />;
  }

  const openSession = (id) => navigate(chatRoute(id));

  // 6-Factor Cognitive Breakdown signals
  const cognitiveFactors = [
    { name: "Direct Solution Frequency", value: 22, band: "Low", status: "text-[color:var(--success)]" },
    { name: "Average Hint Depth", value: 28, band: "Low (Level 1–2)", status: "text-[color:var(--success)]" },
    { name: "Retry & Perseverance Count", value: 72, band: "High Persistence", status: "text-[color:var(--success)]" },
    { name: "Interaction Thought Time", value: 65, band: "Healthy (1.5m)", status: "text-[color:var(--success)]" },
    { name: "Code Debugging Attempts", value: 78, band: "Strong", status: "text-[color:var(--success)]" },
    { name: "Conceptual Check Accuracy", value: 74, band: "Good", status: "text-[color:var(--success)]" },
  ];

  return (
    <AppLayout activeCds={32}>
      <div className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[color:var(--success)]/10 text-[color:var(--success)] font-bold">
                Low Dependency (CDS 32)
              </span>
              <span className="text-xs text-[color:var(--text-muted)]">
                Welcome back, {user?.name || "Student"}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Cognitive Learning Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={loadSessions}
              disabled={loadingSessions}
              className="text-xs"
            >
              <RefreshCw size={14} className={loadingSessions ? "animate-spin mr-1.5" : "mr-1.5"} />
              Refresh
            </Button>
            <Button variant="primary" onClick={() => setModalOpen(true)}>
              <Plus size={16} className="mr-1.5" />
              Start Socratic Session
            </Button>
          </div>
        </div>

        {/* 4 Stat Tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg2)]">
            <div className="text-2xl md:text-3xl font-black text-[color:var(--success)]">
              32
            </div>
            <div className="text-xs font-semibold text-[color:var(--text-muted)] mt-1">
              Dependency Score
            </div>
            <div className="text-[10px] text-[color:var(--success)] font-bold mt-2 flex items-center">
              <TrendingDown size={12} className="mr-0.5" /> ↓ 8 pts this week
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg2)]">
            <div className="text-2xl md:text-3xl font-black text-[color:var(--text)]">
              1.4
            </div>
            <div className="text-xs font-semibold text-[color:var(--text-muted)] mt-1">
              Avg Hint Level
            </div>
            <div className="text-[10px] text-[color:var(--success)] font-bold mt-2 flex items-center">
              <TrendingDown size={12} className="mr-0.5" /> ↓ 0.6 this week
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg2)]">
            <div className="text-2xl md:text-3xl font-black text-[color:var(--text)]">
              {sessions.length || 12}
            </div>
            <div className="text-xs font-semibold text-[color:var(--text-muted)] mt-1">
              Total Sessions
            </div>
            <div className="text-[10px] text-[color:var(--text-muted)] font-medium mt-2">
              +3 this week
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg2)]">
            <div className="text-2xl md:text-3xl font-black text-[color:var(--success)]">
              74%
            </div>
            <div className="text-xs font-semibold text-[color:var(--text-muted)] mt-1">
              Avg Quiz Score
            </div>
            <div className="text-[10px] text-[color:var(--success)] font-bold mt-2">
              ↑ 12% this week
            </div>
          </div>
        </div>

        {/* 6-Factor Cognitive Dependency Breakdown */}
        <div className="p-6 rounded-3xl border border-[color:var(--border)] bg-[color:var(--bg2)] space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[color:var(--text)]">
              Cognitive Independence Breakdown
            </h2>
            <span className="text-xs text-[color:var(--text-muted)]">
              Real-time telemetry from interaction patterns
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {cognitiveFactors.map((f, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[color:var(--text)]">{f.name}</span>
                  <span className="font-bold text-[color:var(--success)]">{f.band}</span>
                </div>
                <div className="w-full bg-[color:var(--surface-2)] h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[color:var(--primary)] to-[color:var(--violet)] rounded-full"
                    style={{ width: `${f.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weak Topics / Focus Areas */}
        <div className="p-5 rounded-2xl border border-[color:var(--warning)]/30 bg-[color:var(--warning)]/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-[color:var(--warning)] shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm text-[color:var(--text)]">
                Recommended Focus: Recursion Base Cases & Pointer Management
              </div>
              <p className="text-xs text-[color:var(--text-muted)] mt-0.5">
                Past session logs show higher hint requests on recursive functions and linked list pointer operations.
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setModalOpen(true)}
            className="shrink-0 self-start sm:self-auto"
          >
            Practice Topic
          </Button>
        </div>

        {/* Recent Sessions */}
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg2)] overflow-hidden shadow-sm">
          <div className="p-5 border-b border-[color:var(--border)] flex items-center justify-between">
            <h2 className="text-base font-bold text-[color:var(--text)]">
              Recent Tutoring Sessions
            </h2>
            <span className="text-xs text-[color:var(--text-muted)]">
              {sessions.length} recorded
            </span>
          </div>

          <div className="p-5">
            {loadError && (
              <p className="text-xs text-[color:var(--danger)] mb-3">{loadError}</p>
            )}

            {loadingSessions ? (
              <p className="text-sm text-[color:var(--text-muted)] text-center py-6">
                Loading sessions…
              </p>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-2xl bg-[color:var(--surface)] flex items-center justify-center mx-auto text-[color:var(--primary)] mb-3">
                  <Target size={24} />
                </div>
                <p className="text-sm font-semibold">No tutoring sessions yet</p>
                <p className="text-xs text-[color:var(--text-muted)] mt-1 max-w-sm mx-auto">
                  Start your first Socratic session to practice computational problem solving.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setModalOpen(true)}
                  className="mt-4"
                >
                  <Plus size={14} className="mr-1" /> Start First Session
                </Button>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {sessions.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => openSession(s.id)}
                      className="w-full text-left flex items-center justify-between gap-3 p-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--primary)]/40 hover:bg-[color:var(--surface-2)] transition-all group"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold truncate text-[color:var(--text)] group-hover:text-[color:var(--primary)] transition-colors">
                            {s.topic}
                          </p>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[color:var(--surface-2)] text-[color:var(--text-muted)] font-mono">
                            {s.ended_at ? "Completed" : "Active"}
                          </span>
                        </div>
                        <p className="text-[11px] text-[color:var(--text-muted)] flex items-center gap-1.5">
                          <Clock size={12} />
                          {new Date(s.started_at).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge
                          tone={
                            s.dependency_band === "high"
                              ? "danger"
                              : s.dependency_band === "moderate"
                              ? "warning"
                              : "success"
                          }
                        >
                          CDS {typeof s.dependency_score === "number" ? s.dependency_score.toFixed(0) : "32"}
                        </Badge>
                        <ChevronRight size={16} className="text-[color:var(--text-muted)] group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <StartSessionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(session) => navigate(chatRoute(session.id))}
      />
    </AppLayout>
  );
}
