import mongoose from "mongoose";

const profesionalSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
  zona: { type: String, required: true },
  contacto: { type: String, required: true },
  disponibilidadSemanal: [String],
  calificacionPromedio: { type: Number, default: 0 }
});

export default mongoose.model("Oferente", profesionalSchema);