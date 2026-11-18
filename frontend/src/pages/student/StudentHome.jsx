import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare,
  LayoutDashboard,
  FileEdit,
  TestTube2,
  BookOpen,
  ArrowRight,
  Flame,
  Award,
  Zap,
} from "lucide-react";
import AppLayout from "../../components/layout/AppLayout.jsx";
import Button from "../../components/ui/Button.jsx";
import StartSessionModal from "../../components/chat/StartSessionModal.jsx";
import { ROUTES, chatRoute } from "../../constants/routes.js";

export default function StudentHome() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);

  const tracks = [
    {
      title: "Data Structures Mastery",
      level: "Intermediate",
      progress: 68,
      topics: ["Trees", "Heaps", "Graphs"],
      active: true,
    },
    {
      title: "Algorithms & Complexity",
      level: "Advanced",
      progress: 42,
      topics: ["Dynamic Programming", "Greedy", "Backtracking"],
      active: true,
    },
    {
      title: "System Design & Memory",
      level: "Introductory",
      progress: 15,
      topics: ["Pointers", "Memory Leaks", "Concurrency"],
      active: false,
    },
  ];

  return (
    <AppLayout activeCds={32}>
      <div className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-8">
        {/* Hero Welcome */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-[color:var(--primary)]/15 via-[color:var(--violet)]/15 to-transparent border border-[color:var(--primary)]/20">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[color:var(--primary)]">
              <Zap size={14} /> Self-Paced Learning Track
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Ready to code with CogniCode?
            </h1>
            <p className="text-xs md:text-sm text-[color:var(--text-muted)] max-w-xl">
              Solve algorithmic problems with a Socratic AI coach that helps you discover
              solutions on your own through guided inquiry and progressive hints.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[color:var(--surface-2)] border border-[color:var(--border)]">
              <Flame size={20} className="text-[color:var(--warning)]" />
              <div>
                <div className="text-sm font-black">5 Days</div>
                <div className="text-[10px] text-[color:var(--text-muted)] font-semibold">Current Streak</div>
              </div>
            </div>
            <Button variant="primary" onClick={() => setModalOpen(true)}>
              Start Tutoring
            </Button>
          </div>
        </div>

        {/* Feature Cards Grid (Matching Figma Prototype #shome) */}
        <div>
          <h2 className="text-lg font-bold mb-4">Explore Learning Modes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Primary Chat Card */}
            <div
              onClick={() => setModalOpen(true)}
              className="md:col-span-2 p-6 rounded-2xl bg-gradient-to-r from-[color:var(--primary)] to-[color:var(--violet)] text-white cursor-pointer hover:shadow-lg hover:shadow-[color:var(--primary)]/20 transition-all flex items-center justify-between group"
            >
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white">
                  <MessageSquare size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Socratic Tutor Chat</h3>
                  <p className="text-xs text-white/80 mt-1 max-w-md">
                    Ask programming questions · Receive Socratic guided nudges · Level 1–5 hints · No direct solution spoiler policy
                  </p>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                <ArrowRight size={20} />
              </div>
            </div>

            {/* Dashboard Card */}
            <div
              onClick={() => navigate(ROUTES.STUDENT_DASHBOARD)}
              className="p-5 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg2)] hover:border-[color:var(--primary)]/50 cursor-pointer transition-all flex flex-col justify-between"
            >
              <div className="w-10 h-10 rounded-xl bg-[color:var(--surface-2)] border border-[color:var(--border)] flex items-center justify-center text-[color:var(--primary)] mb-3">
                <LayoutDashboard size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[color:var(--text)]">Cognitive Dashboard</h3>
                <p className="text-xs text-[color:var(--text-muted)] mt-1">
                  Track your Cognitive Dependency Score (CDS) and see weak topic trends.
                </p>
              </div>
            </div>

            {/* Reflections Card */}
            <div
              onClick={() => navigate(ROUTES.STUDENT_REFLECTIONS)}
              className="p-5 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg2)] hover:border-[color:var(--primary)]/50 cursor-pointer transition-all flex flex-col justify-between"
            >
              <div className="w-10 h-10 rounded-xl bg-[color:var(--surface-2)] border border-[color:var(--border)] flex items-center justify-center text-[color:var(--violet)] mb-3">
                <FileEdit size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[color:var(--text)]">Learning Reflections</h3>
                <p className="text-xs text-[color:var(--text-muted)] mt-1">
                  Review post-session takeaways and track computational thinking growth.
                </p>
              </div>
            </div>

            {/* Quizzes Card */}
            <div
              onClick={() => navigate(ROUTES.STUDENT_QUIZ)}
              className="p-5 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg2)] hover:border-[color:var(--primary)]/50 cursor-pointer transition-all flex flex-col justify-between"
            >
              <div className="w-10 h-10 rounded-xl bg-[color:var(--surface-2)] border border-[color:var(--border)] flex items-center justify-center text-[color:var(--warning)] mb-3">
                <TestTube2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[color:var(--text)]">Understanding Checks</h3>
                <p className="text-xs text-[color:var(--text-muted)] mt-1">
                  Answer conceptual code quizzes before receiving Level 3+ assistance.
                </p>
              </div>
            </div>

            {/* University Courses Card */}
            <div
              onClick={() => navigate(ROUTES.STUDENT_COURSES)}
              className="p-5 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg2)] hover:border-[color:var(--primary)]/50 cursor-pointer transition-all flex flex-col justify-between"
            >
              <div className="w-10 h-10 rounded-xl bg-[color:var(--surface-2)] border border-[color:var(--border)] flex items-center justify-center text-[color:var(--success)] mb-3">
                <BookOpen size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[color:var(--text)]">Institution Courses</h3>
                <p className="text-xs text-[color:var(--text-muted)] mt-1">
                  Access official coursework, section assignments, and syllabus modules.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Learning Tracks */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Independent Curriculum Tracks</h2>
          <div className="space-y-3">
            {tracks.map((track, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg2)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[color:var(--text)]">{track.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[color:var(--surface-2)] text-[color:var(--text-muted)] font-medium">
                      {track.level}
                    </span>
                  </div>
                  <div className="text-xs text-[color:var(--text-muted)] mt-1">
                    Key Topics: {track.topics.join(" · ")}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-32 bg-[color:var(--surface)] h-2 rounded-full overflow-hidden border border-[color:var(--border)]">
                    <div
                      className="h-full bg-gradient-to-r from-[color:var(--primary)] to-[color:var(--violet)] rounded-full"
                      style={{ width: `${track.progress}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono font-bold w-10 text-right">{track.progress}%</span>
                  <Button variant="ghost" size="sm" onClick={() => setModalOpen(true)}>
                    Resume
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <StartSessionModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onCreated={(session) => navigate(chatRoute(session.id))}
        />
      </div>
    </AppLayout>
  );
}
