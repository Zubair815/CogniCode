/**
 * Chat page.
 * Created: 10/10/2026
 * Updated: 10/10/2026
 */

import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, X, Bot, CheckCircle2, MessageCircleQuestion, Lightbulb, Sparkles } from "lucide-react";

import ChatHeader from "../components/chat/ChatHeader.jsx";
import ChatInput from "../components/chat/ChatInput.jsx";
import MessageList from "../components/chat/MessageList.jsx";
import StartSessionModal from "../components/chat/StartSessionModal.jsx";
import Button from "../components/ui/Button.jsx";
import useChatSession from "../hooks/useChatSession.js";
import { chatService } from "../services/chatService.js";
import { ROUTES, chatRoute } from "../constants/routes.js";

export default function Chat() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!sessionId || sessionId === "active") {
      chatService
        .listMySessions()
        .then((data) => {
          const active = data?.sessions?.find((s) => !s.ended_at);
          if (active) {
            navigate(chatRoute(active.id), { replace: true });
          } else if (data?.sessions?.length) {
            navigate(chatRoute(data.sessions[0].id), { replace: true });
          } else {
            setModalOpen(true);
          }
        })
        .catch(() => {
          setModalOpen(true);
        });
    }
  }, [sessionId, navigate]);

  const {
    session,
    messages,
    loading,
    error,
    wsStatus,
    assistantTyping,
    attemptDetected,
    hintLevel,
    understandingCheckRequired,
    send,
    end,
    clearError,
  } = useChatSession(sessionId);

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
  const aiUnavailable = wsStatus === "error" || wsStatus === "closed";

  return (
    <div className="h-screen flex flex-col bg-[color:var(--bg)] text-[color:var(--text)]">
      <ChatHeader
        topic={session?.topic}
        wsStatus={wsStatus}
        onEnd={() => setConfirmEnd(true)}
      />

      {/* Attempt & Hint Status Bar */}
      <div className="px-4 md:px-6 py-2.5 border-b border-[color:var(--border)] bg-[color:var(--surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {attemptDetected ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[color:var(--success)]">
              <CheckCircle2 size={14} />
              Attempt detected — Guidance active
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[color:var(--warning)]">
              <MessageCircleQuestion size={14} />
              Awaiting attempt — Socratic mode active
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] text-[color:var(--text-muted)] flex items-center gap-1">
            <Lightbulb size={12} className={hintLevel > 0 ? "text-[color:var(--warning)]" : "opacity-40"} />
            Hint Level: {hintLevel > 0 ? `${hintLevel}/5` : "None"}
          </span>
          <button
            onClick={() => send("Can you give me a progressive hint?")}
            disabled={disabled || loading}
            className="text-[11px] font-semibold text-[color:var(--primary)] hover:underline flex items-center gap-1 disabled:opacity-40"
          >
            <Sparkles size={12} />
            Ask for Hint
          </button>
        </div>
      </div>

      {understandingCheckRequired && (
        <div className="mx-4 md:mx-6 mt-2.5 px-3.5 py-2 rounded-xl bg-[color:var(--primary)]/10 border border-[color:var(--primary)]/30 flex items-center justify-between text-xs text-[color:var(--text)]">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-[color:var(--primary)] shrink-0" />
            <span><strong>Conceptual Check Required:</strong> Reply with A, B, C, or D to unlock Level 3+ pseudocode.</span>
          </div>
        </div>
      )}

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
        <>
        {aiUnavailable && (
          <div className="mx-4 md:mx-6 mt-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 text-sm">
            <div className="flex items-center gap-2 font-semibold"><Bot size={16} /> AI tutor is unavailable</div>
            <p className="mt-1 text-[color:var(--text-muted)]">You can still present the session flow. The AI reply requires Ollama or an API key.</p>
            <div className="mt-3 rounded-lg bg-[color:var(--surface-2)] p-3 text-xs text-[color:var(--text-muted)]">
              Demo prompt: “Can you explain recursion?”<br />
              Expected behavior: CogniCode guides the learner with a question before giving a complete solution.
            </div>
          </div>
        )}
        <MessageList messages={messages} typing={assistantTyping} />
        </>
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

      <StartSessionModal
        open={modalOpen}
        onClose={() => navigate(ROUTES.STUDENT_DASHBOARD)}
        onCreated={(s) => navigate(chatRoute(s.id), { replace: true })}
      />
    </div>
  );
}
