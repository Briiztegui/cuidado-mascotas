/**
 * CAPA DE COMUNICACIÓN CON EL BACKEND / API REST (Base para todo el equipo)
 * - Centraliza todas las peticiones HTTP (fetch) hacia los endpoints del servidor generado con IA.
 * - Adjunta automáticamente el token de autorización en los headers y maneja los errores del servidor.
 * - Contiene los objetos listos para importar en cada módulo: authAPI, profesionalesAPI, serviciosAPI, solicitudesAPI, resenasAPI y estadisticasAPI.
 * - Uso: import { serviciosAPI } from "./api.js";
 */

import { CONFIG } from "./config.js";

async function peticionApi(endpoint, opciones = {}) {
  const url = `${CONFIG.API_URL}${endpoint}`;

  const configFetch = {
    headers: {
      "Content-Type": "application/json",
      ...(opciones.headers || {})
    },
    ...opciones
  };

  const respuesta = await fetch(url, configFetch);
  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    throw new Error(datos.error || datos.mensaje || `Error HTTP ${respuesta.status}`);
  }

  return datos;
}

export const authAPI = {
  registro: (payload) =>
    peticionApi("/auth/registro", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  login: (payload) =>
    peticionApi("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    })
};

export const profesionalesAPI = {
  guardarPerfil: (payload) =>
    peticionApi("/profesionales", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  crearOActualizar: (payload) =>
    peticionApi("/profesionales", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  obtenerPorId: (id) =>
    peticionApi(`/profesionales/${id}`),
  listar: (queryString = "") =>
    peticionApi(`/profesionales${queryString ? `?${queryString}` : ""}`)
};

export const serviciosAPI = {
  listar: (queryString = "") =>
    peticionApi(`/servicios${queryString ? `?${queryString}` : ""}`),
  crear: (payload) =>
    peticionApi("/servicios", {
      method: "POST",
      body: JSON.stringify(payload)
    })
};

export const solicitudesAPI = {
  crear: (payload) =>
    peticionApi("/solicitudes", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  cambiarEstado: (id, estado) =>
    peticionApi(`/solicitudes/${id}/estado`, {
      method: "PUT",
      body: JSON.stringify({ estado })
    }),
  listarPorCliente: (id) =>
    peticionApi(`/solicitudes/cliente/${id}`)
};

export const resenasAPI = {
  crear: (payload) =>
    peticionApi("/resenas", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  listarPorProfesional: (id) =>
    peticionApi(`/resenas/profesional/${id}`)
};

export const estadisticasAPI = {
  profesional: (id) =>
    peticionApi(`/estadisticas/profesional/${id}`),
  obtenerPorProfesional: (id) =>
    peticionApi(`/estadisticas/profesional/${id}`)
};
