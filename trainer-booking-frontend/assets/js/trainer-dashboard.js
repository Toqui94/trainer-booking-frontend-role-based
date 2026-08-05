import { api } from './api.js';
import { requireRole, logoutToPortal } from './role-guard.js';

const user = requireRole('ENTRENADOR');
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function initials(name = '', last = '') {
  return `${name.trim()[0] || ''}${last.trim()[0] || ''}`.toUpperCase() || 'EN';
}

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
  item.innerHTML = `<i>${type === 'success' ? '✓' : type === 'error' ? '!' : '•'}</i><span>${message}</span>`;
  $('#toastRegion').append(item);
  requestAnimationFrame(() => item.classList.add('show'));
  setTimeout(() => { item.classList.remove('show'); setTimeout(() => item.remove(), 250); }, 3200);
}

function showView(view) {
  $$('[data-dashboard-view]').forEach((section) => { section.hidden = section.dataset.dashboardView !== view; });
  $$('.sidebar-nav [data-view]').forEach((button) => button.classList.toggle('active', button.dataset.view === view));
  const title = $(`.sidebar-nav [data-view="${view}"]`)?.textContent.trim() || 'Panel';
  $('#topbarTitle').textContent = title;
  closeSidebar();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openSidebar() {
  $('#appSidebar').classList.add('open');
  $('.mobile-backdrop').classList.add('open');
}

function closeSidebar() {
  $('#appSidebar').classList.remove('open');
  $('.mobile-backdrop').classList.remove('open');
}

function handleClick(event) {
  const navButton = event.target.closest('[data-view]');
  if (navButton) showView(navButton.dataset.view);
  const viewTarget = event.target.closest('[data-view-target]');
  if (viewTarget) showView(viewTarget.dataset.viewTarget);
  const actionEl = event.target.closest('[data-action]');
  if (!actionEl) {
    const actionButton = event.target.closest('.table-actions button, .page-head-actions .btn, .panel-head button, .quick-card');
    if (actionButton && !actionButton.dataset.viewTarget) toast('La acción quedó preparada para conectarse con el endpoint correspondiente.', 'info');
    return;
  }
  if (actionEl.dataset.action === 'logout') logoutToPortal();
  if (actionEl.dataset.action === 'open-sidebar') openSidebar();
  if (actionEl.dataset.action === 'close-sidebar') closeSidebar();
}

async function init() {
  if (!user) return;
  fillUser(user);
  document.addEventListener('click', handleClick);
  try {
    if (localStorage.getItem('tb_demo_mode') !== 'true') {
      const response = await api.me();
      if (response.data) fillUser(response.data);
    }
  } catch {
    toast('El panel está usando datos visuales mientras el backend responde.', 'info');
  }
}

init();
