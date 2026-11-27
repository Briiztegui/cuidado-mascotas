/**
 * MÓDULO 3: Onboarding y Perfil del Oferente (Integrante 3 - Brisa)
 * - Utiliza obtenerUsuario de auth-guard.js para mantener la sesión unificada.
 * - Precarga el perfil existente desde GET /api/profesionales/:id (o listando por usuario).
 * - Crea o actualiza el perfil profesional (zona, contacto, disponibilidadSemanal) en MongoDB.
 */

import { profesionalesAPI } from "./api.js";
import { obtenerUsuario } from "./auth-guard.js";
import { STORAGE_KEYS } from "./config.js";

function extraerPerfil(resp) {
  if (!resp || typeof resp !== "object") return null;
  if (resp.profesional && typeof resp.profesional === "object") return resp.profesional;
  if (resp.data && typeof resp.data === "object" && !Array.isArray(resp.data)) return resp.data;
  return resp._id ? resp : null;
}

function extraerListaProfesionales(lista) {
  if (Array.isArray(lista)) return lista;
  if (Array.isArray(lista?.profesionales)) return lista.profesionales;
  if (Array.isArray(lista?.data)) return lista.data;
  return [];
}

document.addEventListener("DOMContentLoaded", async () => {
  const formPerfil = document.getElementById("form-perfil");
  const inputZona = document.getElementById("zona");
  const inputContacto = document.getElementById("contacto");
  const inputFotoPerfil = document.getElementById("fotoPerfil");
  const previewFotoOferente = document.getElementById("preview-foto-oferente");
  const iconoAvatarDefault = document.getElementById("icono-avatar-default");
  const alerta = document.getElementById("alerta-perfil");
  const btnGuardar = document.getElementById("btn-guardar-perfil");
  const btnSeleccionarTodo = document.getElementById("btn-seleccionar-todo");
  const tituloBienvenida = document.getElementById("titulo-bienvenida-oferente");

  const usuarioLogueado = obtenerUsuario();

  if (!usuarioLogueado || usuarioLogueado.rol !== "oferente") {
    return;
  }

  if (usuarioLogueado.nombre && tituloBienvenida) {
    tituloBienvenida.textContent = `¡Hola, ${usuarioLogueado.nombre}! Ayudá a los clientes a encontrarte`;
  }

  const usuarioIdRaw = usuarioLogueado._id ?? usuarioLogueado.id;
  const usuarioId = usuarioIdRaw !== undefined && usuarioIdRaw !== null ? String(usuarioIdRaw) : "";
  let profesionalIdActual = usuarioLogueado.profesionalId ? String(usuarioLogueado.profesionalId) : null;

  if (!usuarioId) {
    mostrarAlerta("No se pudo identificar el ID del usuario en la sesión actual.", "danger");
  }

  // Seleccionar / Quitar todo
  if (btnSeleccionarTodo) {
    btnSeleccionarTodo.addEventListener("click", () => {
      const checks = Array.from(document.querySelectorAll(".disp-check"));
      const todosMarcados = checks.length > 0 && checks.every((cb) => cb.checked);
      checks.forEach((cb) => {
        cb.checked = !todosMarcados;
      });
    });
  }

  // Precargar perfil existente si ya está guardado en MongoDB
  await cargarPerfilExistente();

  async function cargarPerfilExistente() {
    if (!usuarioId && !profesionalIdActual) return;

    try {
      let perfil = null;

      if (profesionalIdActual) {
        const resp = await profesionalesAPI.obtenerPorId(profesionalIdActual);
        perfil = extraerPerfil(resp);
      }

      if (!perfil && usuarioId) {
        const lista = await profesionalesAPI.listar();
        const profesionales = extraerListaProfesionales(lista);

        perfil =
          profesionales.find((p) => {
            const idUsuarioPerfil =
              typeof p.usuario === "object" && p.usuario !== null
                ? p.usuario._id ?? p.usuario.id
                : p.usuario;
            return idUsuarioPerfil !== undefined && idUsuarioPerfil !== null && String(idUsuarioPerfil) === usuarioId;
          }) || null;
      }

      if (perfil && perfil._id) {
        profesionalIdActual = String(perfil._id);
        usuarioLogueado.profesionalId = perfil._id;
        localStorage.setItem(STORAGE_KEYS.USUARIO, JSON.stringify(usuarioLogueado));

        if (inputZona) inputZona.value = perfil.zona || "";
        if (inputContacto) inputContacto.value = perfil.contacto || "";

        if (Array.isArray(perfil.disponibilidadSemanal)) {
          document.querySelectorAll(".disp-check").forEach((cb) => {
            cb.checked = perfil.disponibilidadSemanal.includes(cb.value);
          });
        }
      }
    } catch (error) {
      console.warn("Aún no hay un perfil previo para precargar:", error.message);
    }
  }

  // Guardar o actualizar perfil en MongoDB
  if (formPerfil) {
    formPerfil.addEventListener("submit", async (e) => {
      e.preventDefault();
      ocultarAlerta();

      if (!usuarioId) {
        mostrarAlerta("Sesión inválida: falta el identificador del usuario.", "danger");
        return;
      }

      const zona = inputZona ? inputZona.value.trim() : "";
      const contacto = inputContacto ? inputContacto.value.trim() : "";
      const digitosContacto = contacto.replace(/\D/g, "");
      const disponibilidadSeleccionada = Array.from(
        document.querySelectorAll(".disp-check:checked")
      ).map((cb) => cb.value);

      if (!zona) {
        mostrarAlerta("Ingresá tu zona o ciudad de cobertura.", "danger");
        inputZona?.focus();
        return;
      }

      if (!contacto || digitosContacto.length < 8) {
        mostrarAlerta("Ingresá un número de WhatsApp válido (al menos 8 dígitos).", "danger");
        inputContacto?.focus();
        return;
      }

      if (disponibilidadSeleccionada.length === 0) {
        mostrarAlerta("Seleccioná al menos una franja horaria de disponibilidad semanal.", "danger");
        return;
      }

      const payloadPerfil = {
        usuario: usuarioId,
        zona,
        contacto,
        disponibilidadSemanal: disponibilidadSeleccionada
      };

      try {
        if (btnGuardar) {
          btnGuardar.disabled = true;
          btnGuardar.textContent = "Guardando perfil...";
        }

        const resultado = await profesionalesAPI.guardarPerfil(payloadPerfil);
        const perfilGuardado = extraerPerfil(resultado);

        if (perfilGuardado?._id) {
          profesionalIdActual = String(perfilGuardado._id);
          usuarioLogueado.profesionalId = perfilGuardado._id;
          localStorage.setItem(STORAGE_KEYS.USUARIO, JSON.stringify(usuarioLogueado));
        }

        mostrarAlerta("¡Perfil guardado y activado correctamente! Redirigiendo a tu panel...", "success");

        setTimeout(() => {
          window.location.href = "panel-oferente.html";
        }, 1300);
      } catch (error) {
        mostrarAlerta(
          error.message || "No se pudo guardar el perfil. Verificá que el backend esté encendido.",
          "danger"
        );
      } finally {
        if (btnGuardar) {
          btnGuardar.disabled = false;
          btnGuardar.textContent = "GUARDAR Y ACTIVAR PERFIL";
        }
      }
    });
  }

  function mostrarAlerta(mensaje, tipo) {
    if (!alerta) return;
    alerta.textContent = mensaje;
    alerta.className = `alert alert-${tipo} d-block rounded-3`;
  }

  function ocultarAlerta() {
    if (!alerta) return;
    alerta.className = "alert d-none";
    alerta.textContent = "";
  }
});