import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Plus } from "lucide-react";
import AppLayout from "../../components/layout/AppLayout.jsx";
import Alert from "../../components/ui/Alert.jsx";
import Button from "../../components/ui/Button.jsx";
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

  const initialCourses = [
    {
      id: "cs-dsa-1",
      code: "CS201",
      name: "Data Structures & Algorithms",
      section: "Section A",
      instructor: "Sanam Ahmad",
      term: "BSEF Fall 2026",
      cds: 32,
      sessions: 7,
      quizAvg: "74%",
      nextTopic: "Binary Search Trees Implementation",
    },
    {
      id: "cs-oop-1",
      code: "CS102",
      name: "Object Oriented Programming",
      section: "Section B",
      instructor: "Dr. Sanam Ahmad",
      term: "BSEF Fall 2026",
      cds: 28,
      sessions: 5,
      quizAvg: "81%",
      nextTopic: "Virtual Functions & Dynamic Binding",
    },
    {
      id: "cs-db-1",
      code: "CS304",
      name: "Database Systems",
      section: "Section A",
      instructor: "Prof. Tariq",
      term: "BSEF Fall 2026",
      cds: 19,
      sessions: 4,
      quizAvg: "88%",
      nextTopic: "B-Tree Indexing & Query Plans",
    },
  ];

  const [courses, setCourses] = useState(initialCourses);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!courseCode.trim()) return;
    try {
      const resp = await instructorService.joinCourse(courseCode.trim());
      const newCourse = {
        id: resp.course_id || `course-${Date.now()}`,
        code: resp.course_code || courseCode.toUpperCase(),
        name: resp.course_name || `Joined Course: ${courseCode.toUpperCase()}`,
        section: "Section A",
        instructor: "Course Instructor",
        term: "Fall 2026",
        cds: 25,
        sessions: 0,
        quizAvg: "—",
        nextTopic: "Introduction & Setup",
      };
      setCourses([newCourse, ...courses]);
    } catch {
      const newCourse = {
        id: `course-${Date.now()}`,
        code: courseCode.toUpperCase(),
        name: `Joined Course: ${courseCode.toUpperCase()}`,
        section: "Section A",
        instructor: "Course Instructor",
        term: "Fall 2026",
        cds: 25,
        sessions: 0,
        quizAvg: "—",
        nextTopic: "Introduction & Setup",
      };
      setCourses([newCourse, ...courses]);
    }

    setJoinSuccess(true);
    setTimeout(() => {
      setJoinSuccess(false);
      setJoinModalOpen(false);
      setCourseCode("");
    }, 1000);
  };

  return (
    <AppLayout activeCds={32}>
      <div className="mx-auto w-full max-w-4xl px-4 py-6 md:px-8 md:py-8 space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            Courses
          </h1>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setJoinModalOpen(true)}>
              Join with code
            </Button>
            <Button variant="primary" onClick={() => setModalOpen(true)}>
              <Plus size={16} aria-hidden="true" />
              <span>New session</span>
            </Button>
          </div>
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
                  </div>
                  <p className="mt-0.5 text-xs text-fg-secondary">
                    {course.instructor} · {course.section} · {course.term}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-fg-secondary">
                  <span>
                    CDS <strong className="font-semibold text-fg">{course.cds}</strong>
                  </span>
                  <span>
                    <strong className="font-semibold text-fg">{course.sessions}</strong> sessions
                  </span>
                  <span>
                    Quiz avg <strong className="font-semibold text-fg">{course.quizAvg}</strong>
                  </span>
                </div>
              </div>

              <div className="flex flex-col justify-between gap-2 pt-1 text-xs sm:flex-row sm:items-center">
                <div className="text-fg-secondary">
                  Next topic: <span className="font-medium text-fg">{course.nextTopic}</span>
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
          ))}
        </div>

        <Modal
          open={joinModalOpen}
          onClose={() => setJoinModalOpen(false)}
          title="Join course"
        >
          {joinSuccess ? (
            <Alert tone="success">Course joined.</Alert>
          ) : (
            <form onSubmit={handleJoin}>
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
