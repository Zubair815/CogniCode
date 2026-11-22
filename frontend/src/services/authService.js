/**
 * Auth API service.
 */

import api, { refreshAccessToken } from "./api.js";

export const authService = {
  async register(payload) {
    const { data } = await api.post("/auth/register", payload);
    return data;
  },

  async login(payload) {
    const { data } = await api.post("/auth/login", payload);
    return data;
  },

  async refresh() {
    return refreshAccessToken();
  },

  async me() {
    const { data } = await api.get("/auth/me");
    return data;
  },

  async createWsTicket(sessionId = null) {
    const { data } = await api.post("/auth/ws-ticket", {
      session_id: sessionId,
    });
    return data;
  },

  async logout() {
    const { data } = await api.post("/auth/logout");
    return data;
  },

  async forgotPassword(email) {
    const { data } = await api.post("/auth/forgot-password", { email });
    return data;
  },
};
