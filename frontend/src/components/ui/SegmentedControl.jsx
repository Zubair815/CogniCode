/**
 * SegmentedControl — single choice among 2–4 options (radio group semantics).
 * Arrow keys move the selection, matching native radio behavior.
 */

import { useRef } from "react";

export default function SegmentedControl({ options, value, onChange, label, size = "md", fullWidth = false, className = "" }) {
  const refs = useRef([]);

  const onKeyDown = (e, idx) => {
    let next = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (idx + 1) % options.length;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (idx - 1 + options.length) % options.length;
    if (next === null) return;
    e.preventDefault();
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={[
        "inline-flex gap-0.5 rounded-lg border border-line-subtle bg-surface p-0.5",
        fullWidth ? "flex w-full" : "",
        className,
      ].join(" ")}
    >
      {options.map((opt, idx) => {
        const active = opt.value === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            ref={(el) => (refs.current[idx] = el)}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => onKeyDown(e, idx)}
            className={[
              "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-all duration-fast",
              size === "sm" ? "h-7 px-2.5 text-[13px]" : "h-8 px-3 text-sm",
              fullWidth ? "flex-1" : "",
              active
                ? "bg-elevated text-fg border border-line-subtle shadow-sm dark:bg-surface-2"
                : "border border-transparent text-fg-secondary hover:text-fg",
            ].join(" ")}
          >
            {Icon && <Icon size={14} aria-hidden="true" />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
