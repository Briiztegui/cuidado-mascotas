/**
 * CONFIGURACIÓN GLOBAL DE LA APLICACIÓN (Base para todo el equipo)
 * - Define la URL base del backend (API_URL) en un único lugar configurable (criterio obligatorio).
 * - Define las claves estandarizadas (STORAGE_KEYS) para guardar y leer el token y los datos del usuario logueado en localStorage.
 * - IMPORTANTE: No hardcodear URLs de la API en otros archivos; importar siempre API_URL desde aquí.
 */

export const CONFIG = {
  API_URL: "http://localhost:3000/api"
};

export const STORAGE_KEYS = {
  USUARIO: "cuidado_mascotas_usuario"
};