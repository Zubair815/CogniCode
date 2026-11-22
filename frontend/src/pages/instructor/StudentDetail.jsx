import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AppLayout from "../../components/layout/AppLayout.jsx";
import Alert from "../../components/ui/Alert.jsx";
import Avatar from "../../components/ui/Avatar.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Card from "../../components/ui/Card.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { ROUTES } from "../../constants/routes.js";
import { instructorService } from "../../services/instructorService.js";

export default function StudentDetail() {
  const navigate = useNavigate();
  const { studentId: paramId } = useParams();
  const [searchParams] = useSearchParams();
  const studentId = paramId || searchParams.get("studentId");

  const [reminded, setReminded] = useState(false);
  const [loading, setLoading] = useState(Boolean(studentId));
  const [student, setStudent] = useState(null);
  const [factors, setFactors] = useState([]);
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    let active = true;
    async function loadStudent() {
      if (!studentId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await instructorService.getStudentDetail(studentId);
        if (active && data) {
          setStudent({
            name: data.name,
            email: data.email,
            rollNo: data.email,
            score: Math.round(data.overall_cds || 0),
            riskBand:
              data.risk_band === "high"
                ? "High"
                : data.risk_band === "moderate"
                ? "Moderate"
                : "Low",
            hintAvg: ((data.signals?.hint_depth || 0) / 20).toFixed(1),
            sessionCount: data.sessions?.length || 0,
          });

          if (data.signals) {
            setFactors([
              {
                name: "Direct solution requests",
                value: Math.round(data.signals.solution_frequency || 0),
                desc: "Solution request frequency",
              },
              {
                name: "Average hint depth",
                value: Math.round(data.signals.hint_depth || 0),
                desc: "Scaffolding depth reached (Level 1–5)",
              },
              {
                name: "Interaction time gap",
                value: Math.round(data.signals.time_gap || 0),
                desc: "Rapid prompt frequency (<20s intervals)",
              },
              {
                name: "Code debugging attempts",
                value: Math.round(data.signals.debugging_attempts || 0),
                desc: "Independent debugging frequency",
              },
              {
                name: "Conceptual quiz score",
                value: Math.round(data.signals.quiz_performance || 0),
                desc: "Pre-hint conceptual understanding checks",
              },
              {
                name: "Attempt perseverance",
                value: Math.round(data.signals.retry_count || 0),
                desc: "Student code submission ratio",
              },
            ]);
          }

          if (Array.isArray(data.sessions)) {
            setSessions(
              data.sessions.map((s) => ({
                id: s.session_id,
                topic: s.topic,
                detail: `CDS ${s.dependency_score ?? 0} · Solution asks: ${
                  s.solution_requests ?? 0
                } · Reflection: ${s.reflection_stored ? "Yes" : "No"}`,
                band:
                  s.dependency_band === "high"
                    ? "High"
                    : s.dependency_band === "moderate"
                    ? "Moderate"
                    : "Low",
                tone:
                  s.dependency_band === "high"
                    ? "danger"
                    : s.dependency_band === "moderate"
                    ? "warning"
                    : "success",
              }))
            );
          }
        }
      } catch {
        if (active) setStudent(null);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadStudent();
    return () => {
      active = false;
    };
  }, [studentId]);

  const riskTone =
    (student?.score || 0) > 70
      ? "danger"
      : (student?.score || 0) > 40
      ? "warning"
      : "success";

  return (
    <AppLayout activeCds={0}>
      <div className="mx-auto w-full max-w-4xl px-4 py-6 md:px-8 md:py-8 space-y-6">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(ROUTES.INSTRUCTOR_DASHBOARD)}
            className="-ml-2"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            <span>Back to cohort</span>
          </Button>
        </div>

        {loading ? (
          <Card>
            <div className="py-8 text-center text-sm text-fg-secondary">
              Loading student profile…
            </div>
          </Card>
        ) : !student ? (
          <Card padding="p-0">
            <EmptyState
              title="No student selected"
              description="Select an enrolled student from the cohort analytics table to inspect their dependency signals."
              action={
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => navigate(ROUTES.INSTRUCTOR_DASHBOARD)}
                >
                  Back to cohort
                </Button>
              }
            />
          </Card>
        ) : (
          <>
            {reminded && (
              <Alert tone="success" onDismiss={() => setReminded(false)}>
                Practice recommendation sent to {student.name}.
              </Alert>
            )}

            {/* Student profile header */}
            <div className="flex flex-col justify-between gap-4 border-b border-line-subtle pb-6 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3.5">
                <Avatar name={student.name} size="lg" />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-semibold tracking-tight text-fg">
                      {student.name}
                    </h1>
                    <Badge tone={riskTone}>
                      CDS {student.score} · {student.riskBand}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-fg-secondary">
                    <span className="font-mono">{student.email}</span> · Hint avg {student.hintAvg}/5 · {student.sessionCount} sessions
                  </p>
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setReminded(true)}
              >
                Send practice reminder
              </Button>
            </div>

            {/* 6-Factor Breakdown */}
            <Card title="Dependency signals">
              <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
                {factors.map((f) => {
                  const barColor =
                    f.value > 70
                      ? "bg-danger"
                      : f.value > 40
                      ? "bg-warning"
                      : "bg-success";
                  return (
                    <div key={f.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-fg">{f.name}</span>
                        <span className="font-mono text-fg-secondary">
                          {f.value}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                        <div
                          className={`h-full rounded-full ${barColor}`}
                          style={{ width: `${f.value}%` }}
                        />
                      </div>
                      <p className="text-xs text-fg-muted">{f.desc}</p>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Recent sessions */}
            <Card title="Recent sessions" padding="p-0">
              {sessions.length === 0 ? (
                <EmptyState
                  title="No sessions yet"
                  description="This student has not started any tutoring sessions yet."
                />
              ) : (
                <div className="divide-y divide-line-subtle">
                  {sessions.map((sess) => (
                    <div
                      key={sess.id}
                      className="flex flex-col justify-between gap-2 px-5 py-3.5 sm:flex-row sm:items-center"
                    >
                      <div>
                        <div className="text-sm font-medium text-fg">{sess.topic}</div>
                        <div className="mt-0.5 text-xs text-fg-secondary">
                          {sess.detail}
                        </div>
                      </div>
                      <Badge tone={sess.tone}>{sess.band}</Badge>
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
