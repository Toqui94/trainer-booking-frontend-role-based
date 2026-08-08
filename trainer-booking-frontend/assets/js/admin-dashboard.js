import { api } from './api.js';
import { requireRole, logoutToPortal } from './role-guard.js';

const user = requireRole('ADMINISTRADOR');
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
const money = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(v || 0));

function initials(name = '', last = '') { return `${name.trim()[0] || ''}${last.trim()[0] || ''}`.toUpperCase() || 'AD'; }

function fillUser(profile = user) {
  if (!profile) return;
  const fullName = `${profile.nombre || ''} ${profile.apellido || ''}`.trim();
  $$('[data-user-name]').forEach((el) => { el.textContent = fullName || 'Administrador'; });
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

// ===== ENTRENADORES =====
async function loadEntrenadores() {
  const body = $('#entrenadoresBody');
  try {
    const entrenadores = await api.trainers();
    body.innerHTML = entrenadores.length ? entrenadores.map((e) => `<tr><td><div class="table-user"><strong>${escapeHtml(e.nombreCompleto)}</strong></div></td><td>${escapeHtml(e.documento)}</td><td>${escapeHtml(e.ciudad || '—')}</td><td>${e.calificacion ? `★ ${Number(e.calificacion).toFixed(1)}` : 'Sin calificar'}</td><td><span class="status-chip ${e.estadoVerificacion === 'PENDIENTE' ? 'pending' : e.estadoVerificacion === 'RECHAZADO' ? 'rejected' : ''}">${escapeHtml(e.estadoVerificacion)}</span></td><td><div class="table-actions">
      ${e.estadoVerificacion !== 'APROBADO' ? `<button class="primary" data-action="approve-trainer" data-id="${e.id}">Aprobar</button>` : ''}
      ${e.estadoVerificacion !== 'RECHAZADO' ? `<button class="danger" data-action="reject-trainer" data-id="${e.id}">Rechazar</button>` : ''}
    </div></td></tr>`).join('')
      : '<tr><td colspan="6">No hay entrenadores registrados.</td></tr>';
  } catch (error) { body.innerHTML = `<tr><td colspan="6">${escapeHtml(error.message)}</td></tr>`; }
}

async function setTrainerVerification(id, estado) {
  try { await api.updateTrainerVerification(id, estado); toast(`Entrenador marcado como ${estado.toLowerCase()}.`, 'success'); loadEntrenadores(); }
  catch (error) { toast(error.message, 'error'); }
}

// ===== USUARIOS =====
async function loadUsuarios() {
  const body = $('#usuariosBody');
  try {
    const usuarios = await api.users();
    body.innerHTML = usuarios.length ? usuarios.map((u) => `<tr><td><div class="table-user"><strong>${escapeHtml(u.nombre)} ${escapeHtml(u.apellido)}</strong></div></td><td>${escapeHtml(u.correo)}</td><td><span class="status-chip ${u.estado === 'BLOQUEADO' ? 'rejected' : ''}">${escapeHtml(u.estado)}</span></td><td><div class="table-actions">
      ${u.estado !== 'BLOQUEADO' ? `<button class="danger" data-action="block-user" data-id="${u.id}">Bloquear</button>` : `<button class="primary" data-action="unblock-user" data-id="${u.id}">Reactivar</button>`}
    </div></td></tr>`).join('')
      : '<tr><td colspan="4">No hay usuarios registrados.</td></tr>';
  } catch (error) { body.innerHTML = `<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`; }
}

async function setUserStatus(id, estado) {
  try { await api.updateUserStatus(id, estado); toast(`Usuario actualizado a ${estado.toLowerCase()}.`, 'success'); loadUsuarios(); }
  catch (error) { toast(error.message, 'error'); }
}

// ===== RESERVAS (solo lectura) =====
async function loadReservasAdmin() {
  const body = $('#adminReservasBody');
  try {
    const reservas = await api.allReservations();
    body.innerHTML = reservas.length ? reservas.map((r) => `<tr><td>${escapeHtml(r.clienteNombre)}</td><td>${escapeHtml(r.entrenadorNombre)}</td><td>${r.fecha} · ${r.horaInicio}</td><td>${money(r.valor)}</td><td><span class="status-chip">${escapeHtml(r.estado)}</span></td></tr>`).join('')
      : '<tr><td colspan="5">No hay reservas registradas.</td></tr>';
  } catch (error) { body.innerHTML = `<tr><td colspan="5">${escapeHtml(error.message)}</td></tr>`; }
}

// ===== NAVEGACIÓN =====
function showView(view) {
  $$('[data-dashboard-view]').forEach((section) => { section.hidden = section.dataset.dashboardView !== view; });
  $$('.sidebar-nav [data-view]').forEach((button) => button.classList.toggle('active', button.dataset.view === view));
  const title = $(`.sidebar-nav [data-view="${view}"]`)?.textContent.trim() || 'Administración';
  $('#topbarTitle').textContent = title;
  closeSidebar();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (view === 'entrenadores') loadEntrenadores();
  if (view === 'usuarios') loadUsuarios();
  if (view === 'reservas') loadReservasAdmin();
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
  if (action === 'approve-trainer') setTrainerVerification(actionEl.dataset.id, 'APROBADO');
  if (action === 'reject-trainer') setTrainerVerification(actionEl.dataset.id, 'RECHAZADO');
  if (action === 'block-user') setUserStatus(actionEl.dataset.id, 'BLOQUEADO');
  if (action === 'unblock-user') setUserStatus(actionEl.dataset.id, 'ACTIVO');
}

async function init() {
  if (!user) return;
  fillUser(user);
  document.addEventListener('click', handleClick);
}

init();