/**
 * Chat
 * ----
 * Primary conversational AI workspace.
 * Structure:
 *   AppLayout (Left sidebar + main viewport)
 *     ├── ChatHeader (topic, connection status, Socratic mode, hint level, actions)
 *     ├── Inline notices (conceptual check gate, connection/error banner)
 *     ├── MessageList (centered 768px conversation stream or empty starter)
 *     └── ChatInput (centered 768px bottom composer)
 */

import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import AppLayout from "../components/layout/AppLayout.jsx";
import ChatHeader from "../components/chat/ChatHeader.jsx";
import ChatInput from "../components/chat/ChatInput.jsx";
import MessageList from "../components/chat/MessageList.jsx";
import StartSessionModal from "../components/chat/StartSessionModal.jsx";
import Alert from "../components/ui/Alert.jsx";
import Button from "../components/ui/Button.jsx";
import Modal from "../components/ui/Modal.jsx";
import Spinner from "../components/ui/Spinner.jsx";
import useChatSession from "../hooks/useChatSession.js";
import { chatService } from "../services/chatService.js";
import { ROUTES, chatRoute } from "../constants/routes.js";

export default function Chat() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const isPlaceholderId = !sessionId || sessionId === "active";
  const effectiveSessionId = isPlaceholderId ? null : sessionId;
  const resolvingActive = isPlaceholderId && !modalOpen;

  useEffect(() => {
    if (!isPlaceholderId) return undefined;
    let active = true;
    chatService
      .listMySessions()
      .then((data) => {
        if (!active) return;
        const openSess = data?.sessions?.find((s) => !s.ended_at);
        if (openSess) {
          navigate(chatRoute(openSess.id), { replace: true });
        } else if (data?.sessions?.length) {
          navigate(chatRoute(data.sessions[0].id), { replace: true });
        } else {
          setModalOpen(true);
        }
      })
      .catch(() => {
        if (active) setModalOpen(true);
      });
    return () => {
      active = false;
    };
  }, [isPlaceholderId, navigate]);

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
  } = useChatSession(effectiveSessionId);

  useEffect(() => {
    if (!error) return undefined;
    const fatal =
      error.includes("do not have access") ||
      error.includes("not found") ||
      error.includes("Authentication failed");
    if (fatal) {
      const id = setTimeout(() => {
        navigate(ROUTES.STUDENT_DASHBOARD, { replace: true });
      }, 900);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [error, navigate]);

  const handleEnd = useCallback(() => {
    end();
    setConfirmEnd(false);
    setTimeout(() => navigate(ROUTES.STUDENT_DASHBOARD), 200);
  }, [end, navigate]);

  const disabled = wsStatus !== "open" || !effectiveSessionId;
  const aiUnavailable =
    Boolean(effectiveSessionId) && (wsStatus === "error" || wsStatus === "closed");

  const headerNode = (
    <ChatHeader
      topic={session?.topic}
      wsStatus={wsStatus}
      attemptDetected={attemptDetected}
      hintLevel={hintLevel}
      disabled={disabled || loading}
      onAskHint={() => send("Can you give me a progressive hint?")}
      onNewSession={() => setModalOpen(true)}
      onEnd={() => setConfirmEnd(true)}
    />
  );

  return (
    <AppLayout fullHeight headerSlot={headerNode}>
      {/* Inline status banners centered to the conversation width */}
      {(understandingCheckRequired || error || aiUnavailable) && (
        <div className="mx-auto w-full max-w-content px-4 pt-3 md:px-6 space-y-2">
          {understandingCheckRequired && (
            <Alert tone="info" title="Conceptual check required">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  Reply with option A, B, C, or D to verify conceptual understanding and access Level 3+ pseudocode.
                </span>
                <div className="flex items-center gap-1">
                  {["A", "B", "C", "D"].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      disabled={disabled}
                      onClick={() => send(opt)}
                      className="h-7 w-7 rounded-md border border-line bg-canvas text-xs font-semibold text-fg hover:bg-hover disabled:opacity-40"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </Alert>
          )}

          {error && (
            <Alert tone="danger" onDismiss={clearError}>
              {error}
            </Alert>
          )}

          {aiUnavailable && !loading && (
            <Alert
              tone="warning"
              title="Reconnecting to tutoring server"
              action={{
                label: "New session",
                onClick: () => setModalOpen(true),
              }}
            >
              Real-time chat requires an active WebSocket connection and configured LLM provider.
            </Alert>
          )}
        </div>
      )}

      {/* Main conversation stream */}
      {resolvingActive || (loading && effectiveSessionId) ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-fg-secondary">
            <Spinner size={16} />
            <span>Loading conversation…</span>
          </div>
        </div>
      ) : (
        <MessageList
          messages={messages}
          typing={assistantTyping}
          topic={session?.topic}
          disabled={disabled}
          onSelectPrompt={(prompt) => send(prompt)}
        />
      )}

      {/* Bottom ChatGPT-style composer */}
      <ChatInput
        onSend={send}
        disabled={disabled || loading || resolvingActive}
        busy={assistantTyping}
        disabledReason={
          !effectiveSessionId
            ? "Start or select a session to begin chatting…"
            : wsStatus === "connecting"
            ? "Connecting to session…"
            : "Connection closed — refresh or start a new session."
        }
      />

      {/* End session confirmation dialog */}
      <Modal
        open={confirmEnd}
        onClose={() => setConfirmEnd(false)}
        title="End this tutoring session?"
        description="Your conversation history and Cognitive Dependency Score will be saved. You can start or resume a session anytime."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmEnd(false)}>
              Continue session
            </Button>
            <Button variant="danger" onClick={handleEnd}>
              End session
            </Button>
          </>
        }
      />

      {/* Start new session dialog */}
      <StartSessionModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          if (!effectiveSessionId) navigate(ROUTES.STUDENT_DASHBOARD);
        }}
        onCreated={(s) => {
          setModalOpen(false);
          navigate(chatRoute(s.id), { replace: true });
        }}
      />
    </AppLayout>
  );
}
