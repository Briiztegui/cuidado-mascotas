/**
 * MÓDULO 7: Sistema de Reseñas y Estadísticas (Integrante 7)
 * - Cliente: habilita el formulario de reseña (1 a 5 estrellas + comentario) en mis-solicitudes.html SOLO si la solicitud está en estado 'completada'. Envía con resenasAPI.crear().
 * - Oferente: carga y muestra las reseñas recibidas (resenasAPI.listarPorProfesional) y las estadísticas del panel (estadisticasAPI.obtenerPorProfesional).
 */

import { STORAGE_KEYS } from "./config.js";
import { resenasAPI, solicitudesAPI, estadisticasAPI, profesionalesAPI } from "./api.js";
import { obtenerUsuario } from "./auth-guard.js";

// Datos de la URL (compatible con ?solicitud=&profesional= y ?solicitudId=&profesionalId=)
const params = new URLSearchParams(window.location.search);
const solicitudId = params.get("solicitud") || params.get("solicitudId") || "";
const profesionalIdUrl = params.get("profesional") || params.get("profesionalId") || "";

function obtenerUsuarioActivo() {
  const desdeGuard = typeof obtenerUsuario === "function" ? obtenerUsuario() : null;
  if (desdeGuard) return desdeGuard;

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USUARIO);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const usuarioGuardado = obtenerUsuarioActivo();
const usuarioId = String(usuarioGuardado?._id || usuarioGuardado?.id || "");

// Elementos de resenas.html (vista cliente)
const formResena = document.getElementById("formResena");
const botonEnviar = document.getElementById("btnEnviar");
const inputComentario = document.getElementById("comentario");
const textoMensaje = document.getElementById("mensaje");

// Contenedor de panel-oferente.html (vista profesional)
const seccionOferente = document.getElementById("seccion-estadisticas-resenas");

function escaparHTML(texto) {
  const div = document.createElement("div");
  div.textContent = texto ?? "";
  return div.innerHTML;
}

function obtenerId(valor) {
  if (!valor) return "";
  if (typeof valor === "string") return valor;
  return String(valor._id || valor.id || "");
}

function setMensajeResena(texto, esError = false) {
  if (!textoMensaje) return;
  textoMensaje.textContent = texto;
  textoMensaje.style.color = esError ? "#c0392b" : "";
}

async function obtenerEstadisticasProfesional(profesionalId) {
  if (typeof estadisticasAPI?.obtenerPorProfesional === "function") {
    return estadisticasAPI.obtenerPorProfesional(profesionalId);
  }
  if (typeof estadisticasAPI?.profesional === "function") {
    return estadisticasAPI.profesional(profesionalId);
  }
  throw new Error("No está disponible el método de estadísticas en api.js.");
}

// Chequear que la sesión sea de cliente, haya referencia y la solicitud esté completada (sin duplicar)
async function verificarPermisoResena() {
  if (!botonEnviar) return false;

  if (!usuarioId || (usuarioGuardado?.rol && usuarioGuardado.rol !== "cliente")) {
    botonEnviar.disabled = true;
    setMensajeResena("Solo los clientes con sesión iniciada pueden dejar una reseña.", true);
    return false;
  }

  if (!solicitudId || !profesionalIdUrl) {
    botonEnviar.disabled = true;
    setMensajeResena("Faltan datos de la sesión o de la solicitud para dejar una reseña.", true);
    return false;
  }

  try {
    const respSolicitudes = await solicitudesAPI.listarPorCliente(usuarioId);
    const solicitudes = Array.isArray(respSolicitudes)
      ? respSolicitudes
      : respSolicitudes?.solicitudes || respSolicitudes?.data || [];

    const solicitudValida = solicitudes.find(
      (sol) => obtenerId(sol) === solicitudId && sol.estado === "completada"
    );

    if (!solicitudValida) {
      botonEnviar.disabled = true;
      setMensajeResena(
        "Solo podés dejar una reseña cuando el profesional haya marcado el servicio como completado.",
        true
      );
      return false;
    }

    if (typeof resenasAPI?.listarPorProfesional === "function") {
      const respResenas = await resenasAPI.listarPorProfesional(profesionalIdUrl);
      const listaResenas = Array.isArray(respResenas)
        ? respResenas
        : respResenas?.resenas || respResenas?.data || [];

      const yaExiste = listaResenas.some(
        (r) =>
          obtenerId(r.solicitud) === solicitudId &&
          obtenerId(r.cliente) === usuarioId
      );

      if (yaExiste) {
        botonEnviar.disabled = true;
        setMensajeResena("Ya enviaste una reseña para esta solicitud.", false);
        return false;
      }
    }

    botonEnviar.disabled = false;
    return true;
  } catch (error) {
    botonEnviar.disabled = true;
    setMensajeResena(`No se pudo verificar la solicitud: ${error.message}`, true);
    return false;
  }
}

async function enviarResena(event) {
  if (event) event.preventDefault();
  if (!botonEnviar) return;

  const estrellaMarcada = document.querySelector('input[name="puntaje"]:checked');
  const comentario = inputComentario?.value.trim() || "";

  if (!estrellaMarcada) {
    setMensajeResena("Por favor, seleccioná entre 1 y 5 estrellas.", true);
    return;
  }

  const puntaje = Number(estrellaMarcada.value);
  if (!puntaje || puntaje < 1 || puntaje > 5) {
    setMensajeResena("Seleccioná un puntaje válido entre 1 y 5 estrellas.", true);
    return;
  }

  const payload = {
    solicitud: solicitudId,
    profesional: profesionalIdUrl,
    cliente: usuarioId,
    puntaje,
    comentario
  };

  try {
    botonEnviar.disabled = true;
    botonEnviar.textContent = "Enviando...";
    setMensajeResena("Enviando reseña...", false);

    await resenasAPI.crear(payload);

    setMensajeResena("¡Reseña enviada con éxito! Gracias por compartir tu experiencia.", false);
    if (formResena) {
      formResena.reset();
    } else if (inputComentario) {
      inputComentario.value = "";
    }
  } catch (error) {
    botonEnviar.disabled = false;
    setMensajeResena(`Error al enviar: ${error.message}`, true);
  } finally {
    botonEnviar.textContent = "Enviar";
  }
}

if (botonEnviar) {
  verificarPermisoResena();

  if (formResena) {
    formResena.addEventListener("submit", enviarResena);
  } else {
    botonEnviar.addEventListener("click", enviarResena);
  }
}

// Buscar el id del perfil profesional asociado a este usuario
async function obtenerIdProfesionalLogueado() {
  if (usuarioGuardado?.profesionalId) return String(usuarioGuardado.profesionalId);
  if (!usuarioId) return "";

  const respProfesionales = await profesionalesAPI.listar();
  const listaProfesionales = Array.isArray(respProfesionales)
    ? respProfesionales
    : respProfesionales?.profesionales || respProfesionales?.data || [];

  const miPerfil = listaProfesionales.find(
    (prof) => obtenerId(prof.usuario) === usuarioId
  );

  return obtenerId(miPerfil);
}

// Armar las tarjetas de reseñas en el panel del oferente
function renderizarResenas(resenas) {
  const contenedor = document.getElementById("listaResenasOferente");
  if (!contenedor) return;

  const lista = Array.isArray(resenas) ? resenas : resenas?.resenas || resenas?.data || [];

  if (lista.length === 0) {
    contenedor.innerHTML = `<p class="text-muted mb-0">Todavía no recibiste reseñas de clientes.</p>`;
    return;
  }

  contenedor.innerHTML = lista
    .map((resena) => {
      const puntajeNum = Math.max(0, Math.min(5, Number(resena.puntaje || 0)));
      const estrellas = "★".repeat(puntajeNum) + "☆".repeat(5 - puntajeNum);
      const fecha = resena.fecha ? new Date(resena.fecha).toLocaleDateString("es-AR") : "";
      const nombreCliente = resena.cliente?.nombre || "Cliente";
      const comentarioTexto = resena.comentario || "Sin comentario adicional.";

      return `
        <div class="border-bottom pb-3 mb-3">
          <div class="d-flex justify-content-between align-items-center">
            <strong>${escaparHTML(nombreCliente)}</strong>
            <small class="text-muted">${escaparHTML(fecha)}</small>
          </div>
          <div class="text-warning my-1">${escaparHTML(estrellas)}</div>
          <p class="mb-0 text-secondary">${escaparHTML(comentarioTexto)}</p>
        </div>
      `;
    })
    .join("");
}

// Traer estadísticas y reseñas del profesional al entrar al panel
async function cargarPanelEstadisticasYResenas() {
  const alerta = document.getElementById("alertaStats");

  if (!usuarioId) {
    if (alerta) {
      alerta.textContent = "Iniciá sesión como oferente para ver tus estadísticas.";
      alerta.classList.remove("d-none");
    }
    return;
  }

  try {
    const profesionalId = await obtenerIdProfesionalLogueado();

    if (!profesionalId) {
      if (alerta) {
        alerta.textContent = "Todavía no completaste tu perfil profesional.";
        alerta.classList.remove("d-none");
      }
      return;
    }

    const [stats, resenas] = await Promise.all([
      obtenerEstadisticasProfesional(profesionalId),
      resenasAPI.listarPorProfesional(profesionalId)
    ]);

    const elServicios = document.getElementById("statServicios");
    if (elServicios) {
      elServicios.textContent = String(
        stats.totalServicios ?? stats.cantidadServicios ?? stats.servicios ?? 0
      );
    }

    const elPromedio = document.getElementById("statPromedio");
    if (elPromedio) {
      const promedio = Number(stats.calificacionPromedio ?? stats.promedio ?? 0);
      elPromedio.textContent = `${promedio.toFixed(1)} ★`;
    }

    const porEstado = stats.solicitudesPorEstado || stats;
    const mapeoEstados = [
      ["statPendientes", porEstado.pendiente ?? porEstado.pendientes ?? 0],
      ["statAceptadas", porEstado.aceptada ?? porEstado.aceptadas ?? 0],
      ["statCompletadas", porEstado.completada ?? porEstado.completadas ?? 0],
      ["statRechazadas", porEstado.rechazada ?? porEstado.rechazadas ?? 0]
    ];

    mapeoEstados.forEach(([idElem, valor]) => {
      const el = document.getElementById(idElem);
      if (el) el.textContent = String(valor);
    });

    renderizarResenas(resenas);
  } catch (error) {
    if (alerta) {
      alerta.textContent = `No se pudieron cargar las estadísticas: ${error.message}`;
      alerta.classList.remove("d-none");
    }
  }
}

if (seccionOferente) {
  cargarPanelEstadisticasYResenas();
}