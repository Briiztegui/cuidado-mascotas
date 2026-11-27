/**
 * MÓDULO 5: Buscador y Filtros Combinables del Cliente (Integrante 5)
 * - Carga el listado de oferentes/servicios activos con su calificación promedio.
 * - Captura los filtros combinables (categoría/tipo de mascota, precio máximo, estrellas mínimas, zona, disponibilidad) y consulta a serviciosAPI.buscar() / profesionalesAPI.listar().
 * - Renderiza las tarjetas de resultados y abre el modal de solicitud.
 */

import { CONFIG, STORAGE_KEYS } from "./config.js";

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

function mostrarEstado({ cargando = false, error = false, vacio = false }) {
  estadoCarga?.classList.toggle("d-none", !cargando);
  estadoError?.classList.toggle("d-none", !error);
  estadoVacio?.classList.toggle("d-none", !vacio);
  grillaResultados?.classList.toggle("d-none", cargando || error || vacio);
}

function obtenerFiltros() {
  return {
    categoria: inputCategoria?.value.trim() || "",
    precioMax: inputPrecioMax?.value.trim() || "",
    estrellasMin: inputEstrellasMin?.value.trim() || "",
    zona: inputZona?.value.trim() || "",
    disponibilidad: inputDisponibilidad?.value.trim() || "",
  };
}

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

function obtenerApiRoot() {
  const base =
    CONFIG?.API_URL ||
    (typeof API_URL !== "undefined" ? API_URL : "") ||
    "http://localhost:3000/api";
  const limpia = String(base).replace(/\/+$/, "");
  return limpia.endsWith("/api") ? limpia : `${limpia}/api`;
}

async function fetchJson(url) {
  const respuesta = await fetch(url);

  if (!respuesta.ok) {
    throw new Error(`Error HTTP ${respuesta.status} al consultar ${url}`);
  }

  return await respuesta.json();
}

async function obtenerDatosCatalogo(filtros) {
  const apiRoot = obtenerApiRoot();

  const queryServicios = construirQueryString({
    categoria: filtros.categoria,
    precioMax: filtros.precioMax,
    estrellasMin: filtros.estrellasMin,
  });

  const queryProfesionales = construirQueryString({
    zona: filtros.zona,
    disponibilidad: filtros.disponibilidad,
  });

  const urlServicios = `${apiRoot}/servicios${queryServicios}`;
  const urlProfesionales = `${apiRoot}/profesionales${queryProfesionales}`;

  const [serviciosData, profesionalesData] = await Promise.all([
    fetchJson(urlServicios),
    fetchJson(urlProfesionales),
  ]);

  const servicios = Array.isArray(serviciosData)
    ? serviciosData
    : serviciosData.servicios || serviciosData.data || [];

  const profesionales = Array.isArray(profesionalesData)
    ? profesionalesData
    : profesionalesData.profesionales || profesionalesData.data || [];

  return { servicios, profesionales };
}

function obtenerIdReferencia(ref) {
  if (!ref) return "";
  if (typeof ref === "string") return ref;
  return String(ref._id || ref.id || "");
}

function obtenerNombreUsuarioSesionSiCoincide(idUsuarioRef) {
  if (!idUsuarioRef || !STORAGE_KEYS?.USUARIO) return "";
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USUARIO);
    const u = raw ? JSON.parse(raw) : null;
    if (!u) return "";
    const idsSesion = [u._id, u.id].filter(Boolean).map(String);
    if (idsSesion.includes(String(idUsuarioRef))) {
      return u.nombre || "";
    }
  } catch {
    // ignorar
  }
  return "";
}

function combinarYFiltrarCatalogo(servicios, profesionales, filtros) {
  const mapaProfesionalesPorId = new Map();
  const mapaProfesionalesPorUsuario = new Map();

  profesionales.forEach((prof) => {
    const idProf = String(prof._id || prof.id || "");
    if (idProf) mapaProfesionalesPorId.set(idProf, prof);

    const idUsr = obtenerIdReferencia(prof.usuario);
    if (idUsr) mapaProfesionalesPorUsuario.set(idUsr, prof);
  });

  const catalogo = servicios.map((srv) => {
    const idRefProf = obtenerIdReferencia(srv.profesional);
    const idRefUsr = obtenerIdReferencia(srv.usuario);

    let profObj =
      srv.profesional && typeof srv.profesional === "object"
        ? srv.profesional
        : mapaProfesionalesPorId.get(idRefProf) ||
          mapaProfesionalesPorUsuario.get(idRefProf) ||
          mapaProfesionalesPorUsuario.get(idRefUsr) ||
          {};

    // Si profObj vino solo como ID string en srv.profesional, buscamos en los mapas
    if (!profObj._id && idRefProf && mapaProfesionalesPorId.has(idRefProf)) {
      profObj = mapaProfesionalesPorId.get(idRefProf);
    }

    const idUsuarioDelProf = obtenerIdReferencia(profObj.usuario) || idRefUsr;
    const nombreDesdeUsuarioObj =
      typeof profObj.usuario === "object" && profObj.usuario !== null
        ? profObj.usuario.nombre || profObj.usuario.name
        : "";
    const nombreDesdeSesion = obtenerNombreUsuarioSesionSiCoincide(idUsuarioDelProf);

    const nombreProfesional =
      nombreDesdeUsuarioObj ||
      profObj.nombre ||
      srv.nombreProfesional ||
      nombreDesdeSesion ||
      "Profesional";

    const disponibilidad = Array.isArray(profObj.disponibilidadSemanal)
      ? profObj.disponibilidadSemanal
      : profObj.disponibilidadSemanal
      ? [String(profObj.disponibilidadSemanal)]
      : Array.isArray(srv.disponibilidadSemanal)
      ? srv.disponibilidadSemanal
      : [];

    const zona = profObj.zona || srv.zona || "";
    const foto = profObj.foto || profObj.fotoPerfil || profObj.imagen || srv.foto || "";

    return {
      id: srv._id || srv.id || "",
      profesionalId: profObj._id || profObj.id || idRefProf || "",
      nombreServicio: srv.nombre || "Servicio sin nombre",
      descripcion: srv.descripcion || "",
      precio: Number(srv.precio ?? 0),
      categoria: srv.categoria || "",
      nombreProfesional,
      foto,
      zona,
      disponibilidadSemanal: disponibilidad,
      calificacionPromedio: Number(profObj.calificacionPromedio ?? srv.calificacionPromedio ?? 0),
    };
  });

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

  const promedioSeguro = Number(item.calificacionPromedio ?? 0).toFixed(1);
  const fotoUrl = item.foto ? escaparHTML(item.foto) : "";
  const inicialProfesional = escaparHTML((item.nombreProfesional || "P").charAt(0).toUpperCase());

  const avatarHtml = fotoUrl
    ? `<img
         src="${fotoUrl}"
         alt="Foto de ${escaparHTML(item.nombreProfesional)}"
         class="rounded-circle object-fit-cover flex-shrink-0 border"
         style="width: 38px; height: 38px;"
         onerror="this.style.display='none'"
       />`
    : `<span
         class="d-inline-flex align-items-center justify-content-center rounded-circle bg-light text-secondary fw-bold flex-shrink-0 border"
         style="width: 38px; height: 38px; font-size: 0.95rem;"
       >
         ${inicialProfesional}
       </span>`;

  return `
    <div class="col">
      <article class="card service-card h-100 bg-white">
        <div class="card-body d-flex flex-column">
          <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
            <span class="badge badge-categoria rounded-pill px-3 py-2">
              ${escaparHTML(item.categoria || "Servicio")}
            </span>
            <span class="badge badge-rating rounded-pill px-3 py-2">
              ★ ${escaparHTML(promedioSeguro)}
            </span>
          </div>

          <h3 class="font-brand h5 mb-2">${escaparHTML(item.nombreServicio)}</h3>
          <div class="d-flex align-items-center gap-2 mb-2">
            ${avatarHtml}
            <p class="text-muted small mb-0">
              Por <strong>${escaparHTML(item.nombreProfesional)}</strong>
              ${item.zona ? `· ${escaparHTML(item.zona)}` : ""}
            </p>
          </div>

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
              <button
                type="button"
                class="btn btn-sm btn-pet-outline btn-ver-resenas"
                data-profesional-id="${escaparHTML(item.profesionalId)}"
                data-nombre-profesional="${escaparHTML(item.nombreProfesional)}"
              >
                Ver reseñas
              </button>
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

grillaResultados?.addEventListener("click", (event) => {
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
  if (!grillaResultados || !contadorResultados) return;
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
    if (contadorResultados) {
      contadorResultados.textContent = "Error al cargar el catálogo";
    }
    mostrarEstado({ error: true });
  }
}

function limpiarFiltros() {
  filtrosForm?.reset();
  cargarCatalogo();
}

filtrosForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  cargarCatalogo();
});

btnLimpiarFiltros?.addEventListener("click", limpiarFiltros);
btnLimpiarDesdeVacio?.addEventListener("click", limpiarFiltros);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", cargarCatalogo);
} else {
  cargarCatalogo();
}