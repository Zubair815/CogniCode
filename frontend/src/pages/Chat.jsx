/**
 * Chat page.
 * Created: 10/10/2026
 * Updated: 10/10/2026
 */

import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, X } from "lucide-react";

import ChatHeader from "../components/chat/ChatHeader.jsx";
import ChatInput from "../components/chat/ChatInput.jsx";
import MessageList from "../components/chat/MessageList.jsx";
import Button from "../components/ui/Button.jsx";
import useChatSession from "../hooks/useChatSession.js";
import { ROUTES } from "../constants/routes.js";

export default function Chat() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [confirmEnd, setConfirmEnd] = useState(false);

  const {
    session,
    messages,
    loading,
    error,
    wsStatus,
    assistantTyping,
    send,
    end,
    clearError,
  } = useChatSession(sessionId);

  // Redirect on fatal session errors so we don't leave the user stuck.
  useEffect(() => {
    if (!error) return;
    const fatal =
      error.includes("do not have access") ||
      error.includes("not found") ||
      error.includes("Authentication failed");
    if (fatal) {
      const id = setTimeout(() => {
        navigate(ROUTES.STUDENT_DASHBOARD, { replace: true });
      }, 800);
      return () => clearTimeout(id);
    }
  }, [error, navigate]);

  const handleEnd = useCallback(() => {
    end();
    setTimeout(() => navigate(ROUTES.STUDENT_DASHBOARD), 250);
  }, [end, navigate]);

  const disabled = wsStatus !== "open";

  return (
    <div className="h-screen flex flex-col bg-[color:var(--bg)] text-[color:var(--text)]">
      <ChatHeader
        topic={session?.topic}
        wsStatus={wsStatus}
        onEnd={() => setConfirmEnd(true)}
      />

      {error && (
        <div className="mx-4 md:mx-6 mt-3 px-3.5 py-2.5 rounded-lg bg-[color:var(--danger)]/10 border border-[color:var(--danger)]/30 flex items-start gap-2 text-xs text-[color:var(--danger)]">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={clearError}
            className="opacity-70 hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-[color:var(--text-muted)]">
            Loading session…
          </div>
        </div>
      ) : (
        <MessageList messages={messages} typing={assistantTyping} />
      )}

      <ChatInput onSend={send} disabled={disabled || loading} />

      {confirmEnd && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={() => setConfirmEnd(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-[color:var(--border-2)] p-6 shadow-card"
            style={{ background: "var(--bg2)" }}
          >
            <h3 className="text-base font-extrabold tracking-tight mb-1">
              End this session?
            </h3>
            <p className="text-sm text-[color:var(--text-muted)] mb-5">
              You can start a new session anytime from the dashboard.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setConfirmEnd(false)}>
                Keep going
              </Button>
              <Button variant="danger" onClick={handleEnd}>
                End session
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}