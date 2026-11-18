/**
 * Instructor Analytics, Cohort Oversight, Course Management & Reflection Service.
 *
 * Created: 18/11/2026
 */

import api from "./api.js";

export const instructorService = {
  // Course Management
  async listCourses(config = {}) {
    const { data } = await api.get("/instructor/courses", config);
    return data;
  },

  async createCourse(courseData) {
    const { data } = await api.post("/instructor/courses", courseData);
    return data;
  },

  async joinCourse(courseCode) {
    const { data } = await api.post("/instructor/join-course", { course_code: courseCode });
    return data;
  },

  // Cohort Analytics & High Risk Roster
  async getCohortAnalytics(config = {}) {
    const { data } = await api.get("/instructor/cohort-analytics", config);
    return data;
  },

  // Student Drilldown
  async getStudentDetail(studentId, config = {}) {
    const { data } = await api.get(`/instructor/students/${studentId}`, config);
    return data;
  },

  // Topic Heatmap
  async getTopicHeatmap(config = {}) {
    const { data } = await api.get("/instructor/heatmap", config);
    return data;
  },

  // Student Reflection Journal
  async getStudentReflections(config = {}) {
    const { data } = await api.get("/instructor/reflections/student", config);
    return data;
  },

  async generateReflectionDraft(sessionId) {
    const { data } = await api.post(`/instructor/reflections/${sessionId}/generate`);
    return data;
  },

  async submitReflection(sessionId, payload) {
    const { data } = await api.post(`/instructor/reflections/${sessionId}/submit`, payload);
    return data;
  },
};
