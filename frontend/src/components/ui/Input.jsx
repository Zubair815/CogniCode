/**
 * Input
 * -----
 * Text input with optional label, helper text, and error message.
 * Uses a forwardRef so parent forms can focus or read the node.
 *
 * Props:
 *   label     — optional label rendered above the input
 *   error     — error message; when present, styles the field red
 *   hint      — helper text rendered below the input
 *   id        — recommended for label-input association
 *
 * Created: 10/10/2026
 * Author: Abdullah (BSEF23M526)
 */

import { forwardRef } from "react";

const Input = forwardRef(function Input(
  { label, error, hint, id, className = "", type = "text", ...rest },
  ref
) {
  const inputId = id || rest.name;

  const fieldClasses = [
    "w-full px-3.5 py-2.5 rounded-control",
    "bg-[color:var(--surface-2)] border",
    "text-[color:var(--text)] placeholder:text-[color:var(--text-subtle)]",
    "outline-none transition-colors",
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

      <input
        ref={ref}
        id={inputId}
        type={type}
        className={fieldClasses}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...rest}
      />

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