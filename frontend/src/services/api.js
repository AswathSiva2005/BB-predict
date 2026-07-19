import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('xai_stock_token') ?? localStorage.getItem('xai_stock_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const resolveArtifactUrl = (artifactPath) => {
  if (!artifactPath) {
    return '';
  }

  const normalized = String(artifactPath).replace(/^trained_models[\\/]/, '').replace(/\\/g, '/');
  return `${api.defaults.baseURL}/artifacts/${normalized}`;
};

export const authApi = {
  login: (payload) => api.post('/api/auth/login', payload),
  register: (payload) => api.post('/api/auth/register', payload),
  me: () => api.get('/api/auth/me'),
  updateProfile: (payload) => api.put('/api/auth/me', payload),
  changePassword: (payload) => api.put('/api/auth/password', payload),
  deleteAccount: () => api.delete('/api/auth/me'),
};

export const dashboardApi = {
  dashboard: () => api.get('/api/dashboard'),
  stocks: () => api.get('/api/stocks'),
  history: () => api.get('/api/history'),
  exploreInsights: (symbol) => api.get('/api/explore/insights', { params: { symbol } }),
};

export const marketApi = {
  prediction: (params) => api.get('/api/prediction', { params }),
  postPrediction: (payload) => api.post('/api/predict', payload),
  shap: (params) => api.get('/api/shap', { params }),
  lime: (params) => api.get('/api/lime', { params }),
  explain: (payload) => api.post('/api/explain', payload),
  train: (payload) => api.post('/api/train', payload),
};

export default api;
