# Cuidado de Mascotas 🐾
Proyecto 3 - Media Pila

## Descripción
Cuidado de Mascotas es una plataforma web que conecta a dueños de mascotas (clientes) con cuidadores, paseadores y veterinarios a domicilio (oferentes). Los cuidadores publican sus servicios con precio y disponibilidad semanal. Los clientes buscan con filtros, solicitan un servicio y, cuando termina, dejan una reseña.

## Roles
- **Oferente**: carga su perfil, sus servicios y gestiona las solicitudes (pendiente, aceptada, rechazada, completada).
- **Cliente**: busca, filtra, solicita servicios y deja reseñas.

## Reglas importantes
- El rol se elige al registrarse y no se puede cambiar.
- El WhatsApp del oferente se muestra solo cuando la solicitud está **aceptada**.
- Solo se puede dejar una reseña si la solicitud está **completada**, y es única por par cliente-profesional.

## Instalación y puesta en marcha

### 1. Requisitos previos
- Tener instalado **Node.js** (se recomienda v20 o superior) y **npm**.
- Con versiones de Node menores a 18, `npm run dev` falla con el error `bad option: --watch`.
- Contar con una base de datos en **MongoDB** (local o MongoDB Atlas).

### 2. Clonar el proyecto e instalar dependencias
Abrí una terminal y ejecutá:

```bash
git clone https://github.com/Briiztegui/cuidado-mascotas.git
cd cuidado-mascotas/Backend
npm install
```

### 3. Configurar las variables de entorno
En la carpeta `Backend`, copiá el archivo de ejemplo:

```bash
cp .env.example .env
```

Abrí el archivo `.env` y reemplazá los valores de ejemplo:

```
PORT=3000
MONGODB_URI=mongodb+srv://USUARIO:PASSWORD@cluster.mongodb.net/cuidado_mascotas
```

- `PORT`: puerto donde corre el servidor (por defecto 3000).
- `MONGODB_URI`: connection string de tu base de datos MongoDB. Reemplazá `USUARIO` y `PASSWORD` por tus datos.

> El archivo `.env` **no se sube al repositorio**. Cada persona crea el suyo.

### 4. Levantar el backend
Desde la carpeta `Backend`:

```bash
npm run dev
```

Si todo sale bien, la terminal muestra:

```
Servidor corriendo en http://localhost:3000
Conectado a MongoDB
```

Hay que dejar esa terminal abierta mientras se usa la app.

### 5. Abrir el frontend
Abrí `index.html` con la extensión **Live Server** de VS Code (click derecho → "Open with Live Server").
La URL del backend se configura en `js/config.js`.

## Reseñas y estadísticas

Esta parte la hizo Ludmila. Está en los archivos `html/resenas.html`, `html/estadisticas.html` y `js/resenas-stats.js`.

### Reseñas (vista cliente)
Cuando un cliente termina un servicio, puede dejar una reseña con un puntaje de 1 a 5 estrellas y un comentario.

Cómo funciona:
1. La página recibe por la URL el id de la solicitud y el del profesional (`resenas.html?solicitud=...&profesional=...`).
2. El id del cliente sale de la sesión guardada al iniciar sesión.
3. Antes de dejar enviar, el frontend revisa que la solicitud esté en estado **completada**. Si no lo está, el botón queda deshabilitado.
4. Al enviar, se llama a `POST /api/resenas`.

Aunque el botón se deshabilite, el backend también controla todo: que la solicitud esté completada y que no haya otra reseña del mismo cliente al mismo profesional. Además recalcula el promedio de estrellas del profesional.

### Estadísticas (vista oferente)
En el panel del oferente se muestran:
- Cantidad de servicios
- Solicitudes por estado (pendientes, aceptadas, rechazadas, completadas)
- Promedio de estrellas
- Listado de reseñas recibidas

Los datos vienen de `GET /api/estadisticas/profesional/:id` y `GET /api/resenas/profesional/:id`.

### Cosas que agregué en el backend y en api.js
Mientras trabajaba en reseñas me di cuenta de que faltaban algunas cosas, así que las agregué (avisé al grupo antes):

- Un endpoint nuevo, `GET /api/solicitudes/cliente/:id`, para traer las solicitudes de un cliente. Lo necesitaba para saber si la solicitud estaba completada y recién ahí dejar reseñar.
- Cambié la validación de `POST /api/resenas`. Antes solo controlaba que no hubiera dos reseñas para la misma solicitud, y la consigna pide que sea una por cliente y profesional, así que ahora controla eso.
- En `js/api.js` sumé tres funciones: `resenasAPI.listarPorProfesional`, `estadisticasAPI.obtenerPorProfesional` y `solicitudesAPI.listarPorCliente`.