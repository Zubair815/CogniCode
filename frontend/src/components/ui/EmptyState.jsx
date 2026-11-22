/**
 * EmptyState — explains why a view is empty and what to do next.
 * Deliberately small: an optional icon, a title, one sentence, one action.
 */

export default function EmptyState({ icon: Icon, title, description, action, className = "" }) {
  return (
    <div className={["flex flex-col items-center px-6 py-10 text-center", className].join(" ")}>
      {Icon && (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-line-subtle text-fg-secondary">
          <Icon size={18} aria-hidden="true" />
        </div>
      )}
      <p className="text-[15px] font-medium text-fg">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-fg-secondary">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
