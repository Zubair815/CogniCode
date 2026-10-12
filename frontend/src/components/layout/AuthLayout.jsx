/**
 * AuthLayout
 * ----------
 * Centered auth card used by Login, Register, and ForgotPassword.
 * No separate brand panel — the brand lives inside the card header
 * so the layout works identically on mobile and desktop.
 *
 * Created: 10/10/2026
 * Updated: 10/10/2026
 */

import Logo from "../brand/Logo.jsx";

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[color:var(--bg)] px-4 py-8">
      <div
        className="w-full max-w-[440px] rounded-2xl border border-[color:var(--border-2)] p-6 md:p-8 shadow-card"
        style={{ background: "var(--bg2)" }}
      >
        {/* Brand header */}
        <div className="flex flex-col items-center text-center mb-6 md:mb-8">
          <Logo size={44} />
          <h1 className="mt-3 text-xl md:text-2xl font-black tracking-tight text-[color:var(--text)]">
            CogniCode
          </h1>
          <p className="text-[11px] md:text-xs text-[color:var(--text-muted)] mt-1">
            AI Teaching Assistant for Programming
          </p>
        </div>

        {children}
      </div>
    </div>
  );
}