/**
 * MessageList
 * -----------
 * Scrollable list of messages. Auto-scrolls to bottom on new
 * messages unless the user has manually scrolled up.
 *
 * Props:
 *   messages       — array of { id, role, content, timestamp, intent }
 *   typing         — boolean; renders a typing indicator at the end
 *
 * Created: 10/10/2026
 */

import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble.jsx";
import TypingIndicator from "./TypingIndicator.jsx";

export default function MessageList({ messages = [], typing = false }) {
  const containerRef = useRef(null);
  const shouldStickRef = useRef(true);

  // Track whether the user is at (or near) the bottom.
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldStickRef.current = distanceFromBottom < 80;
  };

  // Auto-scroll when messages or typing state change.
  useEffect(() => {
    if (!shouldStickRef.current) return;
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, typing]);

  // Empty state
  if (messages.length === 0 && !typing) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-3">💬</div>
          <p className="text-sm font-semibold text-[color:var(--text)]">
            Ask your first question
          </p>
          <p className="text-xs text-[color:var(--text-muted)] mt-1">
            Describe what you've tried, or ask about a concept. I'll guide you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-5 space-y-3"
    >
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
      {/* Bottom padding so last message isn't glued to input */}
      <div className="h-1" />
    </div>
  );
}