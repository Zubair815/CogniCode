/**
 * Axios API client.
 *
 * Responsibilities:
 *   - Single base URL from VITE_API_BASE_URL
 *   - Attaches Authorization: Bearer <token> automatically
 *   - Normalizes error responses from the backend
 *   - On 401, clears the token and notifies listeners
 *
 * The token is stored in memory (module scope), not localStorage.
 * This is safer against XSS. Persistence across refreshes is
 * intentionally not implemented yet — it will be added with a
 * refresh-token cookie flow in a later sprint.
 *
 * Created: 10/10/2026
 * Author: Abdullah (BSEF23M526)
 */

import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// In-memory token store
let _token = null;
let _onUnauthorized = null;

export function setToken(token) {
  _token = token || null;
}

export function getToken() {
  return _token;
}

export function clearToken() {
  _token = null;
}

/**
 * Register a callback fired when the API returns 401.
 * Used by AuthContext to clear session state and redirect.
 */
export function onUnauthorized(callback) {
  _onUnauthorized = callback;
}


const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});


// --- Request interceptor: attach bearer token ---
api.interceptors.request.use((config) => {
  if (_token) {
    config.headers.Authorization = `Bearer ${_token}`;
  }
  return config;
});


// --- Response interceptor: normalize errors + handle 401 ---
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      clearToken();
      if (typeof _onUnauthorized === "function") _onUnauthorized();
    }

    // Normalize the error message. Our backend envelope is:
    //   { error: { code, message, details? }, request_id }
    const backendMessage =
      error.response?.data?.error?.message ||
      error.response?.data?.detail ||
      error.message ||
      "Something went wrong.";

    const normalized = new Error(backendMessage);
    normalized.status = status;
    normalized.code = error.response?.data?.error?.code;
    normalized.details = error.response?.data?.error?.details;
    normalized.raw = error;

    return Promise.reject(normalized);
  }
);


export default api;