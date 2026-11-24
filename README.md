# cuidado-mascotas
Proyecto 3- Media Pila
## Exploración y Filtros Combinables (Rol Cliente)

La vista `pages/explorar-cliente.html` junto con la lógica en `js/buscador-cliente.js` permite al usuario con rol **Cliente** explorar los servicios disponibles de **Cuidado de Mascotas** (paseos, veterinaria a domicilio, guardería/cuidado) y filtrar resultados de manera combinable sobre el mismo catálogo.

### Criterios de filtrado disponibles

* **Categoría (`categoria`):** Filtra por tipo de prestación (`paseo`, `veterinaria`, `guarderia` o todas).
* **Precio máximo (`precioMax`):** Filtra servicios cuyo precio sea menor o igual al monto indicado.
* **Calificación mínima (`estrellasMin`):** Filtra por promedio de estrellas mínimo del oferente (`calificacionPromedio`).
* **Zona (`zona`):** Filtra por zona de cobertura del profesional.
* **Disponibilidad (`disponibilidad`):** Filtra por día o franja horaria dentro de `disponibilidadSemanal`.

### Cómo operan en conjunto (filtros combinables)

1. **Lectura y construcción de parámetros:** Al enviar el formulario de filtros (`#filtrosForm`), `js/buscador-cliente.js` lee únicamente los campos completados y arma los *query params* de forma dinámica con `URLSearchParams` (evitando enviar parámetros vacíos).
2. **Consulta a la API (`fetch`):** Utiliza la URL base configurable (`API_URL` definida en `js/config.js`) para consultar mediante `fetch`:
   * `GET /api/servicios` con `categoria`, `precioMax` y `estrellasMin` (si están activos).
   * `GET /api/profesionales` con `zona` y `disponibilidad` (si están activos).
3. **Evaluación conjunta sobre el mismo dataset:** Cada servicio se asocia con su profesional correspondiente (`zona`, `disponibilidadSemanal` y `calificacionPromedio`) y se filtran en conjunto para que solo permanezcan los ítems que cumplan **todas** las condiciones seleccionadas a la vez. Si se limpia la búsqueda, se restablecen los campos y se vuelve a consultar el catálogo.
4. **Estados visuales y tarjetas:** Se gestionan de forma diferenciada los estados de **carga**, **sin resultados**, **error de conexión** y **grilla de resultados**. Cada tarjeta muestra categoría, promedio de estrellas, servicio, profesional, zona, descripción, disponibilidad, precio y los botones de acción para ver reseñas o solicitar el servicio.