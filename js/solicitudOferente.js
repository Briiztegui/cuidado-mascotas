import { solicitudesAPI, profesionalesAPI } from "./api.js";
import { obtenerUsuario } from "./auth-guard.js";
import { STORAGE_KEYS } from "./config.js";

const ACCIONES_POR_ESTADO = {
  pendiente: [
    { estado: "aceptada", texto: "Aceptar", clase: "btn-outline-success" },
    { estado: "rechazada", texto: "Rechazar", clase: "btn-outline-danger" }
  ],
  aceptada: [
    { estado: "completada", texto: "Marcar como completada", clase: "sol-naranja" }
  ],
  rechazada: [],
  completada: []
};

const ESTADOS_CONOCIDOS = ["pendiente", "aceptada", "rechazada", "completada"];

const contenedor = document.getElementById("contenedorSolicitudesOferente");
const alerta = document.getElementById("alertaSolicitudesOferente");

let solicitudes = [];
let estadoFiltroActual = "todas";

const esc = (texto) => {
  const div = document.createElement("div");
  div.textContent = texto ?? "";
  return div.innerHTML;
};

const obtenerId = (obj) => String(obj?._id || obj?.id || "");

const mostrarMensaje = (texto, tipo = "info") => {
  if (!alerta) return;
  alerta.innerHTML = `
    <div class="alert alert-${tipo} alert-dismissible fade show rounded-3 mb-0" role="alert">
      ${esc(texto)}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
    </div>
  `;
};

const formatearFecha = (fecha) => {
  if (!fecha) return "";
  const d = new Date(fecha);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("es-AR");
};

const badgeEstado = (estado) => {
  const variante = ESTADOS_CONOCIDOS.includes(estado) ? estado : "pendiente";
  return `<span class="sol-estado sol-${variante}">${esc(estado)}</span>`;
};

const actualizarBadgeNuevas = (lista) => {
  const cantidad = lista.filter((item) => item.estado === "pendiente").length;

  const badgeSeccion = document.getElementById("badgeSolicitudesNuevas");
  if (badgeSeccion) {
    badgeSeccion.textContent = String(cantidad);
  }

  const badgeNavbar = document.getElementById("badge-solicitudes");
  if (badgeNavbar) {
    badgeNavbar.textContent = String(cantidad);
    badgeNavbar.classList.toggle("d-none", cantidad === 0);
  }
};

async function resolverProfesionalId(usuario) {
  if (usuario?.profesionalId) {
    return String(usuario.profesionalId);
  }

  const usuarioId = obtenerId(usuario);
  if (!usuarioId || typeof profesionalesAPI?.listar !== "function") {
    return "";
  }

  try {
    const resp = await profesionalesAPI.listar();
    const lista = Array.isArray(resp)
      ? resp
      : resp?.profesionales || resp?.data || [];

    const encontrado = lista.find((prof) => {
      const idUsr =
        typeof prof.usuario === "object" && prof.usuario !== null
          ? obtenerId(prof.usuario)
          : String(prof.usuario || "");
      return idUsr === usuarioId;
    });

    if (encontrado?._id) {
      usuario.profesionalId = encontrado._id;
      if (STORAGE_KEYS?.USUARIO) {
        localStorage.setItem(STORAGE_KEYS.USUARIO, JSON.stringify(usuario));
      }
      return String(encontrado._id);
    }
  } catch {
    // Si falla, devolvemos vacío
  }

  return "";
}

const renderizarTarjetaOferente = (solicitud) => {
  const id = obtenerId(solicitud);
  const estado = solicitud.estado || "pendiente";
  const acciones = ACCIONES_POR_ESTADO[estado] || [];
  const clienteNombre = solicitud.cliente?.nombre || "Cliente";
  const clienteEmail = solicitud.cliente?.email || "";
  const servicioNombre = solicitud.servicio?.nombre || "Servicio";
  const precio =
    solicitud.servicio?.precio !== undefined
      ? `$${Number(solicitud.servicio.precio).toLocaleString("es-AR")}`
      : "";
  const fechaTexto = formatearFecha(solicitud.fecha);

  const botones = acciones
    .map(
      (a) => `
      <button
        type="button"
        class="btn btn-sm rounded-pill ${a.clase} btn-cambiar-estado"
        data-id="${esc(id)}"
        data-estado="${a.estado}"
      >
        ${esc(a.texto)}
      </button>`
    )
    .join("");

  return `
    <div class="col-12 col-md-6">
      <div class="sol-tarjeta d-flex flex-column h-100 p-3">
        <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
          ${badgeEstado(estado)}
          <small class="fw-bold text-secondary">${esc(solicitud.diaFranja || "")}</small>
        </div>

        <h2 class="h6 fw-bold mb-1">${esc(servicioNombre)} ${precio ? `· <span class="text-secondary fw-normal">${esc(precio)}</span>` : ""}</h2>
        <small class="text-secondary">
          Solicitado por <strong>${esc(clienteNombre)}</strong>${clienteEmail ? ` (${esc(clienteEmail)})` : ""}
        </small>

        <p class="my-3">${esc(solicitud.descripcion || "")}</p>

        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-auto pt-2 border-top">
          <div class="d-flex flex-wrap align-items-center gap-2">
            ${botones}
          </div>
          ${fechaTexto ? `<small class="text-secondary">Recibida el ${esc(fechaTexto)}</small>` : ""}
        </div>
      </div>
    </div>
  `;
};

const pintar = () => {
  if (!contenedor) return;
  actualizarBadgeNuevas(solicitudes);

  const filtradas =
    estadoFiltroActual === "todas"
      ? solicitudes
      : solicitudes.filter((item) => (item.estado || "pendiente") === estadoFiltroActual);

  if (!filtradas.length) {
    const msg =
      estadoFiltroActual === "todas"
        ? "Todavía no recibiste solicitudes."
        : `No tenés solicitudes en estado "${estadoFiltroActual}".`;
    contenedor.innerHTML = `<p class="text-center text-secondary py-4">${esc(msg)}</p>`;
    return;
  }

  contenedor.innerHTML = filtradas.map(renderizarTarjetaOferente).join("");
};

function configurarFiltrosEstado() {
  document.querySelectorAll(".filtro-estado").forEach((btn) => {
    btn.addEventListener("click", () => {
      estadoFiltroActual = btn.dataset.estado || "todas";

      document.querySelectorAll(".filtro-estado").forEach((b) => {
        const activo = b === btn;
        b.classList.toggle("btn-dark", activo);
        b.classList.toggle("text-white", activo);
        b.classList.toggle("btn-outline-secondary", !activo);
      });

      pintar();
    });
  });
}

function configurarAccionesEstado() {
  if (!contenedor) return;

  contenedor.addEventListener("click", async (evento) => {
    const boton = evento.target.closest(".btn-cambiar-estado");
    if (!boton) return;

    const id = boton.dataset.id;
    const nuevoEstado = boton.dataset.estado;
    if (!id || !nuevoEstado) return;

    if (nuevoEstado === "rechazada" && !window.confirm("¿Seguro que querés rechazar esta solicitud?")) {
      return;
    }

    const textoOriginal = boton.textContent;
    boton.disabled = true;
    boton.textContent = "Actualizando...";

    try {
      await solicitudesAPI.cambiarEstado(id, nuevoEstado);
      solicitudes = solicitudes.map((item) =>
        obtenerId(item) === id ? { ...item, estado: nuevoEstado } : item
      );
      pintar();
      mostrarMensaje(`La solicitud ahora está en estado "${nuevoEstado}".`, "success");
    } catch (error) {
      boton.disabled = false;
      boton.textContent = textoOriginal;
      mostrarMensaje(error.message || "No se pudo actualizar el estado.", "danger");
    }
  });
}

async function iniciarVistaOferente() {
  if (!contenedor) return;

  const usuario = obtenerUsuario();
  if (!usuario) return;

  if (usuario.rol !== "oferente") {
    contenedor.innerHTML = "";
    mostrarMensaje("Esta vista es exclusiva para cuentas de oferente.", "warning");
    return;
  }

  const profesionalId = await resolverProfesionalId(usuario);
  if (!profesionalId) {
    contenedor.innerHTML = "";
    mostrarMensaje(
      "Completá primero tu perfil de oferente para recibir y gestionar solicitudes.",
      "info"
    );
    return;
  }

  configurarFiltrosEstado();
  configurarAccionesEstado();

  try {
    const data = await solicitudesAPI.listarPorProfesional(profesionalId);
    solicitudes = Array.isArray(data) ? data : data?.solicitudes || data?.data || [];
    solicitudes.sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
    pintar();
  } catch (error) {
    contenedor.innerHTML = "";
    mostrarMensaje(
      `No se pudieron cargar las solicitudes recibidas (${error.message}).`,
      "warning"
    );
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciarVistaOferente);
} else {
  iniciarVistaOferente();
}