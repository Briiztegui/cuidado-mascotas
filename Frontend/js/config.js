// Configure the API URL before this module loads, for example:
// window.HUELLITAS_API_URL = "http://localhost:3000/api";
const configuredApiUrl = window.HUELLITAS_API_URL || "http://localhost:3000/api";

export const API_URL = configuredApiUrl.replace(/\/+$/, "");

export const STORAGE_KEYS = Object.freeze({
  usuario: "huellitas_usuario"
});
