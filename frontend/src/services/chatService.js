/**
 * Chat & session REST API service.
 *
 * Wraps the session lifecycle endpoints and interaction history.
 * WebSocket chat is handled separately in the useWebSocket hook.
 *
 * Created: 10/10/2026
 */

import api from "./api.js";

export const chatService = {
  /**
   * POST /session/start
   * @param {string} topic - The programming topic
   * @returns {Promise<Object>} SessionResponse
   */
  async startSession(topic) {
    const { data } = await api.post("/session/start", { topic });
    return data;
  },

  /**
   * GET /session/{id}/history
   * @returns {Promise<Object>} SessionHistoryResponse
   */
  async getSessionHistory(sessionId) {
    const { data } = await api.get(`/session/${sessionId}/history`);
    return data;
  },

  /**
   * GET /session/my-sessions
   * @returns {Promise<Object>} SessionListResponse
   */
  async listMySessions() {
    const { data } = await api.get("/session/my-sessions");
    return data;
  },

  /**
   * POST /session/{id}/end
   * @returns {Promise<Object>} SessionResponse
   */
  async endSession(sessionId) {
    const { data } = await api.post(`/session/${sessionId}/end`);
    return data;
  },
};