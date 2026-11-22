import mongoose from "mongoose";

const resenaSchema = new mongoose.Schema({
  solicitud: { type: mongoose.Schema.Types.ObjectId, ref: "Solicitud", required: true },
  profesional: { type: mongoose.Schema.Types.ObjectId, ref: "Profesional", required: true },
  cliente: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
  puntaje: { type: Number, required: true, min: 1, max: 5 },
  comentario: { type: String },
  fecha: { type: Date, default: Date.now }
});

export default mongoose.model("Resena", resenaSchema);