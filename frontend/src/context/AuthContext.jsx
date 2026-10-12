/**
 * AuthContext
 * -----------
 * Holds the authenticated user in memory for the entire app.
 *
 * Flow:
 *   - login(identifier, password)   → calls authService.login,
 *                                     stores token + user
 *   - register(payload)             → calls authService.register,
 *                                     stores token + user
 *   - logout()                      → clears token + user
 *   - On any 401 from the API, the api client fires onUnauthorized,
 *     which clears state here automatically.
 *
 * The token lives in the api module's memory (see services/api.js),
 * not in this context. This keeps a single source of truth.
 *
 * Created: 10/10/2026
 * Author: Abdullah (BSEF23M526)
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authService } from "../services/authService.js";
import { onUnauthorized, setToken, clearToken } from "../services/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  // --- Handle API-triggered logouts ---
  useEffect(() => {
    onUnauthorized(() => {
      setUser(null);
    });
  }, []);

  // --- Mark the context as ready for consumption ---
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

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore network errors on logout — state is cleared either way.
    } finally {
      clearToken();
      setUser(null);
    }
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