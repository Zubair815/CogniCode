import { useNavigate } from "react-router-dom";
import { ArrowLeft, Map, AlertCircle, Info, Sparkles } from "lucide-react";
import AppLayout from "../../components/layout/AppLayout.jsx";
import Button from "../../components/ui/Button.jsx";
import { ROUTES } from "../../constants/routes.js";

export default function Heatmap() {
  const navigate = useNavigate();

  const topics = [
    { name: "Recursion", quiz: "41%", hint: 3.7, highDep: "46%", status: "critical" },
    { name: "Linked Lists", quiz: "63%", hint: 2.3, highDep: "22%", status: "moderate" },
    { name: "Binary Trees", quiz: "58%", hint: 2.8, highDep: "28%", status: "moderate" },
    { name: "Sorting", quiz: "79%", hint: 1.4, highDep: "8%", status: "healthy" },
    { name: "Graphs (DFS/BFS)", quiz: "38%", hint: 3.9, highDep: "52%", status: "critical" },
    { name: "Stacks & Queues", quiz: "82%", hint: 1.2, highDep: "6%", status: "healthy" },
  ];

  const students = [
    { name: "Hamza Tariq", roll: "BSEF23M512", scores: ["Critical", "Moderate", "Critical", "Healthy", "Critical", "Healthy"] },
    { name: "Kiran Shafiq", roll: "BSEF23M519", scores: ["Critical", "Moderate", "Moderate", "Healthy", "Critical", "Healthy"] },
    { name: "Omar Yusuf", roll: "BSEF23M531", scores: ["Moderate", "Moderate", "Moderate", "Healthy", "Moderate", "Healthy"] },
    { name: "Aiman Sajid", roll: "BSEF23M508", scores: ["Moderate", "Healthy", "Moderate", "Healthy", "Moderate", "Healthy"] },
    { name: "Bilal Ahmad", roll: "BSEF23M544", scores: ["Healthy", "Healthy", "Healthy", "Healthy", "Moderate", "Healthy"] },
  ];

  const getHeatStyle = (status) => {
    if (status === "critical" || status === "Critical") {
      return "bg-[color:var(--danger)]/20 text-[color:var(--danger)] border-[color:var(--danger)]/30 font-bold";
    }
    if (status === "moderate" || status === "Moderate") {
      return "bg-[color:var(--warning)]/20 text-[color:var(--warning)] border-[color:var(--warning)]/30 font-bold";
    }
    return "bg-[color:var(--success)]/20 text-[color:var(--success)] border-[color:var(--success)]/30 font-bold";
  };

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

        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <Map className="text-[color:var(--primary)]" />
            Cognitive Dependency Heatmap
          </h1>
          <p className="text-xs md:text-sm text-[color:var(--text-muted)] mt-1">
            Visual topic-by-topic dependency distribution. Darker cells highlight topics where students rely heavily on Level 4/5 hints without grasping core invariants.
          </p>
        </div>

        {/* Legend */}
        <div className="p-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg2)] flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-semibold text-[color:var(--text)]">Risk Tiers:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[color:var(--success)]" />
              <span>Low Dependency (CDS 0–40)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[color:var(--warning)]" />
              <span>Moderate (CDS 41–70)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[color:var(--danger)]" />
              <span>High Dependency (CDS 71–100)</span>
            </div>
          </div>
          <span className="text-[color:var(--text-muted)]">Course: CS201 Fall 2026</span>
        </div>

        {/* Topic Aggregate Table */}
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg2)] overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[color:var(--border)]">
            <h2 className="text-sm font-bold">Topic Cohort Aggregate Matrix</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[color:var(--surface)] text-[color:var(--text-muted)] border-b border-[color:var(--border)] uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3">Topic</th>
                  <th className="px-4 py-3">Quiz Avg</th>
                  <th className="px-4 py-3">Avg Hint Depth</th>
                  <th className="px-4 py-3">% High Dependency</th>
                  <th className="px-5 py-3">Cohort Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {topics.map((t, idx) => (
                  <tr key={idx} className="hover:bg-[color:var(--surface)] transition-colors">
                    <td className="px-5 py-3.5 font-bold text-[color:var(--text)]">{t.name}</td>
                    <td className="px-4 py-3.5 font-mono">{t.quiz}</td>
                    <td className="px-4 py-3.5 font-mono">{t.hint} / 5.0</td>
                    <td className="px-4 py-3.5 font-mono font-bold">{t.highDep}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] border ${getHeatStyle(t.status)}`}>
                        {t.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Student-by-Topic Heat Grid */}
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg2)] p-5 space-y-4 shadow-sm">
          <h2 className="text-sm font-bold">Per-Student Topic Dependency Matrix</h2>
          <div className="overflow-x-auto">
            <div className="min-w-[600px] space-y-2 text-xs">
              <div className="grid grid-cols-7 gap-2 pb-2 border-b border-[color:var(--border)] font-semibold text-[color:var(--text-muted)]">
                <div>Student</div>
                {topics.map((t, i) => (
                  <div key={i} className="text-center truncate">{t.name}</div>
                ))}
              </div>

              {students.map((s, idx) => (
                <div key={idx} className="grid grid-cols-7 gap-2 items-center py-1.5 border-b border-[color:var(--border)]/50">
                  <div className="font-bold truncate text-[color:var(--text)]">
                    {s.name}
                  </div>
                  {s.scores.map((score, sIdx) => (
                    <div
                      key={sIdx}
                      className={`py-1.5 px-2 rounded-lg text-center border text-[10px] truncate ${getHeatStyle(score)}`}
                    >
                      {score}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
