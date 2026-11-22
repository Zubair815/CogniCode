/**
 * Card — bordered content section. Flat by default: no shadow, no blur.
 */

export default function Card({ children, title, description, actions, padding = "p-5", className = "", as: Tag = "section" }) {
  return (
    <Tag className={["rounded-xl border border-line-subtle bg-canvas", className].join(" ")}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 px-5 pt-4">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold text-fg">{title}</h2>}
            {description && <p className="mt-0.5 text-[13px] text-fg-secondary">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={padding}>{children}</div>
    </Tag>
  );
}
