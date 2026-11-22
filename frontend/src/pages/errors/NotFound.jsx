import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Button from "../../components/ui/Button.jsx";
import Logo from "../../components/brand/Logo.jsx";
import { ROUTES } from "../../constants/routes.js";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-12 text-center text-fg">
      <Logo size={32} />
      <p className="mt-5 font-mono text-xs uppercase tracking-wider text-fg-muted">
        404 · Page not found
      </p>
      <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-fg">
        This page could not be found
      </h1>
      <p className="mt-2 max-w-sm text-sm text-fg-secondary">
        The route or tutoring session you requested does not exist or may have moved.
      </p>
      <div className="mt-6 flex items-center justify-center gap-2.5">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} aria-hidden="true" />
          <span>Go back</span>
        </Button>
        <Button variant="primary" onClick={() => navigate(ROUTES.LANDING)}>
          Go to home
        </Button>
      </div>
    </div>
  );
}
