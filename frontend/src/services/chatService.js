/**
 * Chat & session REST API service.
 *
 * Created: 10/10/2026
 * Updated: 10/10/2026
 */

import api from "./api.js";

export const chatService = {
  async startSession(topic) {
    const { data } = await api.post("/session/start", { topic });
    return data;
  },

  /**
   * getSessionHistory
   * Accepts an axios config object so callers can pass an
   * AbortSignal for cancellation on unmount.
   */
  async getSessionHistory(sessionId, config = {}) {
    const { data } = await api.get(`/session/${sessionId}/history`, config);
    return data;
  },

  async listMySessions(config = {}) {
    const { data } = await api.get("/session/my-sessions", config);
    return data;
  },

  async endSession(sessionId) {
    const { data } = await api.post(`/session/${sessionId}/end`);
    return data;
  },
};