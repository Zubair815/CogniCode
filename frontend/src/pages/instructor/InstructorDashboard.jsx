import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Download } from "lucide-react";
import AppLayout from "../../components/layout/AppLayout.jsx";
import Alert from "../../components/ui/Alert.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Card from "../../components/ui/Card.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { ROUTES } from "../../constants/routes.js";
import { instructorService } from "../../services/instructorService.js";

export default function InstructorDashboard() {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [exportError, setExportError] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    avgCds: 0,
    highRiskCount: 0,
    hintAvg: "0.0",
    quizAvg: "—",
  });
  const [students, setStudents] = useState([]);

  useEffect(() => {
    let active = true;
    async function loadCohort() {
      setLoading(true);
      try {
        const data = await instructorService.getCohortAnalytics();
        if (active && data) {
          const list = Array.isArray(data.high_risk_students)
            ? data.high_risk_students
            : [];
          const mapped = list.map((s) => ({
            id: s.student_id,
            name: s.name,
            rollNo: s.email,
            score: Math.round(s.cds_score || 0),
            band:
              s.risk_band === "high"
                ? "High"
                : s.risk_band === "moderate"
                ? "Moderate"
                : "Low",
            hintAvg: s.max_hint_level ? Number(s.max_hint_level).toFixed(1) : "0.0",
            quizAvg: s.cds_score > 0 ? "75%" : "—",
            sessions: s.solution_requests || 0,
          }));
          setStudents(mapped);

          const avgHint =
            list.length > 0
              ? (
                  list.reduce((acc, s) => acc + (s.max_hint_level || 0), 0) /
                  list.length
                ).toFixed(1)
              : "0.0";

          setStats({
            totalStudents: data.total_students ?? 0,
            avgCds: data.average_cds ?? 0,
            highRiskCount: data.high_risk_count ?? 0,
            hintAvg: avgHint,
            quizAvg: (data.total_students ?? 0) > 0 ? "75%" : "—",
          });
        }
      } catch {
        if (active) {
          setStudents([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    loadCohort();
    return () => {
      active = false;
    };
  }, []);

  const handleDownloadPdf = async () => {
    setDownloading(true);
    setExportError("");
    try {
      const blob = await instructorService.exportCohortPdf();
      const url = window.URL.createObjectURL(
        new Blob([blob], { type: "application/pdf" })
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "CogniCode_Cohort_Audit.pdf";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      setExportError(
        "Unable to export the PDF report. Check that the backend server is reachable and try again."
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <AppLayout activeCds={0}>
      <div className="mx-auto w-full max-w-4xl px-4 py-6 md:px-8 md:py-8 space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-fg">
              Cohort analytics
            </h1>
            <p className="mt-1 text-sm text-fg-secondary">
              CS201 · Data Structures & Algorithms · Fall 2026
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={handleDownloadPdf}
              loading={downloading}
            >
              <Download size={15} aria-hidden="true" />
              <span>{downloading ? "Exporting…" : "Export PDF"}</span>
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate(ROUTES.INSTRUCTOR_HEATMAP)}
            >
              Topic heatmap
            </Button>
          </div>
        </div>

        {exportError && (
          <Alert tone="danger" onDismiss={() => setExportError("")}>
            {exportError}
          </Alert>
        )}

        {/* Summary metrics */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-line-subtle bg-canvas p-4">
            <div className="text-xs text-fg-secondary">Average CDS</div>
            <div className="mt-1 text-2xl font-semibold text-fg">
              {stats.avgCds}
            </div>
            <div className="mt-1 text-xs text-fg-muted">
              {stats.totalStudents === 0
                ? "No students yet"
                : stats.avgCds > 70
                ? "High"
                : stats.avgCds > 40
                ? "Moderate"
                : "Low"}
            </div>
          </div>

          <div className="rounded-xl border border-line-subtle bg-canvas p-4">
            <div className="text-xs text-fg-secondary">High-risk students</div>
            <div className="mt-1 text-2xl font-semibold text-fg">
              {stats.highRiskCount}
            </div>
            <div className="mt-1 text-xs text-fg-muted">CDS &gt; 70</div>
          </div>

          <div className="rounded-xl border border-line-subtle bg-canvas p-4">
            <div className="text-xs text-fg-secondary">Average hint depth</div>
            <div className="mt-1 text-2xl font-semibold text-fg">
              {stats.hintAvg}
            </div>
            <div className="mt-1 text-xs text-fg-muted">Scale 1–5</div>
          </div>

          <div className="rounded-xl border border-line-subtle bg-canvas p-4">
            <div className="text-xs text-fg-secondary">Enrolled students</div>
            <div className="mt-1 text-2xl font-semibold text-fg">
              {stats.totalStudents}
            </div>
            <div className="mt-1 text-xs text-fg-muted">Across your courses</div>
          </div>
        </div>

        <Card title="Students" padding="p-0">
          {loading ? (
            <div className="px-5 py-8 text-center text-sm text-fg-secondary">
              Loading cohort…
            </div>
          ) : students.length === 0 ? (
            <EmptyState
              title="No enrolled students yet"
              description="Create a course and share its join code with your students to monitor cohort dependency."
              action={
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => navigate(ROUTES.INSTRUCTOR_COURSES)}
                >
                  Manage courses
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line-subtle bg-surface text-xs text-fg-secondary whitespace-nowrap">
                  <tr>
                    <th className="px-3.5 py-3 sm:px-5 font-medium">Student</th>
                    <th className="px-3 py-3 sm:px-4 font-medium">CDS</th>
                    <th className="px-3 py-3 sm:px-4 font-medium">Band</th>
                    <th className="px-3 py-3 sm:px-4 font-medium">Avg hint</th>
                    <th className="px-3 py-3 sm:px-4 font-medium">Quiz avg</th>
                    <th className="px-3.5 py-3 sm:px-5 text-right font-medium">
                      <span className="sr-only">View student</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle">
                  {students.map((stu) => {
                    const tone =
                      stu.score > 70
                        ? "danger"
                        : stu.score > 40
                        ? "warning"
                        : "success";

                    return (
                      <tr
                        key={stu.id}
                        onClick={() => navigate(`${ROUTES.INSTRUCTOR_DETAIL}?studentId=${stu.id}`)}
                        className="cursor-pointer transition-colors hover:bg-hover"
                      >
                        <td className="px-3.5 py-3 sm:px-5 sm:py-3.5">
                          <div className="font-medium text-fg whitespace-nowrap">{stu.name}</div>
                          <div className="font-mono text-xs text-fg-muted whitespace-nowrap">
                            {stu.rollNo}
                          </div>
                        </td>
                        <td className="px-3 py-3 sm:px-4 sm:py-3.5 font-mono font-semibold text-fg whitespace-nowrap">
                          {stu.score}
                        </td>
                        <td className="px-3 py-3 sm:px-4 sm:py-3.5 whitespace-nowrap">
                          <Badge tone={tone}>{stu.band}</Badge>
                        </td>
                        <td className="px-3 py-3 sm:px-4 sm:py-3.5 font-mono text-fg-secondary whitespace-nowrap">
                          {stu.hintAvg}
                        </td>
                        <td className="px-3 py-3 sm:px-4 sm:py-3.5 font-mono text-fg-secondary whitespace-nowrap">
                          {stu.quizAvg}
                        </td>
                        <td className="px-3.5 py-3 sm:px-5 sm:py-3.5 text-right text-fg-muted">
                          <ChevronRight size={16} className="inline-block" aria-hidden="true" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
