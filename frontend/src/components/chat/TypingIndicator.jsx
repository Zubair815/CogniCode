/**
 * TypingIndicator
 * ---------------
 * Three animated dots inside a chat bubble — matches assistant
 * message styling. Uses CSS keyframes defined in index.css.
 *
 * Created: 10/10/2026
 */

import { Bot } from "lucide-react";

export default function TypingIndicator() {
  return (
    <div className="flex gap-2.5 mr-auto max-w-[75%] animate-[ccFadeUp_0.3s_ease_both]">
      <div
        className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-white"
        style={{ background: "var(--gradient-primary)" }}
        aria-hidden
      >
        <Bot size={14} />
      </div>
      <div className="bg-[color:var(--surface-2)] border border-[color:var(--border-2)] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
        <span className="cc-dot" />
        <span className="cc-dot" />
        <span className="cc-dot" />
      </div>
    </div>
  );
}