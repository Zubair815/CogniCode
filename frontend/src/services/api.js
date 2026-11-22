/**
 * Axios API client.
 * - Short-lived access token kept strictly in memory (never localStorage).
 * - Rotating refresh token sent automatically via HttpOnly cookie (`withCredentials: true`).
 * - Requires VITE_API_BASE_URL in cross-origin production builds or falls back to
 *   same-origin proxy (e.g. Nginx reverse proxy) rather than hardcoding an external URL.
 */

import axios from "axios";

function resolveApiBaseUrl() {
  const configured = (import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/+$/, "");
  if (configured) return configured;
  if (import.meta.env.DEV) return "http://localhost:8000";
  return "";
}

export const API_BASE_URL = resolveApiBaseUrl();

// In-memory short-lived access token only (zero localStorage exposure)
let _token = null;
let _onUnauthorized = null;
let _refreshPromise = null;

export function setToken(token) {
  _token = token || null;
}

export function getToken() {
  return _token;
}

export function clearToken() {
  _token = null;
}

export function onUnauthorized(cb) {
  _onUnauthorized = cb;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export async function refreshAccessToken() {
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = axios
    .post(`${API_BASE_URL}/auth/refresh`, null, {
      withCredentials: true,
      headers: { "Content-Type": "application/json" },
      timeout: 15000,
    })
    .then((res) => {
      const data = res.data;
      setToken(data?.access_token || null);
      return data;
    })
    .finally(() => {
      _refreshPromise = null;
    });
  return _refreshPromise;
}

api.interceptors.request.use((config) => {
  if (_token) config.headers.Authorization = `Bearer ${_token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      const e = new Error("The request took too long. Please try again.");
      e.status = 0;
      e.code = "timeout";
      return Promise.reject(e);
    }

    if (!error.response) {
      const e = new Error("Cannot reach the server. Please check your connection.");
      e.status = 0;
      e.code = "network_error";
      return Promise.reject(e);
    }

    const originalRequest = error.config;
    const status = error.response.status;
    const reqUrl = originalRequest?.url || "";
    const isAuthRoute =
      reqUrl.includes("/auth/login") ||
      reqUrl.includes("/auth/register") ||
      reqUrl.includes("/auth/refresh");

    if (status === 401 && originalRequest && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true;
      try {
        const refreshed = await refreshAccessToken();
        if (refreshed?.access_token) {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${refreshed.access_token}`;
          return api(originalRequest);
        }
      } catch {
        // Refresh failed -> force re-authentication
      }
      clearToken();
      if (typeof _onUnauthorized === "function") _onUnauthorized();
    } else if (status === 401 && !isAuthRoute) {
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
