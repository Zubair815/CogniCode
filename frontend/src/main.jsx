/**
 * Application entry point.
 *
 * Wrap order (outermost first):
 *   ThemeProvider → AuthProvider → App
 *
 * Created: 10/10/2026
 * Author: Abdullah (BSEF23M526)
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);