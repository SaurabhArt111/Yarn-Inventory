import { api } from './client.js';

export const dashboardApi = {
  summary: () => api.get('/dashboard').then((r) => r.data),
  qualities: () => api.get('/dashboard/qualities').then((r) => r.data),
};
