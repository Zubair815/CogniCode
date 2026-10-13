/**
 * useChatSession
 * --------------
 * Combines the session REST API with the WebSocket layer into a
 * single hook. This is what the Chat page consumes directly.
 *
 * Responsibilities:
 *   - Load session + history on mount (cancellable)
 *   - Maintain the local message list (interactions)
 *   - Manage WS status and connection
 *   - Send messages and reconcile typing/response events
 *   - Surface errors uniformly
 *
 * Created: 10/10/2026
 * Updated: 10/10/2026
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { chatService } from "../services/chatService.js";
import useWebSocket from "./useWebSocket.js";


function isCancel(err) {
  return (
    axios.isCancel?.(err) ||
    err?.name === "CanceledError" ||
    err?.code === "ERR_CANCELED"
  );
}


export default function useChatSession(sessionId) {
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assistantTyping, setAssistantTyping] = useState(false);

  // Tracks the student message that is waiting for a response so we
  // can render it optimistically when the assistant replies.
  const pendingRef = useRef(null);

  // --- Load session + history on mount ---
  useEffect(() => {
    if (!sessionId) return;

    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const history = await chatService.getSessionHistory(sessionId, {
          signal: controller.signal,
        });
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
        if (isCancel(err) || cancelled) return;
        setError(err.message || "Could not load this session.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [sessionId]);

  // --- WebSocket handlers ---
  const handleReady = useCallback((payload) => {
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

  const {
    status,
    sendMessage: wsSend,
    endSession: wsEnd,
    lastError,
  } = useWebSocket({
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

      pendingRef.current = {
        id: `${Date.now()}`,
        content: text,
        timestamp: new Date().toISOString(),
      };

      wsSend(text);
    },
    [wsSend]
  );

  const end = useCallback(() => {
    wsEnd();
  }, [wsEnd]);

  const clearError = useCallback(() => setError(null), []);

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
      clearError,
    }),
    [session, messages, loading, error, status, assistantTyping, send, end, clearError]
  );
}