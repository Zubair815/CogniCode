/**
 * useChatSession
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

    setMessages((prev) => [...prev, assistantMsg]);
  }, []);

  const handleError = useCallback((payload) => {
    setAssistantTyping(false);
    setError(payload.message || "Something went wrong.");
  }, []);

  const handleEnded = useCallback(() => setAssistantTyping(false), []);

  const { status, sendMessage: wsSend, endSession: wsEnd, lastError } =
    useWebSocket({
      sessionId,
      onReady: handleReady,
      onMessage: handleMessage,
      onTyping: handleTyping,
      onError: handleError,
      onEnded: handleEnded,
    });

  const effectiveError = error || lastError;

  const send = useCallback(
    (content) => {
      const text = (content || "").trim();
      if (!text) return;

      const studentMsg = {
        id: `student-${Date.now()}`,
        role: "student",
        content: text,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, studentMsg]);
      setAssistantTyping(true);
      setError(null);
      wsSend(text);
    },
    [wsSend]
  );

  const end = useCallback(() => wsEnd(), [wsEnd]);
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