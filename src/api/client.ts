import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach token from localStorage to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally — clear token and reload
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Auth ─────────────────────────────────────────────────────
export const login  = (email: string, password: string) => api.post('/auth/login', { email, password });
export const logout = () => api.post('/auth/logout');
export const getMe  = () => api.get('/auth/me');

// ── Gmail ─────────────────────────────────────────────────────
export const connectGmail = () => api.post('/gmail/connect');
export const syncGmail    = () => api.post('/gmail/sync');
export const sendDraft    = (draftId: string) => api.post('/gmail/send', { draft_id: draftId });

// ── Messages ──────────────────────────────────────────────────
export const getMessages  = (limit = 50, offset = 0) => api.get(`/messages?limit=${limit}&offset=${offset}`);

// ── AI ────────────────────────────────────────────────────────
export const classifyMessage = (messageId: string) => api.post('/ai/classify', { message_id: messageId });
export const generateDraft   = (messageId: string, personaId: string) => api.post('/ai/draft', { message_id: messageId, persona_id: personaId });

// ── Drafts ────────────────────────────────────────────────────
export const updateDraft = (draftId: string, data: Record<string, string>) => api.put(`/drafts/${draftId}`, data);

// ── Admin ─────────────────────────────────────────────────────
export const adminGetUsers     = () => api.get('/admin/users');
export const adminCreateUser   = (data: object) => api.post('/admin/users', data);
export const adminUpdateUser   = (id: string, data: object) => api.put(`/admin/users/${id}`, data);
export const adminDeleteUser   = (id: string) => api.delete(`/admin/users/${id}`);
export const adminGetOrgs      = () => api.get('/admin/organizations');
export const adminCreateOrg    = (data: object) => api.post('/admin/organizations', data);
export const adminDeleteOrg    = (id: string) => api.delete(`/admin/organizations/${id}`);
export const adminGetGCP       = (orgId: string) => api.get(`/admin/gcp/${orgId}`);
export const adminSaveGCP      = (data: object) => api.post('/admin/gcp', data);
export const adminDeleteGCP    = (orgId: string) => api.delete(`/admin/gcp/${orgId}`);
