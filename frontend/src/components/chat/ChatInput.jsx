/**
 * ChatInput
 * ---------
 * Bottom composer centered in the 768px conversation column.
 */

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";

export default function ChatInput({
  onSend,
  disabled = false,
  busy = false,
  disabledReason = "",
  placeholder = "Ask a question or paste your code attempt…",
}) {
  const [value, setValue] = useState("");
  const textareaRef = useRef(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [value]);

  const canSend = !disabled && !busy && value.trim().length > 0;

  const submit = () => {
    const text = value.trim();
    if (!text || disabled || busy) return;
    onSend(text);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const insertCodeFence = () => {
    if (disabled) return;
    const snippet = value ? `${value}\n\`\`\`python\n\n\`\`\`` : "```python\n\n```";
    setValue(snippet);
    textareaRef.current?.focus();
  };

  return (
    <div className="shrink-0 bg-canvas px-4 pb-4 pt-2 md:px-6">
      <div className="mx-auto w-full max-w-content">
        <div
          className={[
            "rounded-3xl border border-line bg-surface px-4 pb-2.5 pt-3 shadow-composer transition-colors duration-fast",
            "focus-within:border-line-strong focus-within:bg-elevated",
            disabled ? "opacity-75" : "",
          ].join(" ")}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled && disabledReason ? disabledReason : placeholder}
            disabled={disabled}
            rows={1}
            aria-label="Message"
            className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-fg placeholder:text-fg-muted focus-ring-none disabled:cursor-not-allowed"
          />

          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                disabled={disabled || busy}
                onClick={insertCodeFence}
                className="rounded-md px-2 py-1 text-xs font-medium text-fg-secondary hover:bg-hover hover:text-fg disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                Code block
              </button>

              <button
                type="button"
                disabled={disabled || busy}
                onClick={() => onSend("Can you give me a progressive hint?")}
                className="rounded-md px-2 py-1 text-xs font-medium text-fg-secondary hover:bg-hover hover:text-fg disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                Request hint
              </button>
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={!canSend}
              aria-label="Send message"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-on transition-opacity duration-fast hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ArrowUp size={16} strokeWidth={2.25} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
