import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Download } from "lucide-react";
import AppLayout from "../../components/layout/AppLayout.jsx";
import Alert from "../../components/ui/Alert.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Card from "../../components/ui/Card.jsx";
import { ROUTES } from "../../constants/routes.js";
import { instructorService } from "../../services/instructorService.js";

export default function InstructorDashboard() {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [exportError, setExportError] = useState("");
  const [stats, setStats] = useState({
    avgCds: 48,
    highRiskCount: 8,
    hintAvg: 2.8,
    quizAvg: "68%",
  });

  const [students, setStudents] = useState([
    {
      id: "stu-1",
      name: "Hamza Tariq",
      rollNo: "BSEF23M512",
      score: 81,
      band: "High",
      hintAvg: 3.8,
      quizAvg: "38%",
      sessions: 12,
    },
    {
      id: "stu-2",
      name: "Kiran Shafiq",
      rollNo: "BSEF23M519",
      score: 74,
      band: "High",
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
      band: "Low",
      hintAvg: 1.4,
      quizAvg: "82%",
      sessions: 11,
    },
  ]);

  useEffect(() => {
    let active = true;
    async function loadCohort() {
      try {
        const data = await instructorService.getCohortAnalytics();
        if (active && data) {
          setStats((prev) => ({
            ...prev,
            avgCds: data.average_cds || prev.avgCds,
            highRiskCount:
              data.high_risk_count !== undefined
                ? data.high_risk_count
                : prev.highRiskCount,
          }));

          if (data.high_risk_students && data.high_risk_students.length > 0) {
            const mapped = data.high_risk_students.map((s) => ({
              id: s.student_id,
              name: s.name,
              rollNo: s.email,
              score: Math.round(s.cds_score),
              band:
                s.risk_band === "high"
                  ? "High"
                  : s.risk_band === "moderate"
                  ? "Moderate"
                  : "Low",
              hintAvg: s.max_hint_level ? s.max_hint_level.toFixed(1) : "2.5",
              quizAvg: "45%",
              sessions: s.solution_requests || 1,
            }));
            setStudents(mapped);
          }
        }
      } catch {
        // Fallback to default cohort dataset
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
            <div className="mt-1 text-xs text-warning">Moderate</div>
          </div>

          <div className="rounded-xl border border-line-subtle bg-canvas p-4">
            <div className="text-xs text-fg-secondary">High-risk students</div>
            <div className="mt-1 text-2xl font-semibold text-danger">
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
            <div className="text-xs text-fg-secondary">Quiz average</div>
            <div className="mt-1 text-2xl font-semibold text-fg">
              {stats.quizAvg}
            </div>
            <div className="mt-1 text-xs text-success">+5% this month</div>
          </div>
        </div>

        <Card title="Students" padding="p-0">
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
                      onClick={() => navigate(ROUTES.INSTRUCTOR_DETAIL)}
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
        </Card>
      </div>
    </AppLayout>
  );
}
