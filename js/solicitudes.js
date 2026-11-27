/**
 * MÓDULO 6: Flujo de Solicitudes y WhatsApp Condicional (Integrante 6)
 * - Cliente: envía el formulario de reserva (descripción de la mascota, día/franja horaria) con solicitudesAPI.crear().
 * - Oferente: lista las solicitudes recibidas en panel-oferente.html y permite cambiar estados ('aceptada', 'rechazada', 'completada') con solicitudesAPI.cambiarEstado().
 * - Regla crítica: en mis-solicitudes.html, muestra el botón/contacto de WhatsApp del oferente ÚNICAMENTE cuando estado === 'aceptada'.
 */

import { solicitudesAPI, resenasAPI } from "./api.js";
import { obtenerUsuario } from "./auth-guard.js";

const ESTADOS_CONOCIDOS = ["pendiente", "aceptada", "rechazada", "completada"];

const esc = (texto) => {
  const div = document.createElement("div");
  div.textContent = texto ?? "";
  return div.innerHTML;
};

const obtenerId = (valor) => {
  if (!valor) return "";
  if (typeof valor === "string") return valor;
  return String(valor._id || valor.id || "");
};

const limpiarTelefono = (telefono) => (telefono ? String(telefono).replace(/\D/g, "") : "");

const mostrarMensaje = (contenedor, texto, tipo = "info") => {
  if (!contenedor) return;
  contenedor.innerHTML = `
    <div class="alert alert-${tipo} rounded-3 mb-0" role="alert">
      ${esc(texto)}
    </div>
  `;
};

const formatearFecha = (fecha) => {
  const d = new Date(fecha);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("es-AR");
};

const hoyISO = () => {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
};

const badgeEstado = (estado) => {
  const variante = ESTADOS_CONOCIDOS.includes(estado) ? estado : "pendiente";
  return `<span class="sol-estado sol-${variante}">${esc(estado)}</span>`;
};

// ---------------------------------------------------------------
// WhatsApp condicional (solo si estado === "aceptada")
// ---------------------------------------------------------------

const crearBotonWhatsAppOferente = (solicitud) => {
  if (solicitud.estado !== "aceptada") return "";

  const telefonoLimpio = limpiarTelefono(solicitud.profesional?.contacto);
  if (!telefonoLimpio) {
    return `<small class="text-secondary">El profesional todavía no cargó su contacto.</small>`;
  }

  const mensaje = encodeURIComponent(
    `Hola! Te escribo por la solicitud de cuidado de mascotas (${solicitud.diaFranja || ""}).`
  );

  return `
    <a
      href="https://wa.me/${telefonoLimpio}?text=${mensaje}"
      target="_blank"
      rel="noopener noreferrer"
      class="btn sol-whatsapp btn-sm rounded-pill px-3"
    >
      WhatsApp del oferente
    </a>
  `;
};

const textoSinContacto = (estado) => {
  if (estado === "pendiente") {
    return `<small class="text-secondary">El contacto se habilita cuando el profesional acepte.</small>`;
  }
  if (estado === "rechazada") {
    return `<small class="text-secondary">El profesional no pudo aceptar esta solicitud.</small>`;
  }
  return "";
};

// ---------------------------------------------------------------
// Enlace a reseña (solo si estado === "completada")
// ---------------------------------------------------------------

const crearAccionResenaHtml = (solicitud, yaResenada = false) => {
  if (solicitud.estado !== "completada") return "";

  if (yaResenada) {
    return `<span class="badge bg-light text-secondary border rounded-pill px-3 py-2">Reseña enviada</span>`;
  }

  const solId = obtenerId(solicitud);
  const profId = obtenerId(solicitud.profesional);
  const srvId = obtenerId(solicitud.servicio);

  const params = new URLSearchParams({
    solicitud: solId,
    profesional: profId,
    solicitudId: solId,
    profesionalId: profId,
    servicioId: srvId
  });

  return `
    <a
      href="resenas.html?${params.toString()}"
      class="btn btn-sm sol-naranja rounded-pill px-3"
    >
      Dejar reseña
    </a>
  `;
};

// ---------------------------------------------------------------
// Vista CLIENTE: mis-solicitudes.html
// ---------------------------------------------------------------

const renderizarTarjetaCliente = (solicitud, solicitudesResenadas = new Set()) => {
  const id = obtenerId(solicitud);
  const estado = solicitud.estado || "pendiente";
  const servicio = solicitud.servicio?.nombre || "Servicio";
  const profesional = solicitud.profesional?.usuario?.nombre || "";
  const contacto = estado === "aceptada" ? crearBotonWhatsAppOferente(solicitud) : textoSinContacto(estado);
  const resenaHtml = crearAccionResenaHtml(solicitud, solicitudesResenadas.has(id));

  return `
    <div class="col-12 col-md-6">
      <div class="sol-tarjeta d-flex flex-column h-100 p-3">
        <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
          ${badgeEstado(estado)}
          <small class="fw-bold text-secondary">${esc(solicitud.diaFranja || "")}</small>
        </div>
        <h2 class="h6 fw-bold mb-0">${esc(servicio)}</h2>
        ${profesional ? `<small class="text-secondary">${esc(profesional)}</small>` : ""}
        <p class="my-3">${esc(solicitud.descripcion || "")}</p>
        <div class="d-flex flex-wrap align-items-center gap-2 mt-auto">
          ${contacto}
          ${resenaHtml}
        </div>
        <small class="text-secondary mt-2">Enviada el ${esc(formatearFecha(solicitud.fecha))}</small>
      </div>
    </div>
  `;
};

async function obtenerSolicitudesResenadas(solicitudes, clienteId) {
  const resenadas = new Set();
  if (typeof resenasAPI?.listarPorProfesional !== "function") return resenadas;

  const completadas = solicitudes.filter((s) => s.estado === "completada");
  const profIds = [...new Set(completadas.map((s) => obtenerId(s.profesional)).filter(Boolean))];

  await Promise.all(
    profIds.map(async (profId) => {
      try {
        const lista = await resenasAPI.listarPorProfesional(profId);
        const arr = Array.isArray(lista) ? lista : lista?.resenas || lista?.data || [];
        arr.forEach((r) => {
          if (obtenerId(r.cliente) === String(clienteId) && r.solicitud) {
            resenadas.add(obtenerId(r.solicitud));
          }
        });
      } catch {
        // No bloquea el listado si falla la consulta de reseñas
      }
    })
  );

  return resenadas;
}

const cargarVistaCliente = async () => {
  const contenedor = document.getElementById("contenedorMisSolicitudes");
  const alerta = document.getElementById("alertaMisSolicitudes");
  if (!contenedor) return;

  const usuario = obtenerUsuario();
  const clienteId = obtenerId(usuario);
  if (!usuario || !clienteId) return;

  try {
    const resp = await solicitudesAPI.listarPorCliente(clienteId);
    const solicitudes = Array.isArray(resp) ? resp : resp?.solicitudes || resp?.data || [];

    if (!solicitudes.length) {
      contenedor.innerHTML = `<p class="text-center text-secondary py-4">Todavía no hiciste ninguna solicitud. Buscá un servicio en Explorar.</p>`;
      return;
    }

    const solicitudesResenadas = await obtenerSolicitudesResenadas(solicitudes, clienteId);
    contenedor.innerHTML = solicitudes
      .map((sol) => renderizarTarjetaCliente(sol, solicitudesResenadas))
      .join("");
  } catch (error) {
    contenedor.innerHTML = "";
    mostrarMensaje(alerta, `No se pudieron cargar tus solicitudes (${error.message}).`, "warning");
  }
};

// ---------------------------------------------------------------
// Modal de reserva (abierto desde el buscador vía evento o import)
// ---------------------------------------------------------------

let modalBootstrap = null;

const asegurarModal = () => {
  let modal = document.getElementById("modalSolicitud");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "modalSolicitud";
  modal.className = "modal fade";
  modal.tabIndex = -1;
  modal.setAttribute("aria-labelledby", "tituloModalSolicitud");
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content rounded-4">
        <form id="formNuevaSolicitud" novalidate>
          <div class="modal-header">
            <h2 class="modal-title h5" id="tituloModalSolicitud">Solicitar servicio</h2>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
          </div>
          <div class="modal-body">
            <p id="resumenSolicitud" class="text-secondary small"></p>
            <div class="mb-3">
              <label for="descripcionMascota" class="form-label">Descripción de tu mascota</label>
              <textarea id="descripcionMascota" class="form-control" rows="3" required
                placeholder="Tipo de animal, tamaño, edad, cuidados especiales..."></textarea>
            </div>
            <div class="row g-3">
              <div class="col-12 col-sm-6">
                <label for="fechaSolicitud" class="form-label">Día</label>
                <input type="date" id="fechaSolicitud" class="form-control" required>
              </div>
              <div class="col-12 col-sm-6">
                <label for="franjaHoraria" class="form-label">Franja horaria</label>
                <select id="franjaHoraria" class="form-select" required>
                  <option value="">Elegí una franja</option>
                  <option value="Mañana">Mañana</option>
                  <option value="Tarde">Tarde</option>
                  <option value="Noche">Noche</option>
                </select>
              </div>
            </div>
            <div id="alertaModalSolicitud" class="mt-3"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary rounded-pill" data-bs-dismiss="modal">Cancelar</button>
            <button type="submit" class="btn sol-naranja rounded-pill" id="btnEnviarSolicitud">Enviar solicitud</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector("#formNuevaSolicitud").addEventListener("submit", enviarSolicitud);
  return modal;
};

const enviarSolicitud = async (evento) => {
  evento.preventDefault();

  const formulario = evento.currentTarget;
  const alerta = document.getElementById("alertaModalSolicitud");
  const boton = document.getElementById("btnEnviarSolicitud");
  const usuario = obtenerUsuario();
  const clienteId = obtenerId(usuario);

  const descripcion = document.getElementById("descripcionMascota").value.trim();
  const dia = document.getElementById("fechaSolicitud").value;
  const franja = document.getElementById("franjaHoraria").value;
  const diaFranja = [dia, franja].filter(Boolean).join(" - ");

  if (usuario?.rol !== "cliente" || !clienteId) {
    mostrarMensaje(alerta, "Solo los clientes pueden solicitar servicios.", "warning");
    return;
  }
  if (!descripcion || !dia || !franja) {
    mostrarMensaje(alerta, "Completá la descripción de tu mascota, el día y la franja horaria.", "warning");
    return;
  }

  const { servicioId, profesionalId } = formulario.dataset;
  if (!servicioId || !profesionalId) {
    mostrarMensaje(alerta, "No se pudo identificar el servicio. Cerrá el formulario y volvé a elegirlo.", "danger");
    return;
  }

  boton.disabled = true;
  try {
    await solicitudesAPI.crear({
      servicio: servicioId,
      profesional: profesionalId,
      cliente: clienteId,
      descripcion,
      diaFranja
    });
    mostrarMensaje(alerta, "Solicitud enviada. Quedó pendiente hasta que el profesional responda.", "success");
    formulario.reset();
    setTimeout(() => modalBootstrap?.hide(), 1500);
    cargarVistaCliente();
  } catch (error) {
    mostrarMensaje(alerta, error.message, "danger");
  } finally {
    boton.disabled = false;
  }
};

export function abrirModalSolicitud({ servicioId, profesionalId, servicioNombre = "", profesionalNombre = "" }) {
  const modal = asegurarModal();
  const formulario = modal.querySelector("#formNuevaSolicitud");

  formulario.reset();
  formulario.dataset.servicioId = servicioId || "";
  formulario.dataset.profesionalId = profesionalId || "";
  modal.querySelector("#fechaSolicitud").min = hoyISO();
  modal.querySelector("#alertaModalSolicitud").innerHTML = "";
  modal.querySelector("#resumenSolicitud").textContent = [servicioNombre, profesionalNombre]
    .filter(Boolean)
    .join(" · ");

  modalBootstrap = window.bootstrap.Modal.getOrCreateInstance(modal);
  modalBootstrap.show();
}

document.addEventListener("huellitas:solicitar-servicio", (evento) => {
  abrirModalSolicitud(evento.detail || {});
});

cargarVistaCliente();