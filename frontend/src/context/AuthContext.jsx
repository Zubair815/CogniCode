/**
 * AuthContext
 * Created: 10/10/2026
 * Updated: 10/10/2026
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authService } from "../services/authService.js";
import { onUnauthorized, setToken, clearToken } from "../services/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  // When the API fires 401, clear user state so protected routes
  // redirect to /login.
  useEffect(() => {
    onUnauthorized(() => {
      setUser(null);
      clearToken();
    });
  }, []);

  useEffect(() => {
    setBootstrapped(true);
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