const filtrosForm = document.getElementById("filtrosForm");
const inputCategoria = document.getElementById("filtroCategoria");
const inputPrecioMax = document.getElementById("filtroPrecioMax");
const inputEstrellasMin = document.getElementById("filtroEstrellasMin");
const inputZona = document.getElementById("filtroZona");
const inputDisponibilidad = document.getElementById("filtroDisponibilidad");

const btnLimpiarFiltros = document.getElementById("btnLimpiarFiltros");
const btnLimpiarDesdeVacio = document.getElementById("btnLimpiarDesdeVacio");

const grillaResultados = document.getElementById("grillaResultados");
const contadorResultados = document.getElementById("contadorResultados");
const estadoCarga = document.getElementById("estadoCarga");
const estadoError = document.getElementById("estadoError");
const estadoVacio = document.getElementById("estadoVacio");

// Helper para mostrar un solo estado a la vez
function mostrarEstado({ cargando = false, error = false, vacio = false }) {
  estadoCarga.classList.toggle("d-none", !cargando);
  estadoError.classList.toggle("d-none", !error);
  estadoVacio.classList.toggle("d-none", !vacio);
  grillaResultados.classList.toggle("d-none", cargando || error || vacio);
}

//lectura de los valores actuales de los filtros
function obtenerFiltros() {
  return {
    categoria: inputCategoria.value.trim(),
    precioMax: inputPrecioMax.value.trim(),
    estrellasMin: inputEstrellasMin.value.trim(),
    zona: inputZona.value.trim(),
    disponibilidad: inputDisponibilidad.value.trim(),
  };
}

//Arma los query string sin parámetros vacíos
function construirQueryString(paramsObj) {
  const params = new URLSearchParams();

  Object.entries(paramsObj).forEach(([clave, valor]) => {
    if (valor !== "") {
      params.append(clave, valor);
    }
  });

  const query = params.toString();
  return query ? `?${query}` : "";
}

// Obtener URL base configurable (definida en js/config.js)
function obtenerApiUrl() {
  const base = typeof API_URL !== "undefined" ? API_URL : "";
  return base.replace(/\/+$/, ""); // Quita barras extra al final si las hubiera
}

// Helper genérico para hacer un GET y verificar la respuesta HTTP
async function fetchJson(url) {
  const respuesta = await fetch(url);

  if (!respuesta.ok) {
    throw new Error(`Error HTTP ${respuesta.status} al consultar ${url}`);
  }

  return await respuesta.json();
}

// Consultar servicios y profesionales según los filtros activos
async function obtenerDatosCatalogo(filtros) {
  const baseUrl = obtenerApiUrl();

  const queryServicios = construirQueryString({
    categoria: filtros.categoria,
    precioMax: filtros.precioMax,
    estrellasMin: filtros.estrellasMin,
  });

  const queryProfesionales = construirQueryString({
    zona: filtros.zona,
    disponibilidad: filtros.disponibilidad,
  });

  const urlServicios = `${baseUrl}/api/servicios${queryServicios}`;
  const urlProfesionales = `${baseUrl}/api/profesionales${queryProfesionales}`;

  // Promise.all dispara ambos pedidos en paralelo para no perder tiempo
  const [serviciosData, profesionalesData] = await Promise.all([
    fetchJson(urlServicios),
    fetchJson(urlProfesionales),
  ]);

  // por si el backend me devuelve un objeto con el array dentro o un array vacio. 
  const servicios = Array.isArray(serviciosData)
    ? serviciosData
    : serviciosData.servicios || serviciosData.data || [];

  const profesionales = Array.isArray(profesionalesData)
    ? profesionalesData
    : profesionalesData.profesionales || profesionalesData.data || [];

  return { servicios, profesionales };
}

// Saca el ID del profesional tanto si viene como texto/ObjectId como si viene como objeto completo
function obtenerIdProfesional(refProfesional) {
  if (!refProfesional) return "";
  if (typeof refProfesional === "string") return refProfesional;
  return String(refProfesional._id || refProfesional.id || "");
}

function combinarYFiltrarCatalogo(servicios, profesionales, filtros) {
  // Arma un diccionario/mapa por ID para encontrar al profesional al toque
  const mapaProfesionales = new Map();
  profesionales.forEach((prof) => {
    const id = String(prof._id || prof.id || "");
    if (id) mapaProfesionales.set(id, prof);
  });

  // Une cada servicio con su profesional
  const catalogo = servicios.map((srv) => {
    const profObj =
      srv.profesional && typeof srv.profesional === "object"
        ? srv.profesional
        : mapaProfesionales.get(obtenerIdProfesional(srv.profesional)) || {};

    const disponibilidad = Array.isArray(profObj.disponibilidadSemanal)
      ? profObj.disponibilidadSemanal
      : profObj.disponibilidadSemanal
      ? [String(profObj.disponibilidadSemanal)]
      : [];

    return {
      id: srv._id || srv.id || "",
      profesionalId: obtenerIdProfesional(srv.profesional) || profObj._id || "",
      nombreServicio: srv.nombre || "Servicio sin nombre",
      descripcion: srv.descripcion || "",
      precio: Number(srv.precio ?? 0),
      categoria: srv.categoria || "",
      nombreProfesional: profObj.usuario?.nombre || profObj.nombre || "Profesional",
      zona: profObj.zona || "",
      disponibilidadSemanal: disponibilidad,
      calificacionPromedio: Number(profObj.calificacionPromedio ?? 0),
    };
  });

  // Aplicar los filtros activos sobre el mismo conjunto
  return catalogo.filter((item) => {
    if (filtros.categoria && item.categoria.toLowerCase() !== filtros.categoria.toLowerCase()) {
      return false;
    }
    if (filtros.precioMax !== "" && item.precio > Number(filtros.precioMax)) {
      return false;
    }
    if (filtros.estrellasMin !== "" && item.calificacionPromedio < Number(filtros.estrellasMin)) {
      return false;
    }
    if (filtros.zona && !item.zona.toLowerCase().includes(filtros.zona.toLowerCase())) {
      return false;
    }
    if (filtros.disponibilidad) {
      const coincide = item.disponibilidadSemanal.some((franja) =>
        String(franja).toLowerCase().includes(filtros.disponibilidad.toLowerCase())
      );
      if (!coincide) return false;
    }
    return true;
  });
}
/*hidratacion de las tarjetas */
function escaparHTML(texto) {
  return String(texto ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function crearTarjetaHtml(item) {
  const dispTexto =
    item.disponibilidadSemanal.length > 0
      ? item.disponibilidadSemanal.map(escaparHTML).join(" · ")
      : "Consultar disponibilidad";

  // Promedio de estrellas: se actualiza cuando Ludmi registra una nueva reseña (POST /api/resenas)
  const promedioSeguro = Number(item.calificacionPromedio ?? 0).toFixed(1);

  return `
    <div class="col">
      <article class="card service-card h-100 bg-white">
        <div class="card-body d-flex flex-column">
          <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
            <span class="badge badge-categoria rounded-pill px-3 py-2">
              ${escaparHTML(item.categoria || "Servicio")}
            </span>
            <!-- Insignia de calificación promedio del oferente (vinculada a las reseñas de Ludmi) -->
            <span class="badge badge-rating rounded-pill px-3 py-2">
              ★ ${escaparHTML(promedioSeguro)}
            </span>
          </div>

          <h3 class="font-brand h5 mb-1">${escaparHTML(item.nombreServicio)}</h3>
          <p class="text-muted small mb-2">
            Por <strong>${escaparHTML(item.nombreProfesional)}</strong>
            ${item.zona ? `· ${escaparHTML(item.zona)}` : ""}
          </p>

          <p class="card-text small flex-grow-1 mb-3">
            ${escaparHTML(item.descripcion)}
          </p>

          <div class="mb-3">
            <span class="badge tag-disponibilidad rounded-3 px-2 py-1">
              ${dispTexto}
            </span>
          </div>

          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 pt-2 border-top">
            <span class="price-tag fs-5">$${escaparHTML(Number(item.precio ?? 0).toLocaleString("es-AR"))}</span>
            <div class="d-flex flex-wrap gap-2">
              <!-- Botón para ver reseñas: dispara evento para el módulo de reseñas de Ludmi (GET /api/resenas/profesional/:id) -->
              <button
                type="button"
                class="btn btn-sm btn-pet-outline btn-ver-resenas"
                data-profesional-id="${escaparHTML(item.profesionalId)}"
                data-nombre-profesional="${escaparHTML(item.nombreProfesional)}"
              >
                Ver reseñas
              </button>
              <!-- Botón para solicitar servicio: dispara evento para el flujo de solicitudes de Alex -->
              <button
                type="button"
                class="btn btn-sm btn-pet-primary btn-solicitar-servicio"
                data-servicio-id="${escaparHTML(item.id)}"
                data-profesional-id="${escaparHTML(item.profesionalId)}"
              >
                Solicitar servicio
              </button>
            </div>
          </div>
        </div>
      </article>
    </div>
  `;
}

// Delegación única de eventos en la grilla: resuelve tanto el hook de reseñas (Ludmi) como el de solicitudes (Alex)
grillaResultados.addEventListener("click", (event) => {
  // Parte Ludmi: si el cliente hace clic en "Ver reseñas", se emite "huellitas:ver-resenas"
  // con profesionalId y nombreProfesional para que js/resenas-stats.js cargue o muestre las reseñas
  const btnResenas = event.target.closest(".btn-ver-resenas");
  if (btnResenas) {
    document.dispatchEvent(
      new CustomEvent("huellitas:ver-resenas", {
        detail: {
          profesionalId: btnResenas.dataset.profesionalId,
          nombreProfesional: btnResenas.dataset.nombreProfesional,
        },
      })
    );
    return;
  }

  // Parte Alex: si el cliente hace clic en "Solicitar servicio", emitimos "huellitas:solicitar-servicio"
  const btnSolicitar = event.target.closest(".btn-solicitar-servicio");
  if (btnSolicitar) {
    document.dispatchEvent(
      new CustomEvent("huellitas:solicitar-servicio", {
        detail: {
          servicioId: btnSolicitar.dataset.servicioId,
          profesionalId: btnSolicitar.dataset.profesionalId,
        },
      })
    );
  }
});

function renderizarResultados(items) {
  grillaResultados.innerHTML = "";

  if (!items || items.length === 0) {
    contadorResultados.textContent = "0 resultados encontrados";
    mostrarEstado({ vacio: true });
    return;
  }

  contadorResultados.textContent =
    items.length === 1
      ? "1 servicio disponible"
      : `${items.length} servicios disponibles`;

  mostrarEstado({ cargando: false, error: false, vacio: false });
  grillaResultados.innerHTML = items.map(crearTarjetaHtml).join("");
}

// Función principal que coordina: estado cargando -> fetch -> filtrar -> renderizar
async function cargarCatalogo() {
  mostrarEstado({ cargando: true });

  try {
    const filtros = obtenerFiltros();
    const { servicios, profesionales } = await obtenerDatosCatalogo(filtros);
    const resultadosFiltrados = combinarYFiltrarCatalogo(
      servicios,
      profesionales,
      filtros
    );

    renderizarResultados(resultadosFiltrados);
  } catch (error) {
    console.error("Error al cargar el catálogo:", error);
    contadorResultados.textContent = "Error al cargar el catálogo";
    mostrarEstado({ error: true });
  }
}

// Limpiar todos los campos del formulario y volver a cargar
function limpiarFiltros() {
  filtrosForm.reset();
  cargarCatalogo();
}

// Evento: enviar formulario de filtros
filtrosForm.addEventListener("submit", (event) => {
  event.preventDefault(); // Evita que la página se recargue sola como hace un form clásico
  cargarCatalogo();
});

// Eventos: botones para limpiar filtros
btnLimpiarFiltros.addEventListener("click", limpiarFiltros);
btnLimpiarDesdeVacio.addEventListener("click", limpiarFiltros);

// Carga inicial cuando el DOM está listo
document.addEventListener("DOMContentLoaded", () => {
  cargarCatalogo();
});