import { Schema, model } from 'mongoose';

// Datos de la tarjeta verde "FIADOR"
const fiadorSchema = new Schema(
  {
    nombre: {
      paterno: { type: String, required: true, trim: true },
      materno: { type: String, trim: true, default: '' },
      nombres: { type: String, required: true, trim: true },
    },
    edad: {
      type: Number,
      required: true,
      min: [18, 'El fiador debe ser mayor de 18 años'],
    },
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
    ocupacion: { type: String, default: '' },
    trabajo: {
      nombre: { type: String, default: '' },
      direccion: { type: String, default: '' },
      telefono: { type: String, default: '' },
    },
    identificacion: {
      type: String,
      enum: ['INE', 'CARTILLA', 'PASAPORTE', 'LICENCIA', 'CRED_ESCOLAR', 'CURP'],
      default: 'INE',
    },
  },
  { timestamps: true }
);

// el reglamento pide que el fiador radique en Tepic
fiadorSchema.path('domicilio.ciudad').validate(
  (v) => /tepic/i.test(v),
  'El fiador debe radicar en la ciudad de Tepic'
);

fiadorSchema.index({ 'nombre.paterno': 1, 'nombre.materno': 1, 'nombre.nombres': 1 });

export default model('Fiador', fiadorSchema, 'fiadores');