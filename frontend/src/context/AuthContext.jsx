/* eslint-disable react-refresh/only-export-components */
/**
 * AuthContext
 * -----------
 * Manages authenticated user session, JWT persistence, and one-click
 * Student / Instructor demo workspace switching.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authService } from "../services/authService.js";
import { onUnauthorized, setToken, getToken, clearToken } from "../services/api.js";

const AuthContext = createContext(null);

const DEMO_ACCOUNTS = {
  student: {
    name: "Abdullah (Student)",
    email: "demo.student@cognicode.edu",
    password: "DemoPassword123",
    role: "student",
    preferred_language: "Python",
    institution: "PUCIT",
  },
  instructor: {
    name: "Sanam Ahmad (Instructor)",
    email: "demo.instructor@cognicode.edu",
    password: "DemoPassword123",
    role: "instructor",
    preferred_language: "Python",
    institution: "PUCIT",
  },
};

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
    async function restoreSession() {
      const token = getToken();
      if (token) {
        try {
          const profile = await authService.me();
          setUser(profile);
        } catch {
          clearToken();
          setUser(null);
        }
      }
      setBootstrapped(true);
    }
    restoreSession();
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
   * Sign in with a real backend demo account for "student" or "instructor".
   * Auto-registers the demo account on first use so all backend endpoints
   * and WebSockets have a valid signed JWT.
   */
  const loginAsDemo = useCallback(async (targetRole = "student") => {
    const role = targetRole === "instructor" ? "instructor" : "student";
    const preset = DEMO_ACCOUNTS[role];

    try {
      const data = await authService.login({
        identifier: preset.email,
        password: preset.password,
      });
      setToken(data.access_token);
      setUser(data.user);
      return data.user;
    } catch {
      try {
        const data = await authService.register(preset);
        setToken(data.access_token);
        setUser(data.user);
        return data.user;
      } catch {
        // Offline fallback so UI preview still works if backend is stopped
        const fallbackUser = {
          id: `demo-${role}`,
          name: preset.name,
          email: preset.email,
          role: preset.role,
          preferred_language: preset.preferred_language,
          institution: preset.institution,
        };
        setUser(fallbackUser);
        return fallbackUser;
      }
    }
  }, []);

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
    () => ({ user, login, register, loginAsDemo, logout, bootstrapped }),
    [user, login, register, loginAsDemo, logout, bootstrapped]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside an <AuthProvider>.");
  return ctx;
}
