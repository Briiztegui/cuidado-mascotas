/**
 * MÓDULO 2: Seguridad de Rutas y Navbar Dinámico (Integrante 2)
 * - Verifica si hay sesión activa en localStorage. Si no hay, redirige a index.html.
 * - Valida el rol del usuario: si un 'cliente' intenta entrar por URL a una página de 'oferente' (o viceversa), lo bloquea y redirige automáticamente.
 * - Renderiza dinámicamente las opciones del Navbar según el rol y maneja el botón de Cerrar Sesión.
 */

import { CONFIG, STORAGE_KEYS } from "./config.js";

// Guardamos la raíz del proyecto para construir rutas relativas seguras.
const RAIZ = new URL("../", import.meta.url).href;

// RUTAS: Lo que no esté especificado acá es público para cualquiera.
const PAGINAS = {
  "explorar-cliente.html": "cliente",
  "mis-solicitudes.html": "cliente",
  "panel-oferente.html": "oferente",
  "perfil-oferente.html": "oferente"
};

const LOGIN = "index.html";

// A dónde envía según su rol
const PANEL = {
  oferente: "html/panel-oferente.html",
  cliente: "html/explorar-cliente.html"
};

// Botones de la navbar según el rol
const MENUS = {
  oferente: [
    { texto: "Mi panel", href: "html/panel-oferente.html", badge: true },
    { texto: "Mi perfil", href: "html/perfil-oferente.html" }
  ],
  cliente: [
    { texto: "Explorar", href: "html/explorar-cliente.html" },
    { texto: "Mis solicitudes", href: "html/mis-solicitudes.html" }
  ]
};

// Compara los datos para ingresar; si hay algún problema retorna null.
export function obtenerUsuario() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USUARIO);
    const usuario = raw ? JSON.parse(raw) : null;

    if (!usuario || !PANEL[usuario.rol]) return null;
    return usuario;
  } catch {
    return null;
  }
}

// Verifica si tenés token y lo retorna; si no, retorna null.
export function obtenerToken() {
  if (STORAGE_KEYS.TOKEN) {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token) return token;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USUARIO);
    return (raw ? JSON.parse(raw) : {}).token || null;
  } catch {
    return null;
  }
}

// Cierra la sesión actual.
export function cerrarSesion() {
  if (STORAGE_KEYS.TOKEN) {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
  }
  localStorage.removeItem(STORAGE_KEYS.USUARIO);
  window.location.replace(RAIZ + LOGIN);
}

// Retorna en qué página te encontrás.
function paginaActual() {
  return window.location.pathname.split("/").pop() || LOGIN;
}

// Analiza tres situaciones para dejarte acceder a la app.
function protegerPagina() {
  const usuario = obtenerUsuario();
  const acceso = PAGINAS[paginaActual()] || "publico";

  // No tenés sesión y querés ingresar a una página protegida. Te lleva al login.
  if (acceso !== "publico" && !usuario) {
    window.location.replace(RAIZ + LOGIN);
    return false;
  }

  // Entraste a una página que no es la de tu rol; te redirecciona.
  if (acceso !== "publico" && usuario.rol !== acceso) {
    window.location.replace(RAIZ + PANEL[usuario.rol]);
    return false;
  }

  // Si ya estás logueado y vas al login, te redirecciona a tu panel.
  if (usuario && paginaActual() === LOGIN) {
    window.location.replace(RAIZ + PANEL[usuario.rol]);
    return false;
  }

  return true;
}

// Arma el menú superior según el rol del usuario.
function renderNavbar() {
  const usuario = obtenerUsuario();
  if (!usuario) return;

  let nav = document.getElementById("navbar");
  if (!nav) {
    nav = document.createElement("nav");
    nav.id = "navbar";
    const contenedor = document.getElementById("navbarContainer");
    if (contenedor) {
      contenedor.appendChild(nav);
    } else {
      document.body.prepend(nav);
    }
  }

  const rol = usuario.rol;
  const links = MENUS[rol]
    .map((item) => {
      const activo = item.href.endsWith("/" + paginaActual()) ? " active" : "";
      const badge = item.badge
        ? ' <span id="badge-solicitudes" class="badge rounded-pill bg-danger d-none">0</span>'
        : "";
      return `<li class="nav-item"><a class="nav-link${activo}" href="${RAIZ + item.href}">${item.texto}${badge}</a></li>`;
    })
    .join("");

  const color = rol === "oferente" ? "bg-success" : "bg-primary";
  nav.className = `navbar navbar-expand-lg navbar-dark ${color}`;
  nav.innerHTML = `
    <div class="container">
      <a class="navbar-brand fw-bold d-flex align-items-center gap-2" href="${RAIZ + PANEL[rol]}">
        <img src="${RAIZ}imagenes/huellitas.jpeg" alt="Logo Huellitas" class="navbar-logo" onerror="this.style.display='none'">
        <span>Huellitas</span>
      </a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#menu-principal">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="menu-principal">
        <ul class="navbar-nav me-auto">${links}</ul>
        <span class="navbar-text me-3">Hola, ${escaparHTML(usuario.nombre || "")} <small class="text-white-50">(${rol})</small></span>
        <button id="btn-logout" type="button" class="btn btn-outline-light btn-sm">Cerrar sesión</button>
      </div>
    </div>`;

  const btnLogout = document.getElementById("btn-logout");
  if (btnLogout) btnLogout.addEventListener("click", cerrarSesion);

  if (rol === "oferente") actualizarBadgeSolicitudes();
}

// Actualiza las solicitudes pendientes del oferente si el endpoint existe.
async function actualizarBadgeSolicitudes() {
  const badge = document.getElementById("badge-solicitudes");
  if (!badge) return;

  try {
    const token = obtenerToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(`${CONFIG.API_URL}/solicitudes/pendientes`, { headers });

    if (res.status === 401 || res.status === 403) return cerrarSesion();
    if (!res.ok) return;

    const data = await res.json();
    const cantidad = Array.isArray(data) ? data.length : data.cantidad || 0;
    if (cantidad > 0) {
      badge.textContent = cantidad;
      badge.classList.remove("d-none");
    }
  } catch {
    // Silencioso si el endpoint aún no está disponible
  }
}

// Convierte texto común a seguro para HTML.
function escaparHTML(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

// Revisa si podés ingresar a la app; si podés, crea el menú.
if (protegerPagina()) {
  renderNavbar();
  document.documentElement.style.visibility = "";
}