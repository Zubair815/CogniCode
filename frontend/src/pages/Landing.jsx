/**
 * Landing page.
 * Route: /
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUp, Moon, Sun } from "lucide-react";

import Logo from "../components/brand/Logo.jsx";
import Badge from "../components/ui/Badge.jsx";
import Button from "../components/ui/Button.jsx";
import IconButton from "../components/ui/IconButton.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { ROUTES } from "../constants/routes.js";

const PREVIEW_SESSIONS = [
  {
    id: "linked-list",
    topic: "Linked List Reversal",
    hintLevel: "1/5",
    cds: "28",
    turns: [
      {
        role: "student",
        text: "Can you write a function to reverse a singly linked list in Python?",
      },
      {
        role: "assistant",
        label: "Level 1 · Conceptual nudge",
        text: "Before writing the loop, picture two adjacent nodes A → B. If you redirect B.next to point back to A, what reference do you lose unless you save it first?",
      },
      {
        role: "student",
        text: "I would lose the reference to B's original next node. So I need `next_node = curr.next` before setting `curr.next = prev`.",
      },
      {
        role: "assistant",
        label: "Attempt verified",
        text: "Right. Saving `next_node = curr.next` preserves the rest of the list. In what order should `prev` and `curr` advance at the end of each step, and what should the function return when `curr` becomes `None`?",
      },
    ],
  },
  {
    id: "recursion",
    topic: "Recursion & Call Stack",
    hintLevel: "2/5",
    cds: "32",
    turns: [
      {
        role: "student",
        text: "My recursive binary search keeps hitting RecursionError on elements not in the array.",
      },
      {
        role: "assistant",
        label: "Termination check",
        text: "A `RecursionError` means the search interval never stops shrinking. Look at your base case and midpoint update: what happens to `low` and `high` when `low == high` and the target is not at `arr[mid]`?",
      },
      {
        role: "student",
        text: "I passed `mid` instead of `mid - 1` and `mid + 1`, so the interval stayed the same size when `low == high`.",
      },
      {
        role: "assistant",
        label: "Attempt verified",
        text: "Exactly. Because `arr[mid]` has already been checked, excluding `mid` via `mid - 1` or `mid + 1` shrinks the interval on every call and guarantees termination when `low > high`.",
      },
    ],
  },
];

const CORE_PILLARS = [
  {
    title: "Questions before code",
    description:
      "When a student asks for a finished solution without an initial attempt, CogniCode responds with a focused question about the underlying invariant.",
  },
  {
    title: "5-level progressive hints",
    description:
      "Guidance escalates from a conceptual nudge (Level 1) and invariant reminder (Level 2) to pseudocode (Level 3), partial templates (Level 4), and worked references (Level 5).",
  },
  {
    title: "Cognitive Dependency Score (CDS)",
    description:
      "A 0–100 score computed from six interaction signals: solution requests, hint depth, retry count, response interval, debugging attempts, and concept check accuracy.",
  },
  {
    title: "Course & cohort analytics",
    description:
      "Instructors track topic-level dependency heatmaps, review students relying heavily on Level 4–5 hints, and export PDF cohort audit reports.",
  },
];

const WORKFLOW_STEPS = [
  {
    step: "1",
    title: "Ask or paste an attempt",
    description:
      "Start a session on any programming topic and share your initial approach or code.",
  },
  {
    step: "2",
    title: "Work through the question",
    description:
      "The tutor inspects your code syntax and responds with a guiding question or Level 1–2 hint.",
  },
  {
    step: "3",
    title: "Pass the concept check",
    description:
      "Answer a quick conceptual check to access Level 3+ structured pseudocode when you get stuck.",
  },
  {
    step: "4",
    title: "Write a short reflection",
    description:
      "Note the core takeaway and the mistake to avoid next time at the end of the session.",
  },
];

export default function Landing() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [activePreviewId, setActivePreviewId] = useState(PREVIEW_SESSIONS[0].id);

  const activePreview =
    PREVIEW_SESSIONS.find((s) => s.id === activePreviewId) || PREVIEW_SESSIONS[0];

  const primaryDestination = user
    ? user.role === "instructor"
      ? ROUTES.INSTRUCTOR_DASHBOARD
      : "/student/chat/active"
    : ROUTES.REGISTER;

  return (
    <div className="min-h-screen bg-canvas text-fg">
      {/* Top navigation */}
      <header className="sticky top-0 z-header border-b border-line-subtle bg-canvas">
        <div className="mx-auto flex h-header max-w-5xl items-center justify-between px-4 md:px-6">
          <Link to={ROUTES.LANDING} className="inline-flex items-center">
            <Logo size={26} withWordmark />
          </Link>

          <nav
            aria-label="Primary"
            className="hidden items-center gap-6 text-sm text-fg-secondary md:flex"
          >
            <a href="#preview" className="hover:text-fg transition-colors">
              Preview
            </a>
            <a href="#how-it-works" className="hover:text-fg transition-colors">
              How it works
            </a>
            <a href="#courses" className="hover:text-fg transition-colors">
              For courses
            </a>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <IconButton
              label={theme === "dark" ? "Light mode" : "Dark mode"}
              size="sm"
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </IconButton>

            {user ? (
              <Link to={primaryDestination}>
                <Button size="sm" variant="primary" className="px-2.5 text-xs sm:px-3 sm:text-sm">
                  Open chat
                </Button>
              </Link>
            ) : (
              <>
                <Link to={ROUTES.LOGIN}>
                  <Button size="sm" variant="ghost" className="px-2 text-xs sm:px-3 sm:text-sm">
                    Sign in
                  </Button>
                </Link>
                <Link to={ROUTES.REGISTER}>
                  <Button size="sm" variant="primary" className="px-2.5 text-xs sm:px-3 sm:text-sm">
                    Create account
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-3xl px-4 pb-12 pt-14 text-center md:px-6 md:pb-16 md:pt-20">
          <h1 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl md:text-[44px] md:leading-[1.15]">
            Learn programming by reasoning through the problem, not copying the answer.
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-fg-secondary">
            CogniCode is a Socratic tutoring environment for computer science courses. It guides students with targeted questions and 5-level progressive hints while giving instructors visibility into class-wide reliance patterns.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link to={primaryDestination}>
              <Button size="lg" variant="primary">
                {user ? "Open chat" : "Create account"}
              </Button>
            </Link>
            {!user && (
              <Link to={ROUTES.LOGIN}>
                <Button size="lg" variant="secondary">
                  Sign in
                </Button>
              </Link>
            )}
          </div>
        </section>

        {/* Product Preview */}
        <section id="preview" className="mx-auto max-w-5xl px-4 pb-16 md:px-6 md:pb-20">
          <div className="overflow-hidden rounded-2xl border border-line bg-canvas shadow-popover">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-subtle bg-sidebar px-4 py-2.5 text-xs">
              <Logo size={20} withWordmark />

              <div className="flex flex-wrap items-center gap-1.5">
                {PREVIEW_SESSIONS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActivePreviewId(s.id)}
                    className={[
                      "rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-fast",
                      activePreview.id === s.id
                        ? "bg-active text-fg"
                        : "text-fg-secondary hover:bg-hover hover:text-fg",
                    ].join(" ")}
                  >
                    {s.topic}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[210px_1fr]">
              {/* Left sidebar preview */}
              <div className="hidden border-r border-line-subtle bg-sidebar p-3 md:flex md:flex-col md:justify-between">
                <div>
                  <div className="px-2 pb-1 text-xs font-medium text-fg-muted">
                    Recent
                  </div>
                  <div className="space-y-0.5">
                    {PREVIEW_SESSIONS.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setActivePreviewId(s.id)}
                        className={[
                          "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                          activePreview.id === s.id
                            ? "bg-active font-medium text-fg"
                            : "text-fg-secondary hover:bg-hover",
                        ].join(" ")}
                      >
                        <span className="truncate">{s.topic}</span>
                      </button>
                    ))}
                    <div className="truncate rounded-md px-2 py-1.5 text-xs text-fg-muted">
                      Binary Search Trees
                    </div>
                    <div className="truncate rounded-md px-2 py-1.5 text-xs text-fg-muted">
                      Dynamic Programming
                    </div>
                  </div>
                </div>

                <div className="border-t border-line-subtle pt-2.5">
                  <div className="flex items-center justify-between px-2 py-1 text-xs text-fg-secondary">
                    <span>Dependency score</span>
                    <Badge tone="success">CDS {activePreview.cds}</Badge>
                  </div>
                </div>
              </div>

              {/* Conversation column preview */}
              <div className="flex flex-col bg-canvas">
                <div className="flex items-center justify-between border-b border-line-subtle px-4 py-2.5">
                  <span className="text-sm font-semibold text-fg">
                    {activePreview.topic}
                  </span>
                  <span className="text-xs text-fg-muted">
                    Hint {activePreview.hintLevel}
                  </span>
                </div>

                <div className="space-y-5 p-4 md:p-6">
                  {activePreview.turns.map((turn, idx) =>
                    turn.role === "student" ? (
                      <div key={idx} className="flex justify-end">
                        <div className="max-w-[80%] rounded-2xl bg-surface px-4 py-2.5 text-sm leading-relaxed text-fg">
                          {turn.text}
                        </div>
                      </div>
                    ) : (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">
                          <Logo size={24} />
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="text-xs font-medium text-accent-fg">
                            {turn.label}
                          </div>
                          <p className="text-sm leading-relaxed text-fg">
                            {turn.text}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>

                <div className="border-t border-line-subtle px-4 py-3 md:px-6">
                  <div className="flex items-center justify-between rounded-3xl border border-line bg-surface px-4 py-2">
                    <span className="text-xs text-fg-muted">
                      Ask a question or paste your code attempt…
                    </span>
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-on">
                      <ArrowUp size={14} aria-hidden="true" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works & core pillars */}
        <section
          id="how-it-works"
          className="border-t border-line-subtle py-16 md:py-20"
        >
          <div className="mx-auto max-w-5xl px-4 md:px-6 space-y-14">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-fg">
                How a tutoring session works
              </h2>
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {WORKFLOW_STEPS.map((s) => (
                  <div key={s.step} className="border-t border-line-subtle pt-4">
                    <div className="font-mono text-xs text-fg-muted">
                      0{s.step}
                    </div>
                    <h3 className="mt-1.5 text-[15px] font-semibold text-fg">
                      {s.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-fg-secondary">
                      {s.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-fg">
                Built for programming coursework
              </h2>
              <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
                {CORE_PILLARS.map((item) => (
                  <div key={item.title} className="border-t border-line-subtle pt-4">
                    <h3 className="text-base font-semibold text-fg">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-fg-secondary">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Students & Instructors */}
        <section
          id="courses"
          className="border-t border-line-subtle bg-sidebar py-16 md:py-20"
        >
          <div className="mx-auto max-w-5xl px-4 md:px-6">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <div>
                <h2 className="text-lg font-semibold text-fg">For students</h2>
                <ul className="mt-3 space-y-2 text-sm text-fg-secondary">
                  <li>· Real-time Socratic chat with Python syntax and AST checks</li>
                  <li>· 5-level progressive hint ladder gated by your own attempts</li>
                  <li>· Personal Cognitive Dependency Score (CDS) and reflection journal</li>
                  <li>· Self-paced practice tracks and university course enrollment</li>
                </ul>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-fg">For instructors</h2>
                <ul className="mt-3 space-y-2 text-sm text-fg-secondary">
                  <li>· Course creation with 6-character student join codes</li>
                  <li>· Cohort roster highlighting high-reliance trends</li>
                  <li>· Topic-by-topic dependency heatmap across course modules</li>
                  <li>· PDF cohort audit export</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-line-subtle bg-canvas py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 text-xs text-fg-muted sm:flex-row md:px-6">
          <Logo size={20} withWordmark />
          <div>
            BSEF23-63 · PUCIT · Supervised by Sanam Ahmad
          </div>
        </div>
      </footer>
    </div>
  );
}
