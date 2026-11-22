/**
 * Dashboard — Student progress & session history.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Plus, RefreshCw } from "lucide-react";
import axios from "axios";

import AppLayout from "../components/layout/AppLayout.jsx";
import Alert from "../components/ui/Alert.jsx";
import Badge from "../components/ui/Badge.jsx";
import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import StartSessionModal from "../components/chat/StartSessionModal.jsx";
import InstructorDashboard from "./instructor/InstructorDashboard.jsx";
import { chatService } from "../services/chatService.js";
import { instructorService } from "../services/instructorService.js";
import { chatRoute } from "../constants/routes.js";

function isCancel(err) {
  return (
    axios.isCancel?.(err) ||
    err?.name === "CanceledError" ||
    err?.code === "ERR_CANCELED"
  );
}

export default function Dashboard({ role }) {
  const navigate = useNavigate();

  const [modalOpen, setModalOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [cdsData, setCdsData] = useState({
    score: 0,
    band: "low",
    trend: "No sessions yet",
    breakdown: {
      solution_frequency: 0,
      hint_depth: 0,
      retry_count: 0,
      time_gap: 0,
      debugging_attempts: 0,
      quiz_performance: 0,
    },
    weak_topics: [],
  });

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

      try {
        const [cds, reminderList] = await Promise.all([
          chatService.getStudentCdsSummary({ signal: controller.signal }),
          instructorService.listStudentReminders({ signal: controller.signal }),
        ]);
        if (cds) setCdsData(cds);
        if (Array.isArray(reminderList)) setReminders(reminderList);
      } catch {
        // Ignore secondary summary failures
      }
    } catch (err) {
      if (isCancel(err)) return;
      setLoadError(err.message || "Unable to load sessions. Check your connection and try again.");
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }, [isStudent]);

  useEffect(() => {
    if (!isStudent) return undefined;
    const initialTimer = setTimeout(() => {
      loadSessions();
    }, 0);
    const onFocus = () => loadSessions();
    window.addEventListener("focus", onFocus);
    return () => {
      clearTimeout(initialTimer);
      window.removeEventListener("focus", onFocus);
      abortRef.current?.abort();
    };
  }, [isStudent, loadSessions]);

  if (!isStudent) {
    return <InstructorDashboard />;
  }

  const openSession = (id) => navigate(chatRoute(id));
  const hasSessions = sessions.length > 0;
  const avgHintLevel = hasSessions
    ? ((cdsData.breakdown?.hint_depth || 0) / 20).toFixed(1)
    : "0.0";
  const quizAvgLabel = hasSessions
    ? `${Math.round(cdsData.breakdown?.quiz_performance || 0)}%`
    : "—";

  const cognitiveFactors = [
    {
      name: "Direct solution requests",
      value: cdsData.breakdown?.solution_frequency ?? 0,
      band: `${Math.round(cdsData.breakdown?.solution_frequency ?? 0)}% of turns`,
    },
    {
      name: "Average hint depth",
      value: cdsData.breakdown?.hint_depth ?? 0,
      band: !hasSessions ? "Level 0" : `Level ${avgHintLevel}`,
    },
    {
      name: "Attempt perseverance",
      value: cdsData.breakdown?.retry_count ?? 0,
      band: `${Math.round(cdsData.breakdown?.retry_count ?? 0)}%`,
    },
    {
      name: "Deliberate response pacing",
      value: cdsData.breakdown?.time_gap ?? 0,
      band: `${Math.round(cdsData.breakdown?.time_gap ?? 0)}%`,
    },
    {
      name: "Independent debugging",
      value: cdsData.breakdown?.debugging_attempts ?? 0,
      band: `${Math.round(cdsData.breakdown?.debugging_attempts ?? 0)}%`,
    },
    {
      name: "Concept check accuracy",
      value: cdsData.breakdown?.quiz_performance ?? 0,
      band: `${Math.round(cdsData.breakdown?.quiz_performance ?? 0)}%`,
    },
  ];

  const handleDismissReminder = async (id) => {
    try {
      await instructorService.acknowledgeReminder(id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // ignore transient dismiss error
    }
  };

  return (
    <AppLayout activeCds={cdsData.score}>
      <div className="mx-auto w-full max-w-4xl px-4 py-6 md:px-8 md:py-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            Dashboard
          </h1>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="md"
              onClick={loadSessions}
              disabled={loadingSessions}
            >
              <RefreshCw
                size={14}
                className={loadingSessions ? "animate-spin" : ""}
                aria-hidden="true"
              />
              <span>Refresh</span>
            </Button>
            <Button variant="primary" size="md" onClick={() => setModalOpen(true)}>
              <Plus size={16} aria-hidden="true" />
              <span>New session</span>
            </Button>
          </div>
        </div>

        {/* Summary metrics */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-line-subtle bg-canvas p-4">
            <div className="text-xs text-fg-secondary">Dependency score</div>
            <div className="mt-1 text-2xl font-semibold text-fg">
              {cdsData.score}
            </div>
            <div className="mt-1 text-xs text-fg-muted">{cdsData.trend}</div>
          </div>

          <div className="rounded-xl border border-line-subtle bg-canvas p-4">
            <div className="text-xs text-fg-secondary">Average hint level</div>
            <div className="mt-1 text-2xl font-semibold text-fg">{avgHintLevel}</div>
            <div className="mt-1 text-xs text-fg-muted">Scale 1–5</div>
          </div>

          <div className="rounded-xl border border-line-subtle bg-canvas p-4">
            <div className="text-xs text-fg-secondary">Sessions</div>
            <div className="mt-1 text-2xl font-semibold text-fg">
              {sessions.length}
            </div>
            <div className="mt-1 text-xs text-fg-muted">
              {hasSessions ? "Total sessions" : "No sessions yet"}
            </div>
          </div>

          <div className="rounded-xl border border-line-subtle bg-canvas p-4">
            <div className="text-xs text-fg-secondary">Quiz average</div>
            <div className="mt-1 text-2xl font-semibold text-fg">{quizAvgLabel}</div>
            <div className="mt-1 text-xs text-fg-muted">
              {hasSessions ? "Concept checks" : "No checks yet"}
            </div>
          </div>
        </div>

        {/* Instructor practice reminders */}
        {reminders.map((rem) => (
          <Alert
            key={rem.id}
            tone="info"
            title={`Practice reminder · ${rem.topic}`}
            onDismiss={() => handleDismissReminder(rem.id)}
            action={{
              label: "Practice",
              onClick: () => setModalOpen(true),
            }}
          >
            {rem.message}
          </Alert>
        ))}

        {/* Focus notice — only shown when weak topics actually exist */}
        {cdsData.weak_topics && cdsData.weak_topics.length > 0 && (
          <Alert
            tone="warning"
            title={`Focus area: ${cdsData.weak_topics.join(", ")}`}
            action={{
              label: "Practice",
              onClick: () => setModalOpen(true),
            }}
          >
            Recent sessions show higher dependency on {cdsData.weak_topics.join(", ")}.
          </Alert>
        )}

        {/* Recent tutoring sessions */}
        <Card title="Recent sessions" padding="p-0">
          {loadError && (
            <div className="px-5 pt-3">
              <Alert
                tone="danger"
                action={{ label: "Retry", onClick: loadSessions }}
              >
                {loadError}
              </Alert>
            </div>
          )}

          {loadingSessions ? (
            <div className="px-5 py-8 text-center text-sm text-fg-secondary">
              Loading sessions…
            </div>
          ) : sessions.length === 0 ? (
            <EmptyState
              title="No sessions yet"
              action={
                <Button size="sm" onClick={() => setModalOpen(true)}>
                  New session
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-line-subtle">
              {sessions.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => openSession(s.id)}
                    className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors duration-fast hover:bg-hover"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-fg">
                        {s.topic}
                      </div>
                      <div className="mt-0.5 text-xs text-fg-muted">
                        {new Date(s.started_at).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2.5">
                      <Badge
                        tone={
                          s.dependency_band === "high"
                            ? "danger"
                            : s.dependency_band === "moderate"
                            ? "warning"
                            : "success"
                        }
                      >
                        CDS{" "}
                        {typeof s.dependency_score === "number"
                          ? s.dependency_score.toFixed(0)
                          : "0"}
                      </Badge>
                      <ChevronRight
                        size={16}
                        className="text-fg-muted"
                        aria-hidden="true"
                      />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* 6-Factor Cognitive Dependency Breakdown (flattened, no nested sub-cards) */}
        <Card title="Dependency signals">
          <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
            {cognitiveFactors.map((f) => (
              <div key={f.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-fg">{f.name}</span>
                  <span className="text-fg-secondary">{f.band}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${f.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <StartSessionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(session) => navigate(chatRoute(session.id))}
      />
    </AppLayout>
  );
}
