import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, AlertCircle, Clock, BookOpen, Sparkles, TrendingUp, ShieldAlert, Loader2 } from "lucide-react";
import AppLayout from "../../components/layout/AppLayout.jsx";
import Button from "../../components/ui/Button.jsx";
import { ROUTES } from "../../constants/routes.js";
import { instructorService } from "../../services/instructorService.js";

export default function StudentDetail() {
  const navigate = useNavigate();
  const { studentId } = useParams();

  const [student, setStudent] = useState({
    name: "Hamza Tariq",
    email: "hamza.tariq@pucit.edu.pk",
    rollNo: "BSEF23M512",
    score: 81,
    riskBand: "High Risk",
    hintAvg: 3.8,
    sessionCount: 12,
  });

  const [factors, setFactors] = useState([
    { name: "Direct Solution Requests", value: 88, band: "High Risk", desc: "Frequently requests code immediately" },
    { name: "Average Hint Depth", value: 76, band: "High Risk", desc: "Reaches Level 4/5 in 72% of queries" },
    { name: "Interaction Time Gap", value: 82, band: "High Risk", desc: "Average response time < 15 seconds (copy-pasting)" },
    { name: "Code Debugging Attempts", value: 24, band: "Critical", desc: "Rarely tests or modifies code before re-prompting" },
    { name: "Conceptual Quiz Score", value: 38, band: "Low", desc: "Fails pre-hint understanding checks" },
    { name: "Metacognitive Reflection", value: 40, band: "Moderate", desc: "Brief or generic post-session reflection notes" },
  ]);

  const [sessions, setSessions] = useState([
    {
      id: "sess-1",
      topic: "Recursion: Towers of Hanoi",
      detail: "14 interactions · Hint Level reached: 4 (Partial Code) · Attempt Detected: No",
      band: "High Dependency",
      bandColor: "text-[color:var(--danger)] bg-[color:var(--danger)]/10",
    },
    {
      id: "sess-2",
      topic: "Binary Search Tree Inversion",
      detail: "8 interactions · Hint Level reached: 2 (Concept Reminder) · Attempt Detected: Yes",
      band: "Low Dependency",
      bandColor: "text-[color:var(--success)] bg-[color:var(--success)]/10",
    },
  ]);

  useEffect(() => {
    let active = true;
    async function loadStudent() {
      if (!studentId) return;
      try {
        const data = await instructorService.getStudentDetail(studentId);
        if (active && data) {
          setStudent({
            name: data.name,
            email: data.email,
            rollNo: data.email,
            score: Math.round(data.overall_cds),
            riskBand: data.risk_band === "high" ? "High Risk" : data.risk_band === "moderate" ? "Moderate" : "Low Risk",
            hintAvg: ((data.signals?.hint_depth || 20) / 20).toFixed(1),
            sessionCount: data.sessions?.length || 0,
          });

          if (data.signals) {
            setFactors([
              { name: "Direct Solution Requests", value: Math.round(data.signals.solution_frequency), band: data.signals.solution_frequency > 50 ? "High Risk" : "Normal", desc: "S1: Solution request frequency" },
              { name: "Average Hint Depth", value: Math.round(data.signals.hint_depth), band: data.signals.hint_depth > 50 ? "High Risk" : "Normal", desc: "S2: Scaffolding depth reached (Level 1-5)" },
              { name: "Interaction Time Gap", value: Math.round(data.signals.time_gap), band: data.signals.time_gap > 50 ? "High Risk" : "Normal", desc: "S4: Rapid prompt frequency (<20s intervals)" },
              { name: "Code Debugging Attempts", value: Math.round(data.signals.debugging_attempts), band: data.signals.debugging_attempts > 50 ? "High Risk" : "Normal", desc: "S5: Absence of independent debugging" },
              { name: "Conceptual Quiz Score", value: Math.round(data.signals.quiz_performance), band: "Low", desc: "S6: Pre-hint conceptual understanding checks" },
              { name: "Attempt Perseverance", value: Math.round(data.signals.retry_count), band: "Normal", desc: "S3: Student code submission ratio" },
            ]);
          }

          if (data.sessions && data.sessions.length > 0) {
            setSessions(
              data.sessions.map((s) => ({
                id: s.session_id,
                topic: s.topic,
                detail: `CDS: ${s.dependency_score} · Solution asks: ${s.solution_requests} · Reflection: ${s.reflection_stored ? "Yes" : "No"}`,
                band: s.dependency_band === "high" ? "High Dependency" : s.dependency_band === "moderate" ? "Moderate Dependency" : "Low Dependency",
                bandColor: s.dependency_band === "high" ? "text-[color:var(--danger)] bg-[color:var(--danger)]/10" : "text-[color:var(--success)] bg-[color:var(--success)]/10",
              }))
            );
          }
        }
      } catch (err) {
        // Fallback to sample data
      }
    }
    loadStudent();
    return () => {
      active = false;
    };
  }, [studentId]);

  return (
    <AppLayout activeCds={0}>
      <div className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(ROUTES.INSTRUCTOR_DASHBOARD)}
          className="text-xs -ml-2 mb-2"
        >
          <ArrowLeft size={14} className="mr-1.5" /> Back to Cohort Dashboard
        </Button>

        {/* Profile Card */}
        <div className="p-6 rounded-3xl border border-[color:var(--border)] bg-[color:var(--bg2)] flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[color:var(--danger)]/15 text-[color:var(--danger)] flex items-center justify-center font-black text-2xl shrink-0">
              {student.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">
                {student.name}
              </h1>
              <p className="text-xs text-[color:var(--text-muted)] font-mono mt-0.5">
                {student.email}
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                <span className={`px-2.5 py-0.5 rounded-full font-bold ${
                  student.score > 70
                    ? "bg-[color:var(--danger)]/10 text-[color:var(--danger)]"
                    : student.score > 40
                    ? "bg-[color:var(--warning)]/10 text-[color:var(--warning)]"
                    : "bg-[color:var(--success)]/10 text-[color:var(--success)]"
                }`}>
                  Score: {student.score} — {student.riskBand}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-[color:var(--warning)]/10 text-[color:var(--warning)] font-bold">
                  Hint Avg: {student.hintAvg} / 5
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-[color:var(--surface-2)] text-[color:var(--text)] font-semibold">
                  {student.sessionCount} Sessions Recorded
                </span>
              </div>
            </div>
          </div>

          <div className="flex sm:flex-col items-end gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => alert("Notification sent to student to review recursion fundamentals.")}
            >
              Recommend Remediation
            </Button>
          </div>
        </div>

        {/* 6-Factor Cognitive Breakdown */}
        <div className="p-6 rounded-3xl border border-[color:var(--border)] bg-[color:var(--bg2)] space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">Cognitive Dependency Indicators (BR-08)</h2>
            <span className="text-xs text-[color:var(--text-muted)]">Real-time telemetry</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {factors.map((f, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[color:var(--text)]">{f.name}</span>
                  <span
                    className={`font-black ${
                      f.value > 70
                        ? "text-[color:var(--danger)]"
                        : f.value > 40
                        ? "text-[color:var(--warning)]"
                        : "text-[color:var(--success)]"
                    }`}
                  >
                    {f.value}%
                  </span>
                </div>
                <div className="w-full bg-[color:var(--surface-2)] h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      f.value > 70
                        ? "bg-[color:var(--danger)]"
                        : f.value > 40
                        ? "bg-[color:var(--warning)]"
                        : "bg-[color:var(--success)]"
                    }`}
                    style={{ width: `${f.value}%` }}
                  />
                </div>
                <p className="text-[11px] text-[color:var(--text-muted)]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Session Logs */}
        <div className="p-6 rounded-3xl border border-[color:var(--border)] bg-[color:var(--bg2)] space-y-4 shadow-sm">
          <h2 className="text-base font-bold">Recent Socratic Dialogue Sessions</h2>
          <div className="space-y-3">
            {sessions.map((sess) => (
              <div
                key={sess.id}
                className="p-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-bold text-[color:var(--text)]">{sess.topic}</div>
                  <div className="text-[color:var(--text-muted)] mt-1">{sess.detail}</div>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded self-start sm:self-auto ${sess.bandColor}`}>
                  {sess.band}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
