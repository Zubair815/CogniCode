/**
 * useChatSession
 * Tracks honest per-message delivery state (`sent` | `queued` | `failed`)
 * and guarantees server-side session closure via WebSocket ack + REST fallback.
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
  const [attemptDetected, setAttemptDetected] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const [understandingCheckRequired, setUnderstandingCheckRequired] = useState(false);

  const abortRef = useRef(null);

  useEffect(() => {
    if (!sessionId) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
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
            status: "sent",
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

  const handleReady = useCallback((payload) => {
    setSession((prev) => ({
      id: payload.session_id,
      topic: payload.topic,
      ...(prev || {}),
    }));
  }, []);

  const handleTyping = useCallback(() => setAssistantTyping(true), []);

  const handleMessage = useCallback((payload) => {
    setAssistantTyping(false);
    if (payload.attempt_detected !== undefined) {
      setAttemptDetected(payload.attempt_detected);
    }
    if (payload.hint_level !== undefined) {
      setHintLevel(payload.hint_level);
    }
    if (payload.understanding_check_required !== undefined) {
      setUnderstandingCheckRequired(payload.understanding_check_required);
    }

    const assistantMsg = {
      id: payload.interaction_id || `assistant-${Date.now()}`,
      role: "assistant",
      content: payload.content,
      intent: payload.intent,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [
      ...prev.map((m) => (m.role === "student" && m.status === "queued" ? { ...m, status: "sent" } : m)),
      assistantMsg,
    ]);
  }, []);

  const handleError = useCallback((payload) => {
    setAssistantTyping(false);
    setError(payload.message || "Something went wrong.");
  }, []);

  const handleEnded = useCallback(() => setAssistantTyping(false), []);

  const handleQueueFlush = useCallback((flushedIds) => {
    if (!flushedIds?.length) return;
    const idSet = new Set(flushedIds);
    setMessages((prev) =>
      prev.map((m) => (idSet.has(m.id) ? { ...m, status: "sent" } : m))
    );
    setAssistantTyping(true);
  }, []);

  const handleQueueFailed = useCallback((failedIds, reason) => {
    setAssistantTyping(false);
    if (reason) setError(reason);
    if (!failedIds?.length) return;
    const idSet = new Set(failedIds);
    setMessages((prev) =>
      prev.map((m) => (idSet.has(m.id) ? { ...m, status: "failed" } : m))
    );
  }, []);

  const { status, sendMessage: wsSend, endSession: wsEnd, lastError } =
    useWebSocket({
      sessionId,
      onReady: handleReady,
      onMessage: handleMessage,
      onTyping: handleTyping,
      onError: handleError,
      onEnded: handleEnded,
      onQueueFlush: handleQueueFlush,
      onQueueFailed: handleQueueFailed,
    });

  const effectiveError = error || lastError;

  const send = useCallback(
    (content) => {
      const text = (content || "").trim();
      if (!text) return;

      const clientId = `student-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const res = wsSend(text, clientId);
      if (res.outcome === "invalid") return;

      const studentMsg = {
        id: clientId,
        role: "student",
        content: text,
        timestamp: new Date().toISOString(),
        status: res.outcome, // "sent" | "queued" | "failed"
      };

      setMessages((prev) => [...prev, studentMsg]);
      if (res.outcome === "sent") {
        setAssistantTyping(true);
        setError(null);
      } else if (res.outcome === "queued") {
        setAssistantTyping(false);
        setError("Connection temporarily unavailable — message queued and will send on reconnect.");
      } else {
        setAssistantTyping(false);
        setError(res.reason || "Message could not be sent.");
      }
    },
    [wsSend]
  );

  const end = useCallback(async () => {
    try {
      await wsEnd();
    } catch {
      // ignore WS failure; enforce closure via REST
    }
    if (sessionId) {
      await chatService.endSession(sessionId);
    }
  }, [wsEnd, sessionId]);

  const clearError = useCallback(() => setError(null), []);

  return useMemo(
    () => ({
      session,
      messages,
      loading,
      error: effectiveError,
      wsStatus: status,
      assistantTyping,
      attemptDetected,
      hintLevel,
      understandingCheckRequired,
      send,
      end,
      clearError,
    }),
    [session, messages, loading, effectiveError, status, assistantTyping, attemptDetected, hintLevel, understandingCheckRequired, send, end, clearError]
  );
}
