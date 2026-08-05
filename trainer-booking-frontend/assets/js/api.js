const config = window.TRAINER_BOOKING_CONFIG || {};
export const API_BASE = config.apiBase || 'http://localhost:4000/api/v1';

export function getToken() {
  return localStorage.getItem('tb_token');
}

export function setSession(token, user) {
  if (token) localStorage.setItem('tb_token', token);
  if (user) localStorage.setItem('tb_user', JSON.stringify(user));
}

export function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('tb_user') || 'null'); } catch { return null; }
}

export function clearSession() {
  localStorage.removeItem('tb_token');
  localStorage.removeItem('tb_user');
}

export async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeout || 5000);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
      body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || payload.error || `Error HTTP ${response.status}`);
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  health: () => request('/health'),
  trainers: (params = {}) => request(`/trainers?${new URLSearchParams(params)}`),
  trainer: (id) => request(`/trainers/${id}`),
  services: (params = {}) => request(`/services?${new URLSearchParams(params)}`),
  specialties: () => request('/catalog/specialties'),
  availability: (trainerId, fecha, serviceId) => request(`/trainers/${trainerId}/availability?${new URLSearchParams({ fecha, id_servicio: serviceId })}`),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  register: (body) => request('/auth/register', { method: 'POST', body }),
  createCliente: (body) => request('/clientes', { method: 'POST', body }),
  createEntrenador: (body) => request('/entrenadores', { method: 'POST', body }),
  me: () => request('/auth/me'),
  reservations: () => request('/reservations'),
  createReservation: (body) => request('/reservations', { method: 'POST', body }),
  createPayment: (reservationId, body) => request(`/payments/reservations/${reservationId}`, { method: 'POST', body }),
  cancelReservation: (id) => request(`/reservations/${id}/cancel`, { method: 'PATCH' }),
  notifications: () => request('/notifications')
};
