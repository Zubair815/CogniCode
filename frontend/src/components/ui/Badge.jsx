/**
 * Badge
 * -----
 * Small pill used for statuses, CDS bands, and intent labels.
 *
 * Props:
 *   tone — "success" | "warning" | "danger" | "info" | "violet" | "neutral"
 *
 * Created: 10/10/2026
 * Author: Abdullah (BSEF23M526)
 */

const TONE_CLASSES = {
  success: "bg-[color:var(--success)]/15 text-[color:var(--success)]",
  warning: "bg-[color:var(--warning)]/15 text-[color:var(--warning)]",
  danger:  "bg-[color:var(--danger)]/15 text-[color:var(--danger)]",
  info:    "bg-[color:var(--primary)]/15 text-[color:var(--primary-hi)]",
  violet:  "bg-[#8B5CF6]/15 text-[#A78BFA]",
  neutral: "bg-[color:var(--surface-2)] text-[color:var(--text-muted)]",
};

export default function Badge({ children, tone = "neutral", className = "" }) {
  const toneCls = TONE_CLASSES[tone] || TONE_CLASSES.neutral;
  return (
    <span
      className={[
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full",
        "text-[11px] font-bold",
        toneCls,
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}