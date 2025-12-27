import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gearguard_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('gearguard_token');
      localStorage.removeItem('gearguard_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = (email, password) => api.post('/auth/login', { email, password });
export const register = (data) => api.post('/auth/register', data);
export const getMe = () => api.get('/auth/me');

// Users
export const getUsers = (params) => api.get('/users', { params });
export const updateUser = (userId, data) => api.put(`/users/${userId}`, null, { params: data });

// Equipment
export const getEquipment = (params) => api.get('/equipment', { params });
export const getEquipmentById = (id) => api.get(`/equipment/${id}`);
export const createEquipment = (data) => api.post('/equipment', data);
export const updateEquipment = (id, data) => api.put(`/equipment/${id}`, data);
export const deleteEquipment = (id) => api.delete(`/equipment/${id}`);

// Teams
export const getTeams = () => api.get('/teams');
export const getTeamById = (id) => api.get(`/teams/${id}`);
export const createTeam = (data) => api.post('/teams', data);
export const updateTeam = (id, data) => api.put(`/teams/${id}`, data);
export const addTeamMember = (teamId, userId) => api.post(`/teams/${teamId}/members/${userId}`);
export const removeTeamMember = (teamId, userId) => api.delete(`/teams/${teamId}/members/${userId}`);
export const getTeamTechnicians = (teamId) => api.get(`/teams/${teamId}/technicians`);

// Maintenance Requests
export const getMaintenanceRequests = (params) => api.get('/maintenance-requests', { params });
export const getMaintenanceRequestById = (id) => api.get(`/maintenance-requests/${id}`);
export const createMaintenanceRequest = (data) => api.post('/maintenance-requests', data);
export const updateMaintenanceRequest = (id, data) => api.put(`/maintenance-requests/${id}`, data);
export const deleteMaintenanceRequest = (id) => api.delete(`/maintenance-requests/${id}`);

// Dashboard
export const getDashboardStats = () => api.get('/dashboard/stats');

// Reports
export const getRequestsByTeam = () => api.get('/reports/requests-by-team');
export const getRequestsByStatus = () => api.get('/reports/requests-by-status');

// Seed
export const seedDatabase = () => api.post('/seed');

export default api;
