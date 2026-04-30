import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const requestUrl = error.config?.url || '';
        const isAuthRequest =
            requestUrl.includes('/auth/login') ||
            requestUrl.includes('/auth/register');

        if (error.response?.status === 401 && !isAuthRequest) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    getMe: () => api.get('/auth/me'),
};

// Puzzle API
export const puzzleAPI = {
    create: (data) => api.post('/puzzles', data),
    getById: (id) => api.get(`/puzzles/${id}`),
    update: (id, data) => api.put(`/puzzles/${id}`, data),
    getMyPuzzles: () => api.get('/puzzles'),
    addBlocks: (puzzleId, blocks) => api.post(`/puzzles/${puzzleId}/blocks`, blocks),
    getBlocks: (puzzleId, shuffle = false) => api.get(`/puzzles/${puzzleId}/blocks?shuffle=${shuffle}`),
};

// Assignment API
export const assignmentAPI = {
    create: (data) => api.post('/assignments', data),
    getById: (id) => api.get(`/assignments/${id}`),
    getAll: (params) => api.get('/assignments', { params }),
    getPuzzle: (assignmentId) => api.get(`/assignments/${assignmentId}/puzzle`),
};

// Attempt API
export const attemptAPI = {
    create: (data) => api.post('/attempts', data),
    submit: (attemptId, data) => api.post(`/attempts/${attemptId}/submit`, data),
    getById: (id) => api.get(`/attempts/${id}`),
    getAll: (params) => api.get('/attempts', { params }),
};

// Analytics API
export const analyticsAPI = {
    getAssignmentAnalytics: (assignmentId) => api.get(`/analytics/assignment/${assignmentId}`),
    getPuzzleAnalytics: (puzzleId) => api.get(`/analytics/puzzle/${puzzleId}`),
    getStudentProgress: (userId, cohort_id) =>
        api.get(`/analytics/student/${userId}`, { params: { cohort_id } }),
    getInstructorSummary: () => api.get('/analytics/instructor/summary'),
};

export default api;
