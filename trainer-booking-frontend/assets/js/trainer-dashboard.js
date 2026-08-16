import { api } from './api.js';
import { requireRole, logoutToPortal } from './role-guard.js';

const user = requireRole('ENTRENADOR');
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
const money = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(v || 0));

const state = { entrenadorId: null };

function initials(name = '', last = '') { return `${name.trim()[0] || ''}${last.trim()[0] || ''}`.toUpperCase() || 'EN'; }

function fillUser(profile = user) {
  if (!profile) return;
  const fullName = `${profile.nombre || ''} ${profile.apellido || ''}`.trim();
  $$('[data-user-name]').forEach((el) => { el.textContent = fullName || 'Entrenador'; });
  $$('[data-user-first-name]').forEach((el) => { el.textContent = profile.nombre || 'Entrenador'; });
  $$('[data-user-initials]').forEach((el) => { el.textContent = initials(profile.nombre, profile.apellido); });
}

function toast(message, type = 'info') {
  const item = document.createElement('div');
  item.className = `toast toast-${type}`;
  item.innerHTML = `<i>${type === 'success' ? '✓' : type === 'error' ? '!' : '•'}</i><span>${escapeHtml(message)}</span>`;
  $('#toastRegion').append(item);
  requestAnimationFrame(() => item.classList.add('show'));
  setTimeout(() => { item.classList.remove('show'); setTimeout(() => item.remove(), 250); }, 3200);
}

function modal(content) {
  let root = $('#modalRoot');
  if (!root) { root = document.createElement('div'); root.id = 'modalRoot'; document.body.append(root); }
  root.innerHTML = `<div class="modal-backdrop" data-action="close-modal"></div><section class="modal" role="dialog" aria-modal="true"><button class="modal-close" data-action="close-modal" aria-label="Cerrar">×</button>${content}</section>`;
  document.body.classList.add('modal-open');
  requestAnimationFrame(() => $('.modal', root)?.classList.add('visible'));
}

function closeModal() {
  const root = $('#modalRoot');
  if (!root) return;
  $('.modal', root)?.classList.remove('visible');
  setTimeout(() => { root.innerHTML = ''; document.body.classList.remove('modal-open'); }, 180);
}

// ===== SERVICIOS =====
async function loadServicios() {
  const grid = $('#serviciosGrid');
  try {
    const servicios = await api.services(state.entrenadorId);
    grid.innerHTML = servicios.length ? servicios.map((s) => `<article class="quick-card"><i>⌁</i><strong>${escapeHtml(s.nombreServicio)}</strong><small>${escapeHtml(s.modalidad)} · ${s.duracion} min · ${money(s.precio)}</small><button class="btn btn-outline btn-small" data-action="delete-service" data-id="${s.idServicio}" style="margin-top:8px">Eliminar</button></article>`).join('')
      : '<p class="empty-hint">Aún no tienes servicios publicados.</p>';
  } catch (error) { grid.innerHTML = `<p class="empty-hint">${escapeHtml(error.message)}</p>`; }
}

function newServiceModal() {
  modal(`<h2>Crear servicio</h2><form id="serviceForm" class="form-grid">
    <label class="field field-full"><span>Nombre</span><input name="nombreServicio" required /></label>
    <label class="field field-full"><span>Descripción</span><textarea name="descripcion"></textarea></label>
    <label class="field"><span>Modalidad</span><select name="modalidad"><option value="PRESENCIAL">Presencial</option><option value="VIRTUAL">Virtual</option><option value="HIBRIDO">Híbrido</option></select></label>
    <label class="field"><span>Duración (min)</span><input type="number" name="duracion" min="15" value="60" required /></label>
    <label class="field field-full"><span>Precio</span><input type="number" name="precio" min="0" required /></label>
    <button class="btn btn-primary btn-full field-full" type="submit">Crear servicio →</button>
  </form>`);
}

async function submitService(form) {
  const raw = Object.fromEntries(new FormData(form));
  try {
    await api.createService({ idEntrenador: state.entrenadorId, nombreServicio: raw.nombreServicio, descripcion: raw.descripcion, modalidad: raw.modalidad, duracion: Number(raw.duracion), precio: Number(raw.precio) });
    closeModal(); toast('Servicio creado.', 'success'); loadServicios();
  } catch (error) { toast(error.message, 'error'); }
}

async function deleteService(id) {
  try { await api.deleteService(id); toast('Servicio eliminado.', 'success'); loadServicios(); }
  catch (error) { toast(error.message, 'error'); }
}

// ===== HORARIOS =====
async function loadHorarios() {
  const body = $('#horariosBody');
  try {
    const horarios = await api.horariosByTrainer(state.entrenadorId);
    body.innerHTML = horarios.length ? horarios.map((h) => `<tr><td><strong>${escapeHtml(h.dia)}</strong></td><td>${h.horaInicio}</td><td>${h.horaFin}</td><td><div class="table-actions"><button class="danger" data-action="delete-horario" data-id="${h.idHorario}">Eliminar</button></div></td></tr>`).join('')
      : '<tr><td colspan="4">Aún no tienes horarios configurados.</td></tr>';
  } catch (error) { body.innerHTML = `<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`; }
}

function newHorarioModal() {
  modal(`<h2>Agregar horario</h2><form id="horarioForm" class="form-grid">
    <label class="field field-full"><span>Día</span><select name="dia"><option>LUNES</option><option>MARTES</option><option>MIERCOLES</option><option>JUEVES</option><option>VIERNES</option><option>SABADO</option><option>DOMINGO</option></select></label>
    <label class="field"><span>Hora inicial</span><input type="time" name="horaInicio" required /></label>
    <label class="field"><span>Hora final</span><input type="time" name="horaFin" required /></label>
    <button class="btn btn-primary btn-full field-full" type="submit">Guardar horario →</button>
  </form>`);
}

async function submitHorario(form) {
  const raw = Object.fromEntries(new FormData(form));
  try {
    await api.createHorario({ idEntrenador: state.entrenadorId, dia: raw.dia, horaInicio: raw.horaInicio, horaFin: raw.horaFin });
    closeModal(); toast('Horario agregado.', 'success'); loadHorarios();
  } catch (error) { toast(error.message, 'error'); }
}

async function deleteHorario(id) {
  try { await api.deleteHorario(id); toast('Horario eliminado.', 'success'); loadHorarios(); }
  catch (error) { toast(error.message, 'error'); }
}

// ===== RESERVAS =====
async function loadReservas() {
  const body = $('#reservasBody');
  try {
    const reservas = await api.reservationsByTrainer(state.entrenadorId);
    body.innerHTML = reservas.length ? reservas.map((r) => `<tr><td>${escapeHtml(r.clienteNombre)}</td><td>${r.fecha} · ${r.horaInicio}</td><td>${escapeHtml(r.servicioNombre)}</td><td>${money(r.valor)}</td><td><span class="status-chip">${escapeHtml(r.estado)}</span></td><td><div class="table-actions">
      ${r.estado === 'PENDIENTE' ? `<button class="primary" data-action="confirm-reserva" data-id="${r.id}">Confirmar</button>` : ''}
      ${r.estado === 'CONFIRMADA' ? `<button class="primary" data-action="complete-reserva" data-id="${r.id}">Completar</button>` : ''}
      ${['PENDIENTE', 'CONFIRMADA'].includes(r.estado) ? `<button class="danger" data-action="cancel-reserva" data-id="${r.id}">Cancelar</button>` : ''}
    </div></td></tr>`).join('')
      : '<tr><td colspan="6">Aún no tienes reservas.</td></tr>';
  } catch (error) { body.innerHTML = `<tr><td colspan="6">${escapeHtml(error.message)}</td></tr>`; }
}

async function reservaAction(fn, id, successMsg) {
  try { await fn(id); toast(successMsg, 'success'); loadReservas(); }
  catch (error) { toast(error.message, 'error'); }
}

// ===== NAVEGACIÓN =====
function showView(view) {
  $$('[data-dashboard-view]').forEach((section) => { section.hidden = section.dataset.dashboardView !== view; });
  $$('.sidebar-nav [data-view]').forEach((button) => button.classList.toggle('active', button.dataset.view === view));
  const title = $(`.sidebar-nav [data-view="${view}"]`)?.textContent.trim() || 'Panel';
  $('#topbarTitle').textContent = title;
  closeSidebar();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (view === 'servicios') loadServicios();
  if (view === 'horarios') loadHorarios();
  if (view === 'reservas') loadReservas();
}

function openSidebar() { $('#appSidebar').classList.add('open'); $('.mobile-backdrop').classList.add('open'); }
function closeSidebar() { $('#appSidebar').classList.remove('open'); $('.mobile-backdrop').classList.remove('open'); }

function handleClick(event) {
  const navButton = event.target.closest('[data-view]');
  if (navButton) showView(navButton.dataset.view);
  const viewTarget = event.target.closest('[data-view-target]');
  if (viewTarget) showView(viewTarget.dataset.viewTarget);

  const actionEl = event.target.closest('[data-action]');
  if (!actionEl) return;
  const action = actionEl.dataset.action;
  if (action === 'logout') logoutToPortal();
  if (action === 'open-sidebar') openSidebar();
  if (action === 'close-sidebar') closeSidebar();
  if (action === 'close-modal') closeModal();
  if (action === 'new-service') newServiceModal();
  if (action === 'delete-service') deleteService(actionEl.dataset.id);
  if (action === 'new-horario') newHorarioModal();
  if (action === 'delete-horario') deleteHorario(actionEl.dataset.id);
  if (action === 'confirm-reserva') reservaAction(api.confirmReservation, actionEl.dataset.id, 'Reserva confirmada.');
  if (action === 'complete-reserva') reservaAction(api.completeReservation, actionEl.dataset.id, 'Sesión marcada como completada.');
  if (action === 'cancel-reserva') reservaAction(api.cancelReservation, actionEl.dataset.id, 'Reserva cancelada.');
  if (action === 'mark-read') markNotificationRead(actionEl.dataset.id);
  if (action === 'open-notifications') openNotifications();
}

function handleSubmit(event) {
  if (event.target.id === 'serviceForm') { event.preventDefault(); submitService(event.target); }
  if (event.target.id === 'horarioForm') { event.preventDefault(); submitHorario(event.target); }
}

async function init() {
  if (!user) return;
  fillUser(user);
  document.addEventListener('click', handleClick);
  document.addEventListener('submit', handleSubmit);
  try {
    const entrenador = await api.trainerByUser(user.id_usuario);
    state.entrenadorId = entrenador.id;
  } catch {
    toast('No fue posible cargar tu perfil de entrenador.', 'error');
  }
}

    async function openNotifications() {
    let notifs = [];
    try { notifs = await api.notifications(user.id_usuario); } catch (error) { toast(error.message, 'error'); }
    modal(`<h2>Notificaciones</h2><div class="reservation-list">${notifs.length ? notifs.map((n) => `<article class="${n.leido ? '' : 'unread'}"><div><h3>${escapeHtml(n.titulo)}</h3><p>${escapeHtml(n.mensaje)}</p><small>${new Date(n.fecha).toLocaleString('es-CO')}</small></div>${!n.leido ? `<button class="btn btn-outline btn-small" data-action="mark-read" data-id="${n.idNotificacion}">Marcar leída</button>` : ''}</article>`).join('') : '<p class="empty-hint">No tienes notificaciones.</p>'}</div>`);
  }

  async function markNotificationRead(id) {
    try { await api.markNotificationRead(id); openNotifications(); } catch (error) { toast(error.message, 'error'); }
  } 

init();