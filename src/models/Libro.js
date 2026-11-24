import { Schema, model } from 'mongoose';

// Cada ejemplar físico va embebido dentro de su libro, porque siempre
// se consultan juntos (catálogo + disponibilidad).
const ejemplarSchema = new Schema({
  inventario: { type: String, required: true }, // ej. 0165-004512
  numero: { type: Number, required: true },      // EJ. 1, EJ. 2...
  estadoFisico: {
    type: String,
    enum: ['BUENO', 'REGULAR', 'DANADO'],
    default: 'BUENO',
  },
  situacion: {
    type: String,
    enum: ['DISPONIBLE', 'PRESTADO', 'APARTADO', 'EXTRAVIADO', 'BAJA'],
    default: 'DISPONIBLE',
  },
  fechaAlta: { type: Date, default: Date.now },
});

// Si el libro que quiere el usuario está prestado, lo puede apartar.
// La lista de espera vive dentro del libro porque siempre se consulta
// junto con sus ejemplares.
const apartadoSchema = new Schema({
  usuario: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
  fechaSolicitud: { type: Date, required: true },
  fechaDisponible: { type: Date, default: null }, // cuando regresó el libro
  fechaLimiteRecoger: { type: Date, default: null },
  inventarioAsignado: { type: String, default: null },
  estado: {
    type: String,
    enum: ['EN_ESPERA', 'DISPONIBLE', 'RECOGIDO', 'CANCELADO', 'VENCIDO'],
    default: 'EN_ESPERA',
  },
});

const libroSchema = new Schema(
  {
    titulo: { type: String, required: true, trim: true },
    autores: { type: [String], default: [] },
    editorial: { type: String, default: '' },
    anioPublicacion: { type: Number, min: 1500, max: 2100 },
    isbn: { type: String, default: '' },
    paginas: { type: Number, min: 1 },
    idioma: { type: String, default: 'Español' },

    // sala donde está: la de consulta no sale a domicilio
    sala: {
      type: String,
      enum: ['GENERAL', 'INFANTIL', 'JUVENIL', 'CONSULTA', 'NAYARITA'],
      default: 'GENERAL',
    },
    // clasificación Dewey + librística (como "I 780 A54")
    clasificacion: {
      prefijo: { type: String, default: '' }, // I = infantil, R = consulta...
      dewey: { type: String, required: true },
      cutter: { type: String, required: true },
    },
    colocacion: { type: String, required: true },
    categoria: { type: String, required: true }, // clase principal Dewey
    materias: { type: [String], default: [] },

    ejemplares: { type: [ejemplarSchema], default: [] },
    apartados: { type: [apartadoSchema], default: [] },
  },
  { timestamps: true }
);

libroSchema.index({ titulo: 'text', autores: 'text', materias: 'text' }, { default_language: 'spanish' });
libroSchema.index({ colocacion: 1 });
libroSchema.index({ categoria: 1, sala: 1 });
libroSchema.index({ 'ejemplares.inventario': 1 }, { unique: true, sparse: true });
libroSchema.index({ 'apartados.usuario': 1, 'apartados.estado': 1 });

libroSchema.virtual('prestable').get(function () {
  return this.sala !== 'CONSULTA';
});

export default model('Libro', libroSchema, 'libros');
