/**
 * MÓDULO 6: Flujo de Solicitudes y WhatsApp Condicional (Integrante 6)
 * - Cliente: envía el formulario de reserva (descripción de la mascota, día/franja horaria) con solicitudesAPI.crear().
 * - Oferente: lista las solicitudes recibidas en panel-oferente.html y permite cambiar estados ('aceptada', 'rechazada', 'completada') con solicitudesAPI.cambiarEstado().
 * - Regla crítica: en mis-solicitudes.html, muestra el botón/contacto de WhatsApp del oferente ÚNICAMENTE cuando estado === 'aceptada'.
 */
/**
 * MÓDULO 6: Flujo de Solicitudes y WhatsApp Condicional (Integrante 6)
 * - Cliente: envía el formulario de reserva (descripción de la mascota, día/franja horaria) con solicitudesAPI.crear().
 * - Oferente: lista las solicitudes recibidas en panel-oferente.html y permite cambiar estados ('aceptada', 'rechazada', 'completada') con solicitudesAPI.cambiarEstado().
 * - Regla crítica: en mis-solicitudes.html, muestra el botón/contacto de WhatsApp del oferente ÚNICAMENTE cuando estado === 'aceptada'.
 */
/**
 * MÓDULO 6: Flujo de Solicitudes y WhatsApp Condicional (Integrante 6)
 * - Cliente: envía el formulario de reserva (descripción de la mascota, día/franja horaria) con solicitudesAPI.crear().
 * - Oferente: lista las solicitudes recibidas en panel-oferente.html y permite cambiar estados ('aceptada', 'rechazada', 'completada') con solicitudesAPI.cambiarEstado().
 * - Regla crítica: en mis-solicitudes.html, muestra el botón/contacto de WhatsApp del oferente ÚNICAMENTE cuando estado === 'aceptada'.
 *
 * Uso desde otros módulos (por ejemplo, el buscador de Mela):
 *   import { abrirModalSolicitud } from "./solicitudes.js";
 *   abrirModalSolicitud({ servicioId, profesionalId, servicioNombre, profesionalNombre });
 */

import { solicitudesAPI } from "./api.js";
import { obtenerUsuario } from "./auth-guard.js";

// ---------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------

// Qué botones se muestran al oferente según el estado actual de la solicitud.
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

// ---------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------

// Convierte texto en texto seguro para meter dentro de HTML.
const esc = (texto) => {
    const div = document.createElement("div");
    div.textContent = texto ?? "";
    return div.innerHTML;
};

const limpiarTelefono = (telefono) => (telefono ? String(telefono).replace(/\D/g, "") : "");

const mostrarMensaje = (contenedor, texto, tipo = "info") => {
    if (!contenedor) {
        return;
    }
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

// Fecha de hoy en formato YYYY-MM-DD (hora local) para el mínimo del calendario.
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
// WhatsApp condicional (regla crítica: solo si estado === 'aceptada')
// ---------------------------------------------------------------

const crearBotonWhatsAppOferente = (solicitud) => {
    if (solicitud.estado !== "aceptada") {
        return "";
    }

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
            class="btn btn-success btn-sm rounded-pill px-3"
        >
            WhatsApp del oferente
        </a>
    `;
};

// Texto que explica por qué todavía no hay botón de WhatsApp.
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
// Vista CLIENTE: mis-solicitudes.html
// ---------------------------------------------------------------

const renderizarTarjetaCliente = (solicitud) => {
    const id = solicitud._id || solicitud.id || "";
    const estado = solicitud.estado || "pendiente";
    const servicio = solicitud.servicio?.nombre || "Servicio";
    const profesional = solicitud.profesional?.usuario?.nombre || "";
    const contacto = estado === "aceptada" ? crearBotonWhatsAppOferente(solicitud) : textoSinContacto(estado);

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
                </div>
                <small class="text-secondary mt-2">Enviada el ${esc(formatearFecha(solicitud.fecha))}</small>
                <div class="resena-slot" data-solicitud-id="${esc(id)}" data-estado="${esc(estado)}"></div>
            </div>
        </div>
    `;
};

const cargarVistaCliente = async () => {
    const contenedor = document.getElementById("contenedorMisSolicitudes");
    const alerta = document.getElementById("alertaMisSolicitudes");
    if (!contenedor) {
        return;
    }

    const usuario = obtenerUsuario();
    if (!usuario) {
        return;
    }

    try {
        const solicitudes = await solicitudesAPI.listarPorCliente(usuario.id);
        if (!solicitudes.length) {
            contenedor.innerHTML = `<p class="text-center text-secondary py-4">Todavía no hiciste ninguna solicitud. Buscá un servicio en Explorar.</p>`;
            return;
        }
        contenedor.innerHTML = solicitudes.map(renderizarTarjetaCliente).join("");
    } catch (error) {
        contenedor.innerHTML = "";
        mostrarMensaje(alerta, `No se pudieron cargar tus solicitudes (${error.message}).`, "warning");
    }
};

// ---------------------------------------------------------------
// Vista OFERENTE: panel-oferente.html
// ---------------------------------------------------------------

const renderizarTarjetaOferente = (solicitud) => {
    const id = solicitud._id || solicitud.id || "";
    const estado = solicitud.estado || "pendiente";
    const acciones = ACCIONES_POR_ESTADO[estado] || [];
    const cliente = solicitud.cliente?.nombre || "Cliente";
    const servicio = solicitud.servicio?.nombre || "";

    const botones = acciones
        .map(
            (a) => `
            <button
                type="button"
                class="btn btn-sm rounded-pill ${a.clase} btn-cambiar-estado"
                data-id="${esc(id)}"
                data-estado="${a.estado}"
            >
                ${a.texto}
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
                <h3 class="h6 fw-bold mb-0">${esc(cliente)}</h3>
                ${servicio ? `<small class="text-secondary">${esc(servicio)}</small>` : ""}
                <p class="my-3">${esc(solicitud.descripcion || "")}</p>
                <div class="d-flex flex-wrap align-items-center gap-2 mt-auto">
                    ${botones}
                </div>
            </div>
        </div>
    `;
};

// Actualiza el contador de pendientes en la sección y en la navbar (id que crea auth-guard.js).
const actualizarBadgeNuevas = (solicitudes) => {
    const cantidad = solicitudes.filter((item) => item.estado === "pendiente").length;

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

const cargarVistaOferente = async () => {
    const contenedor = document.getElementById("contenedorSolicitudesOferente");
    const alerta = document.getElementById("alertaSolicitudesOferente");
    if (!contenedor) {
        return;
    }

    const usuario = obtenerUsuario();
    if (!usuario?.profesionalId) {
        mostrarMensaje(alerta, "Completá tu perfil de oferente para empezar a recibir solicitudes.", "info");
        return;
    }

    let solicitudes = [];

    const pintar = () => {
        actualizarBadgeNuevas(solicitudes);
        if (!solicitudes.length) {
            contenedor.innerHTML = `<p class="text-center text-secondary py-4">Todavía no recibiste solicitudes.</p>`;
            return;
        }
        contenedor.innerHTML = solicitudes.map(renderizarTarjetaOferente).join("");
    };

    try {
        solicitudes = await solicitudesAPI.listarPorProfesional(usuario.profesionalId);
        solicitudes.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    } catch (error) {
        mostrarMensaje(alerta, `No se pudieron cargar las solicitudes (${error.message}).`, "warning");
        return;
    }

    pintar();

    contenedor.addEventListener("click", async (evento) => {
        const boton = evento.target.closest(".btn-cambiar-estado");
        if (!boton) {
            return;
        }

        const id = boton.dataset.id;
        const nuevoEstado = boton.dataset.estado;

        if (nuevoEstado === "rechazada" && !window.confirm("¿Seguro que querés rechazar esta solicitud?")) {
            return;
        }

        boton.disabled = true;
        try {
            await solicitudesAPI.cambiarEstado(id, nuevoEstado);
            solicitudes = solicitudes.map((item) =>
                (item._id || item.id) === id ? { ...item, estado: nuevoEstado } : item
            );
            pintar();
            mostrarMensaje(alerta, `Estado actualizado a "${nuevoEstado}".`, "success");
        } catch (error) {
            boton.disabled = false;
            mostrarMensaje(alerta, error.message, "danger");
        }
    });
};

// ---------------------------------------------------------------
// Modal de reserva (lo abre el botón "Solicitar" del buscador)
// ---------------------------------------------------------------

let modalBootstrap = null;

// Crea el modal una sola vez y lo agrega al final del <body>.
const asegurarModal = () => {
    let modal = document.getElementById("modalSolicitud");
    if (modal) {
        return modal;
    }

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

    const descripcion = document.getElementById("descripcionMascota").value.trim();
    const dia = document.getElementById("fechaSolicitud").value;
    const franja = document.getElementById("franjaHoraria").value;
    const diaFranja = [dia, franja].filter(Boolean).join(" - ");

    if (usuario?.rol !== "cliente") {
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
            cliente: usuario.id,
            descripcion,
            diaFranja
        });
        mostrarMensaje(alerta, "Solicitud enviada. Quedó pendiente hasta que el profesional responda.", "success");
        formulario.reset();
        setTimeout(() => modalBootstrap?.hide(), 1500);
        cargarVistaCliente(); // si estamos en mis-solicitudes.html, refresca el listado
    } catch (error) {
        mostrarMensaje(alerta, error.message, "danger");
    } finally {
        boton.disabled = false;
    }
};

/**
 * Abre el modal de reserva para un servicio puntual.
 * @param {{servicioId: string, profesionalId: string, servicioNombre?: string, profesionalNombre?: string}} datos
 */
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

// ---------------------------------------------------------------
// Inicio: cada función se activa solo si la página tiene su contenedor
// ---------------------------------------------------------------

cargarVistaCliente();
cargarVistaOferente();
