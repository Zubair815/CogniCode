/**
 * AuthContext
 * Created: 10/10/2026
 * Updated: 10/10/2026
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authService } from "../services/authService.js";
import { onUnauthorized, setToken, getToken, clearToken } from "../services/api.js";

const AuthContext = createContext(null);
const USER_STORAGE_KEY = "cc_auth_user";

function loadStoredUser() {
  try {
    const raw = sessionStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveStoredUser(u) {
  try {
    if (u) sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
    else sessionStorage.removeItem(USER_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (getToken() ? loadStoredUser() : null));
  const [bootstrapped, setBootstrapped] = useState(false);

  // When the API fires 401, clear user state so protected routes
  // redirect to /login.
  useEffect(() => {
    onUnauthorized(() => {
      setUser(null);
      saveStoredUser(null);
      clearToken();
    });
  }, []);

  useEffect(() => {
    let active = true;
    const token = getToken();
    if (!token) {
      setBootstrapped(true);
      return;
    }
    authService
      .me()
      .then((freshUser) => {
        if (!active) return;
        setUser(freshUser);
        saveStoredUser(freshUser);
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        saveStoredUser(null);
        clearToken();
      })
      .finally(() => {
        if (active) setBootstrapped(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async ({ identifier, password }) => {
    const data = await authService.login({ identifier, password });
    setToken(data.access_token);
    setUser(data.user);
    saveStoredUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await authService.register(payload);
    setToken(data.access_token);
    setUser(data.user);
    saveStoredUser(data.user);
    return data.user;
  }, []);

  /**
   * Logout is idempotent and never throws.
   * Even if the server call fails, local state is cleared.
   */
  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // ignore — we still clear local state
    }
    clearToken();
    saveStoredUser(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, login, register, logout, bootstrapped }),
    [user, login, register, logout, bootstrapped]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside an <AuthProvider>.");
  return ctx;
}