/**
 * IconButton
 * ----------
 * Square icon-only button. `label` is required: it becomes the
 * accessible name and the native tooltip.
 */

import { forwardRef } from "react";

const sizes = {
  sm: "h-8 w-8",
  md: "h-9 w-9",
  lg: "h-10 w-10",
};

const variants = {
  ghost: "text-fg-secondary hover:text-fg hover:bg-hover",
  secondary: "border border-line text-fg hover:bg-hover",
  neutral: "bg-primary text-primary-on hover:bg-primary-hover",
};

const IconButton = forwardRef(function IconButton(
  { label, tooltip, children, size = "md", variant = "ghost", className = "", type = "button", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={tooltip}
      className={[
        "inline-flex items-center justify-center shrink-0 rounded-lg",
        "transition-colors duration-fast ease-standard",
        "disabled:cursor-not-allowed disabled:opacity-40",
        sizes[size] || sizes.md,
        variants[variant] || variants.ghost,
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
});

export default IconButton;
