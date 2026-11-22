import { authAPI } from "./api.js";
import { STORAGE_KEYS } from "./config.js";

const loginForm = document.querySelector("#login-form");
const registerForm = document.querySelector("#register-form");

function showPanel(panelName) {
  const isLogin = panelName === "login";
  document.querySelector("#login-panel").hidden = !isLogin;
  document.querySelector("#register-panel").hidden = isLogin;

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
  message.textContent = text;
  message.classList.toggle("text-danger", isError);
  message.classList.toggle("text-success", !isError);
}

function setSubmitting(form, isSubmitting) {
  const button = form.querySelector('[type="submit"]');
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
    const needsProfile = isNewAccount || !usuario.profesionalId;
    window.location.assign(
      needsProfile ? "./html/perfil-oferente.html" : "./html/panel-oferente.html"
    );
    return;
  }

  throw new Error("El servidor devolvió un rol de usuario no válido.");
}

function saveUser(response) {
  const usuario = response && response.usuario;
  if (!usuario || !usuario.id || !["cliente", "oferente"].includes(usuario.rol)) {
    throw new Error("El servidor devolvió datos de usuario incompletos.");
  }

  localStorage.setItem(STORAGE_KEYS.usuario, JSON.stringify(usuario));
  return usuario;
}

document.querySelectorAll("[data-auth-tab]").forEach((tab) => {
  tab.addEventListener("click", () => showPanel(tab.dataset.authTab));
});

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
