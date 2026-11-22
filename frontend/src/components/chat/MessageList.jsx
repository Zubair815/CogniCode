/**
 * MessageList
 * -----------
 * Scrollable conversation viewport centered in a 768px reading column.
 */

import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble.jsx";
import TypingIndicator from "./TypingIndicator.jsx";

function buildStarterPrompts(topic) {
  const subject = topic || "this problem";
  return [
    `What is the main invariant behind ${subject}?`,
    `Here is my initial approach to ${subject} — what edge case am I missing?`,
    "Can you give me a progressive hint?",
    `Walk me through a small input example for ${subject}.`,
  ];
}

export default function MessageList({
  messages = [],
  typing = false,
  topic = "",
  onSelectPrompt,
  disabled = false,
}) {
  const containerRef = useRef(null);
  const shouldStickRef = useRef(true);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldStickRef.current = distanceFromBottom < 96;
  };

  useEffect(() => {
    if (!shouldStickRef.current) return;
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, typing]);

  if (messages.length === 0 && !typing) {
    const starters = buildStarterPrompts(topic);
    return (
      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-6">
        <div className="my-auto mx-auto w-full max-w-content">
          <h2 className="text-center text-xl font-semibold tracking-tight text-fg sm:text-2xl">
            {topic || "What are you working on?"}
          </h2>

          {onSelectPrompt && (
            <div className="mx-auto mt-6 grid max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
              {starters.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelectPrompt(prompt)}
                  className="rounded-xl border border-line-subtle bg-canvas px-3.5 py-3 text-left text-sm text-fg-secondary transition-colors duration-fast hover:bg-hover hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto"
    >
      <div className="mx-auto w-full max-w-content px-4 py-6 md:px-6 space-y-6">
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            role={m.role}
            content={m.content}
            timestamp={m.timestamp}
            intent={m.intent}
          />
        ))}
        {typing && <TypingIndicator />}
        <div className="h-2" />
      </div>
    </div>
  );
}
