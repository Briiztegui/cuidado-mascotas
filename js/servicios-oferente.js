/*
 VARIABLES
*/

const servicios = [];


/*
 SELECTORES DEL DOM
*/

const formularioServicio = document.getElementById("formularioServicio");
const nombreServicio = document.getElementById("nombreServicio");
const descripcion = document.getElementById("descripcion");
const precio = document.getElementById("precio");
const categoria = document.getElementById("categoria");
const serviciosActivos = document.getElementById("serviciosActivos");
const mensajeSinServicios = document.getElementById("mensajeSinServicios");


/*
 FUNCIONES
*/

function mostrarServicio(servicio) {

    const columna = document.createElement("div");
    columna.classList.add("col-12", "col-md-6", "col-lg-4");

    const tarjeta = document.createElement("div");
    tarjeta.classList.add("card", "filter-card", "shadow-sm", "h-100", "p-3");

    const titulo = document.createElement("h3");
    titulo.classList.add("h5");
    titulo.textContent = servicio.nombre;

    const textoDescripcion = document.createElement("p");
    textoDescripcion.textContent = servicio.descripcion;

    const textoCategoria = document.createElement("p");
    textoCategoria.textContent = "Categoría: " + servicio.categoria;

    const textoPrecio = document.createElement("p");
    textoPrecio.textContent = "Precio: $" + servicio.precio;

    // Botón eliminar
    const botonEliminar = document.createElement("button");
    botonEliminar.classList.add("btn", "btn-link", "text-danger", "p-0");
    botonEliminar.type = "button";
    botonEliminar.title = "Eliminar servicio";

    const iconoEliminar = document.createElement("i");
    iconoEliminar.classList.add("bi", "bi-trash3-fill");

    botonEliminar.appendChild(iconoEliminar);

    // Evento para eliminar el servicio

    botonEliminar.addEventListener("click", function () {
        if (confirm("¿Estás seguro de que querés eliminar este servicio?")) {
            const indice = servicios.indexOf(servicio);
            servicios.splice(indice, 1);
            botonEliminar.closest(".col-12").remove();

            if (servicios.length === 0) {
                mensajeSinServicios.classList.remove("d-none");
            }
        }
    });

    // Agregar elementos a la tarjeta
    tarjeta.appendChild(titulo);
    tarjeta.appendChild(textoDescripcion);
    tarjeta.appendChild(textoCategoria);
    tarjeta.appendChild(textoPrecio);
    tarjeta.appendChild(botonEliminar);

    columna.appendChild(tarjeta);

    serviciosActivos.appendChild(columna);

    mensajeSinServicios.classList.add("d-none");
}


// Limpiar el formulario

function limpiarFormulario() {
    formularioServicio.reset();
}


/* =================================
   4. EVENTOS
================================= */

// Publicar un servicio
formularioServicio.addEventListener("submit", function (evento) {

    evento.preventDefault();

    const servicio = {
        nombre: nombreServicio.value,
        descripcion: descripcion.value,
        precio: Number(precio.value),
        categoria: categoria.value
    };

    servicios.push(servicio);

    mostrarServicio(servicio);

    limpiarFormulario();

});