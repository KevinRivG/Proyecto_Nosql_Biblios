// Consultas complejas del catálogo / acervo
// Integrante: Rivera González Kevin
import { porcentaje } from './comun.js';

const unAnioAtras = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d;
};

// 1. Los libros que más se prestan en un periodo y cuántos lectores distintos los pidieron
export const librosMasPrestados = {
  coleccion: 'prestamos',
  descripcion: 'Top de libros más prestados en un periodo, con lectores distintos y ejemplares disponibles',
  pipeline: ({ desde = unAnioAtras(), hasta = new Date(), limite = 10 } = {}) => [
    { $match: { fechaPrestamo: { $gte: new Date(desde), $lte: new Date(hasta) } } },
    {
      $group: {
        _id: '$libro',
        totalPrestamos: { $sum: 1 },
        lectores: { $addToSet: '$usuario' },
        renovaciones: { $sum: { $size: '$renovaciones' } },
      },
    },
    { $sort: { totalPrestamos: -1 } },
    { $limit: limite },
    { $lookup: { from: 'libros', localField: '_id', foreignField: '_id', as: 'libro' } },
    { $unwind: '$libro' },
    {
      $project: {
        _id: 0,
        libroId: { $toString: '$_id' },
        titulo: '$libro.titulo',
        autores: '$libro.autores',
        colocacion: '$libro.colocacion',
        categoria: '$libro.categoria',
        totalPrestamos: 1,
        renovaciones: 1,
        lectoresDistintos: { $size: '$lectores' },
        ejemplares: { $size: '$libro.ejemplares' },
        disponibles: {
          $size: {
            $filter: { input: '$libro.ejemplares', as: 'e', cond: { $eq: ['$$e.situacion', 'DISPONIBLE'] } },
          },
        },
      },
    },
  ],
};

// 2. Estado del acervo por sala y por clase Dewey (cuántos hay, cuántos prestados, % ocupación)
export const disponibilidadPorSala = {
  coleccion: 'libros',
  descripcion: 'Ejemplares disponibles, prestados, apartados y fuera de servicio por sala y categoría',
  pipeline: () => [
    { $unwind: '$ejemplares' },
    {
      $group: {
        _id: { sala: '$sala', categoria: '$categoria' },
        total: { $sum: 1 },
        disponibles: { $sum: { $cond: [{ $eq: ['$ejemplares.situacion', 'DISPONIBLE'] }, 1, 0] } },
        prestados: { $sum: { $cond: [{ $eq: ['$ejemplares.situacion', 'PRESTADO'] }, 1, 0] } },
        apartados: { $sum: { $cond: [{ $eq: ['$ejemplares.situacion', 'APARTADO'] }, 1, 0] } },
        fueraDeServicio: {
          $sum: { $cond: [{ $in: ['$ejemplares.situacion', ['EXTRAVIADO', 'BAJA']] }, 1, 0] },
        },
      },
    },
    { $sort: { '_id.sala': 1, total: -1 } },
    {
      $group: {
        _id: '$_id.sala',
        totalEjemplares: { $sum: '$total' },
        disponibles: { $sum: '$disponibles' },
        prestados: { $sum: '$prestados' },
        apartados: { $sum: '$apartados' },
        fueraDeServicio: { $sum: '$fueraDeServicio' },
        categorias: {
          $push: {
            categoria: '$_id.categoria',
            total: '$total',
            disponibles: '$disponibles',
            prestados: '$prestados',
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        sala: '$_id',
        totalEjemplares: 1,
        disponibles: 1,
        prestados: 1,
        apartados: 1,
        fueraDeServicio: 1,
        porcentajeOcupacion: porcentaje({ $add: ['$prestados', '$apartados'] }, '$totalEjemplares'),
        categorias: 1,
      },
    },
    { $sort: { totalEjemplares: -1 } },
  ],
};

// 3. Libros prestables que nadie ha pedido en X meses (para difusión o descarte)
export const librosSinMovimiento = {
  coleccion: 'libros',
  descripcion: 'Libros que se pueden prestar pero no han salido en los últimos N meses',
  pipeline: ({ meses = 12, sala = null, limite = 50 } = {}) => {
    const corte = new Date();
    corte.setMonth(corte.getMonth() - meses);
    const filtro = { sala: { $ne: 'CONSULTA' } };
    if (sala) filtro.sala = sala;
    return [
      { $match: filtro },
      {
        $lookup: {
          from: 'prestamos',
          let: { id: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$libro', '$$id'] } } },
            { $sort: { fechaPrestamo: -1 } },
            { $limit: 1 },
            { $project: { _id: 0, fechaPrestamo: 1 } },
          ],
          as: 'ultimo',
        },
      },
      { $addFields: { ultimoPrestamo: { $arrayElemAt: ['$ultimo.fechaPrestamo', 0] } } },
      {
        $match: {
          $or: [{ ultimoPrestamo: null }, { ultimoPrestamo: { $exists: false } }, { ultimoPrestamo: { $lt: corte } }],
        },
      },
      { $sort: { ultimoPrestamo: 1, anioPublicacion: 1 } },
      { $limit: limite },
      {
        $project: {
          _id: 0,
          libroId: { $toString: '$_id' },
          titulo: 1,
          autores: 1,
          colocacion: 1,
          sala: 1,
          categoria: 1,
          anioPublicacion: 1,
          ejemplares: { $size: '$ejemplares' },
          ultimoPrestamo: { $ifNull: ['$ultimoPrestamo', null] },
        },
      },
    ];
  },
};

// 4. Autores más leídos: préstamos, lectores distintos y títulos que se prestaron
export const autoresMasLeidos = {
  coleccion: 'prestamos',
  descripcion: 'Autores con más préstamos, lectores distintos y sus títulos más pedidos',
  pipeline: ({ desde = unAnioAtras(), limite = 10 } = {}) => [
    { $match: { fechaPrestamo: { $gte: new Date(desde) } } },
    { $lookup: { from: 'libros', localField: 'libro', foreignField: '_id', as: 'l' } },
    { $unwind: '$l' },
    { $unwind: '$l.autores' },
    {
      $group: {
        _id: '$l.autores',
        prestamos: { $sum: 1 },
        lectores: { $addToSet: '$usuario' },
        titulos: { $addToSet: '$l.titulo' },
      },
    },
    { $sort: { prestamos: -1, _id: 1 } },
    { $limit: limite },
    {
      $project: {
        _id: 0,
        autor: '$_id',
        prestamos: 1,
        lectoresDistintos: { $size: '$lectores' },
        titulosDistintos: { $size: '$titulos' },
        titulos: { $slice: ['$titulos', 5] },
      },
    },
  ],
};

// 5. Índice de rotación por categoría = préstamos / ejemplares
export const rotacionPorCategoria = {
  coleccion: 'libros',
  descripcion: 'Índice de rotación (préstamos por ejemplar) de cada clase Dewey',
  pipeline: ({ desde = unAnioAtras() } = {}) => [
    { $match: { sala: { $ne: 'CONSULTA' } } },
    {
      $group: {
        _id: '$categoria',
        titulos: { $sum: 1 },
        ejemplares: { $sum: { $size: '$ejemplares' } },
        ids: { $push: '$_id' },
      },
    },
    {
      $lookup: {
        from: 'prestamos',
        let: { ids: '$ids' },
        pipeline: [
          { $match: { $expr: { $and: [{ $in: ['$libro', '$$ids'] }, { $gte: ['$fechaPrestamo', new Date(desde)] }] } } },
          { $count: 'n' },
        ],
        as: 'p',
      },
    },
    {
      $project: {
        _id: 0,
        categoria: '$_id',
        titulos: 1,
        ejemplares: 1,
        prestamos: { $ifNull: [{ $arrayElemAt: ['$p.n', 0] }, 0] },
      },
    },
    {
      $addFields: {
        indiceRotacion: {
          $cond: [{ $gt: ['$ejemplares', 0] }, { $round: [{ $divide: ['$prestamos', '$ejemplares'] }, 2] }, 0],
        },
      },
    },
    { $sort: { indiceRotacion: -1 } },
  ],
};

// 6. Libros con más apartados que ejemplares: conviene comprar más
export const librosConAltaDemanda = {
  coleccion: 'libros',
  descripcion: 'Libros con muchos apartados por ejemplar y sugerencia de adquisición',
  pipeline: ({ meses = 12, minApartados = 2 } = {}) => {
    const desde = new Date();
    desde.setMonth(desde.getMonth() - meses);
    const contar = (cond) => ({ $size: { $filter: { input: '$recientes', as: 'a', cond } } });
    return [
      { $match: { 'apartados.0': { $exists: true } } },
      {
        $addFields: {
          recientes: {
            $filter: { input: '$apartados', as: 'a', cond: { $gte: ['$$a.fechaSolicitud', desde] } },
          },
        },
      },
      {
        $addFields: {
          totalApartados: { $size: '$recientes' },
          enEspera: contar({ $eq: ['$$a.estado', 'EN_ESPERA'] }),
          vencidos: contar({ $eq: ['$$a.estado', 'VENCIDO'] }),
        },
      },
      { $match: { totalApartados: { $gte: minApartados } } },
      {
        $lookup: {
          from: 'prestamos',
          let: { id: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$libro', '$$id'] }, { $gte: ['$fechaPrestamo', desde] }] } } },
            { $count: 'n' },
          ],
          as: 'p',
        },
      },
      {
        $project: {
          _id: 0,
          libroId: { $toString: '$_id' },
          titulo: 1,
          colocacion: 1,
          apartados: '$totalApartados',
          enEspera: 1,
          vencidos: 1,
          prestamos: { $ifNull: [{ $arrayElemAt: ['$p.n', 0] }, 0] },
          ejemplaresActivos: {
            $size: {
              $filter: {
                input: '$ejemplares',
                as: 'e',
                cond: { $not: [{ $in: ['$$e.situacion', ['EXTRAVIADO', 'BAJA']] }] },
              },
            },
          },
        },
      },
      {
        $addFields: {
          demandaPorEjemplar: {
            $round: [{ $divide: [{ $add: ['$apartados', '$prestamos'] }, { $max: ['$ejemplaresActivos', 1] }] }, 2],
          },
        },
      },
      {
        $addFields: {
          sugerencia: {
            $switch: {
              branches: [
                { case: { $eq: ['$ejemplaresActivos', 0] }, then: 'Reponer: no hay ejemplares activos' },
                { case: { $gte: ['$demandaPorEjemplar', 8] }, then: 'Adquirir más ejemplares' },
                { case: { $gte: ['$demandaPorEjemplar', 4] }, then: 'Vigilar demanda' },
              ],
              default: 'Suficiente',
            },
          },
        },
      },
      { $sort: { demandaPorEjemplar: -1 } },
    ];
  },
};

// 7. Ejemplares dañados, en estado regular o extraviados por sala,
//    con el lector responsable cuando fue extravío
export const inventarioMantenimiento = {
  coleccion: 'libros',
  descripcion: 'Ejemplares que requieren reparación o reposición, con responsable del extravío',
  pipeline: () => [
    { $unwind: '$ejemplares' },
    {
      $match: {
        $or: [{ 'ejemplares.estadoFisico': { $in: ['REGULAR', 'DANADO'] } }, { 'ejemplares.situacion': 'EXTRAVIADO' }],
      },
    },
    {
      $lookup: {
        from: 'prestamos',
        let: { inv: '$ejemplares.inventario' },
        pipeline: [
          { $match: { $expr: { $and: [{ $eq: ['$inventario', '$$inv'] }, { $eq: ['$estado', 'EXTRAVIADO'] }] } } },
          { $lookup: { from: 'usuarios', localField: 'usuario', foreignField: '_id', as: 'u' } },
          { $unwind: '$u' },
          { $project: { _id: 0, lector: { $concat: ['$u.nombre.paterno', ' ', '$u.nombre.materno', ', ', '$u.nombre.nombres'] } } },
        ],
        as: 'resp',
      },
    },
    {
      $group: {
        _id: '$sala',
        danados: { $sum: { $cond: [{ $eq: ['$ejemplares.estadoFisico', 'DANADO'] }, 1, 0] } },
        regulares: { $sum: { $cond: [{ $eq: ['$ejemplares.estadoFisico', 'REGULAR'] }, 1, 0] } },
        extraviados: { $sum: { $cond: [{ $eq: ['$ejemplares.situacion', 'EXTRAVIADO'] }, 1, 0] } },
        ejemplares: {
          $push: {
            inventario: '$ejemplares.inventario',
            titulo: '$titulo',
            colocacion: '$colocacion',
            estadoFisico: '$ejemplares.estadoFisico',
            situacion: '$ejemplares.situacion',
            responsable: { $ifNull: [{ $arrayElemAt: ['$resp.lector', 0] }, null] },
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        sala: '$_id',
        danados: 1,
        regulares: 1,
        extraviados: 1,
        totalAtender: { $add: ['$danados', '$regulares', '$extraviados'] },
        ejemplares: { $slice: ['$ejemplares', 25] },
      },
    },
    { $sort: { totalAtender: -1 } },
  ],
};

// 8. Búsqueda avanzada con resultados + filtros calculados (facetas)
export const busquedaAvanzada = {
  coleccion: 'libros',
  descripcion: 'Búsqueda por texto con conteos por sala, categoría y década en una sola consulta',
  pipeline: ({ texto = '', sala = null, categoria = null, soloDisponibles = false, pagina = 1, limite = 10 } = {}) => {
    const filtro = {};
    if (texto) {
      const rx = { $regex: texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
      filtro.$or = [{ titulo: rx }, { autores: rx }, { colocacion: rx }, { materias: rx }];
    }
    if (sala) filtro.sala = sala;
    if (categoria) filtro.categoria = categoria;

    const etapas = [
      { $match: filtro },
      {
        $addFields: {
          disponibles: {
            $size: { $filter: { input: '$ejemplares', as: 'e', cond: { $eq: ['$$e.situacion', 'DISPONIBLE'] } } },
          },
          decada: { $multiply: [{ $floor: { $divide: ['$anioPublicacion', 10] } }, 10] },
        },
      },
    ];
    if (soloDisponibles) etapas.push({ $match: { disponibles: { $gt: 0 } } });

    etapas.push(
      {
        $facet: {
          resultados: [
            { $sort: { titulo: 1 } },
            { $skip: (pagina - 1) * limite },
            { $limit: limite },
            {
              $project: {
                _id: 0,
                libroId: { $toString: '$_id' },
                titulo: 1,
                autores: 1,
                colocacion: 1,
                sala: 1,
                categoria: 1,
                disponibles: 1,
                ejemplares: { $size: '$ejemplares' },
              },
            },
          ],
          total: [{ $count: 'n' }],
          porSala: [{ $group: { _id: '$sala', total: { $sum: 1 } } }, { $sort: { total: -1 } }],
          porCategoria: [{ $group: { _id: '$categoria', total: { $sum: 1 } } }, { $sort: { total: -1 } }],
          porDecada: [{ $group: { _id: '$decada', total: { $sum: 1 } } }, { $sort: { _id: -1 } }],
        },
      },
      {
        $project: {
          resultados: 1,
          total: { $ifNull: [{ $arrayElemAt: ['$total.n', 0] }, 0] },
          porSala: { $map: { input: '$porSala', as: 'x', in: { clave: '$$x._id', total: '$$x.total' } } },
          porCategoria: { $map: { input: '$porCategoria', as: 'x', in: { clave: '$$x._id', total: '$$x.total' } } },
          porDecada: {
            $map: { input: '$porDecada', as: 'x', in: { clave: { $concat: [{ $toString: '$$x._id' }, 's'] }, total: '$$x.total' } },
          },
        },
      }
    );
    return etapas;
  },
};

// 9. Antigüedad del acervo: rangos de años de publicación y años promedio por sala
export const antiguedadAcervo = {
  coleccion: 'libros',
  descripcion: 'Distribución del acervo por año de publicación y antigüedad promedio por sala',
  pipeline: () => [
    { $match: { anioPublicacion: { $type: 'number' } } },
    {
      $facet: {
        rangos: [
          {
            $bucket: {
              groupBy: '$anioPublicacion',
              boundaries: [1500, 1950, 1970, 1990, 2000, 2010, 2020, 2100],
              default: 'otro',
              output: {
                titulos: { $sum: 1 },
                ejemplares: { $sum: { $size: '$ejemplares' } },
                promedioPaginas: { $avg: '$paginas' },
              },
            },
          },
        ],
        porSala: [
          {
            $group: {
              _id: '$sala',
              anioPromedio: { $avg: '$anioPublicacion' },
              masAntiguo: { $min: '$anioPublicacion' },
              masReciente: { $max: '$anioPublicacion' },
            },
          },
          { $sort: { anioPromedio: 1 } },
        ],
      },
    },
    {
      $project: {
        rangos: {
          $map: {
            input: '$rangos',
            as: 'r',
            in: {
              desde: '$$r._id',
              titulos: '$$r.titulos',
              ejemplares: '$$r.ejemplares',
              promedioPaginas: { $round: ['$$r.promedioPaginas', 0] },
            },
          },
        },
        porSala: {
          $map: {
            input: '$porSala',
            as: 's',
            in: {
              sala: '$$s._id',
              anioPromedio: { $round: ['$$s.anioPromedio', 0] },
              masAntiguo: '$$s.masAntiguo',
              masReciente: '$$s.masReciente',
              antiguedadPromedio: { $round: [{ $subtract: [new Date().getFullYear(), '$$s.anioPromedio'] }, 0] },
            },
          },
        },
      },
    },
  ],
};

// 10. Qué categorías prefiere cada tipo de lector (estudiante, docente, hogar...)
export const preferenciasPorOcupacion = {
  coleccion: 'prestamos',
  descripcion: 'Top de categorías que lee cada ocupación de usuario',
  pipeline: ({ top = 3, desde = unAnioAtras() } = {}) => [
    { $match: { fechaPrestamo: { $gte: new Date(desde) } } },
    { $lookup: { from: 'usuarios', localField: 'usuario', foreignField: '_id', as: 'u' } },
    { $lookup: { from: 'libros', localField: 'libro', foreignField: '_id', as: 'l' } },
    { $unwind: '$u' },
    { $unwind: '$l' },
    { $group: { _id: { ocupacion: '$u.ocupacion', categoria: '$l.categoria' }, total: { $sum: 1 } } },
    { $sort: { total: -1 } },
    {
      $group: {
        _id: '$_id.ocupacion',
        totalPrestamos: { $sum: '$total' },
        categorias: { $push: { clave: '$_id.categoria', total: '$total' } },
      },
    },
    {
      $project: {
        _id: 0,
        ocupacion: '$_id',
        totalPrestamos: 1,
        categorias: { $slice: ['$categorias', top] },
      },
    },
    { $sort: { totalPrestamos: -1 } },
  ],
};

export default {
  librosMasPrestados,
  disponibilidadPorSala,
  librosSinMovimiento,
  autoresMasLeidos,
  rotacionPorCategoria,
  librosConAltaDemanda,
  inventarioMantenimiento,
  busquedaAvanzada,
  antiguedadAcervo,
  preferenciasPorOcupacion,
};
