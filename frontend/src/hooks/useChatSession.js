/**
 * useChatSession
 * --------------
 * Combines the session REST API with the WebSocket layer into a
 * single hook. This is what the Chat page consumes directly.
 *
 * Responsibilities:
 *   - Load session + history on mount
 *   - Maintain the local message list (interactions)
 *   - Manage WS status and connection
 *   - Send messages and reconcile typing/response events
 *   - Surface errors uniformly
 *
 * Message shape used by the UI:
 *   {
 *     id: string,
 *     role: "student" | "assistant",
 *     content: string,
 *     timestamp: string,   // ISO
 *     intent?: string,
 *   }
 *
 * Created: 10/10/2026
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { chatService } from "../services/chatService.js";
import useWebSocket from "./useWebSocket.js";

export default function useChatSession(sessionId) {
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assistantTyping, setAssistantTyping] = useState(false);

  // Track a pending student message until its response arrives, so we
  // can render optimistically and reconcile by interaction_id.
  const pendingRef = useRef(null);

  // --- Load session + history on mount ---
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const history = await chatService.getSessionHistory(sessionId);
        if (cancelled) return;

        setSession({ id: history.session_id, topic: history.topic });

        const flat = [];
        for (const item of history.interactions) {
          flat.push({
            id: `${item.id}-s`,
            role: "student",
            content: item.message,
            timestamp: item.timestamp,
          });
          flat.push({
            id: `${item.id}-a`,
            role: "assistant",
            content: item.response,
            intent: item.intent,
            timestamp: item.timestamp,
          });
        }
        setMessages(flat);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load session.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (sessionId) load();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // --- WebSocket handlers ---
  const handleReady = useCallback((payload) => {
    // Session topic might arrive via ready frame if REST hasn't yet.
    setSession((prev) => ({
      id: payload.session_id,
      topic: payload.topic,
      ...(prev || {}),
    }));
  }, []);

  const handleTyping = useCallback(() => {
    setAssistantTyping(true);
  }, []);

  const handleMessage = useCallback((payload) => {
    setAssistantTyping(false);

    const assistantMsg = {
      id: payload.interaction_id || `local-${Date.now()}`,
      role: "assistant",
      content: payload.content,
      intent: payload.intent,
      timestamp: new Date().toISOString(),
    };

    // Reconcile with any pending optimistic student message.
    const pending = pendingRef.current;
    pendingRef.current = null;

    setMessages((prev) => {
      const next = [...prev];
      if (pending) {
        next.push({
          id: `student-${pending.id}`,
          role: "student",
          content: pending.content,
          timestamp: pending.timestamp,
        });
      }
      next.push(assistantMsg);
      return next;
    });
  }, []);

  const handleError = useCallback((payload) => {
    setAssistantTyping(false);
    setError(payload.message || "Something went wrong.");
  }, []);

  const handleEnded = useCallback(() => {
    setAssistantTyping(false);
  }, []);

  const { status, sendMessage: wsSend, endSession: wsEnd, lastError } =
    useWebSocket({
      sessionId,
      onReady: handleReady,
      onMessage: handleMessage,
      onTyping: handleTyping,
      onError: handleError,
      onEnded: handleEnded,
    });

  // Surface WS errors uniformly.
  useEffect(() => {
    if (lastError) setError(lastError);
  }, [lastError]);

  // --- Public send ---
  const send = useCallback(
    (content) => {
      const text = (content || "").trim();
      if (!text) return;

      // Optimistic render of the student message happens when the
      // assistant replies, so we store it as "pending".
      pendingRef.current = {
        id: `${Date.now()}`,
        content: text,
        timestamp: new Date().toISOString(),
      };

      // Send via WS
      const sent = wsSend(text);
      if (!sent) {
        // queued — will send on reconnect
      }
    },
    [wsSend]
  );

  const end = useCallback(() => {
    wsEnd();
  }, [wsEnd]);

  return useMemo(
    () => ({
      session,
      messages,
      loading,
      error,
      wsStatus: status,
      assistantTyping,
      send,
      end,
      clearError: () => setError(null),
    }),
    [session, messages, loading, error, status, assistantTyping, send, end]
  );
}