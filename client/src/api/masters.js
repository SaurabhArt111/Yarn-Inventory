import { api } from './client.js';

function makeMasterApi(basePath) {
  return {
    list: (params) => api.get(basePath, { params }).then((r) => r.data),
    listForSelect: (params) => api.get(`${basePath}/select`, { params }).then((r) => r.data),
    get: (id) => api.get(`${basePath}/${id}`).then((r) => r.data),
    create: (payload) => api.post(basePath, payload).then((r) => r.data),
    update: (id, payload) => api.patch(`${basePath}/${id}`, payload).then((r) => r.data),
    remove: (id) => api.delete(`${basePath}/${id}`).then((r) => r.data),
  };
}

export const partyApi = makeMasterApi('/parties');
export const companyApi = makeMasterApi('/companies');

export const qualityApi = {
  ...makeMasterApi('/qualities'),
  detail: (id) => api.get(`/qualities/${id}/detail`).then((r) => r.data),
  addShade: (id, name) => api.post(`/qualities/${id}/shades`, { name }).then((r) => r.data),
  updateShade: (id, shadeId, payload) => api.patch(`/qualities/${id}/shades/${shadeId}`, payload).then((r) => r.data),
  deleteShade: (id, shadeId) => api.delete(`/qualities/${id}/shades/${shadeId}`).then((r) => r.data),
};
