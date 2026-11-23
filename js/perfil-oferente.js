/**
 * MÓDULO 3: Onboarding y Perfil del Oferente (Integrante 3 - Brisa)
 * - Valida que el usuario tenga rol 'oferente'.
 * - Precarga el perfil existente desde GET /api/profesionales/:id (o listando por usuario).
 * - Crea o actualiza el perfil profesional (zona, contacto, disponibilidadSemanal) en MongoDB.
 */

import { profesionalesAPI } from "./api.js";
import { STORAGE_KEYS } from "./config.js";

document.addEventListener("DOMContentLoaded", async () => {
  const formPerfil = document.getElementById("form-perfil");
  const inputZona = document.getElementById("zona");
  const inputContacto = document.getElementById("contacto");
  const alerta = document.getElementById("alerta-perfil");
  const btnGuardar = document.getElementById("btn-guardar-perfil");
  const btnSeleccionarTodo = document.getElementById("btn-seleccionar-todo");
  const btnCerrarSesion = document.getElementById("btn-cerrar-sesion");
  const nombreNav = document.getElementById("nombre-oferente-nav");
  const tituloBienvenida = document.getElementById("titulo-bienvenida-oferente");

  // 1. Verificar sesión y rol ('oferente')
  const usuarioRaw = localStorage.getItem(STORAGE_KEYS.USUARIO);
  const usuarioLogueado = usuarioRaw ? JSON.parse(usuarioRaw) : null;

  if (!usuarioLogueado) {
    window.location.href = "../index.html";
    return;
  }

  if (usuarioLogueado.rol !== "oferente") {
    alert("Acceso restringido: esta sección es exclusiva para cuentas con rol Oferente.");
    window.location.href = "../index.html";
    return;
  }

  if (usuarioLogueado.nombre) {
    if (nombreNav) nombreNav.textContent = `Hola, ${usuarioLogueado.nombre} (Oferente)`;
    if (tituloBienvenida) tituloBienvenida.textContent = `¡Hola, ${usuarioLogueado.nombre}! Ayudá a los clientes a encontrarte`;
  }

  const usuarioId = usuarioLogueado._id || usuarioLogueado.id;
  let profesionalIdActual = usuarioLogueado.profesionalId || null;

  // Cerrar sesión
  if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener("click", () => {
      localStorage.removeItem(STORAGE_KEYS.USUARIO);
      window.location.href = "../index.html";
    });
  }

  // Seleccionar / Quitar todo
  if (btnSeleccionarTodo) {
    btnSeleccionarTodo.addEventListener("click", () => {
      const checks = Array.from(document.querySelectorAll(".disp-check"));
      const todosMarcados = checks.every((cb) => cb.checked);
      checks.forEach((cb) => {
        cb.checked = !todosMarcados;
      });
    });
  }

  // 2. Precargar perfil existente si ya está guardado en MongoDB
  await cargarPerfilExistente();

  async function cargarPerfilExistente() {
    try {
      let perfil = null;

      if (profesionalIdActual) {
        const resp = await profesionalesAPI.obtenerPorId(profesionalIdActual);
        perfil = resp?.profesional || resp;
      } else {
        const lista = await profesionalesAPI.listar();
        const profesionales = Array.isArray(lista) ? lista : (lista?.profesionales || []);
        perfil = profesionales.find((p) => {
          const idUsuarioPerfil = typeof p.usuario === "object" ? p.usuario?._id : p.usuario;
          return idUsuarioPerfil === usuarioId;
        });
      }

      if (perfil && perfil._id) {
        profesionalIdActual = perfil._id;
        usuarioLogueado.profesionalId = perfil._id;
        localStorage.setItem(STORAGE_KEYS.USUARIO, JSON.stringify(usuarioLogueado));

        inputZona.value = perfil.zona || "";
        inputContacto.value = perfil.contacto || "";

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

  // 3. Guardar o actualizar perfil en MongoDB
  formPerfil.addEventListener("submit", async (e) => {
    e.preventDefault();
    ocultarAlerta();

    const zona = inputZona.value.trim();
    const contacto = inputContacto.value.trim();
    const disponibilidadSeleccionada = Array.from(
      document.querySelectorAll(".disp-check:checked")
    ).map((cb) => cb.value);

    if (!zona) {
      mostrarAlerta("Ingresá tu zona o ciudad de cobertura.", "danger");
      inputZona.focus();
      return;
    }

    if (!contacto) {
      mostrarAlerta("Ingresá tu número de WhatsApp.", "danger");
      inputContacto.focus();
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
      btnGuardar.disabled = true;
      btnGuardar.textContent = "Guardando perfil...";

      const resultado = await profesionalesAPI.guardarPerfil(payloadPerfil);
      const perfilGuardado = resultado?.profesional || resultado;

      if (perfilGuardado?._id) {
        profesionalIdActual = perfilGuardado._id;
        usuarioLogueado.profesionalId = perfilGuardado._id;
        localStorage.setItem(STORAGE_KEYS.USUARIO, JSON.stringify(usuarioLogueado));
      }

      mostrarAlerta("¡Perfil guardado y activado correctamente! Redirigiendo a tu panel...", "success");

      setTimeout(() => {
        window.location.href = "panel-oferente.html";
      }, 1300);
    } catch (error) {
      mostrarAlerta(error.message || "No se pudo guardar el perfil. Verificá que el backend esté encendido.", "danger");
    } finally {
      btnGuardar.disabled = false;
      btnGuardar.textContent = "GUARDAR Y ACTIVAR PERFIL";
    }
  });

  function mostrarAlerta(mensaje, tipo) {
    alerta.textContent = mensaje;
    alerta.className = `alert alert-${tipo} d-block rounded-3`;
  }

  function ocultarAlerta() {
    alerta.className = "alert d-none";
    alerta.textContent = "";
  }
});