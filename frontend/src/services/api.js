/**
 * Axios API client.
 * Created: 10/10/2026
 * Updated: 10/10/2026
 */

import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

let _token = null;
let _onUnauthorized = null;

export function setToken(token) { _token = token || null; }
export function getToken() { return _token; }
export function clearToken() { _token = null; }
export function onUnauthorized(cb) { _onUnauthorized = cb; }

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60s — LLM/slow-network tolerance
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (_token) config.headers.Authorization = `Bearer ${_token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Timeout
    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      const e = new Error("The request took too long. Please try again.");
      e.status = 0;
      e.code = "timeout";
      return Promise.reject(e);
    }

    // Network error (no response)
    if (!error.response) {
      const e = new Error(
        "Cannot reach the server. Please check your connection."
      );
      e.status = 0;
      e.code = "network_error";
      return Promise.reject(e);
    }

    const status = error.response.status;
    if (status === 401) {
      clearToken();
      if (typeof _onUnauthorized === "function") _onUnauthorized();
    }

    const backendMessage =
      error.response?.data?.error?.message ||
      error.response?.data?.detail ||
      error.message ||
      "Something went wrong.";

    const normalized = new Error(backendMessage);
    normalized.status = status;
    normalized.code = error.response?.data?.error?.code;
    normalized.details = error.response?.data?.error?.details;
    return Promise.reject(normalized);
  }
);

export default api;