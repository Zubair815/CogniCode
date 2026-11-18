/**
 * Card
 * ----
 * Glassmorphic surface used across the app for grouping content.
 * The `title` and `actions` props provide a consistent header.
 *
 * Created: 10/10/2026
 * Author: Abdullah (BSEF23M526)
 */

export default function Card({
  children,
  title,
  actions,
  padding = "p-5",
  className = "",
}) {
  return (
    <section
      className={[
        "rounded-card border border-[color:var(--border)]",
        "bg-[color:var(--surface)] backdrop-blur-glass",
        className,
      ].join(" ")}
    >
      {(title || actions) && (
        <header className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[color:var(--border)]">
          {title && (
            <h3 className="text-[13px] font-bold text-[color:var(--text)]">{title}</h3>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={padding}>{children}</div>
    </section>
  );
}