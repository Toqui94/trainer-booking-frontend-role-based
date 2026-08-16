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
  clienteByUsuario: (idUsuario) => request(`/clientes/usuario/${idUsuario}`),
  reservationsByClient: (idCliente) => request(`/reservas/cliente/${idCliente}`),

  // ===== Notificaciones =====
  notifications: (idUsuario) => request(`/notificaciones/usuario/${idUsuario}`),

  // ===== Calificaciones =====
  createRating: (idReserva, body) => request(`/calificaciones/reserva/${idReserva}`, { method: 'POST', body }),

  // Horarios
  horariosByTrainer: (idEntrenador) => request(`/horarios/entrenador/${idEntrenador}`),

  // Pagos
  paymentByReservation: (idReserva) => request(`/pagos/reserva/${idReserva}`),
  confirmPayment: (idPago, body) => request(`/pagos/${idPago}/confirmar`, { method: 'POST', body }),

  // Servicios y horarios (gestión propia del entrenador)
  createService: (body) => request('/servicios', { method: 'POST', body }),
  deleteService: (id) => request(`/servicios/${id}`, { method: 'DELETE' }),
  createHorario: (body) => request('/horarios', { method: 'POST', body }),
  deleteHorario: (id) => request(`/horarios/${id}`, { method: 'DELETE' }),

  // Entrenador ↔ usuario, y verificación (admin)
  trainerByUser: (idUsuario) => request(`/entrenadores/usuario/${idUsuario}`),
  updateTrainerVerification: (id, estado) => request(`/entrenadores/${id}/verificacion`, { method: 'PATCH', body: { estado } }),

  // Reservas por entrenador / todas (admin, solo lectura)
  reservationsByTrainer: (idEntrenador) => request(`/reservas/entrenador/${idEntrenador}`),
  allReservations: () => request('/reservas'),

  // Usuarios (admin)
  users: () => request('/usuarios'),
  updateUserStatus: (id, estado) => request(`/usuarios/${id}/estado`, { method: 'PATCH', body: { estado } }),

  markNotificationRead: (id) => request(`/notificaciones/${id}/leida`, { method: 'PATCH' }),
rateReservation: (idReserva, puntuacion, comentario) => {
  const params = new URLSearchParams({ puntuacion });
  if (comentario) params.set('comentario', comentario);
  return request(`/calificaciones/reserva/${idReserva}?${params.toString()}`, { method: 'POST' });
},
ratingsByTrainer: (idEntrenador) => request(`/calificaciones/entrenador/${idEntrenador}`),

};