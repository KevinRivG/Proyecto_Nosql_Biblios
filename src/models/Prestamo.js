import { Schema, model } from 'mongoose';

const renovacionSchema = new Schema(
  {
    fecha: { type: Date, required: true },
    venceAnterior: Date,
    venceNueva: Date,
  },
  { _id: false }
);

const recordatorioSchema = new Schema(
  {
    fecha: { type: Date, required: true },
    medio: { type: String, enum: ['TELEFONO', 'CORREO', 'PRESENCIAL'], default: 'TELEFONO' },
    dirigidoA: { type: String, enum: ['USUARIO', 'FIADOR'], default: 'USUARIO' },
  },
  { _id: false }
);

// Equivale a la "ficha de préstamo a domicilio": colocación + fecha de devolución + lector
const prestamoSchema = new Schema(
  {
    folio: { type: Number, required: true, unique: true },
    usuario: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    libro: { type: Schema.Types.ObjectId, ref: 'Libro', required: true },
    inventario: { type: String, required: true },
    // copia de datos del libro al momento del préstamo (para el comprobante)
    titulo: String,
    colocacion: String,

    fechaPrestamo: { type: Date, required: true },
    fechaVencimiento: { type: Date, required: true },
    fechaDevolucion: { type: Date, default: null },

    estado: {
      type: String,
      enum: ['ACTIVO', 'DEVUELTO', 'EXTRAVIADO'],
      default: 'ACTIVO',
    },
    diasRetraso: { type: Number, default: 0 },
    condicionEntrega: { type: String, enum: ['BUENO', 'REGULAR', 'DANADO'], default: 'BUENO' },
    condicionDevolucion: { type: String, enum: ['BUENO', 'REGULAR', 'DANADO'], default: null },

    renovaciones: { type: [renovacionSchema], default: [] },
    recordatorios: { type: [recordatorioSchema], default: [] },
    atendio: { type: String, default: 'Mostrador' },
  },
  { timestamps: true }
);

prestamoSchema.index({ usuario: 1, estado: 1 });
prestamoSchema.index({ libro: 1, fechaPrestamo: -1 });
prestamoSchema.index({ estado: 1, fechaVencimiento: 1 });

export default model('Prestamo', prestamoSchema, 'prestamos');
