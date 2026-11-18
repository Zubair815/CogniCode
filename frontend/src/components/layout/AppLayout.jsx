import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  MessageSquare,
  LayoutDashboard,
  BookOpen,
  Compass,
  FileEdit,
  TestTube2,
  Users,
  Grid,
  Map,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  TrendingDown,
  Sparkles,
} from "lucide-react";

import Logo from "../brand/Logo.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";
import { ROUTES } from "../../constants/routes.js";

export default function AppLayout({ children, activeCds = 32 }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isInstructor = user?.role === "instructor";
  const userName = user?.name || (isInstructor ? "Instructor" : "Student");
  const userInitial = userName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate(ROUTES.LOGIN, { replace: true });
    }
  };

  const studentLinks = [
    { to: ROUTES.STUDENT_DASHBOARD, label: "My Dashboard", icon: LayoutDashboard },
    { to: "/student/chat/active", label: "Tutor Chat", icon: MessageSquare },
    { to: ROUTES.STUDENT_COURSES, label: "My Courses", icon: BookOpen },
    { to: ROUTES.STUDENT_HOME, label: "Independent Tracks", icon: Compass },
    { to: ROUTES.STUDENT_REFLECTIONS, label: "Reflections", icon: FileEdit },
    { to: ROUTES.STUDENT_QUIZ, label: "Quizzes", icon: TestTube2 },
  ];

  const instructorLinks = [
    { to: ROUTES.INSTRUCTOR_DASHBOARD, label: "Analytics Dashboard", icon: LayoutDashboard },
    { to: ROUTES.INSTRUCTOR_COURSES, label: "Courses", icon: BookOpen },
    { to: ROUTES.INSTRUCTOR_DETAIL, label: "Student Detail", icon: Users },
    { to: ROUTES.INSTRUCTOR_HEATMAP, label: "Dependency Heatmap", icon: Map },
  ];

  const navLinks = isInstructor ? instructorLinks : studentLinks;

  // CDS categorization
  let cdsColor = "var(--success)";
  let cdsBand = "Low Risk";
  let cdsBg = "rgba(16, 185, 129, 0.12)";
  if (activeCds > 70) {
    cdsColor = "var(--danger)";
    cdsBand = "High Risk";
    cdsBg = "rgba(239, 68, 68, 0.12)";
  } else if (activeCds > 40) {
    cdsColor = "var(--warning)";
    cdsBand = "Moderate";
    cdsBg = "rgba(245, 158, 11, 0.12)";
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[color:var(--bg)] text-[color:var(--text)]">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[color:var(--border)] bg-[color:var(--bg2)]">
        <div className="flex items-center gap-2">
          <Logo size={28} withWordmark />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-lg text-[color:var(--text-muted)] hover:bg-[color:var(--surface)]"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation"
            className="p-2 rounded-lg text-[color:var(--text-muted)] hover:bg-[color:var(--surface)]"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`${
          mobileMenuOpen ? "flex" : "hidden"
        } md:flex flex-col w-full md:w-64 shrink-0 border-r border-[color:var(--border)] bg-[color:var(--bg2)] md:min-h-screen sticky md:top-0 z-30 transition-all`}
      >
        {/* Brand */}
        <div className="p-5 border-b border-[color:var(--border)] hidden md:block">
          <Logo size={32} withWordmark />
          <p className="text-[11px] font-medium text-[color:var(--text-muted)] mt-1 tracking-wide">
            AI Teaching Assistant
          </p>
        </div>

        {/* User Card */}
        <div className="p-4 mx-3 my-3 rounded-xl bg-[color:var(--surface)] border border-[color:var(--border)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white bg-gradient-to-tr from-[color:var(--primary)] to-[color:var(--violet)] shrink-0 shadow-sm">
            {userInitial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate text-[color:var(--text)]">
              {userName}
            </div>
            <div className="text-[11px] text-[color:var(--text-muted)] flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[color:var(--success)]" />
              {isInstructor ? "Educator" : "Student"}
            </div>
          </div>
        </div>

        {/* Cognitive Dependency Score Widget (for students) */}
        {!isInstructor && (
          <div className="mx-3 mb-3 p-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)]">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-[color:var(--text-muted)] flex items-center gap-1.5">
                <Sparkles size={12} className="text-[color:var(--primary)]" />
                Cognitive Dependency
              </span>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{ color: cdsColor, backgroundColor: cdsBg }}
              >
                {cdsBand}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black" style={{ color: cdsColor }}>
                {activeCds}
              </span>
              <span className="text-xs text-[color:var(--text-muted)] font-medium">/ 100</span>
              <span className="ml-auto text-[11px] text-[color:var(--success)] font-medium flex items-center">
                <TrendingDown size={12} className="mr-0.5" />
                -8 pts
              </span>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to || (link.to.includes("/chat") && location.pathname.startsWith("/student/chat"));
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[color:var(--primary)] text-white shadow-sm shadow-[color:var(--primary)]/30 font-semibold"
                    : "text-[color:var(--text-muted)] hover:text-[color:var(--text)] hover:bg-[color:var(--surface)]"
                }`}
              >
                <Icon size={18} className={isActive ? "text-white" : "opacity-75"} />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="p-3 border-t border-[color:var(--border)] mt-auto space-y-1">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium text-[color:var(--text-muted)] hover:text-[color:var(--text)] hover:bg-[color:var(--surface)] transition-colors"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium text-[color:var(--danger)] hover:bg-[color:var(--danger)]/10 transition-colors"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
