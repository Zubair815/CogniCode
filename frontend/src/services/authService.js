/**
 * Auth API service.
 *
 * Created: 10/10/2026
 * Updated: 10/10/2026
 */

import api from "./api.js";

export const authService = {
  async register(payload) {
    const { data } = await api.post("/auth/register", payload);
    return data;
  },

  async login(payload) {
    const { data } = await api.post("/auth/login", payload);
    return data;
  },

  async me() {
    const { data } = await api.get("/auth/me");
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