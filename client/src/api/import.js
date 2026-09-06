import { api } from './client.js';

export const importApi = {
  previewQuality: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/import/quality/preview', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
  },
  confirmQuality: (names) => api.post('/import/quality/confirm', { names }).then((r) => r.data),
};
