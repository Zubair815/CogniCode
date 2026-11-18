/**
 * Landing page.
 *
 * Route: /
 *
 * Public marketing page explaining CogniCode's core value
 * proposition, features, and how it works. Uses scroll-triggered
 * animations, animated SVG illustrations, and the frozen brand
 * color scheme.
 *
 * Sections:
 *   1. Sticky navbar
 *   2. Hero
 *   3. The Problem
 *   4. Core Features
 *   5. How It Works
 *   6. For Students / For Instructors
 *   7. Stats
 *   8. Final CTA
 *   9. Footer
 *
 * Created: 10/10/2026
 */

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  Eye,
  Gauge,
  GraduationCap,
  Layers,
  LineChart,
  Moon,
  NotebookPen,
  Presentation,
  Sparkles,
  Sun,
  Target,
  TrendingDown,
  Users,
} from "lucide-react";

import Logo from "../components/brand/Logo.jsx";
import Button from "../components/ui/Button.jsx";
import Badge from "../components/ui/Badge.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { ROUTES } from "../constants/routes.js";


// =============================================================================
// HOOKS
// =============================================================================
/**
 * useReveal
 * ---------
 * Adds a scroll-triggered reveal to any element. When the element
 * enters the viewport, the `revealed` flag flips to true and the
 * consumer applies the appropriate CSS class.
 */
function useReveal(options = { rootMargin: "0px 0px -80px 0px", threshold: 0.1 }) {
  const ref = useRef(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setRevealed(true);
        observer.disconnect();
      }
    }, options);

    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ref, revealed };
}


/**
 * Reveal
 * ------
 * Wrapper component that applies fade-up animation when scrolled into view.
 */
function Reveal({ children, delay = 0, className = "" }) {
  const { ref, revealed } = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}


// =============================================================================
// NAVBAR
// =============================================================================
function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const dashboardPath =
    user?.role === "instructor"
      ? ROUTES.INSTRUCTOR_DASHBOARD
      : ROUTES.STUDENT_DASHBOARD;

  return (
    <header
      className="sticky top-0 z-50 bg-[color:var(--bg)]"
      // No border, no shadow — navbar blends with the body.
    >
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-3">
        <Link to={ROUTES.LANDING} className="shrink-0">
          <Logo size={30} withWordmark />
        </Link>

        {/* Center links (hidden on small screens) */}
        <nav className="hidden lg:flex items-center gap-1 text-sm">
          <a
            href="#features"
            className="px-3 py-2 rounded-lg text-[color:var(--text-muted)] hover:text-[color:var(--text)] hover:bg-[color:var(--surface-2)] transition-colors"
          >
            Features
          </a>
          <a
            href="#how"
            className="px-3 py-2 rounded-lg text-[color:var(--text-muted)] hover:text-[color:var(--text)] hover:bg-[color:var(--surface-2)] transition-colors"
          >
            How it Works
          </a>
          <a
            href="#for"
            className="px-3 py-2 rounded-lg text-[color:var(--text-muted)] hover:text-[color:var(--text)] hover:bg-[color:var(--surface-2)] transition-colors"
          >
            For You
          </a>
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-1.5 md:gap-2">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[color:var(--text-muted)] hover:text-[color:var(--text)] hover:bg-[color:var(--surface-2)] transition-colors"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {user ? (
            <Link to={dashboardPath}>
              <Button size="sm">Go to Dashboard</Button>
            </Link>
          ) : (
            <>
              <Link to={ROUTES.LOGIN} className="hidden sm:inline-flex">
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>
              <Link to={ROUTES.REGISTER}>
                <Button size="sm">Register</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}


// =============================================================================
// HERO
// =============================================================================
function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background gradient orbs */}
      <div
        aria-hidden
        className="absolute -top-32 -left-32 w-[400px] h-[400px] rounded-full blur-3xl opacity-40 pointer-events-none"
        style={{ background: "radial-gradient(circle, #6366F1 0%, transparent 70%)" }}
      />
      <div
        aria-hidden
        className="absolute -bottom-40 -right-32 w-[500px] h-[500px] rounded-full blur-3xl opacity-30 pointer-events-none"
        style={{ background: "radial-gradient(circle, #8B5CF6 0%, transparent 70%)" }}
      />

      <div className="relative max-w-6xl mx-auto px-4 md:px-6 py-16 md:py-24 lg:py-32 grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
        {/* Left: copy */}
        <div>
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[color:var(--border-2)] bg-[color:var(--surface)] text-xs text-[color:var(--primary-hi)] mb-5 md:mb-6"
            style={{ animation: "ccFadeUp 0.6s ease both" }}
          >
            <Sparkles size={12} />
            <span>Powered by multi-agent AI</span>
          </div>

          <h1
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-[1.1] tracking-tight"
            style={{ animation: "ccFadeUp 0.6s ease 0.1s both" }}
          >
            AI that{" "}
            <span className="gradient-text">teaches</span>,<br />
            not just answers.
          </h1>

          <p
            className="mt-5 md:mt-6 text-sm md:text-base lg:text-lg text-[color:var(--text-muted)] max-w-xl leading-relaxed"
            style={{ animation: "ccFadeUp 0.6s ease 0.2s both" }}
          >
            CogniCode helps you actually learn programming by thinking —
            not by copying AI-generated code. Socratic dialogue,
            progressive hints, and real cognitive growth.
          </p>

          <div
            className="mt-7 md:mt-8 flex flex-wrap items-center gap-3"
            style={{ animation: "ccFadeUp 0.6s ease 0.3s both" }}
          >
            <Link to={ROUTES.REGISTER}>
              <Button size="md">
                Get Started Free
                <ArrowRight size={16} />
              </Button>
            </Link>
            <a href="#how">
              <Button variant="secondary" size="md">
                See How It Works
              </Button>
            </a>
          </div>

          <p
            className="mt-5 text-xs text-[color:var(--text-subtle)]"
            style={{ animation: "ccFadeUp 0.6s ease 0.4s both" }}
          >
            No credit card · Open to all institutions · Free for students
          </p>
        </div>

        {/* Right: illustration */}
        <div className="relative flex justify-center lg:justify-end">
          <HeroIllustration />
        </div>
      </div>
    </section>
  );
}


/**
 * HeroIllustration
 * ----------------
 * A floating card mockup showing a sample chat snippet and the
 * CDS gauge. Everything is CSS/SVG — no external images.
 */
function HeroIllustration() {
  return (
    <div className="relative w-full max-w-md" style={{ animation: "ccFloat 6s ease-in-out infinite" }}>
      {/* Card */}
      <div className="rounded-2xl border border-[color:var(--border-2)] bg-[color:var(--bg2)] shadow-card overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-[color:var(--border)]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[color:var(--success)]" />
            <span className="text-xs font-semibold">Tutor Session</span>
          </div>
          <Badge tone="info">
            <Gauge size={10} /> 32 · Low
          </Badge>
        </div>

        {/* Messages */}
        <div className="p-4 space-y-3 text-sm">
          <div className="flex">
            <div className="rounded-2xl rounded-tl-sm bg-[color:var(--surface-2)] border border-[color:var(--border-2)] px-3 py-2 max-w-[85%]">
              Can you write me a function to reverse a linked list?
            </div>
          </div>
          <div className="flex justify-end">
            <div
              className="rounded-2xl rounded-tr-sm px-3 py-2 max-w-[85%] text-white"
              style={{ background: "var(--gradient-primary)" }}
            >
              Let's think first — what happens to each node's{" "}
              <code className="bg-white/20 px-1 rounded text-[11px]">next</code>{" "}
              pointer after reversal?
            </div>
          </div>
          <div className="flex">
            <div className="rounded-2xl rounded-tl-sm bg-[color:var(--surface-2)] border border-[color:var(--border-2)] px-3 py-2 max-w-[85%]">
              It should point to the previous node?
            </div>
          </div>
          <div className="flex items-center gap-1.5 pt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--warning)] animate-pulse" />
            <span className="text-[10px] font-semibold text-[color:var(--warning)]">
              Level 1 hint unlocked
            </span>
          </div>
        </div>

        {/* Footer input bar */}
        <div className="px-4 py-3 border-t border-[color:var(--border)] flex gap-2">
          <div className="flex-1 px-3 py-2 rounded-lg bg-[color:var(--surface-2)] text-xs text-[color:var(--text-subtle)]">
            Type your attempt…
          </div>
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white"
            style={{ background: "var(--gradient-primary)" }}
          >
            <ArrowRight size={14} />
          </div>
        </div>
      </div>

      {/* Floating CDS badge */}
      <div
        className="absolute -top-4 -right-4 md:-right-6 rounded-xl border border-[color:var(--border-2)] bg-[color:var(--bg2)] px-3 py-2 shadow-card"
        style={{ animation: "ccFloat 5s ease-in-out infinite 0.5s" }}
      >
        <div className="text-[10px] uppercase font-bold text-[color:var(--text-subtle)]">
          Dependency
        </div>
        <div className="text-lg font-black text-[color:var(--success)]">32</div>
      </div>

      {/* Floating icon */}
      <div
        className="absolute -bottom-4 -left-4 md:-left-6 w-12 h-12 rounded-xl flex items-center justify-center shadow-card"
        style={{
          background: "var(--gradient-primary)",
          animation: "ccFloat 5s ease-in-out infinite 1s",
        }}
      >
        <Brain size={20} className="text-white" />
      </div>
    </div>
  );
}


// =============================================================================
// PROBLEM
// =============================================================================
function Problem() {
  const items = [
    {
      icon: TrendingDown,
      title: "AI bypasses the struggle",
      body: "Students get complete solutions on the first request — skipping the thinking that builds programming skill.",
    },
    {
      icon: Eye,
      title: "Learning becomes invisible",
      body: "Copying code works in assignments but fails in exams, interviews, and real projects.",
    },
    {
      icon: Gauge,
      title: "No one measures reliance",
      body: "Instructors can't see who's leaning too hard on AI until it's too late to intervene.",
    },
  ];

  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 py-16 md:py-24">
      <Reveal>
        <div className="text-center mb-10 md:mb-14">
          <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-subtle)] mb-2">
            The Problem
          </p>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight">
            AI made coding easier.
            <br />
            <span className="gradient-text">It also made learning harder.</span>
          </h2>
        </div>
      </Reveal>

      <div className="grid md:grid-cols-3 gap-4 md:gap-6">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <Reveal key={item.title} delay={i * 0.1}>
              <div className="h-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 md:p-6 hover:border-[color:var(--border-2)] transition-colors">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[color:var(--danger)]/15 text-[color:var(--danger)] mb-4">
                  <Icon size={20} />
                </div>
                <h3 className="text-base md:text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-[color:var(--text-muted)] leading-relaxed">
                  {item.body}
                </p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}


// =============================================================================
// FEATURES
// =============================================================================
function Features() {
  const features = [
    {
      icon: Brain,
      tone: "primary",
      title: "Socratic Tutoring",
      body: "When you ask for code without an attempt, CogniCode responds with a guiding question instead. Think first — then get help.",
      points: ["Attempt detection", "Context-aware questions", "No repeated prompts"],
    },
    {
      icon: Layers,
      tone: "violet",
      title: "5-Level Progressive Hints",
      body: "Conceptual nudge → concept reminder → pseudocode → partial code → full solution. Each level unlocks only after you demonstrate an attempt.",
      points: ["Locked until you try", "Escalating guidance", "Full solution as last resort"],
    },
    {
      icon: Gauge,
      tone: "warning",
      title: "Cognitive Dependency Score",
      body: "A real-time behavioral metric based on six signals — hint level, solution requests, retries, debugging effort, interaction time, quiz performance.",
      points: ["Updated live", "Trend over time", "Visible to you first"],
    },
    {
      icon: LineChart,
      tone: "success",
      title: "Instructor Analytics",
      body: "Instructors see course-wide dependency heatmaps, weak topic detection, and per-student drill-down — without invading anyone's privacy.",
      points: ["Course heatmap", "Student drill-down", "PDF export"],
    },
  ];

  const TONE_BG = {
    primary: "bg-[#6366F1]/15 text-[#818CF8]",
    violet: "bg-[#8B5CF6]/15 text-[#A78BFA]",
    warning: "bg-[#F59E0B]/15 text-[#F59E0B]",
    success: "bg-[#10B981]/15 text-[#10B981]",
  };

  return (
    <section id="features" className="max-w-6xl mx-auto px-4 md:px-6 py-16 md:py-24">
      <Reveal>
        <div className="text-center mb-10 md:mb-14">
          <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-subtle)] mb-2">
            Core Features
          </p>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight">
            Everything you need to
            <br />
            <span className="gradient-text">actually learn to code.</span>
          </h2>
        </div>
      </Reveal>

      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <Reveal key={f.title} delay={(i % 2) * 0.1}>
              <div className="h-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 md:p-6 hover:border-[color:var(--border-2)] hover:-translate-y-0.5 transition-all">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${TONE_BG[f.tone]}`}
                >
                  <Icon size={22} />
                </div>
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-[color:var(--text-muted)] leading-relaxed mb-4">
                  {f.body}
                </p>
                <ul className="space-y-1.5">
                  {f.points.map((p) => (
                    <li
                      key={p}
                      className="flex items-center gap-2 text-xs text-[color:var(--text-muted)]"
                    >
                      <CheckCircle2 size={12} className="text-[color:var(--success)] shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}


// =============================================================================
// HOW IT WORKS
// =============================================================================
function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Ask",
      body: "Type a question or submit your code just like you would with any AI tutor.",
      icon: BookOpen,
    },
    {
      n: "02",
      title: "Attempt",
      body: "Show your thinking — a guess, a partial answer, a bug. Any genuine attempt counts.",
      icon: Target,
    },
    {
      n: "03",
      title: "Get Guided",
      body: "Receive a Socratic question or a progressive hint that fits exactly where you are.",
      icon: Sparkles,
    },
    {
      n: "04",
      title: "Reflect",
      body: "End each session by writing what you learned and what mistake you'll avoid next.",
      icon: NotebookPen,
    },
  ];

  return (
    <section id="how" className="relative py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <Reveal>
          <div className="text-center mb-10 md:mb-14">
            <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-subtle)] mb-2">
              How It Works
            </p>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight">
              From question to <span className="gradient-text">understanding</span>
            </h2>
          </div>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal key={s.n} delay={i * 0.1}>
                <div className="relative h-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 hover:border-[color:var(--border-2)] transition-colors">
                  <div className="text-[44px] leading-none font-black text-[color:var(--border-2)] absolute top-4 right-4 select-none">
                    {s.n}
                  </div>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[color:var(--primary)]/15 text-[color:var(--primary-hi)] mb-4">
                    <Icon size={18} />
                  </div>
                  <h3 className="text-base font-bold mb-1.5">{s.title}</h3>
                  <p className="text-xs text-[color:var(--text-muted)] leading-relaxed">
                    {s.body}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}


// =============================================================================
// FOR STUDENTS / FOR INSTRUCTORS
// =============================================================================
function ForYou() {
  const cards = [
    {
      icon: GraduationCap,
      tone: "primary",
      title: "For Students",
      tagline: "Learn deeply, on your own terms",
      points: [
        "Personalized Socratic questions based on your weak topics",
        "Hint levels that respect how much you've tried",
        "See your dependency score and watch it drop as you improve",
        "Reflect after each session and keep a learning journal",
      ],
    },
    {
      icon: Presentation,
      tone: "violet",
      title: "For Instructors",
      tagline: "See who needs help — before the exam",
      points: [
        "Course-wide dependency heatmap updated in real time",
        "Weak topic detection across your entire class",
        "Per-student drill-down: sessions, quizzes, reflections",
        "Export PDF reports for advisory meetings",
      ],
    },
  ];

  const TONE_BG = {
    primary: "bg-[#6366F1]/15 text-[#818CF8]",
    violet: "bg-[#8B5CF6]/15 text-[#A78BFA]",
  };

  return (
    <section id="for" className="max-w-6xl mx-auto px-4 md:px-6 py-16 md:py-24">
      <Reveal>
        <div className="text-center mb-10 md:mb-14">
          <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-subtle)] mb-2">
            Built For You
          </p>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight">
            One platform, <span className="gradient-text">two experiences</span>
          </h2>
        </div>
      </Reveal>

      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <Reveal key={c.title} delay={i * 0.1}>
              <div className="h-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 md:p-7 hover:border-[color:var(--border-2)] transition-colors">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${TONE_BG[c.tone]}`}
                >
                  <Icon size={24} />
                </div>
                <h3 className="text-lg md:text-xl font-black mb-1">{c.title}</h3>
                <p className="text-sm text-[color:var(--primary-hi)] font-medium mb-4">
                  {c.tagline}
                </p>
                <ul className="space-y-2.5">
                  {c.points.map((p) => (
                    <li
                      key={p}
                      className="flex items-start gap-2 text-sm text-[color:var(--text-muted)] leading-snug"
                    >
                      <CheckCircle2
                        size={14}
                        className="text-[color:var(--success)] shrink-0 mt-0.5"
                      />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}


// =============================================================================
// STATS
// =============================================================================
function Stats() {
  const stats = [
    { v: "9", label: "AI Agents", icon: Brain },
    { v: "5", label: "Hint Levels", icon: Layers },
    { v: "6", label: "CDS Signals", icon: Gauge },
    { v: "100%", label: "Private", icon: Users },
  ];

  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 py-16 md:py-20">
      <Reveal>
        <div className="rounded-3xl border border-[color:var(--border-2)] p-8 md:p-10 relative overflow-hidden"
          style={{ background: "var(--surface)" }}
        >
          <div
            aria-hidden
            className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{ background: "radial-gradient(circle, #8B5CF6 0%, transparent 70%)" }}
          />
          <div className="relative">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-black text-center mb-8 md:mb-10 tracking-tight">
              Built for university programming courses
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6">
              {stats.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="text-center" style={{ animation: `ccFadeUp 0.7s ease ${i * 0.08}s both` }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3 bg-[color:var(--primary)]/15 text-[color:var(--primary-hi)]">
                      <Icon size={18} />
                    </div>
                    <div className="text-2xl md:text-3xl lg:text-4xl font-black gradient-text">
                      {s.v}
                    </div>
                    <div className="text-xs text-[color:var(--text-muted)] mt-1">
                      {s.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}


// =============================================================================
// FINAL CTA
// =============================================================================
function FinalCTA() {
  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 py-16 md:py-24">
      <Reveal>
        <div
          className="relative rounded-3xl overflow-hidden p-8 md:p-14 text-center"
          style={{ background: "var(--gradient-primary)" }}
        >
          <div
            aria-hidden
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.4) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.3) 0%, transparent 40%)",
            }}
          />
          <div className="relative">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-white tracking-tight mb-3">
              Ready to actually learn?
            </h2>
            <p className="text-white/80 max-w-xl mx-auto mb-7 text-sm md:text-base">
              Join CogniCode and turn AI from a shortcut into a teacher.
              Free for students. Open to all institutions.
            </p>
            <Link to={ROUTES.REGISTER}>
              <Button
                size="md"
                className="!bg-white !text-[color:var(--text)] hover:!opacity-95"
              >
                Create Free Account
                <ArrowRight size={16} />
              </Button>
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}


// =============================================================================
// FOOTER
// =============================================================================
function Footer() {
  return (
    <footer className="border-t border-[color:var(--border)] mt-8">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo size={26} withWordmark />
          <p className="text-xs text-[color:var(--text-subtle)] text-center md:text-right">
            BSEF23-63 · PUCIT FYP 2026 · Supervisor: Sanam Ahmad
            <br />
            A Cognitive-Aware AI Teaching Assistant for Programming Education
          </p>
        </div>
      </div>
    </footer>
  );
}


// =============================================================================
// PAGE
// =============================================================================
export default function Landing() {
  return (
    <div className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text)]">
      <Navbar />
      <main>
        <Hero />
        <Problem />
        <Features />
        <HowItWorks />
        <ForYou />
        <Stats />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}