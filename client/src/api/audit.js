import { api } from './client.js';

export const auditApi = {
  list: (params) => api.get('/audit-logs', { params }).then((r) => r.data),
};
