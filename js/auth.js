/**
 * MÓDULO 1: Autenticación y Registro (Integrante 1)
 * - Maneja el envío de formularios de Login y Registro usando authAPI (de api.js).
 * - Guarda el token y los datos del usuario (incluyendo su rol fijo) en localStorage usando STORAGE_KEYS.
 * - Redirige al panel correspondiente según el rol ('oferente' -> panel-oferente.html / 'cliente' -> explorar-cliente.html).
 */

import { authAPI } from "./api.js";
import { STORAGE_KEYS } from "./config.js";

const loginForm = document.querySelector("#login-form");
const registerForm = document.querySelector("#register-form");

function showPanel(panelName) {
  const isLogin = panelName === "login";
  const loginPanel = document.querySelector("#login-panel");
  const registerPanel = document.querySelector("#register-panel");

  if (loginPanel) loginPanel.hidden = !isLogin;
  if (registerPanel) registerPanel.hidden = isLogin;

  document.querySelectorAll("[data-auth-tab]").forEach((tab) => {
    const active = tab.dataset.authTab === panelName;
    if (tab.matches('[role="tab"]')) {
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    }
  });

  clearMessages();
}

function clearMessages() {
  document.querySelectorAll(".auth-message").forEach((message) => {
    message.textContent = "";
    message.classList.remove("text-danger", "text-success");
  });
}

function showMessage(form, text, isError = true) {
  const message = document.querySelector(`#${form.id.replace("-form", "-message")}`);
  if (!message) return;
  message.textContent = text;
  message.classList.toggle("text-danger", isError);
  message.classList.toggle("text-success", !isError);
}

function setSubmitting(form, isSubmitting) {
  const button = form.querySelector('[type="submit"]');
  if (!button) return;
  button.disabled = isSubmitting;
  button.textContent = isSubmitting
    ? "Un momento..."
    : form === loginForm ? "Iniciar sesión" : "Crear cuenta";
}

function redirectByRole(usuario, isNewAccount = false) {
  if (usuario.rol === "cliente") {
    window.location.assign("./html/explorar-cliente.html");
    return;
  }

  if (usuario.rol === "oferente") {
    if (isNewAccount) {
      window.location.assign("./html/perfil-oferente.html");
      return;
    }

    window.location.assign("./html/panel-oferente.html");
    return;
  }

  throw new Error("El servidor devolvió un rol de usuario no válido.");
}

function saveUser(response) {
  const rawUsuario = response && (response.usuario || response.data?.usuario || response.data);
  const id = rawUsuario && (rawUsuario.id ?? rawUsuario._id);

  if (!rawUsuario || !id || !["cliente", "oferente"].includes(rawUsuario.rol)) {
    throw new Error("El servidor devolvió datos de usuario incompletos.");
  }

  const usuarioNormalizado = {
    ...rawUsuario,
    id: String(id),
    _id: String(rawUsuario._id ?? id)
  };

  localStorage.setItem(STORAGE_KEYS.USUARIO, JSON.stringify(usuarioNormalizado));

  const token = response.token || rawUsuario.token;
  if (token) {
    localStorage.setItem(STORAGE_KEYS.TOKEN, String(token));
  }

  return usuarioNormalizado;
}

document.querySelectorAll("[data-auth-tab]").forEach((tab) => {
  tab.addEventListener("click", () => showPanel(tab.dataset.authTab));
});

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessages();

    if (!loginForm.reportValidity()) return;

    const formData = new FormData(loginForm);
    const credentials = {
      email: String(formData.get("email")).trim().toLowerCase(),
      password: String(formData.get("password"))
    };

    setSubmitting(loginForm, true);
    try {
      const response = await authAPI.login(credentials);
      const usuario = saveUser(response);
      redirectByRole(usuario);
    } catch (error) {
      showMessage(loginForm, error.message);
    } finally {
      setSubmitting(loginForm, false);
    }
  });
}

if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessages();

    if (!registerForm.reportValidity()) return;

    const formData = new FormData(registerForm);
    const datos = {
      nombre: String(formData.get("nombre")).trim(),
      email: String(formData.get("email")).trim().toLowerCase(),
      password: String(formData.get("password")),
      rol: String(formData.get("rol"))
    };

    if (!datos.nombre) {
      showMessage(registerForm, "Ingresá tu nombre y apellido.");
      return;
    }
    if (!["cliente", "oferente"].includes(datos.rol)) {
      showMessage(registerForm, "Seleccioná un tipo de cuenta válido.");
      return;
    }

    setSubmitting(registerForm, true);
    try {
      const response = await authAPI.registro(datos);
      const usuario = saveUser(response);
      showMessage(registerForm, "Cuenta creada. Te estamos llevando a tu espacio.", false);
      redirectByRole(usuario, true);
    } catch (error) {
      showMessage(registerForm, error.message);
    } finally {
      setSubmitting(registerForm, false);
    }
  });
}