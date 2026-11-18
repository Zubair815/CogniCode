import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Plus, Users, ArrowRight, KeyRound, Sparkles, AlertTriangle } from "lucide-react";
import AppLayout from "../../components/layout/AppLayout.jsx";
import Button from "../../components/ui/Button.jsx";
import Badge from "../../components/ui/Badge.jsx";
import { ROUTES } from "../../constants/routes.js";

export default function InstructorCourses() {
  const navigate = useNavigate();
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
            <Button variant="primary" onClick={() => alert("Create Course dialog")}>
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
      </div>
    </AppLayout>
  );
}
