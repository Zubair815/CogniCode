/**
 * Input
 * -----
 * Labelled text input with optional hint and error message.
 * `type="password"` adds an accessible show/hide toggle.
 */

/* eslint-disable react-refresh/only-export-components */
import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/** Shared field styling — also used by Textarea. */
export function fieldClasses({ error = false, className = "" } = {}) {
  return [
    "w-full rounded-lg border bg-canvas px-3 text-[15px] text-fg",
    "placeholder:text-fg-muted transition-colors duration-fast",
    "focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-offset-0",
    error
      ? "border-danger focus:ring-danger-soft"
      : "border-line hover:border-line-strong focus:border-accent focus:ring-accent-soft",
    "disabled:cursor-not-allowed disabled:opacity-60",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export function FieldLabel({ htmlFor, children }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-fg">
      {children}
    </label>
  );
}

export function FieldMessage({ id, error, hint }) {
  if (error) {
    return (
      <p id={id} role="alert" className="mt-1.5 text-[13px] text-danger">
        {error}
      </p>
    );
  }
  if (hint) {
    return (
      <p id={id} className="mt-1.5 text-[13px] text-fg-muted">
        {hint}
      </p>
    );
  }
  return null;
}

const Input = forwardRef(function Input(
  { label, error, hint, id, className = "", type = "text", ...rest },
  ref
) {
  const inputId = id || rest.name;
  const messageId = error || hint ? `${inputId}-message` : undefined;
  const isPassword = type === "password";
  const [showPassword, setShowPassword] = useState(false);
  const effectiveType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className="mb-4">
      {label && <FieldLabel htmlFor={inputId}>{label}</FieldLabel>}

      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={effectiveType}
          className={fieldClasses({ error: !!error, className: `h-11 ${isPassword ? "pr-11" : ""} ${className}` })}
          aria-invalid={error ? true : undefined}
          aria-describedby={messageId}
          {...rest}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-md text-fg-muted hover:text-fg hover:bg-hover transition-colors"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>

      <FieldMessage id={messageId} error={error} hint={hint} />
    </div>
  );
});

export default Input;
