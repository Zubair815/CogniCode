/**
 * Logo
 * ----
 * CogniCode brand mark: a clean geometric monogram combining code
 * brackets and a central Socratic node. Restrained, static, and
 * legible at 20px–44px in both light and dark mode.
 */

export default function Logo({ size = 28, withWordmark = false, className = "" }) {
  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-on"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          width={Math.round(size * 0.62)}
          height={Math.round(size * 0.62)}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8.5 7 4 12l4.5 5" />
          <path d="M15.5 7 20 12l-4.5 5" />
          <circle cx="12" cy="12" r="1.75" fill="currentColor" stroke="none" />
        </svg>
      </span>

      {withWordmark && (
        <span className="text-[15px] font-semibold tracking-tight text-fg">
          CogniCode
        </span>
      )}
    </div>
  );
}
