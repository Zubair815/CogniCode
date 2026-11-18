/**
 * ChatHeader
 * ----------
 * Top bar for the chat page: back button, topic, connection status,
 * and "End Session" button.
 *
 * Props:
 *   topic       — session topic
 *   wsStatus    — "connecting" | "open" | "closed"
 *   onEnd       — () => void
 *
 * Created: 10/10/2026
 */

import { ArrowLeft, Circle } from "lucide-react";
import { Link } from "react-router-dom";
import Button from "../ui/Button.jsx";
import { ROUTES } from "../../constants/routes.js";

const STATUS = {
  connecting: { label: "Connecting…", color: "text-[color:var(--warning)]" },
  open: { label: "Connected", color: "text-[color:var(--success)]" },
  closed: { label: "Disconnected", color: "text-[color:var(--danger)]" },
};

export default function ChatHeader({ topic = "", wsStatus = "connecting", onEnd }) {
  const s = STATUS[wsStatus] || STATUS.connecting;

  return (
    <header className="sticky top-0 z-30 bg-[color:var(--bg)]">
      <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-3 border-b border-[color:var(--border)]">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={ROUTES.STUDENT_DASHBOARD}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[color:var(--text-muted)] hover:text-[color:var(--text)] hover:bg-[color:var(--surface-2)] transition-colors shrink-0"
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-sm md:text-base font-bold truncate">
              {topic || "Tutoring session"}
            </h1>
            <p className={`text-[11px] flex items-center gap-1 ${s.color}`}>
              <Circle size={6} fill="currentColor" /> {s.label}
            </p>
          </div>
        </div>

        <Button variant="secondary" size="sm" onClick={onEnd}>
          End session
        </Button>
      </div>
    </header>
  );
}