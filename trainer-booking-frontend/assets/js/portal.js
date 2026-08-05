import { api, clearSession, getStoredUser, setSession } from './api.js';

const roleConfig = {
  CLIENTE: {
    label: 'Cliente',
    destination: 'cliente.html',
    submit: 'Entrar al panel de cliente',
    registerText: '¿No tienes una cuenta de cliente?',
    demoName: 'María'
  },
  ENTRENADOR: {
    label: 'Entrenador',
    destination: 'entrenador.html',
    submit: 'Entrar al panel de entrenador',
    registerText: '¿Quieres ofrecer tus servicios?',
    demoName: 'Carlos'
  },
  ADMINISTRADOR: {
    label: 'Administrador',
    destination: 'administrador.html',
    submit: 'Entrar al panel administrativo',
    registerText: 'Acceso exclusivo para cuentas autorizadas',
    demoName: 'Administrador'
  }
};

const state = {
  role: 'CLIENTE',
  liveApi: false
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

function toast(message, type = 'info') {
  const item = document.createElement('div');
  item.className = `toast toast-${type}`;
  item.innerHTML = `<i>${type === 'success' ? '✓' : type === 'error' ? '!' : '•'}</i><span>${escapeHtml(message)}</span>`;
  $('#toastRegion').append(item);
  requestAnimationFrame(() => item.classList.add('show'));
  setTimeout(() => { item.classList.remove('show'); setTimeout(() => item.remove(), 250); }, 3800);
}

function modal(content, wide = false) {
  const root = $('#modalRoot');
  root.innerHTML = `<div class="modal-backdrop" data-action="close-modal"></div><section class="modal ${wide ? 'modal-wide' : ''}" role="dialog" aria-modal="true"><button class="modal-close" data-action="close-modal" aria-label="Cerrar">×</button>${content}</section>`;
  document.body.classList.add('modal-open');
  requestAnimationFrame(() => $('.modal', root)?.classList.add('visible'));
}

function closeModal() {
  const root = $('#modalRoot');
  $('.modal', root)?.classList.remove('visible');
  setTimeout(() => { root.innerHTML = ''; document.body.classList.remove('modal-open'); }, 180);
}

function normalizeRoles(user) {
  if (!user) return [];
  if (Array.isArray(user.roles)) return user.roles.map((role) => String(role).toUpperCase());
  if (typeof user.roles === 'string') return user.roles.split(',').map((role) => role.trim().toUpperCase()).filter(Boolean);
  return [];
}

function roleAllowed(user, role) {
  return normalizeRoles(user).includes(role);
}

function redirectByRole(role) {
  localStorage.setItem('tb_active_role', role);
  window.location.href = roleConfig[role].destination;
}

function selectRole(role) {
  if (!roleConfig[role]) return;
  state.role = role;
  $('#selectedRole').value = role;
  $('#selectedRoleLabel').textContent = roleConfig[role].label;
  $$('.role-card').forEach((card) => card.classList.toggle('selected', card.dataset.role === role));
  $('.access-submit').innerHTML = `${roleConfig[role].submit} <span>→</span>`;
  const register = $('#roleRegister');
  if (role === 'ADMINISTRADOR') {
    register.innerHTML = `<span>${roleConfig[role].registerText}</span>`;
  } else {
    register.innerHTML = `<span>${roleConfig[role].registerText}</span><button type="button" data-action="open-role-register">Crear cuenta</button>`;
  }
}

function clientRegisterMarkup() {
  return `<div class="portal-register">
    <a class="brand" href="index.html"><span>TRAINER</span><strong>BOOKING</strong></a>
    <span class="register-role-chip">⌕ Registro de cliente</span>
    <h2>Crea tu cuenta</h2>
    <p>Después del registro entrarás al catálogo para buscar y reservar entrenadores.</p>
    <form id="clientRegisterForm" class="form-grid">
      <label class="field"><span>Nombre</span><input name="nombre" required minlength="2" /></label>
      <label class="field"><span>Apellido</span><input name="apellido" required minlength="2" /></label>
      <label class="field field-full"><span>Correo</span><input type="email" name="correo" required /></label>
      <label class="field"><span>Teléfono</span><input name="telefono" /></label>
      <label class="field"><span>Nivel</span><select name="nivel_experiencia"><option value="PRINCIPIANTE">Principiante</option><option value="INTERMEDIO">Intermedio</option><option value="AVANZADO">Avanzado</option></select></label>
      <label class="field field-full"><span>Contraseña</span><input type="password" name="password" required minlength="8" /></label>
      <label class="field field-full"><span>Objetivo fitness</span><textarea name="objetivo_fitness" placeholder="Ej. ganar fuerza, mejorar resistencia o bajar de peso"></textarea></label>
      <button class="btn btn-primary btn-full field-full" type="submit">Crear cuenta de cliente →</button>
    </form>
  </div>`;
}

function trainerRegisterMarkup() {
  return `<div class="portal-register">
    <a class="brand" href="index.html"><span>TRAINER</span><strong>BOOKING</strong></a>
    <span class="register-role-chip">🏋 Registro de entrenador</span>
    <h2>Postula tu perfil</h2>
    <p>La cuenta quedará pendiente de verificación antes de aparecer públicamente.</p>
    <form id="trainerRegisterForm" class="form-grid">
      <label class="field"><span>Nombre</span><input name="nombre" required minlength="2" /></label>
      <label class="field"><span>Apellido</span><input name="apellido" required minlength="2" /></label>
      <label class="field field-full"><span>Correo</span><input type="email" name="correo" required /></label>
      <label class="field"><span>Teléfono</span><input name="telefono" /></label>
      <label class="field"><span>Documento</span><input name="documento" required minlength="5" /></label>
      <label class="field"><span>Ciudad</span><input name="ciudad" placeholder="Ej. Cali" /></label>
      <label class="field"><span>Años de experiencia</span><input type="number" name="anos_experiencia" min="0" max="80" value="0" required /></label>
      <label class="field field-full"><span>Contraseña</span><input type="password" name="password" required minlength="8" /></label>
      <label class="field field-full"><span>Descripción profesional</span><textarea name="descripcion" placeholder="Describe tu experiencia, enfoque y tipo de clientes"></textarea></label>
      <label class="field field-full"><span>ID de especialidades</span><input name="especialidades" placeholder="Ej. 1,2,4" /><small style="color:var(--muted);font-size:9px">Se vinculará al catálogo de especialidades de la base de datos.</small></label>
      <button class="btn btn-primary btn-full field-full" type="submit">Enviar registro de entrenador →</button>
    </form>
  </div>`;
}

async function submitLogin(form) {
  const payload = Object.fromEntries(new FormData(form));
  const selectedRole = payload.rol;
  delete payload.rol;
  delete payload.remember;
  const button = $('button[type="submit"]', form);
  button.disabled = true;
  button.textContent = 'Validando acceso…';

  try {
    let response;
    if (state.liveApi) {
      response = await api.login(payload);
      if (!roleAllowed(response.user, selectedRole)) {
        clearSession();
        throw new Error(`Esta cuenta no tiene el rol ${roleConfig[selectedRole].label.toLowerCase()}. Selecciona el rol correcto.`);
      }
    } else {
      response = {
        token: `demo-${selectedRole.toLowerCase()}-token`,
        user: {
          id_usuario: selectedRole === 'CLIENTE' ? 101 : selectedRole === 'ENTRENADOR' ? 202 : 303,
          nombre: roleConfig[selectedRole].demoName,
          apellido: selectedRole === 'ADMINISTRADOR' ? 'Principal' : 'Demo',
          correo: payload.correo,
          roles: [selectedRole]
        }
      };
    }
    setSession(response.token, response.user);
    localStorage.setItem('tb_demo_mode', state.liveApi ? 'false' : 'true');
    toast(`Acceso correcto. Abriendo panel de ${roleConfig[selectedRole].label.toLowerCase()}…`, 'success');
    setTimeout(() => redirectByRole(selectedRole), 420);
  } catch (error) {
    button.disabled = false;
    button.innerHTML = `${roleConfig[selectedRole].submit} <span>→</span>`;
    toast(error.message || 'No fue posible iniciar sesión.', 'error');
  }
}

async function submitClientRegistration(form) {
  const payload = Object.fromEntries(new FormData(form));
  const button = $('button[type="submit"]', form);
  button.disabled = true;
  button.textContent = 'Creando cuenta…';
  try {
    let token;
    if (state.liveApi) {
      const response = await api.registerClient(payload);
      token = response.token;
    } else token = 'demo-cliente-token';
    const user = { id_usuario: Date.now(), nombre: payload.nombre, apellido: payload.apellido, correo: payload.correo, roles: ['CLIENTE'] };
    setSession(token, user);
    localStorage.setItem('tb_demo_mode', state.liveApi ? 'false' : 'true');
    closeModal();
    toast('Cuenta de cliente creada correctamente.', 'success');
    setTimeout(() => redirectByRole('CLIENTE'), 420);
  } catch (error) {
    button.disabled = false;
    button.textContent = 'Crear cuenta de cliente →';
    toast(error.message, 'error');
  }
}

async function submitTrainerRegistration(form) {
  const raw = Object.fromEntries(new FormData(form));
  const payload = {
    ...raw,
    anos_experiencia: Number(raw.anos_experiencia || 0),
    especialidades: String(raw.especialidades || '').split(',').map((value) => Number(value.trim())).filter((value) => Number.isInteger(value) && value > 0)
  };
  const button = $('button[type="submit"]', form);
  button.disabled = true;
  button.textContent = 'Enviando postulación…';
  try {
    let token;
    if (state.liveApi) {
      const response = await api.registerTrainer(payload);
      token = response.token;
    } else token = 'demo-entrenador-token';
    const user = { id_usuario: Date.now(), nombre: payload.nombre, apellido: payload.apellido, correo: payload.correo, roles: ['ENTRENADOR'] };
    setSession(token, user);
    localStorage.setItem('tb_demo_mode', state.liveApi ? 'false' : 'true');
    closeModal();
    toast('Registro enviado. El perfil queda pendiente de verificación.', 'success');
    setTimeout(() => redirectByRole('ENTRENADOR'), 650);
  } catch (error) {
    button.disabled = false;
    button.textContent = 'Enviar registro de entrenador →';
    toast(error.message, 'error');
  }
}

function enterDemo(role) {
  const user = {
    id_usuario: role === 'CLIENTE' ? 101 : role === 'ENTRENADOR' ? 202 : 303,
    nombre: roleConfig[role].demoName,
    apellido: role === 'ADMINISTRADOR' ? 'Principal' : 'Demo',
    correo: `${role.toLowerCase()}@demo.com`,
    roles: [role]
  };
  setSession(`demo-${role.toLowerCase()}-token`, user);
  localStorage.setItem('tb_demo_mode', 'true');
  redirectByRole(role);
}

function handleClick(event) {
  const roleCard = event.target.closest('[data-role]');
  if (roleCard) selectRole(roleCard.dataset.role);

  const demoButton = event.target.closest('[data-demo-role]');
  if (demoButton) enterDemo(demoButton.dataset.demoRole);

  const actionElement = event.target.closest('[data-action]');
  if (!actionElement) return;
  const action = actionElement.dataset.action;
  if (action === 'close-modal') closeModal();
  if (action === 'change-role') $('#roleGrid').scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (action === 'toggle-password') {
    const input = $('input[name="password"]', actionElement.closest('.password-control'));
    input.type = input.type === 'password' ? 'text' : 'password';
  }
  if (action === 'forgot-password') toast('La recuperación de contraseña se conectará al servicio de correo del backend.', 'info');
  if (action === 'open-role-register') modal(state.role === 'ENTRENADOR' ? trainerRegisterMarkup() : clientRegisterMarkup(), true);
}

function handleSubmit(event) {
  if (event.target.id === 'portalLoginForm') { event.preventDefault(); submitLogin(event.target); }
  if (event.target.id === 'clientRegisterForm') { event.preventDefault(); submitClientRegistration(event.target); }
  if (event.target.id === 'trainerRegisterForm') { event.preventDefault(); submitTrainerRegistration(event.target); }
}

async function init() {
  clearSession();
  try {
    await api.health();
    state.liveApi = true;
  } catch {
    state.liveApi = false;
  }
  selectRole('CLIENTE');
  document.addEventListener('click', handleClick);
  document.addEventListener('submit', handleSubmit);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeModal(); });
}

init();
