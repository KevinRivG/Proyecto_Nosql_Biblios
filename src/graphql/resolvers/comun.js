import mongoose from 'mongoose';
import { GraphQLError, GraphQLScalarType, Kind } from 'graphql';
import Usuario from '../../models/Usuario.js';
import Libro from '../../models/Libro.js';
import Prestamo from '../../models/Prestamo.js';
import { BIBLIOTECA, REGLAS, sumarDias } from '../../utils/reglas.js';

export const Fecha = new GraphQLScalarType({
  name: 'Fecha',
  description: 'Fecha en formato ISO 8601',
  serialize(valor) {
    const d = valor instanceof Date ? valor : new Date(valor);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  },
  parseValue(valor) {
    const d = new Date(valor);
    if (Number.isNaN(d.getTime())) throw new GraphQLError('Fecha inválida');
    return d;
  },
  parseLiteral(ast) {
    if (ast.kind !== Kind.STRING) throw new GraphQLError('La fecha debe ser texto, ej. "2026-11-21"');
    const d = new Date(ast.value);
    if (Number.isNaN(d.getTime())) throw new GraphQLError('Fecha inválida');
    return d;
  },
});

// error de regla de negocio que se muestra tal cual en el front
export function errorRegla(mensaje) {
  return new GraphQLError(mensaje, { extensions: { code: 'BAD_USER_INPUT' } });
}

export function validarId(id) {
  if (!mongoose.isValidObjectId(id)) throw errorRegla('El id no es válido');
  return id;
}

export async function paginar(Modelo, filtro, { pagina = 1, porPagina = 10, orden = { createdAt: -1 } }) {
  porPagina = Math.min(Math.max(porPagina, 1), 100);
  pagina = Math.max(pagina, 1);
  const [total, items] = await Promise.all([
    Modelo.countDocuments(filtro),
    Modelo.find(filtro).sort(orden).skip((pagina - 1) * porPagina).limit(porPagina),
  ]);
  return { total, pagina, paginas: Math.max(1, Math.ceil(total / porPagina)), items };
}

export function textoABuscar(texto) {
  return new RegExp(texto.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

// "004821" o "4821" -> usuario
export async function usuarioPorCredencial(credencial, { obligatorio = true } = {}) {
  const num = parseInt(String(credencial).replace(/\D/g, ''), 10);
  const usuario = Number.isNaN(num) ? null : await Usuario.findOne({ numRegistro: num });
  if (!usuario && obligatorio) throw errorRegla(`No existe la credencial ${credencial}`);
  return usuario;
}

// corre una de las consultas complejas directo con el driver
export async function ejecutarConsulta(consulta, args = {}, { uno = false } = {}) {
  const limpios = Object.fromEntries(Object.entries(args).filter(([, v]) => v !== undefined && v !== null));
  const cursor = mongoose.connection.db.collection(consulta.coleccion).aggregate(consulta.pipeline(limpios));
  const filas = await cursor.toArray();
  return uno ? filas[0] || null : filas;
}

// Revisa si el usuario puede llevarse libros hoy (reglamento)
export async function validarUsuarioParaServicio(usuario) {
  const hoy = new Date();
  if (usuario.estado === 'CANCELADA') {
    throw errorRegla(`La credencial ${String(usuario.numRegistro).padStart(6, '0')} está cancelada: ${usuario.motivoEstado || 'sin motivo registrado'}`);
  }
  if (usuario.estado === 'SUSPENDIDA') {
    if (usuario.suspendidoHasta && usuario.suspendidoHasta <= hoy) {
      usuario.estado = 'ACTIVA';
      usuario.suspendidoHasta = null;
      usuario.motivoEstado = '';
      await usuario.save();
    } else {
      const hasta = usuario.suspendidoHasta ? usuario.suspendidoHasta.toLocaleDateString('es-MX') : 'nuevo aviso';
      throw errorRegla(`El servicio está suspendido hasta el ${hasta} (tres retrasos en un año)`);
    }
  }
  if (usuario.fechaVencimiento < hoy) {
    throw errorRegla(`La credencial venció el ${usuario.fechaVencimiento.toLocaleDateString('es-MX')}. Hay que renovarla primero.`);
  }
}

// Cuando un ejemplar se libera: si hay alguien en la lista de espera
// se le aparta, si no, queda disponible.
export function liberarEjemplar(libro, inventario) {
  const ejemplar = libro.ejemplares.find((e) => e.inventario === inventario);
  if (!ejemplar) return null;
  const siguiente = libro.apartados
    .filter((a) => a.estado === 'EN_ESPERA')
    .sort((a, b) => a.fechaSolicitud - b.fechaSolicitud)[0];

  if (siguiente && ejemplar.estadoFisico !== 'DANADO') {
    const ahora = new Date();
    ejemplar.situacion = 'APARTADO';
    siguiente.estado = 'DISPONIBLE';
    siguiente.fechaDisponible = ahora;
    siguiente.fechaLimiteRecoger = sumarDias(ahora, REGLAS.DIAS_PARA_RECOGER_APARTADO);
    siguiente.inventarioAsignado = inventario;
    return siguiente;
  }
  ejemplar.situacion = 'DISPONIBLE';
  return null;
}

// Apartados que nadie pasó a recoger a tiempo
export async function vencerApartados() {
  const ahora = new Date();
  const libros = await Libro.find({
    apartados: { $elemMatch: { estado: 'DISPONIBLE', fechaLimiteRecoger: { $lt: ahora } } },
  });
  for (const libro of libros) {
    for (const a of libro.apartados) {
      if (a.estado === 'DISPONIBLE' && a.fechaLimiteRecoger < ahora) {
        a.estado = 'VENCIDO';
        if (a.inventarioAsignado) liberarEjemplar(libro, a.inventarioAsignado);
      }
    }
    await libro.save();
  }
  return libros.length;
}

export async function resumen() {
  const ahora = new Date();
  const [usuariosActivos, titulos, ejemplares, prestamosActivos, prestamosVencidos] = await Promise.all([
    Usuario.countDocuments({ estado: 'ACTIVA', fechaVencimiento: { $gte: ahora } }),
    Libro.countDocuments(),
    Libro.aggregate([{ $group: { _id: null, n: { $sum: { $size: '$ejemplares' } } } }]),
    Prestamo.countDocuments({ estado: 'ACTIVO' }),
    Prestamo.countDocuments({ estado: 'ACTIVO', fechaVencimiento: { $lt: ahora } }),
  ]);
  return {
    biblioteca: BIBLIOTECA.nombre,
    numeroBiblioteca: BIBLIOTECA.numero,
    usuariosActivos,
    titulos,
    ejemplares: ejemplares[0]?.n || 0,
    prestamosActivos,
    prestamosVencidos,
  };
}
