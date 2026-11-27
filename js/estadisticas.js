import { estadisticasAPI, profesionalesAPI } from "./api.js";
import { obtenerUsuario } from "./auth-guard.js";

const mensajeEl = document.getElementById("mensajeStats");

function obtenerId(obj) {
  return String(obj?._id || obj?.id || "");
}

function setTexto(ids, valor) {
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(valor);
  }
}

async function resolverProfesionalId() {
  const usuario = obtenerUsuario();
  if (!usuario) return "";
  if (usuario.profesionalId) return String(usuario.profesionalId);

  const usuarioId = obtenerId(usuario);
  if (!usuarioId) return "";

  const lista = await profesionalesAPI.listar();
  const arr = Array.isArray(lista) ? lista : lista?.profesionales || lista?.data || [];
  const prof = arr.find((p) => obtenerId(p.usuario) === usuarioId);
  return obtenerId(prof);
}

async function cargarEstadisticas() {
  if (!document.getElementById("statServicios")) return;

  try {
    const profesionalId = await resolverProfesionalId();
    if (!profesionalId) {
      if (mensajeEl) {
        mensajeEl.textContent = "Completá tu perfil de oferente para ver tus estadísticas.";
      }
      return;
    }

    const datos = await estadisticasAPI.obtenerPorProfesional(profesionalId);
    const estados = datos.solicitudesPorEstado || {};
    const promedio = Number(datos.calificacionPromedio ?? 0).toFixed(1);

    setTexto(["statServicios"], datos.totalServicios ?? 0);
    setTexto(["statPendiente", "statPendientes"], estados.pendiente ?? 0);
    setTexto(["statAceptada", "statAceptadas"], estados.aceptada ?? 0);
    setTexto(["statRechazada", "statRechazadas"], estados.rechazada ?? 0);
    setTexto(["statCompletada", "statCompletadas"], estados.completada ?? 0);
    setTexto(["statPromedio"], promedio);

    if (mensajeEl) mensajeEl.textContent = "";
  } catch (error) {
    if (mensajeEl) {
      mensajeEl.textContent = `No se pudieron cargar las estadísticas: ${error.message}`;
    }
  }
}

cargarEstadisticas();