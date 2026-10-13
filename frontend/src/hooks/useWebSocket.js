/**
 * useWebSocket
 * ------------
 * Manages a WebSocket connection with:
 *   - Auto-reconnect with exponential backoff
 *   - Message queue for messages sent while disconnected
 *   - Ready/typing/response/error message dispatch
 *   - Clean close on unmount
 *
 * The hook is session-scoped: it connects to /ws/chat/{sessionId}
 * with the current JWT as a query param.
 *
 * Usage:
 *   const {
 *     status,        // "connecting" | "open" | "closed"
 *     sendMessage,   // (content: string) => boolean
 *     endSession,    // () => void
 *     lastError,
 *   } = useWebSocket({
 *     sessionId,
 *     onReady,       // (payload) => void
 *     onMessage,     // (payload) => void
 *     onTyping,      // () => void
 *     onError,       // (payload) => void
 *     onEnded,       // (payload) => void
 *   });
 *
 * Created: 10/10/2026
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { getToken } from "../services/api.js";

const WS_BASE_URL =
  import.meta.env.VITE_WS_BASE_URL || "ws://localhost:8000";

const MAX_RECONNECT_DELAY_MS = 10000;
const BASE_RECONNECT_DELAY_MS = 800;

export default function useWebSocket({
  sessionId,
  onReady,
  onMessage,
  onTyping,
  onError,
  onEnded,
} = {}) {
  const [status, setStatus] = useState("connecting");
  const [lastError, setLastError] = useState(null);

  const socketRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const queuedRef = useRef([]);
  const manualCloseRef = useRef(false);
  const handlersRef = useRef({ onReady, onMessage, onTyping, onError, onEnded });


    // Reset error when sessionId changes — prevents stale errors
  // from a previous session leaking into the new one.
  useEffect(() => {
    setLastError(null);
  }, [sessionId]);
  
  // Keep handlers fresh without restarting the socket.
  useEffect(() => {
    handlersRef.current = { onReady, onMessage, onTyping, onError, onEnded };
  }, [onReady, onMessage, onTyping, onError, onEnded]);

  // --- Connection setup ---
  useEffect(() => {
    if (!sessionId) return;

    manualCloseRef.current = false;
    reconnectAttemptsRef.current = 0;

    const connect = () => {
      const token = getToken();
      if (!token) {
        setStatus("closed");
        setLastError("No auth token available.");
        return;
      }

      setStatus("connecting");
      const url = `${WS_BASE_URL}/ws/chat/${sessionId}?token=${encodeURIComponent(token)}`;

      let socket;
      try {
        socket = new WebSocket(url);
      } catch (err) {
        setLastError("Failed to open WebSocket.");
        scheduleReconnect();
        return;
      }
      socketRef.current = socket;

      socket.onopen = () => {
        setStatus("open");
        setLastError(null);
        reconnectAttemptsRef.current = 0;

        // Flush queued messages
        while (queuedRef.current.length > 0) {
          const payload = queuedRef.current.shift();
          try {
            socket.send(JSON.stringify(payload));
          } catch {
            queuedRef.current.unshift(payload);
            break;
          }
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
            h.onEnded?.(data);
            break;
          case "pong":
            // keep-alive reply — no UI action
            break;
          default:
            break;
        }
      };

      socket.onclose = (event) => {
        setStatus("closed");
        socketRef.current = null;

        // 4401/4403 are fatal: do not reconnect.
        if (event.code === 4401 || event.code === 4403) {
          setLastError(
            event.code === 4401
              ? "Authentication failed. Please sign in again."
              : "You do not have access to this session."
          );
          return;
        }
        if (manualCloseRef.current) return;

        scheduleReconnect();
      };

      socket.onerror = () => {
        // The browser fires onclose next; we handle reconnect there.
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
        if (!manualCloseRef.current) connect();
      }, delay);
    };

    connect();

    return () => {
      manualCloseRef.current = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // --- Send a chat message ---
  const sendMessage = useCallback((content) => {
    if (!content || !content.trim()) return false;
    const payload = { type: "chat", content: content.trim() };

    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify(payload));
        return true;
      } catch {
        // fall through to queue
      }
    }
    queuedRef.current.push(payload);
    return false;
  }, []);

  // --- End session gracefully ---
  const endSession = useCallback(() => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify({ type: "session_end" }));
      } catch {
        // ignore
      }
    }
  }, []);

  return { status, sendMessage, endSession, lastError };
}