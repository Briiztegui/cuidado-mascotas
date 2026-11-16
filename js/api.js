/**
 * CAPA DE COMUNICACIÓN CON EL BACKEND / API REST (Base para todo el equipo)
 * - Centraliza todas las peticiones HTTP (fetch) hacia los endpoints del servidor generado con IA.
 * - Adjunta automáticamente el token de autorización en los headers y maneja los errores del servidor.
 * - Contiene los objetos listos para importar en cada módulo: authAPI, profesionalesAPI, serviciosAPI, solicitudesAPI, resenasAPI y estadisticasAPI.
 * - Uso: import { serviciosAPI } from "./api.js";
 */