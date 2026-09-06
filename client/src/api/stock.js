import { api } from './client.js';

export const stockApi = {
  list: (params) => api.get('/stock-entries', { params }).then((r) => r.data),
  available: (params) => api.get('/stock-entries/available', { params }).then((r) => r.data),
  get: (id) => api.get(`/stock-entries/${id}`).then((r) => r.data),
  create: (payload) => api.post('/stock-entries', payload).then((r) => r.data),
  update: (id, payload) => api.patch(`/stock-entries/${id}`, payload).then((r) => r.data),
  cancel: (id) => api.delete(`/stock-entries/${id}`).then((r) => r.data),
};
