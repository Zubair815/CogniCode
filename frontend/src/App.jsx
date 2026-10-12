/**
 * App router.
 *
 * Routes:
 *   /                     → Landing (public)
 *   /login                → Login (public)
 *   /register             → Register (public)
 *   /forgot-password      → ForgotPassword (public)
 *   /student/dashboard    → Dashboard (student, protected)
 *   /instructor/dashboard → Dashboard (instructor, protected)
 *   *                     → redirect to /login
 *
 * Created: 10/10/2026
 * Updated: 10/10/2026
 */

import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { ROUTES } from "./constants/routes.js";


function ProtectedRoute({ requiredRole, children }) {
  const { user } = useAuth();

  if (!user) return <Navigate to={ROUTES.LOGIN} replace />;
  if (requiredRole && user.role !== requiredRole) {
    return (
      <Navigate
        to={
          user.role === "student"
            ? ROUTES.STUDENT_DASHBOARD
            : ROUTES.INSTRUCTOR_DASHBOARD
        }
        replace
      />
    );
  }
  return children;
}


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={ROUTES.LANDING} element={<Landing />} />
        <Route path={ROUTES.LOGIN} element={<Login />} />
        <Route path={ROUTES.REGISTER} element={<Register />} />
        <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />

        <Route
          path={ROUTES.STUDENT_DASHBOARD}
          element={
            <ProtectedRoute requiredRole="student">
              <Dashboard role="student" />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.INSTRUCTOR_DASHBOARD}
          element={
            <ProtectedRoute requiredRole="instructor">
              <Dashboard role="instructor" />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
      </Routes>
    </BrowserRouter>
  );
}