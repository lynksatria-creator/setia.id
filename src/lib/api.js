const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export async function apiRequest(path, { token, ...options } = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.detail || 'Permintaan tidak dapat diproses.');
  }

  return payload;
}

export const authApi = {
  register: (data) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  currentUser: (token) => apiRequest('/auth/me', { token }),
};

export const billingApi = {
  getConfig: () => apiRequest('/billing/config'),
};

export const invitationsApi = {
  list: (token) => apiRequest('/invitations', { token }),
  create: (token, data) => apiRequest('/invitations', { token, method: 'POST', body: JSON.stringify(data) }),
  update: (token, id, data) => apiRequest(`/invitations/${id}`, { token, method: 'PATCH', body: JSON.stringify(data) }),
  publish: (token, id) => apiRequest(`/invitations/${id}/publish`, { token, method: 'POST' }),
};

export const paymentsApi = {
  create: (token, invitationId, paymentMethodId) => apiRequest(`/invitations/${invitationId}/payments`, {
    token,
    method: 'POST',
    body: JSON.stringify({ payment_method_id: paymentMethodId }),
  }),
  get: (token, id) => apiRequest(`/payments/${id}`, { token }),
  submitTransferReference: (token, id, transferReference) => apiRequest(`/payments/${id}/proof`, {
    token,
    method: 'POST',
    body: JSON.stringify({ transfer_reference: transferReference }),
  }),
};

export const adminApi = {
  login: (data) => apiRequest('/admin/login', { method: 'POST', body: JSON.stringify(data) }),
  billingConfig: (token) => apiRequest('/admin/billing/config', { token }),
  updateBillingConfig: (token, data) => apiRequest('/admin/billing/config', { token, method: 'PUT', body: JSON.stringify(data) }),
  invitations: (token) => apiRequest('/admin/invitations', { token }),
  updateInvitation: (token, id, data) => apiRequest(`/admin/invitations/${id}`, { token, method: 'PATCH', body: JSON.stringify(data) }),
  updateActivation: (token, id, data) => apiRequest(`/admin/invitations/${id}/activation`, { token, method: 'PATCH', body: JSON.stringify(data) }),
  payments: (token) => apiRequest('/admin/payments', { token }),
  approvePayment: (token, id) => apiRequest(`/admin/payments/${id}/approve`, { token, method: 'POST' }),
};

export const statusApi = {
  get: () => apiRequest('/'),
  create: (clientName) => apiRequest('/status', {
    method: 'POST',
    body: JSON.stringify({ client_name: clientName }),
  }),
  list: () => apiRequest('/status'),
};
