/**
 * ChatInput
 * ---------
 * Textarea + code submission toggle + send button.
 * Enter sends in normal chat mode; Shift+Enter inserts a newline.
 * Disabled while disconnected.
 *
 * Props:
 *   onSend      — (text, type) => void
 *   disabled    — boolean
 *   placeholder — string (optional)
 *
 * Created: 10/10/2026
 * Updated: 10/10/2026
 */

import { useEffect, useRef, useState } from "react";
import { Code2, Send } from "lucide-react";

export default function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Ask a question or describe what you've tried…",
}) {
  const [value, setValue] = useState("");
  const [codeMode, setCodeMode] = useState(false);
  const textareaRef = useRef(null);

  // Auto-grow the textarea up to a max height.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text, codeMode ? "code_submission" : "chat");
    setValue("");
    setCodeMode(false);
    // Re-focus for fast typing
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !codeMode) {
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
          placeholder={
            codeMode
              ? "Paste or write your code attempt here…"
              : placeholder
          }
          disabled={disabled}
          rows={codeMode ? 3 : 1}
          className={[
            "flex-1 resize-none rounded-lg px-3.5 py-2.5 text-sm",
            "bg-[color:var(--surface-2)] border border-[color:var(--border-2)]",
            "text-[color:var(--text)] placeholder:text-[color:var(--text-subtle)]",
            "outline-none focus:border-[color:var(--primary)] transition-colors",
            codeMode ? "font-mono text-xs" : "",
            disabled ? "opacity-60 cursor-not-allowed" : "",
          ].join(" ")}
        />
        <button
          type="button"
          onClick={() => setCodeMode((prev) => !prev)}
          disabled={disabled}
          title="Toggle code attempt submission mode"
          aria-label="Toggle code submission mode"
          className={[
            "h-10 px-3 rounded-lg flex items-center justify-center border text-xs font-mono font-semibold shrink-0 transition-colors",
            codeMode
              ? "border-[color:var(--primary)] bg-[color:var(--primary)]/15 text-[color:var(--primary)]"
              : "border-[color:var(--border-2)] bg-[color:var(--surface-2)] text-[color:var(--text-muted)] hover:text-[color:var(--text)]",
            disabled ? "opacity-50 cursor-not-allowed" : "",
          ].join(" ")}
        >
          <Code2 size={15} />
        </button>
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
        {codeMode ? (
          <>Code Attempt Mode active · Click Send when ready</>
        ) : (
          <>
            Press <kbd className="px-1 rounded bg-[color:var(--surface-2)]">Enter</kbd> to send ·{" "}
            <kbd className="px-1 rounded bg-[color:var(--surface-2)]">Shift + Enter</kbd> for a new line ·{" "}
            Click <kbd className="px-1 rounded bg-[color:var(--surface-2)]">&lt;/&gt;</kbd> to submit code
          </>
        )}
      </p>
    </div>
  );
}
