import { useNavigate } from "react-router-dom";
import { ArrowLeft, Home, Compass } from "lucide-react";
import Button from "../../components/ui/Button.jsx";
import { ROUTES } from "../../constants/routes.js";
import Logo from "../../components/brand/Logo.jsx";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text)] flex flex-col items-center justify-center p-6 text-center">
      <div className="mb-6">
        <Logo size={40} withWordmark />
      </div>

      <div className="max-w-md w-full p-8 rounded-3xl border border-[color:var(--border)] bg-[color:var(--bg2)] space-y-5 shadow-lg">
        {/* Disconnected Nodes Illustration */}
        <div className="flex justify-center">
          <svg viewBox="0 0 200 140" width="180" height="126" className="mx-auto">
            <ellipse cx="100" cy="120" rx="70" ry="14" fill="rgba(99,102,241,0.12)" />
            <circle cx="100" cy="50" r="24" fill="none" stroke="#6366F1" strokeWidth="2" strokeDasharray="5 3" opacity=".6" />
            <circle cx="100" cy="50" r="10" fill="#6366F1" opacity=".3" />
            <text x="100" y="55" textAnchor="middle" fill="#6366F1" fontSize="14" fontWeight="800">404</text>
            <circle cx="45" cy="70" r="12" fill="none" stroke="#94A3B8" strokeWidth="1.5" opacity=".4" />
            <circle cx="155" cy="70" r="12" fill="none" stroke="#94A3B8" strokeWidth="1.5" opacity=".4" />
            <line x1="57" y1="65" x2="76" y2="55" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="3 3" opacity=".3" />
            <line x1="143" y1="65" x2="124" y2="55" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="3 3" opacity=".3" />
          </svg>
        </div>

        <div className="space-y-1.5">
          <h1 className="text-2xl font-extrabold tracking-tight">404 — Page Not Found</h1>
          <p className="text-xs md:text-sm text-[color:var(--text-muted)]">
            The learning resource, route, or session you requested could not be resolved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button variant="secondary" onClick={() => navigate(-1)} className="w-full sm:w-auto">
            <ArrowLeft size={14} className="mr-1.5" /> Go Back
          </Button>
          <Button variant="primary" onClick={() => navigate(ROUTES.STUDENT_DASHBOARD)} className="w-full sm:w-auto">
            <Home size={14} className="mr-1.5" /> Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
