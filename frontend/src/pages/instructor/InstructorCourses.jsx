import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import AppLayout from "../../components/layout/AppLayout.jsx";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import Modal from "../../components/ui/Modal.jsx";
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
            weakTopic: "Algorithmic Invariants",
            riskCount: 0,
            joinCode: c.course_code,
          }));
          setCourses(mapped);
        }
      } catch {
        // Keep default courses
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
        weakTopic: "Not evaluated yet",
        riskCount: 0,
        joinCode: resp.course_code,
      };
      setCourses([created, ...courses]);
    } catch {
      const created = {
        id: `course-${Date.now()}`,
        code: courseCode.trim() || "CS-NEW",
        name: courseName.trim(),
        section: description.trim() || "General Section",
        enrolled: 0,
        avgCds: 20,
        weakTopic: "Not evaluated yet",
        riskCount: 0,
        joinCode: courseCode.trim() || "CS-NEW",
      };
      setCourses([created, ...courses]);
    } finally {
      setLoading(false);
      setCreateModalOpen(false);
      setCourseName("");
      setCourseCode("");
      setDescription("");
    }
  };

  return (
    <AppLayout activeCds={0}>
      <div className="mx-auto w-full max-w-4xl px-4 py-6 md:px-8 md:py-8 space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            Courses
          </h1>
          <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
            <Plus size={16} aria-hidden="true" />
            <span>Create course</span>
          </Button>
        </div>

        <div className="divide-y divide-line-subtle rounded-xl border border-line-subtle bg-canvas">
          {courses.map((course) => (
            <div key={course.id} className="p-5 space-y-3">
              <div className="flex flex-col justify-between gap-2 md:flex-row md:items-baseline">
                <div>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h2 className="text-base font-semibold text-fg">
                      {course.name}
                    </h2>
                    <span className="font-mono text-xs text-fg-muted">
                      {course.code}
                    </span>
                    <span className="text-xs text-fg-secondary">
                      · {course.section}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-fg-secondary">
                    <span>{course.enrolled} students</span>
                    <span>
                      Join code: <strong className="font-mono text-fg">{course.joinCode}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-fg-secondary">
                  <span>
                    Avg CDS <strong className="font-semibold text-fg">{course.avgCds}</strong>
                  </span>
                  <span>
                    <strong className="font-semibold text-danger">{course.riskCount}</strong> high-risk
                  </span>
                </div>
              </div>

              <div className="flex flex-col justify-between gap-3 pt-1 text-xs sm:flex-row sm:items-center">
                <div className="text-fg-secondary">
                  Weak topic: <span className="font-medium text-fg">{course.weakTopic}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(ROUTES.INSTRUCTOR_HEATMAP)}
                  >
                    Heatmap
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate(ROUTES.INSTRUCTOR_DASHBOARD)}
                  >
                    Cohort analytics
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Modal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Create course"
        >
          <form onSubmit={handleCreateCourse}>
            <Input
              id="course-name"
              label="Course name"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="e.g., Data Structures & Algorithms"
              required
              autoFocus
            />

            <Input
              id="course-code"
              label="Course code (optional)"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              placeholder="CS201-A"
              className="font-mono"
            />

            <Input
              id="course-desc"
              label="Section or term"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Section A · Fall 2026"
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={loading}>
                {loading ? "Creating…" : "Create course"}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppLayout>
  );
}
