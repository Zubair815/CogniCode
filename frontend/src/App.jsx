/**
 * App router for CogniCode.
 * Configured with full student and instructor learning flows matching the Figma Redesign Prototype.
 */

import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Chat from "./pages/Chat.jsx";
import StudentCourses from "./pages/student/StudentCourses.jsx";
import StudentHome from "./pages/student/StudentHome.jsx";
import Reflections from "./pages/student/Reflections.jsx";
import Quiz from "./pages/student/Quiz.jsx";
import InstructorCourses from "./pages/instructor/InstructorCourses.jsx";
import InstructorDashboard from "./pages/instructor/InstructorDashboard.jsx";
import StudentDetail from "./pages/instructor/StudentDetail.jsx";
import Heatmap from "./pages/instructor/Heatmap.jsx";
import NotFound from "./pages/errors/NotFound.jsx";

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
    </BrowserRouter>
  );
}
