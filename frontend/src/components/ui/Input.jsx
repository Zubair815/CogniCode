/**
 * Input
 * -----
 * Text input with optional label, helper text, and error message.
 * When `type="password"`, renders a show/hide eye toggle.
 *
 * Created: 10/10/2026
 * Updated: 10/10/2026
 */

import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const Input = forwardRef(function Input(
  { label, error, hint, id, className = "", type = "text", ...rest },
  ref
) {
  const inputId = id || rest.name;
  const isPassword = type === "password";
  const [showPassword, setShowPassword] = useState(false);

  const effectiveType = isPassword ? (showPassword ? "text" : "password") : type;

  const fieldClasses = [
    "w-full px-3.5 py-2.5 rounded-control",
    "bg-[color:var(--surface-2)] border",
    "text-[color:var(--text)] placeholder:text-[color:var(--text-subtle)]",
    "outline-none transition-colors",
    isPassword ? "pr-11" : "",
    error
      ? "border-[color:var(--danger)] focus:border-[color:var(--danger)]"
      : "border-[color:var(--border-2)] focus:border-[color:var(--primary)]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="mb-3.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)] mb-1.5"
        >
          {label}
        </label>
      )}

      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={effectiveType}
          className={fieldClasses}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...rest}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--text-subtle)] hover:text-[color:var(--text)] transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>

      {error ? (
        <p
          id={`${inputId}-error`}
          className="mt-1.5 text-xs font-medium text-[color:var(--danger)]"
        >
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-[color:var(--text-subtle)]">{hint}</p>
      ) : null}
    </div>
  );
});

export default Input;