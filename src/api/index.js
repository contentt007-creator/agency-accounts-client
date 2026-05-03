import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

// Attach stored JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('agency_jwt');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const auth = {
  setup: (data) => api.post('/auth/setup', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  users: {
    list: () => api.get('/auth/users'),
    create: (data) => api.post('/auth/users', data),
    update: (id, data) => api.put(`/auth/users/${id}`, data),
    delete: (id) => api.delete(`/auth/users/${id}`),
  },
  changePassword: (data) => api.put('/auth/me/password', data),
};

// BDT formatter
export const fmt = (n) =>
  new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 2 }).format(n || 0);

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-BD') : '—');

export const accounts = {
  list: () => api.get('/accounts'),
  get: (id) => api.get(`/accounts/${id}`),
  ledger: (id, params) => api.get(`/accounts/${id}/ledger`, { params }),
  create: (data) => api.post('/accounts', data),
  update: (id, data) => api.put(`/accounts/${id}`, data),
  delete: (id) => api.delete(`/accounts/${id}`),
};

export const contacts = {
  list: (params) => api.get('/contacts', { params }),
  get: (id) => api.get(`/contacts/${id}`),
  create: (data) => api.post('/contacts', data),
  update: (id, data) => api.put(`/contacts/${id}`, data),
  delete: (id) => api.delete(`/contacts/${id}`),
};

export const transactions = {
  list: (params) => api.get('/transactions', { params }),
  get: (id) => api.get(`/transactions/${id}`),
  create: (data) => api.post('/transactions', data),
  void: (id) => api.post(`/transactions/${id}/void`),
};

export const invoices = {
  list: (params) => api.get('/invoices', { params }),
  get: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  payment: (id, data) => api.post(`/invoices/${id}/payment`, data),
  send: (id) => api.post(`/invoices/${id}/send`),
  void: (id) => api.post(`/invoices/${id}/void`),
};

export const bills = {
  list: (params) => api.get('/bills', { params }),
  get: (id) => api.get(`/bills/${id}`),
  create: (data) => api.post('/bills', data),
  update: (id, data) => api.put(`/bills/${id}`, data),
  payment: (id, data) => api.post(`/bills/${id}/payment`, data),
  void: (id) => api.post(`/bills/${id}/void`),
};

export const dashboard = {
  summary: () => api.get('/dashboard/summary'),
  monthly: () => api.get('/dashboard/monthly'),
  topClients: () => api.get('/dashboard/top-clients'),
  agingReceivables: () => api.get('/dashboard/aging/receivables'),
  agingPayables: () => api.get('/dashboard/aging/payables'),
};

export const loans = {
  list: (params) => api.get('/loans', { params }),
  get: (id) => api.get(`/loans/${id}`),
  create: (data) => api.post('/loans', data),
  update: (id, data) => api.put(`/loans/${id}`, data),
  repayment: (id, data) => api.post(`/loans/${id}/repayment`, data),
  writeOff: (id) => api.post(`/loans/${id}/write-off`),
};
