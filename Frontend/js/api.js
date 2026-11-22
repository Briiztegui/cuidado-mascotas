import { API_URL } from "./config.js";

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor. Verificá que el backend esté iniciado.");
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("El servidor devolvió una respuesta inválida.");
  }

  if (!response.ok) {
    throw new Error(data.mensaje || data.error || "No se pudo completar la operación.");
  }

  return data;
}

export const authAPI = Object.freeze({
  login: ({ email, password }) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    }),

  registro: ({ nombre, email, password, rol }) =>
    request("/auth/registro", {
      method: "POST",
      body: JSON.stringify({ nombre, email, password, rol })
    })
});
