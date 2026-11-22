/**
 * Login page.
 * Route: /login
 */

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import AuthLayout from "../components/layout/AuthLayout.jsx";
import Alert from "../components/ui/Alert.jsx";
import Button from "../components/ui/Button.jsx";
import Input from "../components/ui/Input.jsx";
import SegmentedControl from "../components/ui/SegmentedControl.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { ROUTES } from "../constants/routes.js";

const ROLES = [
  { value: "student", label: "Student" },
  { value: "instructor", label: "Instructor" },
];

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [role, setRole] = useState("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Enter your email address and password.");
      return;
    }

    setLoading(true);
    try {
      const user = await login({ identifier: email.trim(), password });
      if (user.role !== role) {
        setError(
          `This email is registered as a ${user.role} account. Switch the tab above to "${
            user.role === "instructor" ? "Instructor" : "Student"
          }".`
        );
        return;
      }
      navigate(
        user.role === "instructor"
          ? ROUTES.INSTRUCTOR_DASHBOARD
          : ROUTES.STUDENT_DASHBOARD,
        { replace: true }
      );
    } catch (err) {
      setError(
        err.message || "Unable to sign in. Verify your credentials and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Sign in">
      <div className="mb-5">
        <SegmentedControl
          label="Sign in role"
          options={ROLES}
          value={role}
          onChange={setRole}
          fullWidth
        />
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <Input
          id="email"
          label={role === "instructor" ? "Instructor email" : "Student email"}
          type="email"
          placeholder={
            role === "instructor"
              ? "instructor@university.edu"
              : "student@university.edu"
          }
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          autoFocus
        />

        <Input
          id="password"
          label="Password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        <div className="-mt-2 mb-4 flex justify-end">
          <Link
            to={ROUTES.FORGOT_PASSWORD}
            className="text-xs font-medium text-fg-secondary hover:text-fg transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        {error && (
          <Alert tone="danger" className="mb-4">
            {error}
          </Alert>
        )}

        <Button type="submit" fullWidth size="lg" loading={loading}>
          {loading
            ? "Signing in…"
            : role === "instructor"
            ? "Continue as instructor"
            : "Continue as student"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-fg-secondary">
        Don’t have an account?{" "}
        <Link
          to={ROUTES.REGISTER}
          className="font-medium text-accent-fg hover:underline"
        >
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}
