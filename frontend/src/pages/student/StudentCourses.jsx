import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Plus, Sparkles, CheckCircle2, ChevronRight, KeyRound, X } from "lucide-react";
import AppLayout from "../../components/layout/AppLayout.jsx";
import Button from "../../components/ui/Button.jsx";
import Card from "../../components/ui/Card.jsx";
import Badge from "../../components/ui/Badge.jsx";
import StartSessionModal from "../../components/chat/StartSessionModal.jsx";
import { chatRoute } from "../../constants/routes.js";

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
      status: "Active",
      topics: ["Recursion", "Binary Trees", "Sorting Algorithms", "Linked Lists"],
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
      status: "Active",
      topics: ["Polymorphism", "Inheritance", "Abstract Classes", "Design Patterns"],
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
      status: "Active",
      topics: ["Normalization", "SQL Joins", "Indexes", "Transactions"],
      nextTopic: "B-Tree Indexing & Query Plans",
    },
  ];

  const [courses, setCourses] = useState(initialCourses);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!courseCode.trim()) return;
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
      status: "Active",
      topics: ["General Curriculum"],
      nextTopic: "Introduction & Setup",
    };
    setCourses([...courses, newCourse]);
    setJoinSuccess(true);
    setTimeout(() => {
      setJoinSuccess(false);
      setJoinModalOpen(false);
      setCourseCode("");
    }, 1200);
  };

  return (
    <AppLayout activeCds={32}>
      <div className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              My Courses
            </h1>
            <p className="text-sm text-[color:var(--text-muted)] mt-1">
              Enrolled university courses with guided Socratic tutoring and dependency tracking.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setJoinModalOpen(true)}>
              <KeyRound size={16} className="mr-1.5" />
              Join with Code
            </Button>
            <Button variant="primary" onClick={() => setModalOpen(true)}>
              <Plus size={16} className="mr-1.5" />
              Start Session
            </Button>
          </div>
        </div>

        {/* Institution Info Banner */}
        <div className="p-4 rounded-xl border border-[color:var(--primary)]/20 bg-[color:var(--primary)]/5 flex items-start gap-3">
          <Sparkles size={18} className="text-[color:var(--primary)] shrink-0 mt-0.5" />
          <p className="text-xs md:text-sm text-[color:var(--text)]">
            Your university courses appear automatically from PUCIT SIS. Complete your weekly
            programming problem sets here to build cognitive independence before assessments.
          </p>
        </div>

        {/* Course Cards Grid */}
        <div className="space-y-4">
          {courses.map((course) => (
            <div
              key={course.id}
              className="p-5 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg2)] hover:border-[color:var(--primary)]/40 transition-all shadow-sm"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base md:text-lg font-bold text-[color:var(--text)]">
                      {course.name}
                    </span>
                    <Badge variant="default" className="text-[10px] font-mono">
                      {course.code}
                    </Badge>
                    <Badge variant="success" className="text-[10px]">
                      {course.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-[color:var(--text-muted)]">
                    Instructor: <strong className="text-[color:var(--text)]">{course.instructor}</strong> · {course.section} · {course.term}
                  </div>
                </div>

                {/* Metrics */}
                <div className="flex items-center gap-3">
                  <div className="text-center px-3.5 py-2 rounded-xl bg-[color:var(--surface)] border border-[color:var(--border)]">
                    <div className="text-lg font-black text-[color:var(--success)]">{course.cds}</div>
                    <div className="text-[10px] text-[color:var(--text-muted)] font-semibold uppercase">CDS</div>
                  </div>
                  <div className="text-center px-3.5 py-2 rounded-xl bg-[color:var(--surface)] border border-[color:var(--border)]">
                    <div className="text-lg font-black text-[color:var(--text)]">{course.sessions}</div>
                    <div className="text-[10px] text-[color:var(--text-muted)] font-semibold uppercase">Sessions</div>
                  </div>
                  <div className="text-center px-3.5 py-2 rounded-xl bg-[color:var(--surface)] border border-[color:var(--border)]">
                    <div className="text-lg font-black text-[color:var(--text)]">{course.quizAvg}</div>
                    <div className="text-[10px] text-[color:var(--text-muted)] font-semibold uppercase">Quiz Avg</div>
                  </div>
                </div>
              </div>

              {/* Topics / Next Step */}
              <div className="mt-4 pt-4 border-t border-[color:var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="text-[color:var(--text-muted)]">
                  Next Milestone: <span className="font-semibold text-[color:var(--text)]">{course.nextTopic}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setModalOpen(true)}
                  className="self-end sm:self-auto text-[color:var(--primary)] hover:text-[color:var(--primary-hi)]"
                >
                  Practice Topic <ChevronRight size={14} className="ml-1" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Join Course Modal */}
        {joinModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg2)] p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Join Course with Code</h3>
                <button
                  onClick={() => setJoinModalOpen(false)}
                  className="p-1 rounded-lg text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-xs text-[color:var(--text-muted)]">
                Enter the 6-character code provided by your instructor or teaching assistant.
              </p>
              {joinSuccess ? (
                <div className="p-3 rounded-xl bg-[color:var(--success)]/10 text-[color:var(--success)] text-sm flex items-center gap-2">
                  <CheckCircle2 size={16} /> Course joined successfully!
                </div>
              ) : (
                <form onSubmit={handleJoin} className="space-y-4">
                  <input
                    type="text"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    placeholder="e.g. CS201-A"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] font-mono text-sm uppercase tracking-wider focus:border-[color:var(--primary)] focus:outline-none"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setJoinModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button variant="primary" type="submit">
                      Join Course
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        <StartSessionModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onCreated={(session) => navigate(chatRoute(session.id))}
        />
      </div>
    </AppLayout>
  );
}
