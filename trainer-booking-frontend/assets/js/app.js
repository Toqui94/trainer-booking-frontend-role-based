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
  const specialties = String(trainer.especialidades || '').split(',').map((x) => x.trim()).filter(Boolean);
  const photo = trainer.foto || 'assets/images/trainer-carlos.jpg';
  return `
    <article class="trainer-card" data-trainer-id="${trainer.id_entrenador}">
      <div class="trainer-photo"><img src="${escapeHtml(photo)}" alt="${escapeHtml(trainer.nombre)} ${escapeHtml(trainer.apellido)}" onerror="this.src='assets/images/trainer-carlos.jpg'" /><div class="photo-shade"></div><span class="availability-dot"><i></i> Disponible</span><span class="rating-pill">★ ${Number(trainer.calificacion || 0).toFixed(1)}</span></div>
      <div class="trainer-body">
        <h3>${escapeHtml(trainer.nombre)} ${escapeHtml(trainer.apellido)}</h3>
        <p>${escapeHtml(trainer.descripcion || 'Entrenador profesional verificado.')}</p>
        <div class="trainer-meta"><span>⌁ ${Number(trainer.anos_experiencia || 0)} años exp.</span><span>☷ ${trainer.resenas || 0} reseñas</span></div>
        <div class="tag-list">${specialties.slice(0, 3).map((item) => `<span>${escapeHtml(item)}</span>`).join('')}</div>
        <div class="next-slot"><i>◷</i><div><strong>Disponible ${escapeHtml(trainer.disponible || 'esta semana')}</strong><small>Próximo horario libre</small></div></div>
        <div class="trainer-footer"><div><small>Sesión desde</small><strong>${money(trainer.precio_desde)}</strong></div><button class="btn btn-primary btn-card" data-action="view-trainer" data-id="${trainer.id_entrenador}">Ver perfil</button></div>
      </div>
    </article>`;
}

function renderTrainers() {
  const query = ($('#trainerSearch')?.value || '').trim().toLowerCase();
  const city = $('#cityFilter')?.value || '';
  const mode = $('#modeFilter')?.value || '';
  let result = state.trainers.filter((t) => {
    const haystack = `${t.nombre} ${t.apellido} ${t.especialidades} ${t.descripcion}`.toLowerCase();
    const modeList = t.modalidades || [t.modalidad].filter(Boolean);
    return (!query || haystack.includes(query)) && (!city || t.ciudad === city) && (!mode || modeList.some((m) => m.toLowerCase() === mode.toLowerCase()));
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
    const [trainersResponse, servicesResponse] = await Promise.all([api.trainers({ limite: 30 }), api.services()]);
    if (trainersResponse.data?.length) {
      state.trainers = trainersResponse.data.map((t, index) => ({
        ...demoTrainers[index % demoTrainers.length],
        ...t,
        foto: t.foto || demoTrainers[index % demoTrainers.length].foto,
        modalidades: demoTrainers[index % demoTrainers.length].modalidades,
        disponible: demoTrainers[index % demoTrainers.length].disponible,
        resenas: demoTrainers[index % demoTrainers.length].resenas
      }));
    }
    if (servicesResponse.data?.length) {
      state.services = servicesResponse.data.slice(0, 5).map((s, index) => ({ ...demoServices[index % demoServices.length], id: s.id_servicio, title: s.nombre_servicio, description: s.descripcion || demoServices[index % demoServices.length].description, price: s.precio }));
    }
    renderTrainers(); renderServices();
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

function findTrainer(id) { return state.trainers.find((t) => Number(t.id_entrenador) === Number(id)); }

async function openTrainer(id) {
  let trainer = findTrainer(id);
  if (state.liveApi) {
    try {
      const response = await api.trainer(id);
      trainer = { ...trainer, ...response.data, servicios: response.data.servicios?.length ? response.data.servicios : trainer.servicios };
    } catch (error) { toast(error.message, 'error'); }
  }
  if (!trainer) return;
  state.selectedTrainer = trainer;
  const specialties = Array.isArray(trainer.especialidades) ? trainer.especialidades.map((x) => x.nombre) : String(trainer.especialidades || '').split(',');
  const services = trainer.servicios?.length ? trainer.servicios : demoTrainers.find((x) => x.id_entrenador === Number(id))?.servicios || [];
  modal(`<div class="profile-modal">
    <div class="profile-hero"><img src="${trainer.foto || 'assets/images/trainer-carlos.jpg'}" alt="${escapeHtml(trainer.nombre)}" /><div class="profile-gradient"></div><span class="profile-status"><i></i> Perfil verificado</span></div>
    <div class="profile-content">
      <div class="profile-title"><div><span>${escapeHtml(trainer.ciudad || 'Colombia')}</span><h2>${escapeHtml(trainer.nombre)} ${escapeHtml(trainer.apellido)}</h2><p>${escapeHtml(trainer.descripcion || '')}</p></div><div class="profile-score"><strong>★ ${Number(trainer.calificacion || 0).toFixed(1)}</strong><small>${trainer.resenas || 0} reseñas</small></div></div>
      <div class="profile-stats"><div><strong>${trainer.anos_experiencia || 0}</strong><span>Años de experiencia</span></div><div><strong>${services.length}</strong><span>Servicios activos</span></div><div><strong>${trainer.resenas || 0}</strong><span>Clientes atendidos</span></div></div>
      <div class="profile-tags">${specialties.filter(Boolean).map((x) => `<span>${escapeHtml(x.nombre || x)}</span>`).join('')}</div>
      <h3 class="modal-section-title">Servicios disponibles</h3>
      <div class="profile-services">${services.map((s) => `<article><div><span>${escapeHtml(s.modalidad || 'PRESENCIAL')}</span><h4>${escapeHtml(s.nombre_servicio)}</h4><p>${escapeHtml(s.descripcion || '')}</p><small>◷ ${s.duracion} minutos</small></div><div><strong>${money(s.precio)}</strong><button class="btn btn-primary btn-small" data-action="start-booking" data-trainer="${trainer.id_entrenador}" data-service="${s.id_servicio}">Reservar</button></div></article>`).join('')}</div>
    </div>
  </div>`, { wide: true });
}

function openBooking(trainerId, serviceId) {
  const trainer = findTrainer(trainerId) || state.selectedTrainer;
  const service = trainer?.servicios?.find((s) => Number(s.id_servicio) === Number(serviceId)) || demoTrainers.flatMap((t) => t.servicios || []).find((s) => Number(s.id_servicio) === Number(serviceId));
  if (!trainer || !service) { toast('No fue posible cargar el servicio.', 'error'); return; }
  state.booking = { trainer, service, date: todayISO(), slot: '' };
  renderBookingModal(1);
}

function bookingSteps(active) {
  return `<div class="booking-steps">${['Servicio', 'Fecha y hora', 'Pago'].map((label, index) => `<div class="${index + 1 <= active ? 'active' : ''}"><span>${index + 1}</span><small>${label}</small></div>`).join('')}</div>`;
}

function renderBookingModal(step) {
  const { trainer, service } = state.booking;
  if (step === 1) {
    modal(`<div class="booking-modal">${bookingSteps(1)}<div class="booking-head"><span>Reserva de entrenamiento</span><h2>Confirma el servicio</h2></div><div class="booking-summary"><img src="${trainer.foto}" alt="" /><div><small>Entrenador</small><h3>${escapeHtml(trainer.nombre)} ${escapeHtml(trainer.apellido)}</h3><p>${escapeHtml(trainer.ciudad || '')} · ★ ${Number(trainer.calificacion || 0).toFixed(1)}</p></div></div><div class="selected-service"><div><span>${escapeHtml(service.modalidad)}</span><h3>${escapeHtml(service.nombre_servicio)}</h3><p>${escapeHtml(service.descripcion || '')}</p><small>◷ ${service.duracion} minutos</small></div><strong>${money(service.precio)}</strong></div><button class="btn btn-primary btn-full" data-action="booking-date">Elegir fecha y hora →</button></div>`);
  } else if (step === 2) {
    modal(`<div class="booking-modal">${bookingSteps(2)}<div class="booking-head"><span>Disponibilidad</span><h2>Elige fecha y hora</h2></div><label class="field"><span>Fecha del entrenamiento</span><input type="date" id="bookingDate" min="${todayISO()}" value="${state.booking.date}" /></label><div class="slot-head"><h3>Horarios disponibles</h3><small id="slotStatus">Selecciona una hora</small></div><div class="slot-grid" id="slotGrid"><div class="slot-loading">Consultando disponibilidad…</div></div><button class="btn btn-primary btn-full" id="bookingContinue" data-action="booking-payment" disabled>Continuar al pago →</button></div>`);
    loadAvailability();
  } else {
    modal(`<div class="booking-modal">${bookingSteps(3)}<div class="booking-head"><span>Pago seguro</span><h2>Finaliza tu reserva</h2></div><div class="payment-summary"><div><span>Entrenador</span><strong>${escapeHtml(trainer.nombre)} ${escapeHtml(trainer.apellido)}</strong></div><div><span>Servicio</span><strong>${escapeHtml(service.nombre_servicio)}</strong></div><div><span>Fecha</span><strong>${new Date(`${state.booking.date}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}</strong></div><div><span>Hora</span><strong>${timeLabel(state.booking.slot)}</strong></div><div class="total"><span>Total</span><strong>${money(service.precio)}</strong></div></div><div class="payment-methods"><label class="payment-option selected"><input type="radio" name="method" value="TARJETA" checked /><i>▰</i><span><strong>Tarjeta débito o crédito</strong><small>Visa, Mastercard y American Express</small></span></label><label class="payment-option"><input type="radio" name="method" value="TRANSFERENCIA" /><i>⇄</i><span><strong>Transferencia bancaria</strong><small>PSE o transferencia directa</small></span></label></div><button class="btn btn-primary btn-full" data-action="confirm-payment">Pagar ${money(service.precio)} →</button><p class="payment-note">🔒 Pago procesado de forma segura. En modo demostración no se realiza ningún cobro real.</p></div>`);
  }
}

async function loadAvailability() {
  const grid = $('#slotGrid');
  let slots = demoSlots;
  if (state.liveApi) {
    try {
      const response = await api.availability(state.booking.trainer.id_entrenador, state.booking.date, state.booking.service.id_servicio);
      slots = response.data?.horarios?.map((x) => x.hora_inicio) || [];
    } catch (error) { toast(error.message, 'error'); }
  }
  grid.innerHTML = slots.length ? slots.map((slot) => `<button class="slot" data-action="select-slot" data-slot="${slot}">${timeLabel(slot)}</button>`).join('') : '<div class="slot-empty">No hay horarios disponibles para esta fecha.</div>';
}

function saveDemoReservation(reservation) {
  const existing = JSON.parse(localStorage.getItem('tb_demo_reservations') || '[]');
  existing.unshift(reservation);
  localStorage.setItem('tb_demo_reservations', JSON.stringify(existing));
}

async function confirmPayment() {
  const button = $('[data-action="confirm-payment"]');
  button.disabled = true; button.textContent = 'Procesando…';
  try {
    if (state.liveApi && getToken()) {
      const reservation = await api.createReservation({ id_servicio: state.booking.service.id_servicio, fecha: state.booking.date, hora_inicio: state.booking.slot });
      const method = $('input[name="method"]:checked')?.value || 'TARJETA';
      await api.createPayment(reservation.data.id_reserva, { metodo_pago: method });
      toast('Orden de pago creada. La reserva está pendiente de confirmación.', 'success');
    } else {
      saveDemoReservation({ id_reserva: Date.now(), fecha: state.booking.date, hora_inicio: state.booking.slot, hora_fin: '', estado: 'CONFIRMADA', valor: state.booking.service.precio, nombre_servicio: state.booking.service.nombre_servicio, entrenador_nombre: state.booking.trainer.nombre, entrenador_apellido: state.booking.trainer.apellido, modalidad: state.booking.service.modalidad });
      toast('Reserva de demostración confirmada.', 'success');
    }
    modal(`<div class="success-modal"><div class="success-icon">✓</div><span>Reserva confirmada</span><h2>Tu entrenamiento quedó agendado</h2><p>Te esperamos el <strong>${new Date(`${state.booking.date}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })}</strong> a las <strong>${timeLabel(state.booking.slot)}</strong> con ${escapeHtml(state.booking.trainer.nombre)}.</p><button class="btn btn-primary btn-full" data-action="open-dashboard">Ver mis reservas</button></div>`);
  } catch (error) {
    button.disabled = false; button.textContent = `Pagar ${money(state.booking.service.precio)} →`;
    if (/token|autentic|sesión|cliente/i.test(error.message)) { toast('Inicia sesión como cliente para completar la reserva.', 'error'); openLogin(); } else toast(error.message, 'error');
  }
}

function authLayout(title, subtitle, form, footer) {
  return `<div class="auth-modal"><a class="brand" href="#"><span>TRAINER</span><strong>BOOKING</strong></a><div class="booking-head"><span>Cuenta personal</span><h2>${title}</h2><p>${subtitle}</p></div>${form}<div class="auth-footer">${footer}</div></div>`;
}

function openLogin() {
  modal(authLayout('Bienvenido de nuevo', 'Ingresa para reservar y administrar tus entrenamientos.', `<form id="loginForm" class="form-grid"><label class="field field-full"><span>Correo electrónico</span><input type="email" name="correo" required placeholder="correo@ejemplo.com" /></label><label class="field field-full"><span>Contraseña</span><input type="password" name="password" required minlength="8" placeholder="••••••••" /></label><button class="btn btn-primary btn-full" type="submit">Iniciar sesión</button></form>`, `¿Todavía no tienes cuenta? <button data-action="open-register">Regístrate gratis</button>`));
}

function openRegister() {
  modal(authLayout('Crea tu cuenta', 'Regístrate como cliente y empieza a reservar entrenamientos.', `<form id="registerForm" class="form-grid"><label class="field"><span>Nombre</span><input name="nombre" required /></label><label class="field"><span>Apellido</span><input name="apellido" required /></label><label class="field field-full"><span>Correo</span><input type="email" name="correo" required /></label><label class="field"><span>Teléfono</span><input name="telefono" inputmode="tel" /></label><label class="field"><span>Nivel</span><select name="nivel_experiencia"><option value="PRINCIPIANTE">Principiante</option><option value="INTERMEDIO">Intermedio</option><option value="AVANZADO">Avanzado</option></select></label><label class="field field-full"><span>Contraseña</span><input type="password" name="password" minlength="8" required /></label><label class="field field-full"><span>Objetivo fitness</span><textarea name="objetivo_fitness" placeholder="Ej. aumentar fuerza y mejorar resistencia"></textarea></label><button class="btn btn-primary btn-full" type="submit">Crear cuenta</button></form>`, `¿Ya tienes cuenta? <button data-action="open-login">Inicia sesión</button>`));
}

async function submitLogin(form) {
  const data = Object.fromEntries(new FormData(form));
  const button = $('button[type="submit"]', form); button.disabled = true; button.textContent = 'Ingresando…';
  try {
    if (state.liveApi) {
      const response = await api.login(data); setSession(response.token, response.user); state.user = response.user;
    } else {
      const user = { id_usuario: 1, nombre: data.correo.split('@')[0], apellido: '', correo: data.correo, roles: ['CLIENTE'] }; setSession('demo-token', user); state.user = user;
    }
    closeModal(); updateSessionUI(); toast('Sesión iniciada correctamente.', 'success');
  } catch (error) { button.disabled = false; button.textContent = 'Iniciar sesión'; toast(error.message, 'error'); }
}

async function submitRegister(form) {
  const data = Object.fromEntries(new FormData(form));
  const button = $('button[type="submit"]', form); button.disabled = true; button.textContent = 'Creando cuenta…';
  try {
    if (state.liveApi) {
      const response = await api.registerClient(data); const user = { nombre: data.nombre, apellido: data.apellido, correo: data.correo, roles: ['CLIENTE'] }; setSession(response.token, user); state.user = user;
    } else {
      const user = { id_usuario: Date.now(), nombre: data.nombre, apellido: data.apellido, correo: data.correo, roles: ['CLIENTE'] }; setSession('demo-token', user); state.user = user;
    }
    closeModal(); updateSessionUI(); toast('Cuenta creada correctamente.', 'success');
  } catch (error) { button.disabled = false; button.textContent = 'Crear cuenta'; toast(error.message, 'error'); }
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
    try { const response = await api.reservations(); reservations = response.data || []; } catch (error) { toast(error.message, 'error'); }
  }
  modal(`<div class="dashboard-modal"><div class="dashboard-head"><div><span>Panel de cliente</span><h2>Mis reservas</h2><p>${state.user ? `Cuenta de ${escapeHtml(state.user.nombre)} ${escapeHtml(state.user.apellido || '')}` : 'Vista de demostración'}</p></div><button class="btn btn-outline btn-small" data-action="logout">Cerrar sesión</button></div><div class="dashboard-tabs"><button class="active">Próximas</button><button>Historial</button><button>Notificaciones</button></div><div class="reservation-list">${reservations.length ? reservations.map((r) => `<article><div class="reservation-date"><strong>${new Date(`${r.fecha}T12:00:00`).getDate()}</strong><span>${new Date(`${r.fecha}T12:00:00`).toLocaleDateString('es-CO', { month: 'short' })}</span></div><div class="reservation-info"><span class="status status-${String(r.estado).toLowerCase()}">${String(r.estado).replaceAll('_', ' ')}</span><h3>${escapeHtml(r.nombre_servicio)}</h3><p>${escapeHtml(r.entrenador_nombre)} ${escapeHtml(r.entrenador_apellido)} · ${escapeHtml(r.modalidad || '')}</p><small>◷ ${timeLabel(r.hora_inicio)} · ${money(r.valor)}</small></div><button class="reservation-more">•••</button></article>`).join('') : '<div class="dashboard-empty"><i>◷</i><h3>Aún no tienes reservas</h3><p>Explora los entrenadores y agenda tu primera sesión.</p><button class="btn btn-primary" data-action="close-modal">Buscar entrenador</button></div>'}</div></div>`, { wide: true });
}

function quickBookService(serviceId) {
  const service = state.services.find((s) => Number(s.id) === Number(serviceId));
  const trainer = state.trainers.find((t) => t.servicios?.some((x) => String(x.nombre_servicio).toLowerCase().includes(service?.title?.split(' ')[0]?.toLowerCase()))) || state.trainers[0];
  const trainerService = trainer.servicios?.[0];
  openBooking(trainer.id_entrenador, trainerService?.id_servicio);
}

function handleClick(event) {
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
  if (action === 'select-slot') { $$('.slot').forEach((x) => x.classList.remove('selected')); actionEl.classList.add('selected'); state.booking.slot = actionEl.dataset.slot; $('#bookingContinue').disabled = false; $('#slotStatus').textContent = timeLabel(state.booking.slot); }
  if (action === 'booking-payment') { if (!state.booking.slot) return; renderBookingModal(3); }
  if (action === 'confirm-payment') confirmPayment();
  if (action === 'quick-book-service') quickBookService(actionEl.dataset.service);
  if (action === 'open-dashboard') openDashboard();
  if (action === 'logout') logoutToPortal();
}

function handleChange(event) {
  if (['trainerSearch', 'cityFilter', 'modeFilter'].includes(event.target.id)) renderTrainers();
  if (event.target.id === 'bookingDate') { state.booking.date = event.target.value; state.booking.slot = ''; $('#bookingContinue').disabled = true; loadAvailability(); }
  if (event.target.name === 'method') { $$('.payment-option').forEach((x) => x.classList.toggle('selected', $('input', x).checked)); }
}

function handleSubmit(event) {
  if (event.target.id === 'loginForm') { event.preventDefault(); submitLogin(event.target); }
  if (event.target.id === 'registerForm') { event.preventDefault(); submitRegister(event.target); }
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
