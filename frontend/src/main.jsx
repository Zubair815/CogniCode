/**
 * Application entry point.
 *
 * Note: StrictMode is intentionally DISABLED in development for
 * Phase 1 because its double-mount behavior breaks WebSocket
 * connections in useWebSocket (connection is closed before it
 * finishes establishing, then a second connection is opened —
 * confusing both the client and the backend).
 *
 * We will re-enable StrictMode when the WS hook is refactored to
 * be resilient to double-mount (tracked for Phase 4).
 *
 * Created: 10/10/2026
 * Updated: 10/10/2026
 */

import { createRoot } from "react-dom/client";

import App from "./App.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <ThemeProvider>
    <AuthProvider>
      <App />
    </AuthProvider>
  </ThemeProvider>
);