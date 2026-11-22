import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import AppLayout from "../../components/layout/AppLayout.jsx";
import Alert from "../../components/ui/Alert.jsx";
import Button from "../../components/ui/Button.jsx";
import Card from "../../components/ui/Card.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Textarea from "../../components/ui/Textarea.jsx";
import { chatService } from "../../services/chatService.js";
import { instructorService } from "../../services/instructorService.js";
import { ROUTES } from "../../constants/routes.js";

const MIN_REFLECTION_CHARS = 100;

export default function Reflections() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [takeaway, setTakeaway] = useState("");
  const [mistake, setMistake] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [reflections, setReflections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadData() {
      setLoading(true);
      try {
        const [reflData, sessData] = await Promise.all([
          instructorService.getStudentReflections(),
          chatService.listMySessions(),
        ]);
        if (!active) return;

        if (Array.isArray(reflData)) {
          setReflections(
            reflData.map((r) => ({
              id: r.id,
              sessionId: r.session_id,
              topic: r.topic || "Computer Science",
              date: r.created_at
                ? new Date(r.created_at).toLocaleDateString()
                : "Recent",
              takeaway: r.learned_today,
              mistakeToAvoid: r.mistake_to_avoid,
            }))
          );
        }

        const list = Array.isArray(sessData?.sessions) ? sessData.sessions : [];
        setSessions(list);
        if (list.length > 0) {
          const pending = list.find((s) => !s.reflection_stored) || list[0];
          setSelectedSessionId(pending.id);
        }
      } catch (err) {
        if (active) {
          setSubmitError(err?.message || "Unable to load reflections.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, []);

  const handleGenerateDraft = async () => {
    if (!selectedSessionId) return;
    setDrafting(true);
    setSubmitError("");
    try {
      const draft = await instructorService.generateReflectionDraft(selectedSessionId);
      setTakeaway(draft.learned_today || "");
      setMistake(draft.mistake_to_avoid || "");
    } catch (err) {
      setSubmitError(err?.message || "Unable to generate AI draft.");
    } finally {
      setDrafting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setSavedSuccess(false);

    if (!selectedSessionId) {
      setSubmitError("Start a tutoring session before submitting a reflection.");
      return;
    }

    const learned = takeaway.trim();
    const avoid = mistake.trim();
    if (learned.length < MIN_REFLECTION_CHARS || avoid.length < MIN_REFLECTION_CHARS) {
      setSubmitError(
        `Each section must be at least ${MIN_REFLECTION_CHARS} characters for meaningful reflection.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const saved = await instructorService.submitReflection(selectedSessionId, {
        learned_today: learned,
        mistake_to_avoid: avoid,
      });
      const entry = {
        id: saved.id,
        sessionId: saved.session_id,
        topic: saved.topic || "Computer Science",
        date: saved.created_at
          ? new Date(saved.created_at).toLocaleDateString()
          : "Today",
        takeaway: saved.learned_today,
        mistakeToAvoid: saved.mistake_to_avoid,
      };
      setReflections((prev) => [
        entry,
        ...prev.filter((item) => item.sessionId !== saved.session_id),
      ]);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === selectedSessionId ? { ...s, reflection_stored: true } : s
        )
      );
      setTakeaway("");
      setMistake("");
      setSavedSuccess(true);
    } catch (err) {
      setSubmitError(err?.message || "Failed to save reflection. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout activeCds={0}>
      <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8 md:py-8 space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">
          Reflections
        </h1>

        <Card title="New reflection">
          {savedSuccess && (
            <Alert tone="success" className="mb-4" onDismiss={() => setSavedSuccess(false)}>
              Reflection saved to your journal.
            </Alert>
          )}
          {submitError && (
            <Alert tone="danger" className="mb-4" onDismiss={() => setSubmitError("")}>
              {submitError}
            </Alert>
          )}

          {loading ? (
            <div className="py-6 text-center text-sm text-fg-secondary">
              Loading your sessions…
            </div>
          ) : sessions.length === 0 ? (
            <EmptyState
              title="Complete a session to reflect"
              description="Reflections are linked to your tutoring sessions so your AI memory learns from each topic."
              action={
                <Button size="sm" onClick={() => navigate(ROUTES.STUDENT_DASHBOARD)}>
                  Go to dashboard
                </Button>
              }
            />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <label htmlFor="reflection-session" className="block text-sm font-medium text-fg">
                    Tutoring session
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerateDraft}
                    loading={drafting}
                    disabled={!selectedSessionId || submitting}
                  >
                    <Sparkles size={14} aria-hidden="true" />
                    <span>{drafting ? "Generating…" : "Generate AI draft"}</span>
                  </Button>
                </div>
                <select
                  id="reflection-session"
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
                >
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.topic} · {new Date(s.started_at).toLocaleDateString()}
                      {s.reflection_stored ? " (reflected)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Textarea
                  id="reflection-takeaway"
                  label="What did you learn?"
                  value={takeaway}
                  onChange={(e) => setTakeaway(e.target.value)}
                  rows={3}
                  placeholder="Summarize the key invariant, base case, or algorithmic pattern in your own words (at least 100 characters)…"
                  required
                />
                <div className="-mt-2 text-right text-xs text-fg-muted">
                  {takeaway.trim().length} / {MIN_REFLECTION_CHARS} min characters
                </div>
              </div>

              <div>
                <Textarea
                  id="reflection-mistake"
                  label="Mistake to avoid next time"
                  value={mistake}
                  onChange={(e) => setMistake(e.target.value)}
                  rows={3}
                  placeholder="Describe the specific bug, edge case, or assumption you will avoid next time (at least 100 characters)…"
                  required
                />
                <div className="-mt-2 text-right text-xs text-fg-muted">
                  {mistake.trim().length} / {MIN_REFLECTION_CHARS} min characters
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="primary" type="submit" loading={submitting}>
                  {submitting ? "Saving…" : "Save reflection"}
                </Button>
              </div>
            </form>
          )}
        </Card>

        <Card title="Past reflections" padding="p-0">
          {loading ? (
            <div className="px-5 py-8 text-center text-sm text-fg-secondary">
              Loading reflections…
            </div>
          ) : reflections.length === 0 ? (
            <EmptyState
              title="No reflections yet"
              description="Record what you learned after completing a tutoring session."
            />
          ) : (
            <div className="divide-y divide-line-subtle">
              {reflections.map((item) => (
                <div key={item.id} className="p-5 space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-sm font-semibold text-fg">{item.topic}</h3>
                    <span className="text-xs text-fg-muted">{item.date}</span>
                  </div>

                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="font-medium text-fg">Takeaway: </span>
                      <span className="text-fg-secondary">{item.takeaway}</span>
                    </p>
                    <p>
                      <span className="font-medium text-fg">Avoid: </span>
                      <span className="text-fg-secondary">{item.mistakeToAvoid}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
