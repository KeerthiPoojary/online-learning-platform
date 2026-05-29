import api from './api';

export const getCourses = async (filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  const response = await api.get(`/courses${params ? `?${params}` : ''}`);
  return response.data;
};

export const getCourseById = async (id) => {
  const response = await api.get(`/courses/${id}`);
  return response.data;
};

export const createCourse = async (courseData) => {
  const response = await api.post('/courses', courseData);
  return response.data;
};

export const updateCourse = async (id, courseData) => {
  const response = await api.put(`/courses/${id}`, courseData);
  return response.data;
};

export const deleteCourse = async (id) => {
  const response = await api.delete(`/courses/${id}`);
  return response.data;
};

export const enrollInCourse = async (courseId) => {
  const response = await api.post(`/courses/${courseId}/enroll`);
  return response.data;
};

export const getEnrolledCourses = async () => {
  const response = await api.get('/dashboard/student');
  return response.data.enrolledCourses;
};

export const addLesson = async (courseId, lessonData) => {
  const response = await api.post(`/courses/${courseId}/lessons`, lessonData);
  return response.data;
};