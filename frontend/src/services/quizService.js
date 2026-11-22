/**
 * Conceptual Quiz API service (server-graded and persisted in PostgreSQL).
 */

import api from "./api.js";

export const quizService = {
  async getQuestions(topic = null, config = {}) {
    const params = topic ? { topic } : undefined;
    const { data } = await api.get("/quiz/questions", { ...config, params });
    return data;
  },

  async submitQuiz(sessionId, answers) {
    const { data } = await api.post("/quiz/submit", {
      session_id: sessionId,
      answers,
    });
    return data;
  },

  async listResults(config = {}) {
    const { data } = await api.get("/quiz/results", config);
    return data;
  },
};
