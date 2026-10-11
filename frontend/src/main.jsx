/**
 * Application entry point.
 *
 * Wraps the app with ThemeProvider so dark/light state is
 * available everywhere.
 *
 * Created: 10/10/2026
 * Author: Abdullah (BSEF23M526)
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
);