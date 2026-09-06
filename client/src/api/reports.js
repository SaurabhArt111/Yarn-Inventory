import { api } from './client.js';

const TYPES = ['stock', 'beams', 'inventory', 'parties', 'companies', 'qualities'];

export const reportApi = {
  types: TYPES,
  fetchJson: (type, params) => api.get(`/reports/${type}`, { params: { ...params, format: 'json' } }).then((r) => r.data),
  downloadUrl: (type, params, format) => {
    const query = new URLSearchParams({ ...params, format }).toString();
    return `${api.defaults.baseURL}/reports/${type}?${query}`;
  },
};
