/**
 * Button
 * ------
 * Single button component with four visual variants and
 * consistent sizing. Uses CSS variables for theming so the
 * same component works in dark and light mode.
 *
 * Props:
 *   variant  — "primary" | "secondary" | "ghost" | "danger"
 *   size     — "sm" | "md"
 *   loading  — disables the button and shows a spinner
 *   fullWidth— stretches to the parent width
 *
 * Created: 10/10/2026
 * Author: Abdullah (BSEF23M526)
 */

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-control font-semibold transition-all " +
  "focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed";

const sizeClasses = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
};

const variantClasses = {
  primary:
    "text-white shadow-glow hover:shadow-glow-lg hover:-translate-y-px",
  secondary:
    "border border-[color:var(--border-2)] text-[color:var(--text-muted)] " +
    "hover:text-[color:var(--text)] hover:bg-[color:var(--surface-2)]",
  ghost:
    "text-[color:var(--text-muted)] hover:text-[color:var(--text)] " +
    "border border-[color:var(--border)]",
  danger:
    "bg-[color:var(--danger)] text-white hover:opacity-90",
};


function Spinner() {
  return (
    <svg
      className="animate-spin"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}


export default function Button({
  children,
  variant = "primary",
  size = "md",
  type = "button",
  loading = false,
  fullWidth = false,
  disabled = false,
  className = "",
  ...rest
}) {
  const classes = [
    baseClasses,
    sizeClasses[size] || sizeClasses.md,
    variantClasses[variant] || variantClasses.primary,
    fullWidth ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const isPrimary = variant === "primary";

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={classes}
      style={isPrimary ? { background: "var(--gradient-primary)" } : undefined}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}