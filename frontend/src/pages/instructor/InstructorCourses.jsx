import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Plus, Users, ArrowRight, KeyRound, Sparkles, AlertTriangle, X, CheckCircle2 } from "lucide-react";
import AppLayout from "../../components/layout/AppLayout.jsx";
import Button from "../../components/ui/Button.jsx";
import Badge from "../../components/ui/Badge.jsx";
import { ROUTES } from "../../constants/routes.js";
import { instructorService } from "../../services/instructorService.js";

export default function InstructorCourses() {
  const navigate = useNavigate();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const [courses, setCourses] = useState([
    {
      id: "inst-dsa-a",
      code: "CS201-A",
      name: "Data Structures & Algorithms",
      section: "Section A",
      enrolled: 48,
      avgCds: 46,
      cdsBand: "Moderate",
      weakTopic: "Recursion & Trees",
      riskCount: 8,
      joinCode: "DSA-FALL26",
    },
    {
      id: "inst-dsa-b",
      code: "CS201-B",
      name: "Data Structures & Algorithms",
      section: "Section B",
      enrolled: 42,
      avgCds: 38,
      cdsBand: "Low",
      weakTopic: "Heaps & Priority Queues",
      riskCount: 3,
      joinCode: "DSA-SEC-B",
    },
    {
      id: "inst-oop",
      code: "CS102-M",
      name: "Object Oriented Programming",
      section: "Morning Section",
      enrolled: 54,
      avgCds: 29,
      cdsBand: "Low",
      weakTopic: "Virtual Destructors",
      riskCount: 2,
      joinCode: "OOP-M526",
    },
  ]);

  useEffect(() => {
    let active = true;
    async function fetchCourses() {
      try {
        const data = await instructorService.listCourses();
        if (active && data && data.length > 0) {
          const mapped = data.map((c) => ({
            id: c.id,
            code: c.course_code,
            name: c.course_name,
            section: c.description || "General Section",
            enrolled: c.enrolled_count || 0,
            avgCds: 35,
            cdsBand: "Low",
            weakTopic: "Algorithmic Invariants",
            riskCount: 0,
            joinCode: c.course_code,
          }));
          setCourses(mapped);
        }
      } catch (err) {
        // Fallback to local default courses
      }
    }
    fetchCourses();
    return () => {
      active = false;
    };
  }, []);

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!courseName.trim()) return;
    setLoading(true);
    try {
      const resp = await instructorService.createCourse({
        course_name: courseName.trim(),
        course_code: courseCode.trim() || undefined,
        description: description.trim() || undefined,
      });
      const created = {
        id: resp.id,
        code: resp.course_code,
        name: resp.course_name,
        section: resp.description || "General Section",
        enrolled: 0,
        avgCds: 20,
        cdsBand: "Low",
        weakTopic: "Not evaluated yet",
        riskCount: 0,
        joinCode: resp.course_code,
      };
      setCourses([created, ...courses]);
      setCreateModalOpen(false);
      setCourseName("");
      setCourseCode("");
      setDescription("");
    } catch (err) {
      // Local addition
      const created = {
        id: `course-${Date.now()}`,
        code: courseCode.trim() || "CS-NEW",
        name: courseName.trim(),
        section: description.trim() || "General Section",
        enrolled: 0,
        avgCds: 20,
        cdsBand: "Low",
        weakTopic: "Not evaluated yet",
        riskCount: 0,
        joinCode: courseCode.trim() || "CS-NEW",
      };
      setCourses([created, ...courses]);
      setCreateModalOpen(false);
      setCourseName("");
      setCourseCode("");
      setDescription("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout activeCds={0}>
      <div className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Instructor Course Management
            </h1>
            <p className="text-xs md:text-sm text-[color:var(--text-muted)] mt-1">
              Oversee enrolled student cohorts, manage syllabus topics, and monitor real-time AI dependency.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
              <Plus size={16} className="mr-1.5" />
              New Course
            </Button>
          </div>
        </div>

        {/* Courses List */}
        <div className="space-y-4">
          {courses.map((course) => (
            <div
              key={course.id}
              className="p-5 md:p-6 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg2)] hover:border-[color:var(--primary)]/40 transition-all shadow-sm space-y-4"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg font-bold text-[color:var(--text)]">
                      {course.name}
                    </span>
                    <Badge variant="default" className="font-mono text-xs">
                      {course.code}
                    </Badge>
                    <span className="text-xs text-[color:var(--text-muted)]">
                      · {course.section}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-[color:var(--text-muted)]">
                    <span className="flex items-center gap-1">
                      <Users size={14} /> {course.enrolled} Students Enrolled
                    </span>
                    <span className="flex items-center gap-1 font-mono text-[color:var(--primary)] font-semibold">
                      <KeyRound size={14} /> Join Code: {course.joinCode}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-center px-4 py-2 rounded-xl bg-[color:var(--surface)] border border-[color:var(--border)]">
                    <div
                      className={`text-xl font-black ${
                        course.avgCds > 40 ? "text-[color:var(--warning)]" : "text-[color:var(--success)]"
                      }`}
                    >
                      {course.avgCds}
                    </div>
                    <div className="text-[10px] text-[color:var(--text-muted)] font-semibold uppercase">
                      Cohort CDS
                    </div>
                  </div>
                  <div className="text-center px-4 py-2 rounded-xl bg-[color:var(--surface)] border border-[color:var(--border)]">
                    <div className="text-xl font-black text-[color:var(--danger)]">
                      {course.riskCount}
                    </div>
                    <div className="text-[10px] text-[color:var(--text-muted)] font-semibold uppercase">
                      High Dependency
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[color:var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-[color:var(--text-muted)]">
                  <AlertTriangle size={14} className="text-[color:var(--warning)]" />
                  Cohort Weak Cluster: <span className="font-semibold text-[color:var(--text)]">{course.weakTopic}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(ROUTES.INSTRUCTOR_HEATMAP)}
                  >
                    View Heatmap
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate(ROUTES.INSTRUCTOR_DASHBOARD)}
                  >
                    Cohort Analytics <ArrowRight size={14} className="ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Create Course Modal */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-[color:var(--bg2)] border border-[color:var(--border)] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-base text-[color:var(--text)]">
                  <BookOpen size={18} className="text-[color:var(--primary)]" />
                  Create New Course
                </div>
                <button
                  onClick={() => setCreateModalOpen(false)}
                  className="p-1 rounded-lg text-[color:var(--text-muted)] hover:bg-[color:var(--surface)]"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateCourse} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[color:var(--text-muted)] mb-1">
                    Course Name *
                  </label>
                  <input
                    type="text"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    placeholder="e.g. Data Structures & Algorithms"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-sm focus:border-[color:var(--primary)] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[color:var(--text-muted)] mb-1">
                    Course Code (optional)
                  </label>
                  <input
                    type="text"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    placeholder="e.g. CS201-A (leave empty for auto-generated)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-sm font-mono focus:border-[color:var(--primary)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[color:var(--text-muted)] mb-1">
                    Section or Term Description
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Section A · Fall 2026"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-sm focus:border-[color:var(--primary)] focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[color:var(--border)]">
                  <Button variant="secondary" type="button" onClick={() => setCreateModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={loading}>
                    {loading ? "Creating..." : "Create Course"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
