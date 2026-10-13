/**
 * Central route path constants.
 *
 * Created: 10/10/2026
 * Updated: 10/10/2026
 */

export const ROUTES = Object.freeze({
  LANDING: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  FORGOT_PASSWORD: "/forgot-password",
  STUDENT_DASHBOARD: "/student/dashboard",
  STUDENT_CHAT: "/student/chat/:sessionId",
  INSTRUCTOR_DASHBOARD: "/instructor/dashboard",
});

/**
 * Build a concrete chat route for a given session ID.
 * Use this instead of string concatenation everywhere.
 */
export function chatRoute(sessionId) {
  return `/student/chat/${sessionId}`;
}