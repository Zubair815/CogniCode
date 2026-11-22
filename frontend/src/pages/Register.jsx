/**
 * Register page.
 * Route: /register
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

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [role, setRole] = useState("student");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    invite_code: "",
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
      setError("Complete your name, email address, and password.");
      return;
    }

    if (role === "instructor" && !form.invite_code.trim()) {
      setError("Instructor accounts require an institutional invite code.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      role,
      invite_code: role === "instructor" ? form.invite_code.trim() : null,
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
      setError(err.message || "Unable to create account. Check the form details and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Create your account">
      <div className="mb-5">
        <SegmentedControl
          label="Account role"
          options={ROLES}
          value={role}
          onChange={setRole}
          fullWidth
        />
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <Input
          id="name"
          label="Full name"
          placeholder="Your full name"
          value={form.name}
          onChange={update("name")}
          autoComplete="name"
        />

        <Input
          id="email"
          label="Email address"
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
          placeholder="At least 8 characters, 1 letter, 1 digit"
          value={form.password}
          onChange={update("password")}
          autoComplete="new-password"
        />

        {role === "instructor" ? (
          <Input
            id="invite_code"
            label="Instructor invite code"
            placeholder="Provided by your department administrator"
            value={form.invite_code}
            onChange={update("invite_code")}
            hint="Public instructor sign-up requires institutional authorization."
            required
          />
        ) : (
          <Input
            id="preferred_language"
            label="Preferred language"
            placeholder="Python"
            value={form.preferred_language}
            onChange={update("preferred_language")}
          />
        )}

        <Input
          id="institution"
          label="Institution (optional)"
          placeholder="University, college, or independent study"
          value={form.institution}
          onChange={update("institution")}
          hint="Leave blank if you are studying independently."
        />

        {error && (
          <Alert tone="danger" className="mb-4">
            {error}
          </Alert>
        )}

        <Button type="submit" fullWidth size="lg" loading={loading}>
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-fg-secondary">
        Already have an account?{" "}
        <Link
          to={ROUTES.LOGIN}
          className="font-medium text-accent-fg hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
