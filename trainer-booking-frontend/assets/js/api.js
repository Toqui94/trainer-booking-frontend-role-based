const config = window.TRAINER_BOOKING_CONFIG || {};
export const API_BASE = config.apiBase || 'http://localhost:8081/api';

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
  const timer = setTimeout(() => controller.abort(), options.timeout || 8000);

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

  // ===== Entrenadores =====
  trainers: () => request('/entrenadores'),
  trainer: (id) => request(`/entrenadores/${id}`),
  trainersByCity: (ciudad) => request(`/entrenadores/ciudad/${encodeURIComponent(ciudad)}`),

  // ===== Servicios =====
  services: (idEntrenador) => idEntrenador ? request(`/servicios/entrenador/${idEntrenador}`) : request('/servicios'),
  service: (id) => request(`/servicios/${id}`),

  // ===== Especialidades =====
  specialties: () => request('/especialidades'),

  // ===== Autenticación (ya ajustado en Fase 2) =====
  login: (body) => request('/auth/login', { method: 'POST', body }),
  register: (body) => request('/auth/register', { method: 'POST', body }),
  createCliente: (body) => request('/clientes', { method: 'POST', body }),
  createEntrenador: (body) => request('/entrenadores', { method: 'POST', body }),

  // ===== Reservas =====
  reservations: () => request('/reservas'),
  createReservation: (body) => request('/reservas', { method: 'POST', body }),
  confirmReservation: (id) => request(`/reservas/${id}/confirmar`, { method: 'POST' }),
  cancelReservation: (id) => request(`/reservas/${id}/cancelar`, { method: 'POST' }),
  completeReservation: (id) => request(`/reservas/${id}/realizar`, { method: 'POST' }),

  // ===== Notificaciones =====
  notifications: (idUsuario) => request(`/notificaciones/usuario/${idUsuario}`),

  // ===== Calificaciones =====
  createRating: (idReserva, body) => request(`/calificaciones/reserva/${idReserva}`, { method: 'POST', body })

  // PENDIENTES — el backend aún no tiene estos endpoints, se construyen en Fase 6:
  //   - disponibilidad/horarios de un entrenador
  //   - registrar un pago
};