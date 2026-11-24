import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import AppLayout from "../../components/layout/AppLayout.jsx";
import Alert from "../../components/ui/Alert.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Card from "../../components/ui/Card.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { fieldClasses } from "../../components/ui/Input.jsx";
import { chatService } from "../../services/chatService.js";
import { quizService } from "../../services/quizService.js";
import { ROUTES } from "../../constants/routes.js";

export default function Quiz() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answersMap, setAnswersMap] = useState({});
  const [submitResult, setSubmitResult] = useState(null);
  const [resultsHistory, setResultsHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadInitial() {
      setLoading(true);
      try {
        const [sessData, histData] = await Promise.all([
          chatService.listMySessions(),
          quizService.listResults(),
        ]);
        if (!active) return;
        const list = Array.isArray(sessData?.sessions) ? sessData.sessions : [];
        setSessions(list);
        if (list.length > 0) {
          setSelectedSessionId(list[0].id);
        }
        setResultsHistory(Array.isArray(histData) ? histData : []);
      } catch (err) {
        if (active) setError(err?.message || "Unable to load quiz data.");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadInitial();
    return () => {
      active = false;
    };
  }, []);

  const selectedSession = sessions.find((s) => s.id === selectedSessionId) || null;

  useEffect(() => {
    if (!selectedSessionId) return undefined;
    let active = true;
    quizService
      .getQuestions(selectedSession?.topic)
      .then((qs) => {
        if (!active) return;
        setQuestions(Array.isArray(qs) ? qs : []);
        setCurrentIdx(0);
        setAnswersMap({});
        setSubmitResult(null);
      })
      .catch((err) => {
        if (active) setError(err?.message || "Failed to load conceptual questions.");
      });
    return () => {
      active = false;
    };
  }, [selectedSessionId, selectedSession?.topic]);

  const currentQ = questions[currentIdx];
  const selectedOption = currentQ ? answersMap[currentQ.id] || null : null;

  const feedbackForCurrent = submitResult?.feedback?.find(
    (f) => f.question_id === currentQ?.id
  );

  const handleSelect = (optId) => {
    if (submitResult || !currentQ) return;
    setAnswersMap((prev) => ({ ...prev, [currentQ.id]: optId }));
  };

  const handleSubmitCurrent = async () => {
    if (!currentQ || !selectedOption || !selectedSessionId) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await quizService.submitQuiz(selectedSessionId, [
        { question_id: currentQ.id, selected_option: selectedOption },
      ]);
      setSubmitResult(res);
      setResultsHistory((prev) => [
        {
          id: res.result_id,
          session_id: res.session_id,
          topic: res.topic,
          score: res.score,
          total_questions: res.total_questions,
          passed: res.passed,
          created_at: res.created_at,
        },
        ...prev,
      ]);
    } catch (err) {
      setError(err?.message || "Unable to submit quiz answer.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    setSubmitResult(null);
    if (questions.length > 0) {
      setCurrentIdx((currentIdx + 1) % questions.length);
    }
  };

  return (
    <AppLayout activeCds={0}>
      <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8 md:py-8 space-y-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            Quizzes
          </h1>
          {questions.length > 0 && (
            <span className="text-xs text-fg-muted">
              Question {currentIdx + 1} of {questions.length}
            </span>
          )}
        </div>

        {error && (
          <Alert tone="danger" onDismiss={() => setError("")}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Card>
            <div className="py-8 text-center text-sm text-fg-secondary">
              Loading quiz workspace…
            </div>
          </Card>
        ) : sessions.length === 0 ? (
          <Card padding="p-0">
            <EmptyState
              title="Start a session before taking a quiz"
              description="Conceptual quizzes are graded on the server and directly update your session's Cognitive Dependency Score."
              action={
                <Button size="sm" onClick={() => navigate(ROUTES.STUDENT_DASHBOARD)}>
                  Go to dashboard
                </Button>
              }
            />
          </Card>
        ) : (
          <>
            <Card>
              <div className="space-y-5">
                <div>
                  <label htmlFor="quiz-session" className="block text-xs font-medium text-fg-secondary mb-1.5">
                    Assess understanding for session
                  </label>
                  <select
                    id="quiz-session"
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                    className={fieldClasses({ className: "h-11" })}
                  >
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.topic} · {new Date(s.started_at).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </div>

                {currentQ && (
                  <>
                    <div className="text-xs font-medium text-fg-secondary">
                      {currentQ.topic}
                    </div>

                    <h2 className="text-lg font-semibold leading-snug text-fg">
                      {currentQ.prompt}
                    </h2>

                    {currentQ.code_snippet && (
                      <pre className="overflow-x-auto rounded-xl border border-line-subtle bg-code p-4 font-mono text-[13px] leading-relaxed text-fg">
                        <code>{currentQ.code_snippet}</code>
                      </pre>
                    )}

                    <div className="space-y-2" role="radiogroup" aria-label={currentQ.prompt}>
                      {currentQ.options.map((opt) => {
                        const selected = selectedOption === opt.id;
                        const isGradedCorrect = feedbackForCurrent?.correct_option === opt.id;
                        const isGradedWrong =
                          Boolean(feedbackForCurrent) && selected && !feedbackForCurrent.is_correct;

                        let cls = "border-line bg-canvas hover:border-line-strong hover:bg-surface";
                        if (selected && !feedbackForCurrent) {
                          cls = "border-accent bg-accent-soft text-fg font-medium";
                        } else if (feedbackForCurrent && isGradedCorrect) {
                          cls = "border-success bg-success-soft text-fg font-medium";
                        } else if (isGradedWrong) {
                          cls = "border-danger bg-danger-soft text-danger";
                        }

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            disabled={Boolean(feedbackForCurrent) || submitting}
                            onClick={() => handleSelect(opt.id)}
                            className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3.5 text-left text-sm transition-colors duration-fast ${cls}`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-line-subtle bg-surface font-mono text-xs font-semibold">
                                {opt.id}
                              </span>
                              <span>{opt.text}</span>
                            </div>
                            {feedbackForCurrent && isGradedCorrect && (
                              <CheckCircle2 size={17} className="shrink-0 text-success" aria-label="Correct option" />
                            )}
                            {isGradedWrong && (
                              <XCircle size={17} className="shrink-0 text-danger" aria-label="Incorrect option" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {feedbackForCurrent && (
                      <Alert
                        tone={feedbackForCurrent.is_correct ? "success" : "warning"}
                        title={
                          feedbackForCurrent.is_correct
                            ? `Correct — Session CDS updated to ${submitResult.updated_cds_score}`
                            : `Review the invariant — Session CDS updated to ${submitResult.updated_cds_score}`
                        }
                      >
                        {feedbackForCurrent.explanation}
                      </Alert>
                    )}

                    <div className="flex items-center justify-between border-t border-line-subtle pt-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (!currentQ) return;
                          setAnswersMap((prev) => {
                            const next = { ...prev };
                            delete next[currentQ.id];
                            return next;
                          });
                          setSubmitResult(null);
                        }}
                        disabled={!selectedOption || Boolean(feedbackForCurrent) || submitting}
                      >
                        Clear
                      </Button>

                      {!feedbackForCurrent ? (
                        <Button
                          variant="primary"
                          onClick={handleSubmitCurrent}
                          disabled={!selectedOption}
                          loading={submitting}
                        >
                          {submitting ? "Grading…" : "Check & save"}
                        </Button>
                      ) : (
                        <Button variant="primary" onClick={handleNext}>
                          Next question
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </Card>

            <Card title="Completed quizzes" padding="p-0">
              {resultsHistory.length === 0 ? (
                <EmptyState
                  title="No saved quiz attempts yet"
                  description="Submit an answer above to record your conceptual check score."
                />
              ) : (
                <div className="divide-y divide-line-subtle">
                  {resultsHistory.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 px-5 py-3.5 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-fg">{item.topic}</div>
                        <div className="text-xs text-fg-muted">
                          {new Date(item.created_at).toLocaleString()}
                        </div>
                      </div>
                      <Badge tone={item.passed ? "success" : "warning"}>
                        {item.score}/{item.total_questions} · {item.passed ? "Passed" : "Review"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
