import { STORAGE_KEYS } from "./config.js";
import { resenasAPI, solicitudesAPI, estadisticasAPI, profesionalesAPI } from "./api.js";

// Datos de la URL y del usuario logueado
const params = new URLSearchParams(window.location.search);
const solicitudId = params.get("solicitud");
const profesionalIdUrl = params.get("profesional");

const usuarioGuardado = JSON.parse(localStorage.getItem(STORAGE_KEYS.USUARIO));
const usuarioId = usuarioGuardado?._id || usuarioGuardado?.id;

// Elementos de resenas.html (vista cliente)
const botonEnviar = document.getElementById("btnEnviar");
const inputComentario = document.getElementById("comentario");
const textoMensaje = document.getElementById("mensaje");

// Contenedor de panel-oferente.html (vista profesional)
const seccionOferente = document.getElementById("seccion-estadisticas-resenas");

// Chequear que la solicitud esté completada antes de dejar comentar
async function verificarPermisoResena() {
  if (!usuarioId || !solicitudId || !profesionalIdUrl) {
    botonEnviar.disabled = true;
    textoMensaje.textContent = "Faltan datos de la sesión o de la solicitud para dejar una reseña.";
    return;
  }

  try {
    const solicitudes = await solicitudesAPI.listarPorCliente(usuarioId);
    const solicitudValida = solicitudes.find(
      (sol) => (sol._id === solicitudId || sol.id === solicitudId) && sol.estado === "completada"
    );

    if (!solicitudValida) {
      botonEnviar.disabled = true;
      textoMensaje.textContent = "Solo podés dejar una reseña cuando el profesional haya marcado el servicio como completado.";
    }
  } catch (error) {
    botonEnviar.disabled = true;
    textoMensaje.textContent = `No se pudo verificar la solicitud: ${error.message}`;
  }
}

if (botonEnviar) {
  verificarPermisoResena();

  botonEnviar.addEventListener("click", async () => {
    const estrellaMarcada = document.querySelector('input[name="puntaje"]:checked');
    const comentario = inputComentario.value.trim();

    if (!estrellaMarcada) {
      textoMensaje.textContent = "Por favor, seleccioná entre 1 y 5 estrellas.";
      return;
    }

    const payload = {
      solicitud: solicitudId,
      profesional: profesionalIdUrl,
      cliente: usuarioId,
      puntaje: Number(estrellaMarcada.value),
      comentario
    };

    try {
      botonEnviar.disabled = true;
      textoMensaje.textContent = "Enviando reseña...";

      await resenasAPI.crear(payload);

      textoMensaje.textContent = "¡Reseña enviada con éxito! Gracias por compartir tu experiencia.";
      inputComentario.value = "";
    } catch (error) {
      botonEnviar.disabled = false;
      textoMensaje.textContent = `Error al enviar: ${error.message}`;
    }
  });
}

// Buscar el id del perfil profesional asociado a este usuario
async function obtenerIdProfesionalLogueado() {
  if (usuarioGuardado?.profesionalId) return usuarioGuardado.profesionalId;

  const listaProfesionales = await profesionalesAPI.listar();
  const miPerfil = listaProfesionales.find(
    (prof) => prof.usuario === usuarioId || prof.usuario?._id === usuarioId
  );

  return miPerfil?._id || miPerfil?.id;
}

// Armar las tarjetas de reseñas en el panel
function renderizarResenas(resenas) {
  const contenedor = document.getElementById("listaResenasOferente");

  if (!resenas || resenas.length === 0) {
    contenedor.innerHTML = `<p class="text-muted mb-0">Todavía no recibiste reseñas de clientes.</p>`;
    return;
  }

  contenedor.innerHTML = resenas
    .map((resena) => {
      const estrellas = "★".repeat(resena.puntaje) + "☆".repeat(5 - resena.puntaje);
      const fecha = resena.fecha ? new Date(resena.fecha).toLocaleDateString("es-AR") : "";
      const nombreCliente = resena.cliente?.nombre || "Cliente";

      return `
        <div class="border-bottom pb-3 mb-3">
          <div class="d-flex justify-content-between align-items-center">
            <strong>${nombreCliente}</strong>
            <small class="text-muted">${fecha}</small>
          </div>
          <div class="text-warning my-1">${estrellas}</div>
          <p class="mb-0 text-secondary">${resena.comentario || "Sin comentario adicional."}</p>
        </div>
      `;
    })
    .join("");
}

// Traer estadísticas y reseñas del profesional al entrar al panel
async function cargarPanelEstadisticasYResenas() {
  const alerta = document.getElementById("alertaStats");

  if (!usuarioId) {
    alerta.textContent = "Iniciá sesión como oferente para ver tus estadísticas.";
    alerta.classList.remove("d-none");
    return;
  }

  try {
    const profesionalId = await obtenerIdProfesionalLogueado();

    if (!profesionalId) {
      alerta.textContent = "Todavía no completaste tu perfil profesional.";
      alerta.classList.remove("d-none");
      return;
    }

    const [stats, resenas] = await Promise.all([
      estadisticasAPI.obtenerPorProfesional(profesionalId),
      resenasAPI.listarPorProfesional(profesionalId)
    ]);

    document.getElementById("statServicios").textContent = stats.cantidadServicios ?? stats.servicios ?? 0;

    const promedio = Number(stats.calificacionPromedio ?? stats.promedio ?? 0);
    document.getElementById("statPromedio").textContent = `${promedio.toFixed(1)} ★`;

    const porEstado = stats.solicitudesPorEstado || stats;
    document.getElementById("statPendientes").textContent = porEstado.pendiente ?? porEstado.pendientes ?? 0;
    document.getElementById("statAceptadas").textContent = porEstado.aceptada ?? porEstado.aceptadas ?? 0;
    document.getElementById("statCompletadas").textContent = porEstado.completada ?? porEstado.completadas ?? 0;
    document.getElementById("statRechazadas").textContent = porEstado.rechazada ?? porEstado.rechazadas ?? 0;

    renderizarResenas(resenas);
  } catch (error) {
    alerta.textContent = `No se pudieron cargar las estadísticas: ${error.message}`;
    alerta.classList.remove("d-none");
  }
}

if (seccionOferente) {
  cargarPanelEstadisticasYResenas();
}





