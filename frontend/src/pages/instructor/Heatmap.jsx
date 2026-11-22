import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AppLayout from "../../components/layout/AppLayout.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Card from "../../components/ui/Card.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { ROUTES } from "../../constants/routes.js";
import { instructorService } from "../../services/instructorService.js";

export default function Heatmap() {
  const navigate = useNavigate();
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadHeatmap() {
      setLoading(true);
      try {
        const data = await instructorService.getTopicHeatmap();
        if (active && Array.isArray(data)) {
          const mapped = data.map((t) => ({
            name: t.topic,
            studentCount: t.student_count || 0,
            hint: ((t.average_cds || 0) / 20.0).toFixed(1),
            highDep: `${Math.round((t.solution_ratio || 0) * 100)}%`,
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
        if (active) setTopics([]);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadHeatmap();
    return () => {
      active = false;
    };
  }, []);

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
            Enrolled student sessions
          </span>
        </div>

        {/* Topic aggregate table */}
        <Card title="By topic" padding="p-0">
          {loading ? (
            <div className="px-5 py-8 text-center text-sm text-fg-secondary">
              Loading topic telemetry…
            </div>
          ) : topics.length === 0 ? (
            <EmptyState
              title="No topic telemetry yet"
              description="Topic dependency metrics appear once students enrolled in your courses begin tutoring sessions."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line-subtle bg-surface text-xs text-fg-secondary whitespace-nowrap">
                  <tr>
                    <th className="px-3.5 py-3 sm:px-5 font-medium">Topic</th>
                    <th className="px-3 py-3 sm:px-4 font-medium">Students</th>
                    <th className="px-3 py-3 sm:px-4 font-medium">Avg hint depth</th>
                    <th className="px-3 py-3 sm:px-4 font-medium">Solution asks</th>
                    <th className="px-3.5 py-3 sm:px-5 font-medium">Band</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle">
                  {topics.map((t) => (
                    <tr key={t.name} className="hover:bg-hover transition-colors whitespace-nowrap">
                      <td className="px-3.5 py-3 sm:px-5 sm:py-3.5 font-medium text-fg">{t.name}</td>
                      <td className="px-3 py-3 sm:px-4 sm:py-3.5 font-mono text-fg-secondary">{t.studentCount}</td>
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
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
