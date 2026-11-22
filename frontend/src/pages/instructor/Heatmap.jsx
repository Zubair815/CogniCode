import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AppLayout from "../../components/layout/AppLayout.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Card from "../../components/ui/Card.jsx";
import { ROUTES } from "../../constants/routes.js";
import { instructorService } from "../../services/instructorService.js";

export default function Heatmap() {
  const navigate = useNavigate();

  const [topics, setTopics] = useState([
    { name: "Recursion", quiz: "41%", hint: 3.7, highDep: "46%", status: "critical" },
    { name: "Linked Lists", quiz: "63%", hint: 2.3, highDep: "22%", status: "moderate" },
    { name: "Binary Trees", quiz: "58%", hint: 2.8, highDep: "28%", status: "moderate" },
    { name: "Sorting", quiz: "79%", hint: 1.4, highDep: "8%", status: "healthy" },
    { name: "Graphs (DFS/BFS)", quiz: "38%", hint: 3.9, highDep: "52%", status: "critical" },
    { name: "Stacks & Queues", quiz: "82%", hint: 1.2, highDep: "6%", status: "healthy" },
  ]);

  useEffect(() => {
    let active = true;
    async function loadHeatmap() {
      try {
        const data = await instructorService.getTopicHeatmap();
        if (active && data && data.length > 0) {
          const mapped = data.map((t) => ({
            name: t.topic,
            quiz: "65%",
            hint: (t.average_cds / 20.0).toFixed(1),
            highDep: `${Math.round(t.solution_ratio * 100)}%`,
            status:
              t.risk_band === "high"
                ? "critical"
                : t.risk_band === "moderate"
                ? "moderate"
                : "healthy",
          }));
          setTopics(mapped);
        }
      } catch {
        // Keep default heatmap matrix
      }
    }
    loadHeatmap();
    return () => {
      active = false;
    };
  }, []);

  const students = [
    {
      name: "Hamza Tariq",
      scores: ["Critical", "Moderate", "Critical", "Healthy", "Critical", "Healthy"],
    },
    {
      name: "Kiran Shafiq",
      scores: ["Critical", "Moderate", "Moderate", "Healthy", "Critical", "Healthy"],
    },
    {
      name: "Omar Yusuf",
      scores: ["Moderate", "Moderate", "Moderate", "Healthy", "Moderate", "Healthy"],
    },
    {
      name: "Aiman Sajid",
      scores: ["Moderate", "Healthy", "Moderate", "Healthy", "Moderate", "Healthy"],
    },
    {
      name: "Bilal Ahmad",
      scores: ["Healthy", "Healthy", "Healthy", "Healthy", "Moderate", "Healthy"],
    },
  ];

  const statusTone = (status) => {
    const s = String(status).toLowerCase();
    if (s === "critical") return "danger";
    if (s === "moderate") return "warning";
    return "success";
  };

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

        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-baseline">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            Topic heatmap
          </h1>
          <span className="text-xs text-fg-muted">
            CS201 · Data Structures & Algorithms · Fall 2026
          </span>
        </div>

        {/* Topic aggregate table */}
        <Card title="By topic" padding="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line-subtle bg-surface text-xs text-fg-secondary whitespace-nowrap">
                <tr>
                  <th className="px-3.5 py-3 sm:px-5 font-medium">Topic</th>
                  <th className="px-3 py-3 sm:px-4 font-medium">Quiz avg</th>
                  <th className="px-3 py-3 sm:px-4 font-medium">Avg hint depth</th>
                  <th className="px-3 py-3 sm:px-4 font-medium">High dependency</th>
                  <th className="px-3.5 py-3 sm:px-5 font-medium">Band</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {topics.map((t) => (
                  <tr key={t.name} className="hover:bg-hover transition-colors whitespace-nowrap">
                    <td className="px-3.5 py-3 sm:px-5 sm:py-3.5 font-medium text-fg">{t.name}</td>
                    <td className="px-3 py-3 sm:px-4 sm:py-3.5 font-mono text-fg-secondary">{t.quiz}</td>
                    <td className="px-3 py-3 sm:px-4 sm:py-3.5 font-mono text-fg-secondary">
                      {t.hint} / 5.0
                    </td>
                    <td className="px-3 py-3 sm:px-4 sm:py-3.5 font-mono font-medium text-fg">
                      {t.highDep}
                    </td>
                    <td className="px-3.5 py-3 sm:px-5 sm:py-3.5">
                      <Badge tone={statusTone(t.status)}>
                        {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Per-student matrix */}
        <Card title="By student" padding="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line-subtle bg-surface text-xs text-fg-secondary whitespace-nowrap">
                <tr>
                  <th className="px-3.5 py-3 sm:px-5 font-medium">Student</th>
                  {topics.map((t) => (
                    <th key={t.name} className="px-2.5 py-3 sm:px-3 text-center font-medium">
                      {t.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {students.map((s) => (
                  <tr key={s.name} className="hover:bg-hover transition-colors">
                    <td className="px-3.5 py-3 sm:px-5 font-medium text-fg whitespace-nowrap">
                      {s.name}
                    </td>
                    {s.scores.map((score, sIdx) => (
                      <td key={sIdx} className="px-2.5 py-3 sm:px-3 text-center whitespace-nowrap">
                        <Badge tone={statusTone(score)}>{score}</Badge>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
