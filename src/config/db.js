import mongoose from 'mongoose';

export async function conectarDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('Falta la variable MONGO_URI en el archivo .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, { dbName: process.env.DB_NAME || 'biblios' });
    console.log('Conectado a MongoDB Atlas ->', mongoose.connection.name);
  } catch (err) {
    console.error('No se pudo conectar a MongoDB:', err.message);
    process.exit(1);
  }
}
