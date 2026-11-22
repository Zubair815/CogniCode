/**
 * Modal
 * -----
 * Accessible dialog:
 *   - role="dialog", aria-modal, labelled by its title
 *   - Escape and backdrop click close it
 *   - focus moves into the dialog, is trapped while open,
 *     and returns to the previously focused element on close
 *   - page scroll is locked while open
 */

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import IconButton from "./IconButton.jsx";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
};

export default function Modal({ open, onClose, title, description, children, footer, size = "md", initialFocusRef }) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;

    const previouslyFocused = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const focusTarget = initialFocusRef?.current || panelRef.current?.querySelector(FOCUSABLE) || panelRef.current;
    focusTarget?.focus();

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const nodes = Array.from(panelRef.current.querySelectorAll(FOCUSABLE));
      if (nodes.length === 0) {
        e.preventDefault();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [open, initialFocusRef]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-modal flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-overlay animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={[
          "relative flex flex-col w-full bg-elevated text-fg shadow-dialog animate-pop-in focus:outline-none",
          "rounded-t-2xl sm:rounded-2xl border border-line-subtle",
          "max-h-[88dvh]",
          SIZES[size] || SIZES.md,
        ].join(" ")}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 px-5 pb-2 pt-5">
          <div className="min-w-0">
            {title && (
              <h2 id={titleId} className="text-lg font-semibold leading-6">
                {title}
              </h2>
            )}
            {description && (
              <p id={descId} className="mt-1 text-sm text-fg-secondary">
                {description}
              </p>
            )}
          </div>
          <IconButton label="Close" size="sm" onClick={onClose} className="-mr-1.5 -mt-1">
            <X size={18} />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5 pt-2">{children}</div>
        {footer && <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-line-subtle px-5 py-3.5">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
