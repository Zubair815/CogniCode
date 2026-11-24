/**
 * AppLayout
 * ---------
 * Primary two-column application shell:
 *   Left sidebar (260px, collapsible on desktop, drawer on mobile)
 *   +
 *   Main content column
 */

import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Compass,
  FileEdit,
  LayoutDashboard,
  LogOut,
  Map,
  MessageSquare,
  Moon,
  MoreHorizontal,
  PanelLeft,
  PanelLeftClose,
  Settings,
  SquarePen,
  Sun,
  TestTube2,
  Users,
} from "lucide-react";

import Logo from "../brand/Logo.jsx";
import Avatar from "../ui/Avatar.jsx";
import Badge from "../ui/Badge.jsx";
import IconButton from "../ui/IconButton.jsx";
import Menu, { MenuItem, MenuLabel, MenuSeparator } from "../ui/Menu.jsx";
import StartSessionModal from "../chat/StartSessionModal.jsx";
import SettingsModal from "./SettingsModal.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";
import { chatService } from "../../services/chatService.js";
import { ROUTES, chatRoute } from "../../constants/routes.js";

export default function AppLayout({
  children,
  activeCds = 0,
  fullHeight = false,
  headerSlot = null,
}) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [recentSessions, setRecentSessions] = useState([]);

  const isInstructor = user?.role === "instructor";
  const userName = user?.name || (isInstructor ? "Instructor" : "Student");

  useEffect(() => {
    if (isInstructor) return undefined;
    let active = true;
    chatService
      .listMySessions()
      .then((data) => {
        if (active && Array.isArray(data?.sessions)) {
          setRecentSessions(data.sessions.slice(0, 10));
        }
      })
      .catch(() => {
        // Ignore silent sidebar refresh errors
      });
    return () => {
      active = false;
    };
  }, [isInstructor, location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, [mobileOpen]);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate(ROUTES.LOGIN, { replace: true });
    }
  };

  const studentLinks = [
    { to: "/student/chat/active", label: "Chat", icon: MessageSquare, matchPrefix: "/student/chat" },
    { to: ROUTES.STUDENT_DASHBOARD, label: "Dashboard", icon: LayoutDashboard },
    { to: ROUTES.STUDENT_COURSES, label: "Courses", icon: BookOpen },
    { to: ROUTES.STUDENT_HOME, label: "Tracks", icon: Compass },
    { to: ROUTES.STUDENT_REFLECTIONS, label: "Reflections", icon: FileEdit },
    { to: ROUTES.STUDENT_QUIZ, label: "Quizzes", icon: TestTube2 },
  ];

  const instructorLinks = [
    { to: ROUTES.INSTRUCTOR_DASHBOARD, label: "Cohort", icon: LayoutDashboard },
    { to: ROUTES.INSTRUCTOR_COURSES, label: "Courses", icon: BookOpen },
    { to: ROUTES.INSTRUCTOR_DETAIL, label: "Student detail", icon: Users },
    { to: ROUTES.INSTRUCTOR_HEATMAP, label: "Heatmap", icon: Map },
  ];

  const navLinks = isInstructor ? instructorLinks : studentLinks;
  const cdsTone = activeCds > 70 ? "danger" : activeCds > 40 ? "warning" : "success";

  const sidebarContent = (
    <div className="flex h-full flex-col bg-sidebar text-fg">
      {/* Top sidebar header */}
      <div className="flex h-header items-center justify-between px-3">
        <button
          type="button"
          onClick={() =>
            navigate(isInstructor ? ROUTES.INSTRUCTOR_DASHBOARD : "/student/chat/active")
          }
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-hover transition-colors"
        >
          <Logo size={24} withWordmark />
        </button>

        <div className="flex items-center gap-0.5">
          {!isInstructor && (
            <IconButton
              label="New session"
              size="sm"
              onClick={() => {
                setMobileOpen(false);
                setNewSessionOpen(true);
              }}
            >
              <SquarePen size={16} />
            </IconButton>
          )}
          <IconButton
            label="Collapse sidebar"
            size="sm"
            onClick={() => {
              setMobileOpen(false);
              setSidebarCollapsed(true);
            }}
            className="hidden lg:inline-flex"
          >
            <PanelLeftClose size={16} />
          </IconButton>
        </div>
      </div>

      {/* Primary New Session action for students */}
      {!isInstructor && (
        <div className="px-2.5 pb-2">
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              setNewSessionOpen(true);
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-fg hover:bg-hover transition-colors duration-fast"
          >
            <SquarePen size={16} className="text-fg-secondary" aria-hidden="true" />
            <span>New session</span>
          </button>
        </div>
      )}

      {/* Scrollable navigation + conversation history */}
      <div className="flex-1 overflow-y-auto px-2.5 py-1 space-y-5">
        <nav aria-label="Primary navigation" className="space-y-0.5">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              location.pathname === link.to ||
              (link.matchPrefix && location.pathname.startsWith(link.matchPrefix));
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={[
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors duration-fast",
                  isActive
                    ? "bg-active font-medium text-fg"
                    : "text-fg-secondary hover:bg-hover hover:text-fg",
                ].join(" ")}
              >
                <Icon size={16} className="shrink-0" aria-hidden="true" />
                <span className="truncate">{link.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Recent tutoring sessions list */}
        {!isInstructor && recentSessions.length > 0 && (
          <div>
            <div className="px-2.5 pb-1.5 text-xs font-medium text-fg-muted">
              Recent
            </div>
            <ul className="space-y-0.5">
              {recentSessions.map((sess) => {
                const path = chatRoute(sess.id);
                const active = location.pathname === path;
                return (
                  <li key={sess.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileOpen(false);
                        navigate(path);
                      }}
                      className={[
                        "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors duration-fast",
                        active
                          ? "bg-active font-medium text-fg"
                          : "text-fg-secondary hover:bg-hover hover:text-fg",
                      ].join(" ")}
                    >
                      <span className="truncate">{sess.topic}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Bottom account & CDS footer */}
      <div className="border-t border-line-subtle p-2.5 space-y-1">
        {!isInstructor && (
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              navigate(ROUTES.STUDENT_DASHBOARD);
            }}
            className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs text-fg-secondary hover:bg-hover transition-colors"
          >
            <span>Dependency score</span>
            <Badge tone={cdsTone}>CDS {activeCds}</Badge>
          </button>
        )}

        <Menu
          placement="top-start"
          menuClassName="w-56"
          trigger={(triggerProps) => (
            <button
              type="button"
              {...triggerProps}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm hover:bg-hover transition-colors duration-fast"
            >
              <Avatar name={userName} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-fg">{userName}</div>
                <div className="truncate text-xs text-fg-muted">
                  {isInstructor ? "Instructor" : "Student"}
                </div>
              </div>
              <MoreHorizontal size={16} className="text-fg-muted shrink-0" aria-hidden="true" />
            </button>
          )}
        >
          {(close) => (
            <>
              <MenuLabel>{user?.email || userName}</MenuLabel>
              <MenuItem
                icon={Settings}
                onSelect={() => {
                  close();
                  setSettingsOpen(true);
                }}
              >
                Settings
              </MenuItem>
              <MenuItem
                icon={theme === "dark" ? Sun : Moon}
                onSelect={() => {
                  toggleTheme();
                  close();
                }}
              >
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </MenuItem>
              <MenuSeparator />
              <MenuItem
                icon={LogOut}
                danger
                onSelect={() => {
                  close();
                  handleLogout();
                }}
              >
                Sign out
              </MenuItem>
            </>
          )}
        </Menu>
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh-screen w-full overflow-hidden bg-canvas text-fg">
      {/* Desktop / landscape-tablet sidebar (1024px+) */}
      {!sidebarCollapsed && (
        <aside className="hidden lg:flex lg:w-sidebar lg:shrink-0 lg:flex-col border-r border-line-subtle">
          {sidebarContent}
        </aside>
      )}

      {/* Mobile & portrait-tablet slide-over drawer (<1024px) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-overlay flex lg:hidden">
          <div
            className="fixed inset-0 bg-overlay animate-fade-in"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-sidebar flex w-sidebar max-w-[82vw] flex-col border-r border-line-subtle bg-sidebar animate-slide-in-left">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header
          className={[
            "flex h-header shrink-0 items-center justify-between gap-2 border-b border-line-subtle bg-canvas px-3 md:px-4",
            !headerSlot && !sidebarCollapsed ? "lg:hidden" : "",
          ].join(" ")}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <IconButton
              label="Open navigation"
              size="sm"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden"
            >
              <PanelLeft size={18} />
            </IconButton>

            {sidebarCollapsed && (
              <div className="hidden lg:flex items-center gap-1">
                <IconButton
                  label="Expand sidebar"
                  size="sm"
                  onClick={() => setSidebarCollapsed(false)}
                >
                  <PanelLeft size={18} />
                </IconButton>
                {!isInstructor && (
                  <IconButton
                    label="New session"
                    size="sm"
                    onClick={() => setNewSessionOpen(true)}
                  >
                    <SquarePen size={16} />
                  </IconButton>
                )}
              </div>
            )}

            {headerSlot ? (
              <div className="min-w-0 flex-1">{headerSlot}</div>
            ) : (
              <Logo size={24} withWordmark />
            )}
          </div>

          {!headerSlot && (
            <div className="flex items-center gap-1">
              {!isInstructor && (
                <IconButton
                  label="New session"
                  size="sm"
                  onClick={() => setNewSessionOpen(true)}
                >
                  <SquarePen size={16} />
                </IconButton>
              )}
              <IconButton
                label={theme === "dark" ? "Light mode" : "Dark mode"}
                size="sm"
                onClick={toggleTheme}
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </IconButton>
            </div>
          )}
        </header>

        <main
          className={
            fullHeight
              ? "flex min-h-0 flex-1 flex-col overflow-hidden"
              : "flex-1 overflow-y-auto"
          }
        >
          {children}
        </main>
      </div>

      <StartSessionModal
        open={newSessionOpen}
        onClose={() => setNewSessionOpen(false)}
        onCreated={(s) => navigate(chatRoute(s.id))}
      />

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
