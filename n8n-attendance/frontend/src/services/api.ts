import axios from 'axios';

// Use relative URL when in production (proxied by nginx) or full URL in development
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api'  // Relative URL for nginx proxy
  : (() => {
      const base = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const trimmed = base.replace(/\/+$/,'');
      return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
    })();

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;