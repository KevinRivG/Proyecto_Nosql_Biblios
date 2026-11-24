import { Schema, model } from 'mongoose';

// Un "usuario" es el lector que tiene credencial de préstamo a domicilio.
// Los datos salen de la cédula de registro (tarjeta verde) y de la
// credencial amarilla de la Red Nacional de Bibliotecas Públicas.

const amonestacionSchema = new Schema(
  {
    fecha: { type: Date, required: true },
    prestamo: { type: Schema.Types.ObjectId, ref: 'Prestamo' },
    folio: Number,
    diasRetraso: { type: Number, min: 1 },
  },
  { _id: false }
);

const usuarioSchema = new Schema(
  {
    // número que se anota arriba de la foto y en el libro azul
    numRegistro: { type: Number, required: true, unique: true },
    nombre: {
      paterno: { type: String, required: true, trim: true },
      materno: { type: String, trim: true, default: '' },
      nombres: { type: String, required: true, trim: true },
    },
    edad: { type: Number, required: true, min: 3, max: 110 },
    domicilio: {
      calle: { type: String, required: true },
      colonia: { type: String, required: true },
      cp: { type: String, required: true, match: [/^\d{5}$/, 'El C.P. debe tener 5 dígitos'] },
      ciudad: { type: String, default: 'Tepic' },
    },
    telefonos: {
      fijo: { type: String, default: '' },
      movil: { type: String, default: '' },
    },
    correo: { type: String, lowercase: true, trim: true, default: '' },
    ocupacion: {
      type: String,
      enum: ['ESTUDIANTE', 'DOCENTE', 'EMPLEADO', 'COMERCIANTE', 'HOGAR', 'JUBILADO', 'PROFESIONISTA', 'OTRO'],
      default: 'ESTUDIANTE',
    },
    escuelaTrabajo: { type: String, default: '' },
    identificacion: {
      type: String,
      enum: ['INE', 'CARTILLA', 'PASAPORTE', 'LICENCIA', 'CRED_ESCOLAR', 'CURP'],
      default: 'INE',
    },
    fiador: { type: Schema.Types.ObjectId, ref: 'Fiador', required: true },

    fechaExpedicion: { type: Date, required: true },
    fechaVencimiento: { type: Date, required: true },
    duplicadoExpedido: { type: Boolean, default: false },

    estado: {
      type: String,
      enum: ['ACTIVA', 'SUSPENDIDA', 'CANCELADA'],
      default: 'ACTIVA',
    },
    suspendidoHasta: { type: Date, default: null },
    motivoEstado: { type: String, default: '' },

    // cada retraso se anota en el registro (amonestación)
    amonestaciones: { type: [amonestacionSchema], default: [] },
  },
  { timestamps: true }
);

usuarioSchema.index({ 'nombre.paterno': 1, 'nombre.materno': 1, 'nombre.nombres': 1 });
usuarioSchema.index({ estado: 1, fechaVencimiento: 1 });
usuarioSchema.index({ fiador: 1 });

usuarioSchema.virtual('nombreCompleto').get(function () {
  const n = this.nombre;
  return `${n.paterno} ${n.materno}, ${n.nombres}`.replace('  ', ' ');
});

export default model('Usuario', usuarioSchema, 'usuarios');
