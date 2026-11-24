/**
 * Menu
 * ----
 * Small popover menu anchored to a trigger (account menu, row actions).
 *   - trigger gets aria-haspopup / aria-expanded
 *   - Escape or outside click closes and returns focus to the trigger
 *   - ArrowUp / ArrowDown / Home / End move between items
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";

const PLACEMENTS = {
  "top-start": "bottom-full left-0 mb-1.5",
  "top-end": "bottom-full right-0 mb-1.5",
  "bottom-start": "top-full left-0 mt-1.5",
  "bottom-end": "top-full right-0 mt-1.5",
};

export default function Menu({ trigger, children, placement = "bottom-end", className = "", menuClassName = "" }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = useId();

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const items = () => Array.from(menuRef.current?.querySelectorAll('[role^="menuitem"]:not([disabled])') || []);
    items()[0]?.focus();

    const onPointer = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      const list = items();
      const idx = list.indexOf(document.activeElement);
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        rootRef.current?.querySelector('[aria-haspopup="menu"]')?.focus();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        list[(idx + 1) % list.length]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        list[(idx - 1 + list.length) % list.length]?.focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        list[0]?.focus();
      } else if (e.key === "End") {
        e.preventDefault();
        list[list.length - 1]?.focus();
      } else if (e.key === "Tab") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const triggerProps = {
    "aria-haspopup": "menu",
    "aria-expanded": open,
    "aria-controls": open ? menuId : undefined,
    onClick: () => setOpen((o) => !o),
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {trigger(triggerProps, open)}
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          className={[
            "absolute z-popover min-w-[220px] rounded-xl border border-line bg-elevated p-1.5 shadow-popover animate-pop-in",
            PLACEMENTS[placement] || PLACEMENTS["bottom-end"],
            menuClassName,
          ].join(" ")}
        >
          {typeof children === "function" ? children(close) : children}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ children, icon: Icon, onSelect, danger = false, disabled = false, role = "menuitem", checked }) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={role === "menuitemradio" ? !!checked : undefined}
      disabled={disabled}
      onClick={onSelect}
      className={[
        "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm",
        "transition-colors duration-fast focus:outline-none focus-visible:outline-none",
        "hover:bg-hover focus:bg-hover disabled:opacity-50",
        danger ? "text-danger" : "text-fg",
      ].join(" ")}
    >
      {Icon && <Icon size={16} className={danger ? "" : "text-fg-secondary"} aria-hidden="true" />}
      <span className="flex-1 truncate">{children}</span>
    </button>
  );
}

export function MenuSeparator() {
  return <div role="separator" className="my-1 h-px bg-line-subtle" />;
}

export function MenuLabel({ children }) {
  return <div className="px-2.5 pb-1 pt-1.5 text-xs text-fg-muted">{children}</div>;
}
