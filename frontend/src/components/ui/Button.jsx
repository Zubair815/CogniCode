/**
 * Button
 * ------
 * Variants:
 *   primary   — accent fill; the one main action in a view
 *   neutral   — solid foreground fill (high-emphasis, non-brand)
 *   secondary — bordered neutral
 *   ghost     — transparent until hover
 *   danger    — destructive action
 * Sizes: sm (32px) · md (36px) · lg (44px)
 */

import Spinner from "./Spinner.jsx";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium " +
  "transition-colors duration-fast ease-standard select-none " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const sizes = {
  sm: "h-8 px-3 text-sm",
  md: "h-9 px-3.5 text-sm",
  lg: "h-11 px-5 text-[15px]",
};

const variants = {
  primary: "bg-accent text-accent-on hover:bg-accent-hover",
  neutral: "bg-primary text-primary-on hover:bg-primary-hover",
  secondary: "border border-line bg-canvas text-fg hover:bg-hover",
  ghost: "text-fg-secondary hover:text-fg hover:bg-hover",
  danger: "bg-danger text-white hover:opacity-90 dark:text-fg-inverse",
};

function buttonClasses({ variant = "primary", size = "md", fullWidth = false, className = "" } = {}) {
  return [base, sizes[size] || sizes.md, variants[variant] || variants.primary, fullWidth ? "w-full" : "", className]
    .filter(Boolean)
    .join(" ");
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
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...rest}
    >
      {loading && <Spinner size={14} />}
      {children}
    </button>
  );
}
