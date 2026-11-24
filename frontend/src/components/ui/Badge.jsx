/**
 * Badge — compact status label.
 * Tones: neutral · success · warning · danger · info
 * ("violet" is accepted for backward compatibility and renders neutral.)
 * Status should never rely on color alone: always pass readable text.
 */

const TONES = {
  neutral: "bg-surface-2 text-fg-secondary border border-line-subtle",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-accent-soft text-accent-fg",
};

export default function Badge({ children, tone = "neutral", className = "" }) {
  const toneCls = TONES[tone] || TONES.neutral;
  return (
    <span
      className={[
        "inline-flex items-center gap-1 whitespace-nowrap rounded-sm px-1.5 py-0.5",
        "text-xs font-medium leading-4",
        toneCls,
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
