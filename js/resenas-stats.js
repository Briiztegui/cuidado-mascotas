/**
 * MÓDULO 7: Sistema de Reseñas y Estadísticas (Integrante 7)
 * - Cliente: habilita el formulario de reseña (1 a 5 estrellas + comentario) en mis-solicitudes.html SOLO si la solicitud está en estado 'completada'. Envía con resenasAPI.crear().
 * - Oferente: carga y muestra las reseñas recibidas (resenasAPI.listarPorProfesional) y las estadísticas del panel (estadisticasAPI.obtenerPorProfesional).
 */
const boton = document.getElementById("btnEnviar");

boton.addEventListener("click", () => {
  const puntaje = document.querySelector('input[name="puntaje"]:checked');
  const comentario = document.getElementById("comentario").value;

  console.log("Puntaje:", puntaje ? puntaje.value : "ninguno");
  console.log("Comentario:", comentario);
});





