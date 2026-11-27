/**
 * MÓDULO 4: Gestión de Servicios del Oferente (Integrante 4)
 * - Maneja el formulario para crear nuevos servicios de cuidado de mascotas (nombre, descripción, precio, categoría) con serviciosAPI.crear().
 * - Lista en panel-oferente.html los servicios activos cargados por este profesional.
 */

/*
 VARIABLES
*/

import { CONFIG, STORAGE_KEYS } from "./config.js";
import { obtenerUsuario } from "./auth-guard.js";

const formularioServicio = document.getElementById("formularioServicio");
const nombreServicio = document.getElementById("nombreServicio");
const descripcion = document.getElementById("descripcion");
const precio = document.getElementById("precio");
const categoria = document.getElementById("categoria");
const btnPublicar = document.getElementById("btn-publicar-servicio");
const serviciosActivos = document.getElementById("serviciosActivos");
const mensajeSinServicios = document.getElementById("mensajeSinServicios");
const alertaServicios = document.getElementById("alerta-servicios");
const tituloPanel = document.getElementById("titulo-panel-oferente");

const usuarioLogueado = obtenerUsuario();
let profesionalIdActual = usuarioLogueado?.profesionalId ? String(usuarioLogueado.profesionalId) : "";
let serviciosCache = [];

function obtenerApiRoot() {
  const base = String(CONFIG?.API_URL || "http://localhost:3000/api").replace(/\/+$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
}

function mostrarAlerta(mensaje, tipo = "info") {
  if (!alertaServicios) return;
  alertaServicios.textContent = mensaje;
  alertaServicios.className = `alert alert-${tipo} d-block rounded-3`;
}

function ocultarAlerta() {
  if (!alertaServicios) return;
  alertaServicios.className = "alert d-none";
  alertaServicios.textContent = "";
}

function formatearCategoria(cat) {
  const mapa = {
    paseo: "Paseo",
    guarderia: "Pet sitting / Guardería",
    veterinaria: "Veterinaria"
  };
  return mapa[String(cat || "").toLowerCase()] || cat || "General";
}

function obtenerIdRef(ref) {
  if (!ref) return "";
  if (typeof ref === "string") return ref;
  return String(ref._id || ref.id || "");
}

function obtenerRutaPerfilOferente() {
  const enSubcarpeta =
    window.location.pathname.includes("/paginas/") ||
    window.location.pathname.includes("/pages/");
  return enSubcarpeta ? "perfil-oferente.html" : "paginas/perfil-oferente.html";
}

async function resolverProfesionalId() {
  if (profesionalIdActual) return profesionalIdActual;

  const usuarioId = usuarioLogueado?._id ?? usuarioLogueado?.id;
  if (!usuarioId) return "";

  try {
    const resp = await fetch(`${obtenerApiRoot()}/profesionales`);
    if (!resp.ok) return "";
    const data = await resp.json();
    const lista = Array.isArray(data) ? data : data.profesionales || data.data || [];

    const encontrado = lista.find((prof) => {
      const idUsuarioProf = obtenerIdRef(prof.usuario);
      return idUsuarioProf && idUsuarioProf === String(usuarioId);
    });

    if (encontrado?._id) {
      profesionalIdActual = String(encontrado._id);
      if (usuarioLogueado) {
        usuarioLogueado.profesionalId = encontrado._id;
        localStorage.setItem(STORAGE_KEYS.USUARIO, JSON.stringify(usuarioLogueado));
      }
      return profesionalIdActual;
    }
  } catch (error) {
    console.warn("No se pudo resolver profesionalId automáticamente:", error);
  }

  return "";
}

async function exigirPerfilProfesional() {
  if (!usuarioLogueado) {
    return false;
  }

  if (usuarioLogueado.rol !== "oferente") {
    return true;
  }

  const profId = await resolverProfesionalId();
  if (!profId) {
    window.location.href = obtenerRutaPerfilOferente();
    return false;
  }

  return true;
}

function actualizarMensajeVacio() {
  if (!mensajeSinServicios) return;
  mensajeSinServicios.classList.toggle("d-none", serviciosCache.length > 0);
}

function crearTarjetaServicio(servicio) {
  const columna = document.createElement("div");
  columna.classList.add("col-12", "col-md-6", "col-lg-4");

  const tarjeta = document.createElement("div");
  tarjeta.classList.add("card", "filter-card", "shadow-sm", "h-100", "p-3", "d-flex", "flex-column");

  const titulo = document.createElement("h3");
  titulo.classList.add("h5");
  titulo.textContent = servicio.nombre || "Servicio sin nombre";

  const textoDescripcion = document.createElement("p");
  textoDescripcion.classList.add("flex-grow-1");
  textoDescripcion.textContent = servicio.descripcion || "";

  const textoCategoria = document.createElement("p");
  textoCategoria.classList.add("mb-1", "small");
  textoCategoria.textContent = `Categoría: ${formatearCategoria(servicio.categoria)}`;

  const textoPrecio = document.createElement("p");
  textoPrecio.classList.add("mb-2", "fw-bold");
  textoPrecio.textContent = `Precio: $${Number(servicio.precio ?? 0).toLocaleString("es-AR")}`;

  const botonEliminar = document.createElement("button");
  botonEliminar.classList.add("btn", "btn-link", "text-danger", "p-0", "align-self-start");
  botonEliminar.type = "button";
  botonEliminar.title = "Quitar de la vista";

  const iconoEliminar = document.createElement("i");
  iconoEliminar.classList.add("bi", "bi-trash3-fill");
  botonEliminar.appendChild(iconoEliminar);

  botonEliminar.addEventListener("click", () => {
    if (confirm("¿Estás seguro de que querés quitar este servicio de la lista actual?")) {
      const idServicio = servicio._id || servicio.id;
      serviciosCache = serviciosCache.filter((item) =>
        idServicio ? (item._id || item.id) !== idServicio : item !== servicio
      );
      columna.remove();
      actualizarMensajeVacio();
    }
  });

  tarjeta.appendChild(titulo);
  tarjeta.appendChild(textoDescripcion);
  tarjeta.appendChild(textoCategoria);
  tarjeta.appendChild(textoPrecio);
  tarjeta.appendChild(botonEliminar);

  columna.appendChild(tarjeta);
  return columna;
}

function renderizarServicios(lista) {
  if (!serviciosActivos) return;

  Array.from(serviciosActivos.children).forEach((child) => {
    if (child.id !== "mensajeSinServicios") {
      child.remove();
    }
  });

  serviciosCache = Array.isArray(lista) ? [...lista] : [];
  serviciosCache.forEach((srv) => {
    serviciosActivos.appendChild(crearTarjetaServicio(srv));
  });
  actualizarMensajeVacio();
}

async function cargarMisServicios() {
  const profId = await resolverProfesionalId();
  const usuarioId = String(usuarioLogueado?._id ?? usuarioLogueado?.id ?? "");

  if (!profId && !usuarioId) {
    actualizarMensajeVacio();
    return;
  }

  try {
    const resp = await fetch(`${obtenerApiRoot()}/servicios`);
    if (!resp.ok) {
      throw new Error(`Error HTTP ${resp.status}`);
    }

    const data = await resp.json();
    const todos = Array.isArray(data) ? data : data.servicios || data.data || [];

    const mios = todos.filter((srv) => {
      const idProfSrv = obtenerIdRef(srv.profesional);
      const idUsuarioSrv = obtenerIdRef(srv.usuario);
      return (profId && idProfSrv === profId) || (usuarioId && idUsuarioSrv === usuarioId);
    });

    renderizarServicios(mios);
  } catch (error) {
    console.error("Error al cargar servicios del oferente:", error);
    mostrarAlerta("No se pudieron cargar tus servicios desde el servidor.", "warning");
  }
}

function limpiarFormulario() {
  formularioServicio?.reset();
}

formularioServicio?.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  ocultarAlerta();

  const tienePerfil = await exigirPerfilProfesional();
  if (!tienePerfil) return;

  const profId = await resolverProfesionalId();
  const usuarioId = usuarioLogueado?._id ?? usuarioLogueado?.id ?? null;

  if (!profId && !usuarioId) {
    mostrarAlerta("Iniciá sesión como oferente para publicar un servicio.", "danger");
    return;
  }

  const payload = {
    nombre: nombreServicio.value.trim(),
    descripcion: descripcion.value.trim(),
    precio: Number(precio.value),
    categoria: categoria.value,
    ...(profId ? { profesional: profId } : {}),
    ...(usuarioId ? { usuario: usuarioId } : {})
  };

  try {
    if (btnPublicar) {
      btnPublicar.disabled = true;
    }

    const resp = await fetch(`${obtenerApiRoot()}/servicios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(data.mensaje || data.error || `Error HTTP ${resp.status}`);
    }

    const servicioCreado = data.servicio || data.data || data;
    serviciosCache.unshift(servicioCreado);
    renderizarServicios(serviciosCache);
    limpiarFormulario();
    mostrarAlerta("¡Servicio publicado correctamente!", "success");
  } catch (error) {
    mostrarAlerta(error.message || "No se pudo publicar el servicio.", "danger");
  } finally {
    if (btnPublicar) {
      btnPublicar.disabled = false;
    }
  }
});

(async () => {
  const tienePerfil = await exigirPerfilProfesional();
  if (!tienePerfil) return;

  if (usuarioLogueado?.nombre && tituloPanel) {
    tituloPanel.textContent = `Mis servicios — ${usuarioLogueado.nombre}`;
  }

  await cargarMisServicios();
})();