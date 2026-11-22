/**
 * TypingIndicator
 * ---------------
 * Subtle generation state aligned with the assistant column.
 */

import Logo from "../brand/Logo.jsx";

export default function TypingIndicator() {
  return (
    <div
      role="status"
      aria-label="CogniCode is generating a response"
      className="flex items-center gap-3.5 animate-fade-in"
    >
      <div className="shrink-0">
        <Logo size={26} />
      </div>
      <div className="flex items-center gap-1.5 py-2">
        <span className="cc-dot" />
        <span className="cc-dot" />
        <span className="cc-dot" />
      </div>
    </div>
  );
}
