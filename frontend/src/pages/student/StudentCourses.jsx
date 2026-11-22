import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Plus } from "lucide-react";
import AppLayout from "../../components/layout/AppLayout.jsx";
import Alert from "../../components/ui/Alert.jsx";
import Button from "../../components/ui/Button.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Input from "../../components/ui/Input.jsx";
import Modal from "../../components/ui/Modal.jsx";
import StartSessionModal from "../../components/chat/StartSessionModal.jsx";
import { chatRoute } from "../../constants/routes.js";
import { instructorService } from "../../services/instructorService.js";

export default function StudentCourses() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [courseCode, setCourseCode] = useState("");
  const [joinSuccess, setJoinSuccess] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadEnrolledCourses() {
      setLoading(true);
      try {
        const data = await instructorService.listStudentCourses();
        if (active && Array.isArray(data)) {
          setCourses(
            data.map((c) => ({
              id: c.id,
              code: c.course_code,
              name: c.course_name,
              section: c.description || "General Section",
              enrolledCount: c.enrolled_count || 1,
            }))
          );
        }
      } catch {
        if (active) setCourses([]);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadEnrolledCourses();
    return () => {
      active = false;
    };
  }, []);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!courseCode.trim()) return;
    setJoinError("");
    try {
      const resp = await instructorService.joinCourse(courseCode.trim());
      const newCourse = {
        id: resp.course_id,
        code: resp.course_code || courseCode.trim().toUpperCase(),
        name: resp.course_name,
        section: "Enrolled",
        enrolledCount: 1,
      };
      setCourses((prev) => {
        if (prev.some((c) => c.id === newCourse.id || c.code === newCourse.code)) {
          return prev;
        }
        return [newCourse, ...prev];
      });
      setJoinSuccess(true);
      setTimeout(() => {
        setJoinSuccess(false);
        setJoinModalOpen(false);
        setCourseCode("");
      }, 900);
    } catch (err) {
      setJoinError(err.message || "Course code not found. Please check with your instructor.");
    }
  };

  return (
    <AppLayout activeCds={0}>
      <div className="mx-auto w-full max-w-4xl px-4 py-6 md:px-8 md:py-8 space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            Courses
          </h1>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setJoinError("");
                setJoinModalOpen(true);
              }}
            >
              Join with code
            </Button>
            <Button variant="primary" onClick={() => setModalOpen(true)}>
              <Plus size={16} aria-hidden="true" />
              <span>New session</span>
            </Button>
          </div>
        </div>

        <div className="divide-y divide-line-subtle rounded-xl border border-line-subtle bg-canvas">
          {loading ? (
            <div className="px-5 py-8 text-center text-sm text-fg-secondary">
              Loading courses…
            </div>
          ) : courses.length === 0 ? (
            <EmptyState
              title="No courses joined yet"
              description="Enter an enrollment code from your instructor to join a course."
              action={
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setJoinError("");
                    setJoinModalOpen(true);
                  }}
                >
                  Join with code
                </Button>
              }
            />
          ) : (
            courses.map((course) => (
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
                    </div>
                    <p className="mt-0.5 text-xs text-fg-secondary">
                      {course.section}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setModalOpen(true)}
                    className="self-end sm:self-auto -mr-2"
                  >
                    <span>Practice</span>
                    <ChevronRight size={14} aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <Modal
          open={joinModalOpen}
          onClose={() => setJoinModalOpen(false)}
          title="Join course"
        >
          {joinSuccess ? (
            <Alert tone="success">Course joined.</Alert>
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              {joinError && <Alert tone="danger">{joinError}</Alert>}
              <Input
                id="course-code"
                label="Enrollment code"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                placeholder="CS201-A"
                className="font-mono uppercase"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setJoinModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Join
                </Button>
              </div>
            </form>
          )}
        </Modal>

        <StartSessionModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onCreated={(session) => navigate(chatRoute(session.id))}
        />
      </div>
    </AppLayout>
  );
}
