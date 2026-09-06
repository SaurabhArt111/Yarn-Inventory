import { api } from './client.js';

export const analyticsApi = {
  overview: (params) => api.get('/analytics/overview', { params }).then((r) => r.data),
  qualityOptions: () => api.get('/analytics/quality/options').then((r) => r.data),
  partyOptions: () => api.get('/analytics/party/options').then((r) => r.data),
  companyOptions: () => api.get('/analytics/company/options').then((r) => r.data),
  analyzeQuality: (id) => api.get(`/analytics/quality/${id}`).then((r) => r.data),
  analyzeParty: (id) => api.get(`/analytics/party/${id}`).then((r) => r.data),
  analyzeCompany: (id) => api.get(`/analytics/company/${id}`).then((r) => r.data),
};
