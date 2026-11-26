// Traigo la función que habla con el servidor (la agregué en api.js)
import { estadisticasAPI } from "./api.js";

// Este id es de prueba (el profesional de Brisa).
// Más adelante tiene que salir de la sesión cuando el oferente inicia sesión
const PROFESIONAL_ID = "6b0480d15400b82e185e303e";

async function cargarEstadisticas() {
  // Acá voy a mostrar el aviso si algo sale mal
  const mensaje = document.getElementById("mensajeStats");

  try {
    // Le pido los números al servidor y espero la respuesta
    const datos = await estadisticasAPI.obtenerPorProfesional(PROFESIONAL_ID);

    // Voy llenando cada cuadradito con su número, buscándolo por el id del HTML
    document.getElementById("statServicios").textContent = datos.totalServicios;
    document.getElementById("statPendiente").textContent = datos.solicitudesPorEstado.pendiente;
    document.getElementById("statAceptada").textContent = datos.solicitudesPorEstado.aceptada;
    document.getElementById("statRechazada").textContent = datos.solicitudesPorEstado.rechazada;
    document.getElementById("statCompletada").textContent = datos.solicitudesPorEstado.completada;
    document.getElementById("statPromedio").textContent = datos.calificacionPromedio;

    // Si todo salió bien, borro cualquier aviso viejo
    mensaje.textContent = "";
  } catch (error) {
    // Si el servidor está apagado o falla, muestro el error en pantalla
    mensaje.textContent = "No se pudieron cargar las estadísticas: " + error.message;
  }
}

// Llamo a la función apenas carga la página
cargarEstadisticas();