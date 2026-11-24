/**
 * Alert — inline status message with an optional recovery action.
 * Tones: danger · warning · info · success
 * Danger alerts are announced to screen readers immediately.
 */

import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

const TONES = {
  danger: { cls: "border border-danger/20 bg-danger-soft text-danger", Icon: AlertCircle },
  warning: { cls: "border border-warning/20 bg-warning-soft text-warning", Icon: AlertTriangle },
  info: { cls: "border border-line-subtle bg-surface text-fg-secondary", Icon: Info },
  success: { cls: "border border-success/20 bg-success-soft text-success", Icon: CheckCircle2 },
};

export default function Alert({ tone = "danger", title, children, action, onDismiss, className = "" }) {
  const { cls, Icon } = TONES[tone] || TONES.danger;
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={["flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-sm", cls, className].join(" ")}
    >
      <Icon size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={title ? "mt-0.5 text-fg-secondary" : "text-fg"}>{children}</div>}
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="shrink-0 rounded-md px-2 py-0.5 text-sm font-medium underline underline-offset-2 hover:bg-hover"
        >
          {action.label}
        </button>
      )}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mr-1 shrink-0 rounded-md p-0.5 opacity-70 hover:opacity-100 hover:bg-hover"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
