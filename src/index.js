import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { conectarDB } from './config/db.js';
import typeDefs from './graphql/typeDefs/index.js';
import resolvers from './graphql/resolvers/index.js';
import { vencerApartados } from './graphql/resolvers/comun.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4000;

async function iniciar() {
  await conectarDB();

  const servidor = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true, // para poder usar Apollo Sandbox
    formatError: (err) => {
      // los errores de validación de Mongoose se mandan legibles
      if (err.message.includes('validation failed')) {
        return { ...err, message: err.message.split(': ').slice(2).join(': ') || err.message };
      }
      return err;
    },
  });
  await servidor.start();

  const app = express();
  app.use(cors());

  // endpoint único de GraphQL (POST /graphql). En GET abre Apollo Sandbox
  app.use('/graphql', express.json({ limit: '1mb' }), expressMiddleware(servidor));

  // front end
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.listen(PORT, () => {
    console.log(`Front:   http://localhost:${PORT}`);
    console.log(`GraphQL: http://localhost:${PORT}/graphql`);
  });

  // revisa cada hora los apartados que no pasaron a recoger
  setInterval(() => vencerApartados().catch((e) => console.error('apartados:', e.message)), 60 * 60 * 1000);
}

iniciar();
