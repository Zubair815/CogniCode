/**
 * ChatInput
 * ---------
 * Textarea + send button. Enter sends; Shift+Enter inserts a
 * newline. Disabled while disconnected.
 *
 * Props:
 *   onSend      — (text) => void
 *   disabled    — boolean
 *   placeholder — string (optional)
 *
 * Created: 10/10/2026
 */

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";

export default function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Ask a question or describe what you've tried…",
}) {
  const [value, setValue] = useState("");
  const textareaRef = useRef(null);

  // Auto-grow the textarea up to a max height.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [value]);

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
    // Re-focus for fast typing
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="border-t border-[color:var(--border)] bg-[color:var(--bg)] px-4 md:px-6 py-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={[
            "flex-1 resize-none rounded-lg px-3.5 py-2.5 text-sm",
            "bg-[color:var(--surface-2)] border border-[color:var(--border-2)]",
            "text-[color:var(--text)] placeholder:text-[color:var(--text-subtle)]",
            "outline-none focus:border-[color:var(--primary)] transition-colors",
            disabled ? "opacity-60 cursor-not-allowed" : "",
          ].join(" ")}
        />
        <button
          type="button"
          onClick={submit}
          disabled={disabled || !value.trim()}
          aria-label="Send message"
          className={[
            "h-10 px-3.5 rounded-lg flex items-center justify-center gap-1.5",
            "text-sm font-semibold text-white shrink-0",
            "transition-all disabled:opacity-50 disabled:cursor-not-allowed",
            !disabled && value.trim() ? "hover:-translate-y-px hover:shadow-glow" : "",
          ].join(" ")}
          style={{ background: "var(--gradient-primary)" }}
        >
          <Send size={15} />
        </button>
      </div>
      <p className="mt-1.5 text-[10px] text-[color:var(--text-subtle)] hidden md:block">
        Press <kbd className="px-1 rounded bg-[color:var(--surface-2)]">Enter</kbd> to send ·{" "}
        <kbd className="px-1 rounded bg-[color:var(--surface-2)]">Shift</kbd>+
        <kbd className="px-1 rounded bg-[color:var(--surface-2)]">Enter</kbd> for a new line
      </p>
    </div>
  );
}