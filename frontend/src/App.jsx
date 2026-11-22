/**
 * App router for CogniCode with route-level code splitting and session bootstrap guard.
 */

import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Spinner from "./components/ui/Spinner.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { ROUTES } from "./constants/routes.js";

const Landing = lazy(() => import("./pages/Landing.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.jsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Chat = lazy(() => import("./pages/Chat.jsx"));
const StudentCourses = lazy(() => import("./pages/student/StudentCourses.jsx"));
const StudentHome = lazy(() => import("./pages/student/StudentHome.jsx"));
const Reflections = lazy(() => import("./pages/student/Reflections.jsx"));
const Quiz = lazy(() => import("./pages/student/Quiz.jsx"));
const InstructorCourses = lazy(() => import("./pages/instructor/InstructorCourses.jsx"));
const InstructorDashboard = lazy(() => import("./pages/instructor/InstructorDashboard.jsx"));
const StudentDetail = lazy(() => import("./pages/instructor/StudentDetail.jsx"));
const Heatmap = lazy(() => import("./pages/instructor/Heatmap.jsx"));
const NotFound = lazy(() => import("./pages/errors/NotFound.jsx"));

function RouteLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas text-fg-secondary">
      <div className="flex items-center gap-2 text-sm">
        <Spinner size={18} />
        <span>Loading…</span>
      </div>
    </div>
  );
}

function ProtectedRoute({ requiredRole, children }) {
  const { user, bootstrapped } = useAuth();
  if (!bootstrapped) return <RouteLoader />;
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
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          {/* Public Marketing & Auth */}
          <Route path={ROUTES.LANDING} element={<Landing />} />
          <Route path={ROUTES.LOGIN} element={<Login />} />
          <Route path={ROUTES.REGISTER} element={<Register />} />
          <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />

          {/* Student Flow */}
          <Route
            path={ROUTES.STUDENT_DASHBOARD}
            element={
              <ProtectedRoute requiredRole="student">
                <Dashboard role="student" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/chat"
            element={
              <ProtectedRoute requiredRole="student">
                <Chat />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.STUDENT_CHAT}
            element={
              <ProtectedRoute requiredRole="student">
                <Chat />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.STUDENT_COURSES}
            element={
              <ProtectedRoute requiredRole="student">
                <StudentCourses />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.STUDENT_HOME}
            element={
              <ProtectedRoute requiredRole="student">
                <StudentHome />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.STUDENT_REFLECTIONS}
            element={
              <ProtectedRoute requiredRole="student">
                <Reflections />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.STUDENT_QUIZ}
            element={
              <ProtectedRoute requiredRole="student">
                <Quiz />
              </ProtectedRoute>
            }
          />

          {/* Instructor Flow */}
          <Route
            path={ROUTES.INSTRUCTOR_DASHBOARD}
            element={
              <ProtectedRoute requiredRole="instructor">
                <InstructorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.INSTRUCTOR_COURSES}
            element={
              <ProtectedRoute requiredRole="instructor">
                <InstructorCourses />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.INSTRUCTOR_DETAIL}
            element={
              <ProtectedRoute requiredRole="instructor">
                <StudentDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.INSTRUCTOR_HEATMAP}
            element={
              <ProtectedRoute requiredRole="instructor">
                <Heatmap />
              </ProtectedRoute>
            }
          />

          {/* 404 Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
