# cuidado-mascotas
Proyecto 3- Media Pila

## Instalación y puesta en marcha

### 1. Requisitos previos
- Tener instalado **Node.js** (se recomienda v20 o superior) y **npm**.
- Contar con una base de datos en **MongoDB** (local o MongoDB Atlas).

### 2. Clonar el proyecto e instalar dependencias
Abrí una terminal en la carpeta del proyecto y ejecutá:

```bash
git clone https://github.com/Briiztegui/cuidado-mascotas.git
cd cuidado-mascotas/Backend
npm install

### 3. Configurar las variables de entorno
En la carpeta `Backend`, copiá el archivo de ejemplo y completalo:

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

### 5. Abrir el frontend
Abrí `index.html` con la extensión **Live Server** de VS Code (click derecho → "Open with Live Server").
La URL del backend se configura en `js/config.js`.

## Descripción
Cuidado de Mascotas es una plataforma web que conecta a dueños de mascotas (clientes) con cuidadores, paseadores y veterinarios a domicilio (oferentes). Los cuidadores publican sus servicios con precio y disponibilidad semanal; los clientes buscan con filtros, solicitan un servicio y, cuando termina, dejan una reseña.

## Roles
- **Oferente**: carga su perfil, sus servicios y gestiona las solicitudes (pendiente, aceptada, rechazada, completada).
- **Cliente**: busca, filtra, solicita servicios y deja reseñas.

## Reglas importantes
- El rol se elige al registrarse y no se puede cambiar.
- El WhatsApp del oferente se muestra solo cuando la solicitud está **aceptada**.
- Solo se puede dejar una reseña si la solicitud está **completada**, y es única por par cliente-profesional.