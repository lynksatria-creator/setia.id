const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export async function apiRequest(path, { token, ...options } = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Tidak dapat terhubung ke API Undangan.id. Pastikan backend berjalan di port 8000 dan MongoDB tersedia.');
    }
    throw error;
  }

  let payload = null;
  if (response.status !== 204 && response.headers.get('content-type')?.includes('application/json')) {
    try {
      payload = await response.json();
    } catch {
      if (response.ok) throw new Error('API Undangan.id mengirim respons JSON yang tidak valid.');
    }
  }

  if (!response.ok) {
    if (typeof payload?.detail === 'string' && payload.detail) throw new Error(payload.detail);
    if (response.status >= 500) {
      throw new Error(`API Undangan.id mengalami gangguan (HTTP ${response.status}). Pastikan backend dan MongoDB aktif.`);
    }
    throw new Error(`Permintaan tidak dapat diproses (HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}).`);
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

export const advertisementsApi = {
  listPublic: () => apiRequest('/public/advertisements'),
};

export const invitationsApi = {
  list: (token) => apiRequest('/invitations', { token }),
  create: (token, data) => apiRequest('/invitations', { token, method: 'POST', body: JSON.stringify(data) }),
  update: (token, id, data) => apiRequest(`/invitations/${id}`, { token, method: 'PATCH', body: JSON.stringify(data) }),
  publish: (token, id) => apiRequest(`/invitations/${id}/publish`, { token, method: 'POST' }),
};

export const dashboardManagementApi = {
  admins: (token) => apiRequest('/dashboard-admins', { token }),
  createAdmin: (token, data) => apiRequest('/dashboard-admins', { token, method: 'POST', body: JSON.stringify(data) }),
  setAdminActive: (token, id, active) => apiRequest(`/dashboard-admins/${id}`, { token, method: 'PATCH', body: JSON.stringify({ active }) }),
  affiliateProgram: (token) => apiRequest('/affiliate-program', { token }),
  selectAffiliateCombination: (token, combinationId) => apiRequest('/affiliate-program', { token, method: 'PUT', body: JSON.stringify({ combination_id: combinationId }) }),
  createAffiliate: (token, data) => apiRequest('/affiliates', { token, method: 'POST', body: JSON.stringify(data) }),
  updateAffiliate: (token, id, data) => apiRequest(`/affiliates/${id}`, { token, method: 'PATCH', body: JSON.stringify(data) }),
};

export const guestbookApi = {
  listPublic: (slug) => apiRequest(`/public/invitations/${encodeURIComponent(slug)}/guestbook`),
  createPublic: (slug, data) => apiRequest(`/public/invitations/${encodeURIComponent(slug)}/guestbook`, { method: 'POST', body: JSON.stringify(data) }),
  listOwner: (token, invitationId) => apiRequest(`/invitations/${invitationId}/guestbook`, { token }),
  createTickets: (token, invitationId, recipients) => apiRequest(`/invitations/${invitationId}/tickets`, {
    token,
    method: 'POST',
    body: JSON.stringify({ recipients }),
  }),
  checkInTicket: (token, invitationId, ticketToken) => apiRequest(`/invitations/${invitationId}/check-in`, {
    token,
    method: 'POST',
    body: JSON.stringify({ ticket_token: ticketToken }),
  }),
  getTicket: (ticketToken) => apiRequest(`/public/invitation-tickets/${encodeURIComponent(ticketToken)}`),
  moderate: (token, invitationId, entryId, status) => apiRequest(`/invitations/${invitationId}/guestbook/${entryId}`, { token, method: 'PATCH', body: JSON.stringify({ status }) }),
  remove: (token, invitationId, entryId) => apiRequest(`/invitations/${invitationId}/guestbook/${entryId}`, { token, method: 'DELETE' }),
};

export const paymentsApi = {
  create: (token, invitationId, paymentMethodId, mobile) => apiRequest(`/invitations/${invitationId}/payments`, {
    token,
    method: 'POST',
    body: JSON.stringify({ payment_method_id: paymentMethodId, mobile }),
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
  demoAccounts: (token) => apiRequest('/admin/demo-accounts', { token }),
  createDemoAccount: (token, data) => apiRequest('/admin/demo-accounts', { token, method: 'POST', body: JSON.stringify(data) }),
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
