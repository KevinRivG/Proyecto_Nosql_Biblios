// Resolvers del catálogo — Rivera González Kevin
import Libro from '../../models/Libro.js';
import Usuario from '../../models/Usuario.js';
import consultas from '../../consultas/catalogo.js';
import { BIBLIOTECA } from '../../utils/reglas.js';
import { errorRegla, validarId, paginar, textoABuscar, ejecutarConsulta } from './comun.js';

const PREFIJO_SALA = { GENERAL: '', INFANTIL: 'I', JUVENIL: 'J', CONSULTA: 'R', NAYARITA: 'N' };

const CATEGORIAS_DEWEY = [
  'Generalidades e Informática', 'Filosofía y Psicología', 'Religión', 'Ciencias Sociales', 'Lenguas',
  'Ciencias Naturales y Matemáticas', 'Tecnología y Ciencias Aplicadas', 'Artes y Recreación', 'Literatura',
  'Historia y Geografía',
];

function categoriaDeDewey(dewey) {
  const clase = Math.floor(parseFloat(dewey) / 100);
  if (Number.isNaN(clase) || clase < 0 || clase > 9) throw errorRegla('El número Dewey debe estar entre 000 y 999');
  return CATEGORIAS_DEWEY[clase];
}

function armarClasificacion(sala, clasificacion) {
  const dewey = clasificacion.dewey.trim();
  const cutter = clasificacion.cutter.trim().toUpperCase();
  if (!/^\d{3}(\.\d+)?$/.test(dewey)) throw errorRegla('El Dewey debe tener 3 dígitos, ej. 863 o 005.73');
  if (!/^[A-Z]\d{1,3}$/.test(cutter)) throw errorRegla('La librística debe ser una letra y números, ej. A54');
  const prefijo = PREFIJO_SALA[sala];
  return {
    clasificacion: { prefijo, dewey, cutter },
    colocacion: [prefijo, dewey, cutter].filter(Boolean).join(' '),
    categoria: categoriaDeDewey(dewey),
  };
}

// siguiente número de inventario de la biblioteca (0165-000123)
async function siguienteInventario() {
  const [ultimo] = await Libro.aggregate([
    { $unwind: '$ejemplares' },
    { $sort: { 'ejemplares.inventario': -1 } },
    { $limit: 1 },
    { $project: { inv: '$ejemplares.inventario' } },
  ]);
  const n = ultimo ? parseInt(ultimo.inv.split('-')[1], 10) : 0;
  return n + 1;
}

const formatoInventario = (n) => `${BIBLIOTECA.numero}-${String(n).padStart(6, '0')}`;

async function buscarLibro(id) {
  validarId(id);
  const libro = await Libro.findById(id);
  if (!libro) throw errorRegla('No existe el libro');
  return libro;
}

export default {
  Query: {
    libros: async (_, { busqueda, sala, categoria, soloDisponibles, pagina, porPagina }) => {
      const filtro = {};
      if (busqueda?.trim()) {
        const rx = textoABuscar(busqueda);
        filtro.$or = [{ titulo: rx }, { autores: rx }, { colocacion: rx }, { isbn: rx }, { materias: rx }];
      }
      if (sala) filtro.sala = sala;
      if (categoria) filtro.categoria = categoria;
      if (soloDisponibles) filtro['ejemplares.situacion'] = 'DISPONIBLE';
      return paginar(Libro, filtro, { pagina, porPagina, orden: { titulo: 1 } });
    },
    libro: (_, { id }) => buscarLibro(id),
    libroPorInventario: (_, { inventario }) => Libro.findOne({ 'ejemplares.inventario': inventario.trim() }).exec(),
    categorias: () => Libro.distinct('categoria').exec(),

    librosMasPrestados: (_, args) => ejecutarConsulta(consultas.librosMasPrestados, args),
    disponibilidadPorSala: () => ejecutarConsulta(consultas.disponibilidadPorSala),
    librosSinMovimiento: (_, args) => ejecutarConsulta(consultas.librosSinMovimiento, args),
    autoresMasLeidos: (_, args) => ejecutarConsulta(consultas.autoresMasLeidos, args),
    rotacionPorCategoria: (_, args) => ejecutarConsulta(consultas.rotacionPorCategoria, args),
    librosConAltaDemanda: (_, args) => ejecutarConsulta(consultas.librosConAltaDemanda, args),
    inventarioMantenimiento: () => ejecutarConsulta(consultas.inventarioMantenimiento),
    busquedaAvanzada: (_, args) => ejecutarConsulta(consultas.busquedaAvanzada, args, { uno: true }),
    antiguedadAcervo: () => ejecutarConsulta(consultas.antiguedadAcervo, {}, { uno: true }),
    preferenciasPorOcupacion: (_, args) => ejecutarConsulta(consultas.preferenciasPorOcupacion, args),
  },

  Mutation: {
    crearLibro: async (_, { input, ejemplares }) => {
      if (ejemplares < 1 || ejemplares > 20) throw errorRegla('Se pueden dar de alta de 1 a 20 ejemplares');
      const datosClasif = armarClasificacion(input.sala, input.clasificacion);
      let n = await siguienteInventario();
      const lista = Array.from({ length: ejemplares }, (_, i) => ({
        inventario: formatoInventario(n++),
        numero: i + 1,
      }));
      return Libro.create({
        ...input,
        ...datosClasif,
        autores: input.autores.map((a) => a.trim()).filter(Boolean),
        materias: input.materias?.length ? input.materias : [datosClasif.categoria],
        ejemplares: lista,
      });
    },

    actualizarLibro: async (_, { id, input }) => {
      const libro = await buscarLibro(id);
      const { clasificacion, ...resto } = input;
      Object.assign(libro, resto);
      if (clasificacion || input.sala) {
        const datos = armarClasificacion(libro.sala, clasificacion || libro.clasificacion);
        libro.clasificacion = datos.clasificacion;
        libro.colocacion = datos.colocacion;
        libro.categoria = datos.categoria;
      }
      if (libro.sala === 'CONSULTA' && libro.ejemplares.some((e) => e.situacion === 'PRESTADO')) {
        throw errorRegla('No se puede pasar a consulta mientras tenga ejemplares prestados');
      }
      return libro.save();
    },

    eliminarLibro: async (_, { id }) => {
      const libro = await buscarLibro(id);
      if (libro.ejemplares.some((e) => ['PRESTADO', 'APARTADO'].includes(e.situacion))) {
        throw errorRegla('El libro tiene ejemplares prestados o apartados');
      }
      if (libro.apartados.some((a) => a.estado === 'EN_ESPERA')) {
        throw errorRegla('Hay usuarios en lista de espera para este libro');
      }
      await libro.deleteOne();
      return true;
    },

    agregarEjemplar: async (_, { libroId, estadoFisico }) => {
      const libro = await buscarLibro(libroId);
      const n = await siguienteInventario();
      const numero = Math.max(0, ...libro.ejemplares.map((e) => e.numero)) + 1;
      libro.ejemplares.push({ inventario: formatoInventario(n), numero, estadoFisico });
      return libro.save();
    },

    actualizarEjemplar: async (_, { libroId, inventario, estadoFisico, situacion }) => {
      const libro = await buscarLibro(libroId);
      const ejemplar = libro.ejemplares.find((e) => e.inventario === inventario);
      if (!ejemplar) throw errorRegla(`El ejemplar ${inventario} no pertenece a este libro`);
      if (estadoFisico) ejemplar.estadoFisico = estadoFisico;
      if (situacion && situacion !== ejemplar.situacion) {
        // prestado y apartado solo cambian con préstamos / devoluciones
        if (['PRESTADO', 'APARTADO'].includes(situacion) || ['PRESTADO', 'APARTADO'].includes(ejemplar.situacion)) {
          throw errorRegla('Ese cambio se hace desde Préstamos (préstamo, devolución o apartado)');
        }
        ejemplar.situacion = situacion; // DISPONIBLE, EXTRAVIADO (repuesto) o BAJA
      }
      return libro.save();
    },

    eliminarEjemplar: async (_, { libroId, inventario }) => {
      const libro = await buscarLibro(libroId);
      const ejemplar = libro.ejemplares.find((e) => e.inventario === inventario);
      if (!ejemplar) throw errorRegla(`El ejemplar ${inventario} no pertenece a este libro`);
      if (['PRESTADO', 'APARTADO'].includes(ejemplar.situacion)) throw errorRegla('No se puede eliminar un ejemplar prestado o apartado');
      if (libro.ejemplares.length === 1) throw errorRegla('Es el único ejemplar; mejor elimina el libro o dale de baja');
      libro.ejemplares.pull(ejemplar._id);
      return libro.save();
    },
  },

  Libro: {
    prestable: (libro) => libro.sala !== 'CONSULTA',
    totalEjemplares: (libro) => libro.ejemplares.length,
    disponibles: (libro) => libro.ejemplares.filter((e) => e.situacion === 'DISPONIBLE').length,
    listaEspera: (libro) => libro.apartados.filter((a) => ['EN_ESPERA', 'DISPONIBLE'].includes(a.estado)).length,
    // los apartados más recientes primero
    apartados: (libro) => [...libro.apartados].sort((a, b) => b.fechaSolicitud - a.fechaSolicitud),
  },

  Apartado: {
    usuario: (a) => Usuario.findById(a.usuario).exec(),
  },
};
