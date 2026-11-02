import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const weatherAPI = {
  getCurrent: () => apiClient.get('/weather/current'),
  getStatus: () => apiClient.get('/weather/status'),
  toggleSimulation: () => apiClient.post('/weather/toggle-simulation'),
  resetSimulator: () => apiClient.post('/weather/reset-simulator'),
  healthCheck: () => apiClient.get('/health')
};

export default apiClient;
