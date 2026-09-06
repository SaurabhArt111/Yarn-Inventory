import { api } from './client.js';

export const staffApi = {
  list: () => api.get('/staff').then((r) => r.data),
  invite: (payload) => api.post('/staff', payload).then((r) => r.data),
  updatePermissions: (id, payload) => api.patch(`/staff/${id}/permissions`, payload).then((r) => r.data),
  updateStatus: (id, status) => api.patch(`/staff/${id}/status`, { status }).then((r) => r.data),
};
