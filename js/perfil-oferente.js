/**
 * MÓDULO 3: Onboarding y Perfil del Oferente (Integrante 3 - Brisa)
 * - Valida que el usuario tenga rol 'oferente'.
 * - Precarga el perfil existente desde GET /api/profesionales/:id (o listando por usuario).
 * - Crea o actualiza el perfil profesional (zona, contacto, disponibilidadSemanal) en MongoDB.
 */

import { profesionalesAPI } from "./api.js";
import { STORAGE_KEYS } from "./config.js";

const TAMANO_MAX_FOTO_BYTES = 500 * 1024; // 500 KB

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

function obtenerIdUsuarioDePerfil(perfil) {
  if (!perfil || perfil.usuario === undefined || perfil.usuario === null) return "";
  if (typeof perfil.usuario === "object") {
    return String(perfil.usuario._id ?? perfil.usuario.id ?? "");
  }
  return String(perfil.usuario);
}

async function iniciarPerfilOferente() {
  const formPerfil = document.getElementById("form-perfil");
  const inputZona = document.getElementById("zona");
  const inputContacto = document.getElementById("contacto");
  const inputFotoPerfil = document.getElementById("fotoPerfil");
  const previewFotoOferente = document.getElementById("preview-foto-oferente");
  const iconoAvatarDefault = document.getElementById("icono-avatar-default");
  const alerta = document.getElementById("alerta-perfil");
  const btnGuardar = document.getElementById("btn-guardar-perfil");
  const btnSeleccionarTodo = document.getElementById("btn-seleccionar-todo");
  const btnCerrarSesion = document.getElementById("btn-cerrar-sesion");
  const nombreNav = document.getElementById("nombre-oferente-nav");
  const tituloBienvenida = document.getElementById("titulo-bienvenida-oferente");

  let fotoBase64Actual = "";

  const usuarioLogueado = obtenerUsuario();

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

  const idsUsuarioPosibles = new Set(
    [usuarioLogueado._id, usuarioLogueado.id]
      .filter((val) => val !== undefined && val !== null && String(val).trim() !== "")
      .map((val) => String(val))
  );

  const usuarioIdPrincipal = usuarioLogueado._id
    ? String(usuarioLogueado._id)
    : usuarioLogueado.id
    ? String(usuarioLogueado.id)
    : "";

  let profesionalIdActual = usuarioLogueado.profesionalId ? String(usuarioLogueado.profesionalId) : null;

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

  function mostrarVistaPreviaFoto(dataUrl) {
    if (!previewFotoOferente || !iconoAvatarDefault) return;

    if (dataUrl) {
      previewFotoOferente.src = dataUrl;
      previewFotoOferente.classList.remove("d-none");
      iconoAvatarDefault.classList.add("d-none");
    } else {
      previewFotoOferente.src = "";
      previewFotoOferente.classList.add("d-none");
      iconoAvatarDefault.classList.remove("d-none");
    }
  }

  function establecerEstadoCargando(cargando) {
    if (inputZona) inputZona.disabled = cargando;
    if (inputContacto) inputContacto.disabled = cargando;
    if (inputFotoPerfil) inputFotoPerfil.disabled = cargando;
    if (btnSeleccionarTodo) btnSeleccionarTodo.disabled = cargando;
    document.querySelectorAll(".disp-check").forEach((cb) => {
      cb.disabled = cargando;
    });

    if (btnGuardar) {
      btnGuardar.disabled = cargando;
      btnGuardar.textContent = cargando ? "CARGANDO PERFIL..." : "GUARDAR Y ACTIVAR PERFIL";
    }
  }

  if (!usuarioIdPrincipal) {
    mostrarAlerta("No se pudo identificar el ID del usuario en la sesión actual.", "danger");
  }

  if (inputFotoPerfil) {
    inputFotoPerfil.addEventListener("change", (event) => {
      ocultarAlerta();
      const archivo = event.target.files?.[0];

      if (!archivo) {
        fotoBase64Actual = "";
        mostrarVistaPreviaFoto("");
        return;
      }

      if (archivo.size > TAMANO_MAX_FOTO_BYTES) {
        mostrarAlerta("La imagen supera los 500 KB. Elegí un archivo más liviano.", "danger");
        inputFotoPerfil.value = "";
        fotoBase64Actual = "";
        mostrarVistaPreviaFoto("");
        return;
      }

      const lector = new FileReader();
      lector.onload = () => {
        fotoBase64Actual = String(lector.result || "");
        mostrarVistaPreviaFoto(fotoBase64Actual);
      };
      lector.onerror = () => {
        mostrarAlerta("No se pudo leer la imagen seleccionada.", "danger");
      };
      lector.readAsDataURL(archivo);
    });
  }

  if (btnSeleccionarTodo) {
    btnSeleccionarTodo.addEventListener("click", () => {
      const checks = Array.from(document.querySelectorAll(".disp-check"));
      const todosMarcados = checks.every((cb) => cb.checked);
      checks.forEach((cb) => {
        cb.checked = !todosMarcados;
      });
    });
  }

  if (formPerfil) {
    formPerfil.addEventListener("submit", async (e) => {
      e.preventDefault();
      ocultarAlerta();

      if (!usuarioIdPrincipal) {
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
        usuario: usuarioIdPrincipal,
        zona,
        contacto,
        disponibilidadSemanal: disponibilidadSeleccionada,
        foto: fotoBase64Actual
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
        window.scrollTo({ top: 0, behavior: "smooth" });

        setTimeout(() => {
          window.location.href = "panel-oferente.html";
        }, 1000);
      } catch (error) {
        mostrarAlerta(
          error.message || "No se pudo guardar el perfil. Verificá que el backend esté encendido.",
          "danger"
        );
        window.scrollTo({ top: 0, behavior: "smooth" });
      } finally {
        if (btnGuardar) {
          btnGuardar.disabled = false;
          btnGuardar.textContent = "GUARDAR Y ACTIVAR PERFIL";
        }
      }
    });
  }

  async function cargarPerfilExistente() {
    if (idsUsuarioPosibles.size === 0 && !profesionalIdActual) return;

    establecerEstadoCargando(true);
    mostrarAlerta("Cargando datos de tu perfil...", "info");

    try {
      let perfil = null;

      if (profesionalIdActual) {
        try {
          const resp = await profesionalesAPI.obtenerPorId(profesionalIdActual);
          perfil = extraerPerfil(resp);
        } catch {
          perfil = null;
        }
      }

      if (!perfil && idsUsuarioPosibles.size > 0) {
        const lista = await profesionalesAPI.listar();
        const profesionales = extraerListaProfesionales(lista);

        perfil =
          profesionales.find((p) => {
            const idUsuarioPerfil = obtenerIdUsuarioDePerfil(p);
            return idUsuarioPerfil && idsUsuarioPosibles.has(idUsuarioPerfil);
          }) || null;
      }

      if (perfil && perfil._id) {
        profesionalIdActual = String(perfil._id);
        usuarioLogueado.profesionalId = perfil._id;
        localStorage.setItem(STORAGE_KEYS.USUARIO, JSON.stringify(usuarioLogueado));

        if (inputZona) inputZona.value = perfil.zona || "";
        if (inputContacto) inputContacto.value = perfil.contacto || "";

        const fotoGuardada = perfil.foto || perfil.fotoPerfil || perfil.imagen || "";
        if (fotoGuardada) {
          fotoBase64Actual = fotoGuardada;
          mostrarVistaPreviaFoto(fotoGuardada);
        } else {
          fotoBase64Actual = "";
          mostrarVistaPreviaFoto("");
        }

        const franjasGuardadas = Array.isArray(perfil.disponibilidadSemanal)
          ? perfil.disponibilidadSemanal.map((f) => String(f).trim())
          : [];

        document.querySelectorAll(".disp-check").forEach((cb) => {
          cb.checked = franjasGuardadas.includes(String(cb.value).trim());
        });
      }

      ocultarAlerta();
    } catch (error) {
      ocultarAlerta();
      console.warn("Aún no hay un perfil previo para precargar:", error.message);
    } finally {
      establecerEstadoCargando(false);
    }
  }

  await cargarPerfilExistente();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciarPerfilOferente);
} else {
  iniciarPerfilOferente();
}