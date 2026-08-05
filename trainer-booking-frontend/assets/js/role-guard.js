import { clearSession, getStoredUser } from './api.js';

export function userRoles(user = getStoredUser()) {
  if (!user) return [];
  if (Array.isArray(user.roles)) return user.roles.map((role) => String(role).toUpperCase());
  if (typeof user.roles === 'string') return user.roles.split(',').map((role) => role.trim().toUpperCase()).filter(Boolean);
  return [];
}

export function hasRole(requiredRole, user = getStoredUser()) {
  return userRoles(user).includes(String(requiredRole).toUpperCase());
}

export function requireRole(requiredRole) {
  const preview = new URLSearchParams(window.location.search).get('preview') === '1';
  if (preview && !getStoredUser()) {
    const names = { CLIENTE: ['María', 'Demo'], ENTRENADOR: ['Carlos', 'Demo'], ADMINISTRADOR: ['Administrador', 'Principal'] };
    const [nombre, apellido] = names[requiredRole] || ['Usuario', 'Demo'];
    localStorage.setItem('tb_token', `preview-${requiredRole.toLowerCase()}`);
    localStorage.setItem('tb_user', JSON.stringify({ id_usuario: 1, nombre, apellido, correo: `${requiredRole.toLowerCase()}@demo.com`, roles: [requiredRole] }));
    localStorage.setItem('tb_active_role', requiredRole);
    localStorage.setItem('tb_demo_mode', 'true');
  }
  const user = getStoredUser();
  const activeRole = localStorage.getItem('tb_active_role');
  if (!user || !hasRole(requiredRole, user) || (activeRole && activeRole !== requiredRole)) {
    window.location.replace('index.html');
    return null;
  }
  return user;
}

export function logoutToPortal() {
  clearSession();
  localStorage.removeItem('tb_active_role');
  localStorage.removeItem('tb_demo_mode');
  window.location.replace('index.html');
}

export function roleHome(role) {
  return ({ CLIENTE: 'cliente.html', ENTRENADOR: 'entrenador.html', ADMINISTRADOR: 'administrador.html' })[role] || 'index.html';
}
