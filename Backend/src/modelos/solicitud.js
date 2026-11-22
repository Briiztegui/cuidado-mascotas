import mongoose from "mongoose";

const solicitudSchema = new mongoose.Schema({
  servicio: { type: mongoose.Schema.Types.ObjectId, ref: "Servicio", required: true },
  profesional: { type: mongoose.Schema.Types.ObjectId, ref: "Profesional", required: true },
  cliente: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
  descripcion: { type: String, required: true },
  diaFranja: { type: String },
  fecha: { type: Date, default: Date.now },
  estado: {
    type: String,
    enum: ["pendiente", "aceptada", "rechazada", "completada"],
    default: "pendiente"
  }
});

export default mongoose.model("Solicitud", solicitudSchema);