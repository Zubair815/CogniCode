/**
 * Avatar — initials on a neutral surface. No gradients.
 */

const SIZES = {
  sm: "h-7 w-7 text-xs",
  md: "h-8 w-8 text-[13px]",
  lg: "h-10 w-10 text-sm",
};

export default function Avatar({ name = "", size = "md", className = "" }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "?";

  return (
    <span
      aria-hidden="true"
      className={[
        "inline-flex shrink-0 items-center justify-center rounded-full bg-accent font-medium text-accent-on",
        SIZES[size] || SIZES.md,
        className,
      ].join(" ")}
    >
      {initials}
    </span>
  );
}
