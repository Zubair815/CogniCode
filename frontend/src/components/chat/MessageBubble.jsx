/**
 * MessageBubble
 * -------------
 * Renders a single chat message. Assistant messages appear on the
 * left with a gradient avatar; student messages appear on the right
 * with a solid accent.
 *
 * Props:
 *   role       — "student" | "assistant"
 *   content    — message text
 *   timestamp  — ISO date string (optional)
 *   intent     — assistant-only metadata (optional)
 *
 * Created: 10/10/2026
 */

import { Bot, User } from "lucide-react";

function formatTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function MessageBubble({ role, content, timestamp, intent }) {
  const isStudent = role === "student";

  return (
    <div
      className={[
        "flex gap-2.5 max-w-[85%] md:max-w-[75%]",
        isStudent ? "ml-auto flex-row-reverse" : "mr-auto",
        "animate-[ccFadeUp_0.3s_ease_both]",
      ].join(" ")}
    >
      {/* Avatar */}
      <div
        className={[
          "w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
          isStudent
            ? "bg-[color:var(--surface-2)] text-[color:var(--text-muted)] border border-[color:var(--border-2)]"
            : "text-white",
        ].join(" ")}
        style={!isStudent ? { background: "var(--gradient-primary)" } : undefined}
        aria-hidden
      >
        {isStudent ? <User size={14} /> : <Bot size={14} />}
      </div>

      {/* Bubble */}
      <div className="flex flex-col min-w-0">
        <div
          className={[
            "px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words",
            isStudent
              ? "text-white rounded-2xl rounded-tr-sm"
              : "bg-[color:var(--surface-2)] border border-[color:var(--border-2)] text-[color:var(--text)] rounded-2xl rounded-tl-sm",
          ].join(" ")}
          style={isStudent ? { background: "var(--gradient-primary)" } : undefined}
        >
          {content}
        </div>

        <div
          className={[
            "text-[10px] text-[color:var(--text-subtle)] mt-1 px-1",
            isStudent ? "text-right" : "text-left",
          ].join(" ")}
        >
          {formatTime(timestamp)}
          {!isStudent && intent && (
            <span className="ml-2 opacity-70">· {intent.replace("_", " ")}</span>
          )}
        </div>
      </div>
    </div>
  );
}