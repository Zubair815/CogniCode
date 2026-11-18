/**
 * Central route path constants for CogniCode.
 *
 * Aligned with the Figma Redesign Prototype screens.
 */

export const ROUTES = Object.freeze({
  LANDING: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  FORGOT_PASSWORD: "/forgot-password",

  // Student routes
  STUDENT_DASHBOARD: "/student/dashboard",
  STUDENT_CHAT: "/student/chat/:sessionId",
  STUDENT_COURSES: "/student/courses",
  STUDENT_HOME: "/student/home",
  STUDENT_REFLECTIONS: "/student/reflections",
  STUDENT_QUIZ: "/student/quiz",

  // Instructor routes
  INSTRUCTOR_DASHBOARD: "/instructor/dashboard",
  INSTRUCTOR_COURSES: "/instructor/courses",
  INSTRUCTOR_DETAIL: "/instructor/student-detail",
  INSTRUCTOR_HEATMAP: "/instructor/heatmap",
});

/**
 * Build a concrete chat route for a given session ID.
 */
export function chatRoute(sessionId) {
  return `/student/chat/${sessionId}`;
}
