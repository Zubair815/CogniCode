/**
 * useWebSocket
 * ------------
 * Session-scoped WebSocket hook using single-use short-lived auth tickets
 * (never placing JWTs in URLs), bounded outgoing queue, and ack-aware ending.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../services/api.js";
import { authService } from "../services/authService.js";

function resolveWsBaseUrl() {
  const configured = (import.meta.env.VITE_WS_BASE_URL || "").trim();
  if (configured) {
    return configured
      .replace(/\/+$/, "")
      .replace(/^https:\/\//i, "wss://")
      .replace(/^http:\/\//i, "ws://");
  }
  if (API_BASE_URL) {
    return API_BASE_URL
      .replace(/\/+$/, "")
      .replace(/^https:\/\//i, "wss://")
      .replace(/^http:\/\//i, "ws://");
  }
  if (typeof window !== "undefined") {
    return window.location.origin
      .replace(/\/+$/, "")
      .replace(/^https:\/\//i, "wss://")
      .replace(/^http:\/\//i, "ws://");
  }
  return "ws://localhost:8000";
}

const WS_BASE_URL = resolveWsBaseUrl();

const MAX_RECONNECT_DELAY_MS = 10000;
const BASE_RECONNECT_DELAY_MS = 800;
const MAX_QUEUE_SIZE = 10;

export default function useWebSocket({
  sessionId,
  onReady,
  onMessage,
  onTyping,
  onError,
  onEnded,
  onQueueFlush,
  onQueueFailed,
} = {}) {
  const [status, setStatus] = useState("connecting");
  const [lastError, setLastError] = useState(null);

  const socketRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const queuedRef = useRef([]);
  const manualCloseRef = useRef(false);
  const fatalCloseRef = useRef(false);
  const endResolveRef = useRef(null);
  const handlersRef = useRef({
    onReady,
    onMessage,
    onTyping,
    onError,
    onEnded,
    onQueueFlush,
    onQueueFailed,
  });

  useEffect(() => {
    handlersRef.current = {
      onReady,
      onMessage,
      onTyping,
      onError,
      onEnded,
      onQueueFlush,
      onQueueFailed,
    };
  }, [onReady, onMessage, onTyping, onError, onEnded, onQueueFlush, onQueueFailed]);

  useEffect(() => {
    if (!sessionId) return;

    manualCloseRef.current = false;
    fatalCloseRef.current = false;
    reconnectAttemptsRef.current = 0;

    const failQueued = (reason) => {
      if (queuedRef.current.length > 0) {
        const failedIds = queuedRef.current.map((item) => item.clientId).filter(Boolean);
        queuedRef.current = [];
        handlersRef.current.onQueueFailed?.(failedIds, reason);
      }
    };

    const connect = async () => {
      if (manualCloseRef.current || fatalCloseRef.current) return;

      setStatus("connecting");
      let ticket;
      try {
        const resp = await authService.createWsTicket(sessionId);
        ticket = resp?.ticket;
      } catch (err) {
        if (manualCloseRef.current) return;
        const msg = err?.message || "Failed to obtain WebSocket session ticket.";
        setStatus("closed");
        setLastError(msg);
        if (err?.status === 401 || err?.status === 403) {
          fatalCloseRef.current = true;
          failQueued(msg);
          return;
        }
        scheduleReconnect();
        return;
      }

      if (!ticket || manualCloseRef.current) return;

      const url = `${WS_BASE_URL}/ws/chat/${sessionId}?ticket=${encodeURIComponent(ticket)}`;

      let socket;
      try {
        socket = new WebSocket(url);
      } catch {
        setLastError("Failed to open WebSocket.");
        scheduleReconnect();
        return;
      }
      socketRef.current = socket;

      socket.onopen = () => {
        setStatus("open");
        setLastError(null);
        reconnectAttemptsRef.current = 0;

        const flushedIds = [];
        while (queuedRef.current.length > 0) {
          const item = queuedRef.current.shift();
          try {
            socket.send(JSON.stringify(item.payload));
            if (item.clientId) flushedIds.push(item.clientId);
          } catch {
            queuedRef.current.unshift(item);
            break;
          }
        }
        if (flushedIds.length > 0) {
          handlersRef.current.onQueueFlush?.(flushedIds);
        }
      };

      socket.onmessage = (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }
        if (!data || typeof data !== "object") return;

        const h = handlersRef.current;
        switch (data.type) {
          case "ready":
            h.onReady?.(data);
            break;
          case "typing":
            h.onTyping?.();
            break;
          case "response":
            h.onMessage?.(data);
            break;
          case "error":
            setLastError(data.message || "Unknown error");
            h.onError?.(data);
            break;
          case "session_ended":
            if (endResolveRef.current) {
              endResolveRef.current(true);
              endResolveRef.current = null;
            }
            h.onEnded?.(data);
            break;
          case "pong":
            break;
          default:
            break;
        }
      };

      socket.onclose = (event) => {
        setStatus("closed");
        socketRef.current = null;

        if (event.code === 4401 || event.code === 4403) {
          fatalCloseRef.current = true;
          const msg =
            event.code === 4401
              ? "Authentication failed. Please sign in again."
              : "You do not have access to this session.";
          setLastError(msg);
          failQueued(msg);
          return;
        }
        if (manualCloseRef.current) return;

        scheduleReconnect();
      };

      socket.onerror = () => {
        // Reconnect handling occurs in onclose.
      };
    };

    const scheduleReconnect = () => {
      const attempts = reconnectAttemptsRef.current;
      const delay = Math.min(
        BASE_RECONNECT_DELAY_MS * 2 ** attempts,
        MAX_RECONNECT_DELAY_MS
      );
      reconnectAttemptsRef.current += 1;

      reconnectTimerRef.current = setTimeout(() => {
        if (!manualCloseRef.current && !fatalCloseRef.current) connect();
      }, delay);
    };

    connect();

    return () => {
      manualCloseRef.current = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (endResolveRef.current) {
        endResolveRef.current(false);
        endResolveRef.current = null;
      }
      const socket = socketRef.current;
      if (socket && socket.readyState <= 1) {
        try {
          socket.close(1000, "component_unmount");
        } catch {
          // ignore
        }
      }
      socketRef.current = null;
    };
  }, [sessionId]);

  const sendMessage = useCallback((content, clientId = null) => {
    if (!content || !content.trim()) return { outcome: "invalid" };
    if (fatalCloseRef.current) {
      return { outcome: "failed", reason: "Session connection closed." };
    }

    const payload = { type: "chat", content: content.trim() };
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify(payload));
        return { outcome: "sent" };
      } catch {
        // Fall through to bounded queue
      }
    }

    if (queuedRef.current.length >= MAX_QUEUE_SIZE) {
      return { outcome: "failed", reason: "Offline message queue is full." };
    }
    queuedRef.current.push({ clientId, payload });
    return { outcome: "queued" };
  }, []);

  const endSession = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return Promise.resolve(false);
    }
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        if (endResolveRef.current) {
          endResolveRef.current = null;
          resolve(false);
        }
      }, 1500);

      endResolveRef.current = (acked) => {
        clearTimeout(timeoutId);
        resolve(Boolean(acked));
      };

      try {
        socket.send(JSON.stringify({ type: "session_end" }));
      } catch {
        clearTimeout(timeoutId);
        endResolveRef.current = null;
        resolve(false);
      }
    });
  }, []);

  return { status, sendMessage, endSession, lastError };
}
