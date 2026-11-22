import mongoose from "mongoose";

const servicioSchema = new mongoose.Schema({
  profesional: { type: mongoose.Schema.Types.ObjectId, ref: "Profesional", required: true },
  nombre: { type: String, required: true },
  descripcion: { type: String },
  precio: { type: Number, required: true },
  categoria: { type: String, required: true }
});

export default mongoose.model("Servicio", servicioSchema);