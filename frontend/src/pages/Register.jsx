/**
 * Register page.
 *
 * Route: /register
 *
 * Behavior:
 *   - Role selector: Student / Instructor
 *   - Optional institution field (free text)
 *   - Password field has show/hide toggle
 *   - No PUCIT-specific logic
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

const ROLES = [
  { value: "student", label: "Student" },
  { value: "instructor", label: "Instructor" },
];

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [role, setRole] = useState("student");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    preferred_language: "Python",
    institution: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError("Please fill in the required fields.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      role,
      preferred_language: form.preferred_language,
      institution: form.institution.trim() || null,
    };

    setLoading(true);
    try {
      const user = await register(payload);
      navigate(
        user.role === "student"
          ? ROUTES.STUDENT_DASHBOARD
          : ROUTES.INSTRUCTOR_DASHBOARD,
        { replace: true }
      );
    } catch (err) {
      setError(err.message || "Registration failed.");
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
          Create your account ✨
        </h2>
        <p className="text-xs md:text-sm text-[color:var(--text-muted)] mt-1">
          {/* Join CogniCode in 30 seconds */}
        </p>
      </div>

      {/* Role selector */}
      <div className="grid grid-cols-2 gap-2 mb-5 p-1 bg-[color:var(--surface)] rounded-control">
        {ROLES.map((r) => {
          const active = role === r.value;
          return (
            <button
              key={r.value}
              type="button"
              onClick={() => setRole(r.value)}
              className={[
                "py-2 rounded-md text-sm font-semibold transition-colors",
                active
                  ? "text-white"
                  : "text-[color:var(--text-subtle)] hover:text-[color:var(--text)]",
              ].join(" ")}
              style={active ? { background: "var(--gradient-primary)" } : undefined}
            >
              {r.label}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <Input
          id="name"
          label="Full Name"
          placeholder="Your full name"
          value={form.name}
          onChange={update("name")}
          autoComplete="name"
        />

        <Input
          id="email"
          label="Email"
          type="email"
          placeholder="you@university.edu"
          value={form.email}
          onChange={update("email")}
          autoComplete="email"
        />

        <Input
          id="password"
          label="Password"
          type="password"
          placeholder="Min 8 chars · 1 letter · 1 digit"
          value={form.password}
          onChange={update("password")}
          autoComplete="new-password"
        />

        {role === "student" && (
          <Input
            id="preferred_language"
            label="Preferred Language"
            placeholder="Python"
            value={form.preferred_language}
            onChange={update("preferred_language")}
          />
        )}

        <Input
          id="institution"
          label="Institution (optional)"
          placeholder="Your university, college, or self-study"
          value={form.institution}
          onChange={update("institution")}
          hint="Leave empty if you are an independent learner"
        />

        {error && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-[color:var(--danger)]/10 border border-[color:var(--danger)]/30 text-xs font-medium text-[color:var(--danger)]">
            {error}
          </div>
        )}

        <Button type="submit" fullWidth loading={loading}>
          {loading ? "Creating account…" : "Create Account"}
        </Button>
      </form>

      <p className="mt-5 text-xs md:text-sm text-center text-[color:var(--text-muted)]">
        Already have an account?{" "}
        <Link
          to={ROUTES.LOGIN}
          className="text-[color:var(--primary-hi)] font-semibold hover:underline"
        >
          Sign in →
        </Link>
      </p>
    </AuthLayout>
  );
}