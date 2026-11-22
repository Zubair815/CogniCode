/* eslint-disable react-refresh/only-export-components */
/**
 * AuthContext
 * -----------
 * Manages authenticated user session with in-memory short-lived access JWTs
 * restored from an HttpOnly rotating refresh cookie on page load.
 * Contains zero embedded credentials or offline mock authentication.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authService } from "../services/authService.js";
import { onUnauthorized, setToken, clearToken } from "../services/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    onUnauthorized(() => {
      setUser(null);
      clearToken();
    });
  }, []);

  useEffect(() => {
    let active = true;
    async function restoreSession() {
      try {
        const data = await authService.refresh();
        if (active && data?.user && data?.access_token) {
          setToken(data.access_token);
          setUser(data.user);
        }
      } catch {
        clearToken();
        if (active) setUser(null);
      } finally {
        if (active) setBootstrapped(true);
      }
    }
    restoreSession();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async ({ identifier, password }) => {
    const data = await authService.login({ identifier, password });
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await authService.register(payload);
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // ignore — always clear local in-memory state
    }
    clearToken();
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
