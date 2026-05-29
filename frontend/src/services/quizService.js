import api from './api';

export const getQuizzes = async (courseId) => {
  const response = await api.get(`/quizzes/course/${courseId}`);
  return response.data;
};

export const getQuiz = async (quizId) => {
  const response = await api.get(`/quizzes/${quizId}`);
  return response.data;
};

export const submitQuiz = async (quizId, answers) => {
  const response = await api.post(`/quizzes/${quizId}/submit`, { answers });
  return response.data;
};

export const getQuizResults = async (attemptId) => {
  const response = await api.get(`/quizzes/results/${attemptId}`);
  return response.data;
};

export const createQuiz = async (courseId, quizData) => {
  const response = await api.post(`/quizzes/course/${courseId}`, quizData);
  return response.data;
};

export const addQuestion = async (quizId, questionData) => {
  const response = await api.post(`/quizzes/${quizId}/questions`, questionData);
  return response.data;
};