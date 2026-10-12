/**
 * Login page.
 *
 * Route: /login
 *
 * Behavior:
 *   - Accepts email + password.
 *   - Password field has show/hide toggle.
 *   - "Forgot password?" link is always visible.
 *   - On success, redirects by role.
 *
 * Created: 10/10/2026
 * Updated: 10/10/2026
 */

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import AuthLayout from "../components/layout/AuthLayout.jsx";
import Button from "../components/ui/Button.jsx";
import Input from "../components/ui/Input.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { ROUTES } from "../constants/routes.js";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const user = await login({ identifier: email.trim(), password });
      navigate(
        user.role === "student"
          ? ROUTES.STUDENT_DASHBOARD
          : ROUTES.INSTRUCTOR_DASHBOARD,
        { replace: true }
      );
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div
        className="text-center mb-6"
        style={{ animation: "ccFadeUp 0.5s ease both" }}
      >
        <h2 className="text-lg md:text-xl font-extrabold tracking-tight">
          Welcome back 👋
        </h2>
        <p className="text-xs md:text-sm text-[color:var(--text-muted)] mt-1">
          Sign in to continue your session
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <Input
          id="email"
          label="Email"
          type="email"
          placeholder="you@university.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          autoFocus
        />

        <Input
          id="password"
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        {/* Forgot password — always visible */}
        <div className="flex justify-end -mt-1.5 mb-3">
          <Link
            to={ROUTES.FORGOT_PASSWORD}
            className="text-xs font-medium text-[color:var(--text-muted)] hover:text-[color:var(--primary-hi)] transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        {error && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-[color:var(--danger)]/10 border border-[color:var(--danger)]/30 text-xs font-medium text-[color:var(--danger)]">
            {error}
          </div>
        )}

        <Button type="submit" fullWidth loading={loading}>
          {loading ? "Signing in…" : "Sign In"}
        </Button>
      </form>

      <p className="mt-5 text-xs md:text-sm text-center text-[color:var(--text-muted)]">
        New here?{" "}
        <Link
          to={ROUTES.REGISTER}
          className="text-[color:var(--primary-hi)] font-semibold hover:underline"
        >
          Create an account →
        </Link>
      </p>
    </AuthLayout>
  );
}