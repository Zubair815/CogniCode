import { useNavigate } from "react-router-dom";
import { Users, AlertCircle, ArrowUpRight, TrendingUp, Sparkles, Map, ChevronRight } from "lucide-react";
import AppLayout from "../../components/layout/AppLayout.jsx";
import Button from "../../components/ui/Button.jsx";
import Badge from "../../components/ui/Badge.jsx";
import { ROUTES } from "../../constants/routes.js";

export default function InstructorDashboard() {
  const navigate = useNavigate();

  const students = [
    {
      id: "stu-1",
      name: "Hamza Tariq",
      rollNo: "BSEF23M512",
      score: 81,
      band: "High Risk",
      hintAvg: 3.8,
      quizAvg: "38%",
      sessions: 12,
    },
    {
      id: "stu-2",
      name: "Kiran Shafiq",
      rollNo: "BSEF23M519",
      score: 74,
      band: "High Risk",
      hintAvg: 3.2,
      quizAvg: "44%",
      sessions: 10,
    },
    {
      id: "stu-3",
      name: "Omar Yusuf",
      rollNo: "BSEF23M531",
      score: 63,
      band: "Moderate",
      hintAvg: 2.4,
      quizAvg: "61%",
      sessions: 8,
    },
    {
      id: "stu-4",
      name: "Aiman Sajid",
      rollNo: "BSEF23M508",
      score: 55,
      band: "Moderate",
      hintAvg: 2.1,
      quizAvg: "67%",
      sessions: 9,
    },
    {
      id: "stu-5",
      name: "Bilal Ahmad",
      rollNo: "BSEF23M544",
      score: 34,
      band: "Low Risk",
      hintAvg: 1.4,
      quizAvg: "82%",
      sessions: 11,
    },
  ];

  return (
    <AppLayout activeCds={0}>
      <div className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Cohort Analytics Dashboard
            </h1>
            <p className="text-xs md:text-sm text-[color:var(--text-muted)] mt-1">
              Data Structures & Algorithms · Fall 2026 Cohort Monitoring
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => navigate(ROUTES.INSTRUCTOR_HEATMAP)}
            >
              <Map size={16} className="mr-1.5" />
              Dependency Heatmap
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg2)]">
            <div className="text-2xl md:text-3xl font-black text-[color:var(--warning)]">
              48
            </div>
            <div className="text-xs font-semibold text-[color:var(--text-muted)] mt-1">
              Cohort Avg CDS
            </div>
            <div className="text-[10px] text-[color:var(--text-muted)] mt-2">
              Moderate Dependency
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg2)]">
            <div className="text-2xl md:text-3xl font-black text-[color:var(--danger)]">
              8
            </div>
            <div className="text-xs font-semibold text-[color:var(--text-muted)] mt-1">
              High Risk Students
            </div>
            <div className="text-[10px] text-[color:var(--danger)] mt-2 font-medium">
              Requires Socratic Intervention
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg2)]">
            <div className="text-2xl md:text-3xl font-black text-[color:var(--text)]">
              2.8
            </div>
            <div className="text-xs font-semibold text-[color:var(--text-muted)] mt-1">
              Avg Hint Depth
            </div>
            <div className="text-[10px] text-[color:var(--text-muted)] mt-2">
              Scale 1.0 (Nudge) to 5.0 (Code)
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg2)]">
            <div className="text-2xl md:text-3xl font-black text-[color:var(--success)]">
              68%
            </div>
            <div className="text-xs font-semibold text-[color:var(--text-muted)] mt-1">
              Avg Quiz Score
            </div>
            <div className="text-[10px] text-[color:var(--success)] mt-2 font-medium">
              ↑ 5% this month
            </div>
          </div>
        </div>

        {/* High Risk Banner */}
        <div className="p-4 rounded-2xl border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 flex items-start gap-3">
          <AlertCircle size={20} className="text-[color:var(--danger)] shrink-0 mt-0.5" />
          <div className="text-xs md:text-sm">
            <strong className="text-[color:var(--text)]">Cognitive Dependency Alert:</strong>{" "}
            Students in the high-risk band are reaching Level 4/5 hints prematurely without attempting
            their own code formulations. The Socratic engine is currently enforcing stricter attempt verification for these accounts.
          </div>
        </div>

        {/* Student Table */}
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg2)] overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[color:var(--border)] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[color:var(--text)]">
              Student Dependency Roster
            </h2>
            <span className="text-xs text-[color:var(--text-muted)]">
              Showing {students.length} students
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-muted)] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Student</th>
                  <th className="px-4 py-3.5">CDS Score</th>
                  <th className="px-4 py-3.5">Risk Band</th>
                  <th className="px-4 py-3.5">Avg Hint Level</th>
                  <th className="px-4 py-3.5">Quiz Avg</th>
                  <th className="px-5 py-3.5 text-right">Drilldown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {students.map((stu) => {
                  let bandColor = "text-[color:var(--success)] bg-[color:var(--success)]/10";
                  if (stu.score > 70) {
                    bandColor = "text-[color:var(--danger)] bg-[color:var(--danger)]/10";
                  } else if (stu.score > 40) {
                    bandColor = "text-[color:var(--warning)] bg-[color:var(--warning)]/10";
                  }

                  return (
                    <tr
                      key={stu.id}
                      onClick={() => navigate(ROUTES.INSTRUCTOR_DETAIL)}
                      className="hover:bg-[color:var(--surface)] cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="font-bold text-[color:var(--text)]">{stu.name}</div>
                        <div className="text-[11px] text-[color:var(--text-muted)] font-mono">
                          {stu.rollNo}
                        </div>
                      </td>
                      <td className="px-4 py-4 font-black text-sm">
                        <span
                          className={
                            stu.score > 70
                              ? "text-[color:var(--danger)]"
                              : stu.score > 40
                              ? "text-[color:var(--warning)]"
                              : "text-[color:var(--success)]"
                          }
                        >
                          {stu.score}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${bandColor}`}>
                          {stu.band}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-mono font-medium">{stu.hintAvg}</td>
                      <td className="px-4 py-4 font-mono font-medium">{stu.quizAvg}</td>
                      <td className="px-5 py-4 text-right">
                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                          Inspect <ChevronRight size={14} className="ml-1" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
