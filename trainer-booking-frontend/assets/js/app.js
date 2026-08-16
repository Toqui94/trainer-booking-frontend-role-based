import { api, clearSession, getStoredUser, getToken, setSession } from './api.js';
import { demoServices, demoSlots, demoTrainers } from './data.js';
import { requireRole, logoutToPortal } from './role-guard.js';

const state = {
  trainers: [...demoTrainers],
  services: [...demoServices],
  liveApi: false,
  expanded: false,
  selectedTrainer: null,
  booking: { trainer: null, service: null, date: '', slot: '' },
  user: getStoredUser()
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const money = (value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(value || 0));
const todayISO = () => {
  const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10);
};
const timeLabel = (time) => {
  const [h, m] = time.split(':').map(Number);
  const date = new Date(); date.setHours(h, m, 0, 0);
  return date.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
};
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

function toast(message, type = 'info') {
  const item = document.createElement('div');
  item.className = `toast toast-${type}`;
  item.innerHTML = `<i>${type === 'success' ? '✓' : type === 'error' ? '!' : '•'}</i><span>${escapeHtml(message)}</span>`;
  $('#toastRegion').append(item);
  requestAnimationFrame(() => item.classList.add('show'));
  setTimeout(() => { item.classList.remove('show'); setTimeout(() => item.remove(), 250); }, 3800);
}

function modal(content, options = {}) {
  const root = $('#modalRoot');
  root.innerHTML = `<div class="modal-backdrop" data-action="close-modal"></div><section class="modal ${options.wide ? 'modal-wide' : ''}" role="dialog" aria-modal="true"><button class="modal-close" data-action="close-modal" aria-label="Cerrar">×</button>${content}</section>`;
  document.body.classList.add('modal-open');
  setTimeout(() => $('.modal', root)?.classList.add('visible'), 10);
}

function closeModal() {
  const root = $('#modalRoot');
  $('.modal', root)?.classList.remove('visible');
  setTimeout(() => { root.innerHTML = ''; document.body.classList.remove('modal-open'); }, 180);
}

function trainerCard(trainer) {
  const photo = trainer.foto || 'assets/images/trainer-carlos.jpg';
  return `
    <article class="trainer-card" data-trainer-id="${trainer.id}">
      <div class="trainer-photo">
        <img src="${escapeHtml(photo)}" alt="${escapeHtml(trainer.nombreCompleto)}" onerror="this.src='assets/images/trainer-carlos.jpg'" />
        <div class="photo-shade"></div>
        <span class="rating-pill">★ ${Number(trainer.calificacion || 0).toFixed(1)}</span>
      </div>
      <div class="trainer-body">
        <h3>${escapeHtml(trainer.nombreCompleto)}</h3>
        <p>${escapeHtml(trainer.descripcion || 'Entrenador profesional verificado.')}</p>
        <div class="trainer-meta"><span>⌁ ${Number(trainer.aniosExperiencia || 0)} años exp.</span><span>${escapeHtml(trainer.ciudad || '')}</span></div>
        <div class="trainer-footer"><button class="btn btn-primary btn-card" data-action="view-trainer" data-id="${trainer.id}">Ver perfil</button></div>
      </div>
    </article>`;
}

function renderTrainers() {
  const query = ($('#trainerSearch')?.value || '').trim().toLowerCase();
  const city = $('#cityFilter')?.value || '';
  let result = state.trainers.filter((t) => {
    const haystack = `${t.nombreCompleto} ${t.descripcion}`.toLowerCase();
    return (!query || haystack.includes(query)) && (!city || t.ciudad === city);
  });
  if (!state.expanded) result = result.slice(0, 4);
  $('#trainerGrid').innerHTML = result.map(trainerCard).join('');
  $('#trainerEmpty').hidden = result.length > 0;
}

function serviceCard(service) {
  return `<article class="service-card ${service.size === 'large' ? 'service-large' : ''}">
    <div class="service-image"><img src="${service.image}" alt="${escapeHtml(service.title)}" /><span>${escapeHtml(service.badge)}</span></div>
    <div class="service-content"><i>${service.title.toLowerCase().includes('virtual') ? '▣' : service.title.toLowerCase().includes('running') ? '↗' : '⌁'}</i><h3>${escapeHtml(service.title)}</h3><p>${escapeHtml(service.description)}</p><div class="service-footer"><strong>Desde ${money(service.price)}</strong><button data-action="quick-book-service" data-service="${service.id}">Reservar</button></div></div>
  </article>`;
}

function renderServices() {
  $('#servicesGrid').innerHTML = state.services.map(serviceCard).join('');
}

async function loadLiveData() {
  try {
    await api.health();
    state.liveApi = true;
    const trainers = await api.trainers();
    if (trainers?.length) {
      state.trainers = trainers;
    }
    renderTrainers();
    showApiBadge('API conectada', true);
  } catch {
    state.liveApi = false;
    showApiBadge('Modo demostración', false);
  }
}

function showApiBadge(text, live) {
  let badge = $('.api-badge');
  if (!badge) { badge = document.createElement('div'); badge.className = 'api-badge'; document.body.append(badge); }
  badge.classList.toggle('live', live);
  badge.innerHTML = `<i></i>${text}`;
}

function findTrainer(id) { return state.trainers.find((t) => Number(t.id) === Number(id)); }

async function openTrainer(id) {
  let trainer = findTrainer(id);
  let services = [];
  try {
    if (state.liveApi) {
      trainer = await api.trainer(id);
      services = await api.services(id);
    } else {
      services = trainer?.servicios || [];
    }
  } catch (error) { toast(error.message, 'error'); }
  if (!trainer) return;

  state.selectedTrainer = trainer;
  state.selectedTrainer.servicios = services;

  modal(`<div class="profile-modal">
    <div class="profile-hero"><img src="${trainer.foto || 'assets/images/trainer-carlos.jpg'}" alt="${escapeHtml(trainer.nombreCompleto)}" /><div class="profile-gradient"></div></div>
    <div class="profile-content">
      <div class="profile-title">
        <div><span>${escapeHtml(trainer.ciudad || 'Colombia')}</span><h2>${escapeHtml(trainer.nombreCompleto)}</h2><p>${escapeHtml(trainer.descripcion || '')}</p></div>
        <div class="profile-score"><strong>★ ${Number(trainer.calificacion || 0).toFixed(1)}</strong></div>
      </div>
      <div class="profile-stats"><div><strong>${trainer.aniosExperiencia || 0}</strong><span>Años de experiencia</span></div><div><strong>${services.length}</strong><span>Servicios activos</span></div></div>
      <h3 class="modal-section-title">Servicios disponibles</h3>
      <div class="profile-services">${services.map((s) => `<article><div><span>${escapeHtml(s.modalidad || 'PRESENCIAL')}</span><h4>${escapeHtml(s.nombreServicio)}</h4><p>${escapeHtml(s.descripcion || '')}</p><small>◷ ${s.duracion} minutos</small></div><div><strong>${money(s.precio)}</strong><button class="btn btn-primary btn-small" data-action="start-booking" data-trainer="${trainer.id}" data-service="${s.idServicio}">Reservar</button></div></article>`).join('')}</div>
    </div>
  </div>`, { wide: true });
}

function openBooking(trainerId, serviceId) {
  const trainer = (state.selectedTrainer && Number(state.selectedTrainer.id) === Number(trainerId))
      ? state.selectedTrainer
      : findTrainer(trainerId);
  const service = trainer?.servicios?.find((s) => Number(s.idServicio) === Number(serviceId));
  if (!trainer || !service) { toast('No fue posible cargar el servicio.', 'error'); return; }
  state.booking = { trainer, service, date: todayISO(), slot: '' };
  renderBookingModal(1);
}

function bookingSteps(active) {
  return `<div class="booking-steps">${['Servicio', 'Fecha y hora', 'Pago'].map((label, index) => `<div class="${index + 1 <= active ? 'active' : ''}"><span>${index + 1}</span><small>${label}</small></div>`).join('')}</div>`;
}

const DIAS_SEMANA = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

function buildSlotsFromHorarios(horarios, duracionMin) {
  const slots = [];
  horarios.forEach((h) => {
    const [hh, mm] = h.horaInicio.split(':').map(Number);
    const [endH, endM] = h.horaFin.split(':').map(Number);
    let current = hh * 60 + mm;
    const end = endH * 60 + endM;
    while (current + duracionMin <= end) {
      const hours = String(Math.floor(current / 60)).padStart(2, '0');
      const minutes = String(current % 60).padStart(2, '0');
      slots.push(`${hours}:${minutes}`);
      current += duracionMin;
    }
  });
  return slots;
}

async function loadAvailability() {
  const { trainer, service, date } = state.booking;
  const grid = $('#slotGrid');
  if (!grid) return;
  grid.innerHTML = '<p class="slot-loading">Cargando horarios…</p>';
  try {
    const dia = DIAS_SEMANA[new Date(`${date}T12:00:00`).getDay()];
    const horarios = await api.horariosByTrainer(trainer.id);
    const delDia = horarios.filter((h) => h.dia === dia);
    const slots = buildSlotsFromHorarios(delDia, service.duracion);
    if (!slots.length) {
      grid.innerHTML = '<p class="slot-empty">El entrenador no tiene horarios configurados para este día.</p>';
      return;
    }
    grid.innerHTML = slots.map((s) => `<button type="button" class="slot-btn ${state.booking.slot === s ? 'selected' : ''}" data-slot="${s}">${s}</button>`).join('');
  } catch (error) {
    grid.innerHTML = `<p class="slot-empty">${escapeHtml(error.message)}</p>`;
  }
}

function renderBookingModal(step) {
  const { trainer, service } = state.booking;
  if (step === 1) {
    modal(`<div class="booking-modal">${bookingSteps(1)}<div class="booking-head"><span>Reserva de entrenamiento</span><h2>Confirma el servicio</h2></div><div class="booking-summary"><img src="${trainer.foto || 'assets/images/trainer-carlos.jpg'}" alt="" /><div><small>Entrenador</small><h3>${escapeHtml(trainer.nombreCompleto)}</h3><p>${escapeHtml(trainer.ciudad || '')} · ★ ${Number(trainer.calificacion || 0).toFixed(1)}</p></div></div><div class="selected-service"><div><span>${escapeHtml(service.modalidad)}</span><h3>${escapeHtml(service.nombreServicio)}</h3><p>${escapeHtml(service.descripcion || '')}</p><small>◷ ${service.duracion} minutos</small></div><strong>${money(service.precio)}</strong></div><button class="btn btn-primary btn-full" data-action="booking-date">Elegir fecha y hora →</button></div>`);
  } else if (step === 2) {
    modal(`<div class="booking-modal">${bookingSteps(2)}<div class="booking-head"><span>Fecha y hora</span><h2>Elige cuándo entrenar</h2></div>
      <label class="field"><span>Fecha del entrenamiento</span><input type="date" id="bookingDate" min="${todayISO()}" value="${state.booking.date}" /></label>
      <div class="slot-grid" id="slotGrid"></div>
      <button class="btn btn-primary btn-full" data-action="booking-payment" ${state.booking.slot ? '' : 'disabled'}>Continuar →</button>
    </div>`);
    loadAvailability();
  } else {
    modal(`<div class="booking-modal">${bookingSteps(3)}<div class="booking-head"><span>Confirmación</span><h2>Revisa tu reserva</h2></div><div class="payment-summary"><div><span>Entrenador</span><strong>${escapeHtml(trainer.nombreCompleto)}</strong></div><div><span>Servicio</span><strong>${escapeHtml(service.nombreServicio)}</strong></div><div><span>Fecha</span><strong>${new Date(`${state.booking.date}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}</strong></div><div><span>Hora</span><strong>${timeLabel(state.booking.slot)}</strong></div><div class="total"><span>Total</span><strong>${money(service.precio)}</strong></div></div><button class="btn btn-primary btn-full" data-action="confirm-payment">Confirmar reserva →</button><p class="payment-note">La reserva queda como PENDIENTE hasta que el entrenador la confirme.</p></div>`);
  }
}

function saveDemoReservation(reservation) {
  const existing = JSON.parse(localStorage.getItem('tb_demo_reservations') || '[]');
  existing.unshift(reservation);
  localStorage.setItem('tb_demo_reservations', JSON.stringify(existing));
}

async function confirmPayment() {
  const button = $('[data-action="confirm-payment"]');
  button.disabled = true; button.textContent = 'Confirmando…';
  try {
    if (state.liveApi && getToken()) {
      const cliente = await api.clienteByUsuario(state.user.id_usuario);
      await api.createReservation({
        idCliente: cliente.idCliente,
        idEntrenador: state.booking.trainer.id,
        idServicio: state.booking.service.idServicio,
        fecha: state.booking.date,
        horaInicio: state.booking.slot
      });
      toast('Reserva creada. Queda pendiente de confirmación.', 'success');
    } else {
      saveDemoReservation({ id: Date.now(), fecha: state.booking.date, horaInicio: state.booking.slot, estado: 'CONFIRMADA', valor: state.booking.service.precio, servicioNombre: state.booking.service.nombreServicio, entrenadorNombre: state.booking.trainer.nombreCompleto });
      toast('Reserva de demostración confirmada.', 'success');
    }
    modal(`<div class="success-modal"><div class="success-icon">✓</div><span>Reserva confirmada</span><h2>Tu entrenamiento quedó agendado</h2><p>Te esperamos el <strong>${new Date(`${state.booking.date}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })}</strong> a las <strong>${timeLabel(state.booking.slot)}</strong>.</p><button class="btn btn-primary btn-full" data-action="open-dashboard">Ver mis reservas</button></div>`);
  } catch (error) {
    button.disabled = false; button.textContent = 'Confirmar reserva →';
    if (/token|autentic|sesión|cliente/i.test(error.message)) { toast('Inicia sesión como cliente para completar la reserva.', 'error'); openLogin(); } else toast(error.message, 'error');
  }
}

function authLayout(title, subtitle, form, footer) {
  return `<div class="auth-modal"><a class="brand" href="#"><span>TRAINER</span><strong>BOOKING</strong></a><div class="booking-head"><span>Cuenta personal</span><h2>${title}</h2><p>${subtitle}</p></div>${form}<div class="auth-footer">${footer}</div></div>`;
}

function updateSessionUI() {
  if (!state.user) return;
  const loginButtons = $$('[data-action="open-login"]');
  const registerButtons = $$('[data-action="open-register"]');
  loginButtons.forEach((button) => { button.textContent = `Hola, ${state.user.nombre}`; button.dataset.action = 'open-dashboard'; });
  registerButtons.forEach((button) => { button.textContent = 'Cerrar sesión'; button.dataset.action = 'logout'; });
}

async function openDashboard() {
  let reservations = JSON.parse(localStorage.getItem('tb_demo_reservations') || '[]');
  if (state.liveApi && getToken() && getToken() !== 'demo-token') {
    try {
      const cliente = await api.clienteByUsuario(state.user.id_usuario);
      reservations = await api.reservationsByClient(cliente.idCliente);
    } catch (error) { toast(error.message, 'error'); }
  }
  modal(`<div class="dashboard-modal">
    <div class="dashboard-head"><div><span>Panel de cliente</span><h2>Mis reservas</h2><p>${state.user ? `Cuenta de ${escapeHtml(state.user.nombre)} ${escapeHtml(state.user.apellido || '')}` : 'Vista de demostración'}</p></div><button class="btn btn-outline btn-small" data-action="logout">Cerrar sesión</button></div>
    <div class="reservation-list">${reservations.length ? reservations.map((r) => `<article>
  <div class="reservation-date"><strong>${new Date(`${r.fecha}T12:00:00`).getDate()}</strong><span>${new Date(`${r.fecha}T12:00:00`).toLocaleDateString('es-CO', { month: 'short' })}</span></div>
  <div class="reservation-info"><span class="status status-${String(r.estado).toLowerCase()}">${String(r.estado).replaceAll('_', ' ')}</span><h3>${escapeHtml(r.servicioNombre)}</h3><p>${escapeHtml(r.entrenadorNombre)}</p><small>◷ ${timeLabel(r.horaInicio)} · ${money(r.valor)}</small></div>
  <div class="reservation-actions">
    ${r.estado === 'PENDIENTE' ? `<button class="btn btn-primary btn-small" data-action="pay-reservation" data-id="${r.id}">Pagar ahora</button>` : ''}
    ${['PENDIENTE', 'CONFIRMADA'].includes(r.estado) ? `<button class="btn btn-outline btn-small" data-action="cancel-reservation" data-id="${r.id}">Cancelar</button>` : ''}
    ${r.estado === 'REALIZADA' ? `<button class="btn btn-primary btn-small" data-action="rate-reservation" data-id="${r.id}">Calificar</button>` : ''}
  </div>
</article>`).join('') : '<div class="dashboard-empty"><i>◷</i><h3>Aún no tienes reservas</h3><p>Explora los entrenadores y agenda tu primera sesión.</p><button class="btn btn-primary" data-action="close-modal">Buscar entrenador</button></div>'}</div>
  </div>`, { wide: true });
}

async function openNotifications() {
  let notifs = [];
  try { notifs = await api.notifications(state.user.id_usuario); } catch (error) { toast(error.message, 'error'); }
  modal(`<div class="dashboard-modal"><div class="dashboard-head"><div><span>Centro de notificaciones</span><h2>Notificaciones</h2></div></div>
    <div class="reservation-list">${notifs.length ? notifs.map((n) => `<article class="${n.leido ? '' : 'unread'}"><div class="reservation-info"><h3>${escapeHtml(n.titulo)}</h3><p>${escapeHtml(n.mensaje)}</p><small>${new Date(n.fecha).toLocaleString('es-CO')}</small></div>${!n.leido ? `<button class="btn btn-outline btn-small" data-action="mark-read" data-id="${n.idNotificacion}">Marcar leída</button>` : ''}</article>`).join('') : '<div class="dashboard-empty"><i>♢</i><h3>No tienes notificaciones</h3></div>'}</div>
  </div>`, { wide: true });
}

async function markNotificationRead(id) {
  try { await api.markNotificationRead(id); openNotifications(); } catch (error) { toast(error.message, 'error'); }
}

function rateModal(idReserva) {
  modal(`<h2>Califica tu sesión</h2><form id="rateForm" data-reserva="${idReserva}" class="form-grid">
    <label class="field field-full"><span>Puntuación (1 a 5)</span><input type="number" name="puntuacion" min="1" max="5" required /></label>
    <label class="field field-full"><span>Comentario (opcional)</span><textarea name="comentario"></textarea></label>
    <button class="btn btn-primary btn-full field-full" type="submit">Enviar calificación →</button>
  </form>`);
}

async function submitRating(form) {
  const raw = Object.fromEntries(new FormData(form));
  try {
    await api.rateReservation(form.dataset.reserva, Number(raw.puntuacion), raw.comentario);
    closeModal(); toast('¡Gracias por tu calificación!', 'success'); openDashboard();
  } catch (error) { toast(error.message, 'error'); }
}


async function cancelReservationFlow(id) {
  try {
    await api.cancelReservation(id);
    toast('Reserva cancelada.', 'success');
    openDashboard();
  } catch (error) { toast(error.message, 'error'); }
}

async function payReservationFlow(idReserva) {
  try {
    const pago = await api.paymentByReservation(idReserva);
    await api.confirmPayment(pago.idPago, { metodoPago: 'TARJETA', referenciaPago: `SIM-${Date.now()}` });
    toast('Pago confirmado (simulado).', 'success');
    openDashboard();
  } catch (error) { toast(error.message, 'error'); }
}

function quickBookService(serviceId) {
  const service = state.services.find((s) => Number(s.id) === Number(serviceId));
  const trainer = state.trainers.find((t) => t.servicios?.some((x) => String(x.nombre_servicio).toLowerCase().includes(service?.title?.split(' ')[0]?.toLowerCase()))) || state.trainers[0];
  const trainerService = trainer.servicios?.[0];
  openBooking(trainer.id_entrenador, trainerService?.id_servicio);
}

function handleClick(event) {
  const slotBtn = event.target.closest('.slot-btn');
  if (slotBtn) { state.booking.slot = slotBtn.dataset.slot; renderBookingModal(2); return; }

  const actionEl = event.target.closest('[data-action]');
  if (!actionEl) return;
  const action = actionEl.dataset.action;
  if (action === 'close-modal') closeModal();
  if (action === 'toggle-menu') { const menu = $('[data-mobile-menu]'); menu.classList.toggle('open'); actionEl.setAttribute('aria-expanded', menu.classList.contains('open')); }
  if (action === 'open-login') openLogin();
  if (action === 'open-register') openRegister();
  if (action === 'view-trainer') openTrainer(actionEl.dataset.id);
  if (action === 'show-all-trainers') { state.expanded = true; renderTrainers(); actionEl.style.display = 'none'; }
  if (action === 'reset-filters') { $('#trainerSearch').value = ''; $('#cityFilter').value = ''; $('#modeFilter').value = ''; renderTrainers(); }
  if (action === 'start-booking') openBooking(actionEl.dataset.trainer, actionEl.dataset.service);
  if (action === 'booking-date') renderBookingModal(2);
  if (action === 'booking-payment') {
    if (!state.booking.slot) { toast('Selecciona un horario disponible.', 'error'); return; }
    renderBookingModal(3);
  }
  if (action === 'confirm-payment') confirmPayment();
  if (action === 'quick-book-service') quickBookService(actionEl.dataset.service);
  if (action === 'open-dashboard') openDashboard();
  if (action === 'logout') logoutToPortal();
  if (action === 'cancel-reservation') cancelReservationFlow(actionEl.dataset.id);
  if (action === 'pay-reservation') payReservationFlow(actionEl.dataset.id);
  if (action === 'open-notifications') openNotifications();
  if (action === 'mark-read') markNotificationRead(actionEl.dataset.id);
  if (action === 'rate-reservation') rateModal(actionEl.dataset.id);
}
function handleChange(event) {
  if (['trainerSearch', 'cityFilter', 'modeFilter'].includes(event.target.id)) renderTrainers();
  if (event.target.id === 'bookingDate') { state.booking.date = event.target.value; state.booking.slot = ''; loadAvailability(); }  if (event.target.id === 'bookingTime') { state.booking.slot = event.target.value; }
  if (event.target.name === 'method') { $$('.payment-option').forEach((x) => x.classList.toggle('selected', $('input', x).checked)); }
}

function handleSubmit(event) {
  if (event.target.id === 'loginForm') { event.preventDefault(); submitLogin(event.target); }
  if (event.target.id === 'registerForm') { event.preventDefault(); submitRegister(event.target); }
  if (event.target.id === 'rateForm') { event.preventDefault(); submitRating(event.target); }
}

function init() {
  const authenticatedUser = requireRole('CLIENTE');
  if (!authenticatedUser) return;
  state.user = authenticatedUser;
  renderTrainers(); renderServices(); updateSessionUI(); loadLiveData();
  document.addEventListener('click', handleClick);
  document.addEventListener('input', handleChange);
  document.addEventListener('change', handleChange);
  document.addEventListener('submit', handleSubmit);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeModal(); });
  $$('[data-mobile-menu] a').forEach((a) => a.addEventListener('click', () => $('[data-mobile-menu]').classList.remove('open')));
}

init();
