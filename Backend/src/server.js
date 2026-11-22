import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

import Usuario from "./modelos/cliente.js";
import Profesional from "./modelos/oferente.js";
import Servicio from "./modelos/servicio.js";
import Solicitud from "./modelos/solicitud.js";
import Resena from "./modelos/resena.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// ==========================================
// 1. CONEXIÓN A MONGODB
// ==========================================
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("Conectado a MongoDB"))
  .catch((err) => console.error("Error conectando a MongoDB:", err));

// ==========================================
// 2. ENDPOINTS
// ==========================================

// Auth
app.post("/api/auth/registro", async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;
    const salt = await bcrypt.genSalt(10);
    const passwordHasheada = await bcrypt.hash(password, salt);

    const nuevoUsuario = new Usuario({ nombre, email, password: passwordHasheada, rol });
    await nuevoUsuario.save();

    res.status(201).json({
      usuario: {
        id: nuevoUsuario._id,
        nombre: nuevoUsuario.nombre,
        email: nuevoUsuario.email,
        rol: nuevoUsuario.rol
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const usuario = await Usuario.findOne({ email });
    if (!usuario) return res.status(404).json({ mensaje: "Usuario no encontrado" });

    const esValida = await bcrypt.compare(password, usuario.password);
    if (!esValida) return res.status(400).json({ mensaje: "Credenciales inválidas" });

    let profesionalId = null;
    if (usuario.rol === "oferente") {
      const prof = await Profesional.findOne({ usuario: usuario._id });
      if (prof) profesionalId = prof._id;
    }

    res.json({
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        profesionalId
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Profesionales
app.get("/api/profesionales", async (req, res) => {
  try {
    const { zona, disponibilidad } = req.query;
    const filtro = {};
    if (zona) filtro.zona = new RegExp(zona, "i");
    if (disponibilidad) filtro.disponibilidadSemanal = disponibilidad;

    const profesionales = await Profesional.find(filtro).populate("usuario", "nombre email");
    res.json(profesionales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/profesionales/:id", async (req, res) => {
  try {
    const profesional = await Profesional.findById(req.params.id).populate("usuario", "nombre email");
    if (!profesional) return res.status(404).json({ mensaje: "Profesional no encontrado" });

    const servicios = await Servicio.find({ profesional: profesional._id });
    const resenas = await Resena.find({ profesional: profesional._id }).populate("cliente", "nombre");

    res.json({ profesional, servicios, resenas });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/profesionales", async (req, res) => {
  try {
    const { usuario, zona, contacto, disponibilidadSemanal } = req.body;
    const profesional = await Profesional.findOneAndUpdate(
      { usuario },
      { zona, contacto, disponibilidadSemanal },
      { new: true, upsert: true }
    );
    res.status(201).json(profesional);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Servicios
app.get("/api/servicios", async (req, res) => {
  try {
    const { categoria, precioMax, estrellasMin } = req.query;
    const filtro = {};
    if (categoria) filtro.categoria = categoria;
    if (precioMax) filtro.precio = { $lte: Number(precioMax) };

    let servicios = await Servicio.find(filtro).populate({
      path: "profesional",
      populate: { path: "usuario", select: "nombre" }
    });

    if (estrellasMin) {
      servicios = servicios.filter(
        (s) => s.profesional && s.profesional.calificacionPromedio >= Number(estrellasMin)
      );
    }

    res.json(servicios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/servicios", async (req, res) => {
  try {
    const nuevoServicio = new Servicio(req.body);
    await nuevoServicio.save();
    res.status(201).json(nuevoServicio);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Solicitudes
app.post("/api/solicitudes", async (req, res) => {
  try {
    const nuevaSolicitud = new Solicitud(req.body);
    await nuevaSolicitud.save();
    res.status(201).json(nuevaSolicitud);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/solicitudes/profesional/:id", async (req, res) => {
  try {
    const solicitudes = await Solicitud.find({ profesional: req.params.id })
      .populate("cliente", "nombre email")
      .populate("servicio", "nombre precio categoria");
    res.json(solicitudes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/solicitudes/:id/estado", async (req, res) => {
  try {
    const { estado } = req.body;
    const solicitud = await Solicitud.findByIdAndUpdate(
      req.params.id,
      { estado },
      { new: true }
    );
    res.json(solicitud);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Reseñas y Estadísticas
app.post("/api/resenas", async (req, res) => {
  try {
    const { solicitud, profesional, cliente, puntaje, comentario } = req.body;

    const sol = await Solicitud.findById(solicitud);
    if (!sol || sol.estado !== "completada") {
      return res.status(400).json({
        mensaje: "La reseña solo puede crearse si la solicitud está completada."
      });
    }

    const resenaExistente = await Resena.findOne({ solicitud });
    if (resenaExistente) {
      return res.status(400).json({ mensaje: "Ya existe una reseña para esta solicitud." });
    }

    const nuevaResena = new Resena({ solicitud, profesional, cliente, puntaje, comentario });
    await nuevaResena.save();

    const todasLasResenas = await Resena.find({ profesional });
    const suma = todasLasResenas.reduce((acc, r) => acc + r.puntaje, 0);
    const promedio = Number((suma / todasLasResenas.length).toFixed(1));

    await Profesional.findByIdAndUpdate(profesional, { calificacionPromedio: promedio });

    res.status(201).json({ nuevaResena, calificacionPromedio: promedio });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/resenas/profesional/:id", async (req, res) => {
  try {
    const resenas = await Resena.find({ profesional: req.params.id }).populate("cliente", "nombre");
    res.json(resenas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/estadisticas/profesional/:id", async (req, res) => {
  try {
    const profesionalId = req.params.id;
    const totalServicios = await Servicio.countDocuments({ profesional: profesionalId });
    const solicitudes = await Solicitud.find({ profesional: profesionalId });

    const porEstado = {
      pendiente: solicitudes.filter((s) => s.estado === "pendiente").length,
      aceptada: solicitudes.filter((s) => s.estado === "aceptada").length,
      rechazada: solicitudes.filter((s) => s.estado === "rechazada").length,
      completada: solicitudes.filter((s) => s.estado === "completada").length
    };

    const profesional = await Profesional.findById(profesionalId);

    res.json({
      totalServicios,
      solicitudesPorEstado: porEstado,
      calificacionPromedio: profesional ? profesional.calificacionPromedio : 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});