import axios from 'axios';

// Create a clean Axios instance
const API = axios.create({
  baseURL: 'http://localhost:8000',
});

// Auto-attach Bearer token from localStorage
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const authAPI = {
  getLogs: () => API.get('/api/auth/logs'),
};

export const assignmentsAPI = {
  create: (formData) => API.post('/api/assignments/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getAll: (params) => API.get('/api/assignments/', { params }),
  getById: (id) => API.get(`/api/assignments/${id}`),
};

export const submissionsAPI = {
  submit: (formData) => API.post('/api/submissions/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getStudentSubmission: (assignmentId) => API.get(`/api/submissions/assignment/${assignmentId}`),
  listTeacherSubmissions: (params) => API.get('/api/submissions/teacher/list', { params }),
  getById: (id) => API.get(`/api/submissions/${id}`),
};

export const evaluationsAPI = {
  evaluate: (submissionId) => API.post(`/api/evaluations/evaluate/${submissionId}`),
  getReport: (submissionId) => API.get(`/api/evaluations/report/${submissionId}`),
  publish: (submissionId, teacherMarks) => API.post(`/api/evaluations/publish/${submissionId}`, { teacher_marks: teacherMarks }),
};

export const reportsAPI = {
  getTeacherDashboard: () => API.get('/api/reports/teacher/dashboard'),
  getTeacherDashboardAnalytics: () => API.get('/api/reports/teacher/dashboard-analytics'),
  getStudentDashboard: () => API.get('/api/reports/student/dashboard'),
  getTeacherAnalytics: () => API.get('/api/reports/teacher/analytics'),
  getStudentAnalytics: () => API.get('/api/reports/student/analytics'),
};

export const notificationsAPI = {
  getAll: () => API.get('/api/notifications/'),
  markAsRead: (id) => API.post(`/api/notifications/read/${id}`),
  markAllAsRead: () => API.post('/api/notifications/read-all'),
};

export default API;
