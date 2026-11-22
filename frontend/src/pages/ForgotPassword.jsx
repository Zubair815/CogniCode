/**
 * ForgotPassword page.
 * Route: /forgot-password
 */

import { useState } from "react";
import { Link } from "react-router-dom";

import AuthLayout from "../components/layout/AuthLayout.jsx";
import Alert from "../components/ui/Alert.jsx";
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
      setError("Enter the email address associated with your account.");
      return;
    }

    setLoading(true);
    try {
      await authService.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.message || "Unable to send reset instructions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Reset your password">
      {sent ? (
        <div className="space-y-4">
          <Alert tone="success" title="Check your email">
            If an account exists for <strong className="font-medium text-fg">{email}</strong>, we’ve sent instructions to reset your password.
          </Alert>
          <div className="text-center">
            <Link
              to={ROUTES.LOGIN}
              className="text-sm font-medium text-accent-fg hover:underline"
            >
              Return to sign in
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <Input
            id="email"
            label="Email address"
            type="email"
            placeholder="you@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoFocus
          />

          {error && (
            <Alert tone="danger" className="mb-4">
              {error}
            </Alert>
          )}

          <Button type="submit" fullWidth size="lg" loading={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </Button>

          <p className="mt-5 text-center text-sm text-fg-secondary">
            Remembered your password?{" "}
            <Link
              to={ROUTES.LOGIN}
              className="font-medium text-accent-fg hover:underline"
            >
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
