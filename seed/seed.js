// Carga los datos de prueba en MongoDB Atlas
// Uso: npm run seed
import 'dotenv/config';
import mongoose from 'mongoose';
import { conectarDB } from '../src/config/db.js';
import Fiador from '../src/models/Fiador.js';
import Usuario from '../src/models/Usuario.js';
import Libro from '../src/models/Libro.js';
import Prestamo from '../src/models/Prestamo.js';
import { generarDatos } from './generar.js';

async function main() {
  await conectarDB();

  console.log('Generando datos...');
  const { fiadores, usuarios, libros, prestamos } = generarDatos({ ahora: new Date() });

  console.log('Borrando colecciones anteriores...');
  await Promise.all([Fiador.deleteMany({}), Usuario.deleteMany({}), Libro.deleteMany({}), Prestamo.deleteMany({})]);

  // insertMany valida cada documento contra el esquema de Mongoose
  console.log('Insertando...');
  await Fiador.insertMany(fiadores, { timestamps: false });
  await Usuario.insertMany(usuarios, { timestamps: false });
  await Libro.insertMany(libros, { timestamps: false });
  await Prestamo.insertMany(prestamos, { timestamps: false });

  await Promise.all([Fiador.syncIndexes(), Usuario.syncIndexes(), Libro.syncIndexes(), Prestamo.syncIndexes()]);

  const conteos = {
    fiadores: await Fiador.countDocuments(),
    usuarios: await Usuario.countDocuments(),
    libros: await Libro.countDocuments(),
    prestamos: await Prestamo.countDocuments(),
  };
  console.table(conteos);

  const activos = await Prestamo.countDocuments({ estado: 'ACTIVO' });
  const vencidos = await Prestamo.countDocuments({ estado: 'ACTIVO', fechaVencimiento: { $lt: new Date() } });
  console.log(`Préstamos activos: ${activos} (vencidos: ${vencidos})`);

  await mongoose.disconnect();
  console.log('Listo :)');
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
