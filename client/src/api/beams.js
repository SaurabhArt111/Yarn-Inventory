import { api } from './client.js';

export const beamApi = {
  list: (params) => api.get('/beams', { params }).then((r) => r.data),
  get: (id) => api.get(`/beams/${id}`).then((r) => r.data),
  create: (payload) => api.post('/beams', payload).then((r) => r.data),
  update: (id, payload) => api.patch(`/beams/${id}`, payload).then((r) => r.data),
  cancel: (id, reason) => api.post(`/beams/${id}/cancel`, { reason }).then((r) => r.data),
  previewWeight: (params) => api.get('/beams/preview-weight', { params }).then((r) => r.data),
};
