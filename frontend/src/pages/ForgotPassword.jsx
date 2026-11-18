/**
 * ForgotPassword page.
 *
 * Route: /forgot-password
 *
 * V1: Simple placeholder form. The backend endpoint always returns
 * a generic success message to prevent user enumeration. Actual
 * email delivery is planned for V2.
 *
 * Created: 10/10/2026
 */

import { useState } from "react";
import { Link } from "react-router-dom";

import AuthLayout from "../components/layout/AuthLayout.jsx";
import Button from "../components/ui/Button.jsx";
import Input from "../components/ui/Input.jsx";
import { authService } from "../services/authService.js";
import { ROUTES } from "../constants/routes.js";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      await authService.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
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
          Reset your password
        </h2>
        <p className="text-xs md:text-sm text-[color:var(--text-muted)] mt-1">
          We'll email you a link to reset it.
        </p>
      </div>

      {sent ? (
        <div className="text-center space-y-4">
          <div className="text-4xl">📬</div>
          <p className="text-sm text-[color:var(--text-muted)]">
            If an account exists for <strong>{email}</strong>, a reset link
            has been sent. Please check your inbox and spam folder.
          </p>
          <Link
            to={ROUTES.LOGIN}
            className="inline-block text-sm text-[color:var(--primary-hi)] font-semibold hover:underline"
          >
            ← Back to Sign In
          </Link>
        </div>
      ) : (
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

          {error && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-[color:var(--danger)]/10 border border-[color:var(--danger)]/30 text-xs font-medium text-[color:var(--danger)]">
              {error}
            </div>
          )}

          <Button type="submit" fullWidth loading={loading}>
            {loading ? "Sending…" : "Send Reset Link"}
          </Button>

          <p className="mt-5 text-xs md:text-sm text-center text-[color:var(--text-muted)]">
            Remembered it?{" "}
            <Link
              to={ROUTES.LOGIN}
              className="text-[color:var(--primary-hi)] font-semibold hover:underline"
            >
              Back to Sign In
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}