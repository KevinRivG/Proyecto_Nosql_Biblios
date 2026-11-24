// Consultas complejas de préstamos, devoluciones y apartados
// Integrante: Zepeda Castañeda María Fernanda
import { TZ, MESES, exprNombre, exprCredencial, exprDias, porcentaje } from './comun.js';

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// lookup de usuario + fiador que se repite en varias consultas
const conLectorYFiador = [
  { $lookup: { from: 'usuarios', localField: 'usuario', foreignField: '_id', as: 'u' } },
  { $unwind: '$u' },
  { $lookup: { from: 'fiadores', localField: 'u.fiador', foreignField: '_id', as: 'f' } },
  { $unwind: { path: '$f', preserveNullAndEmptyArrays: true } },
];

const telefono = (campo) => ({
  $cond: [{ $ne: [`$${campo}.telefonos.movil`, ''] }, `$${campo}.telefonos.movil`, `$${campo}.telefonos.fijo`],
});

// 1. Préstamos vencidos al día de hoy, ordenados por días de retraso
export const prestamosVencidos = {
  coleccion: 'prestamos',
  descripcion: 'Préstamos activos ya vencidos con días de retraso, recordatorios y contacto de lector y fiador',
  pipeline: () => {
    const hoy = new Date();
    const inicioHoy = new Date(new Date().setHours(0, 0, 0, 0));
    return [
      { $match: { estado: 'ACTIVO', fechaVencimiento: { $lt: inicioHoy } } },
      ...conLectorYFiador,
      {
        $project: {
          _id: 0,
          folio: 1,
          titulo: 1,
          colocacion: 1,
          fechaPrestamo: 1,
          fechaVencimiento: 1,
          diasRetraso: exprDias('$fechaVencimiento', hoy),
          recordatorios: { $size: '$recordatorios' },
          credencial: exprCredencial('u.numRegistro'),
          lector: exprNombre('u.nombre'),
          telefonoLector: telefono('u'),
          fiador: exprNombre('f.nombre'),
          telefonoFiador: telefono('f'),
        },
      },
      { $sort: { diasRetraso: -1 } },
    ];
  },
};

// 2. Agenda de devoluciones de los próximos días (como el archivo con números por día)
export const agendaDevoluciones = {
  coleccion: 'prestamos',
  descripcion: 'Préstamos activos agrupados por la fecha en que se deben devolver (próximos N días)',
  pipeline: ({ dias = 7 } = {}) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const hasta = new Date(hoy.getTime() + (dias + 1) * 86400000);
    return [
      { $match: { estado: 'ACTIVO', fechaVencimiento: { $gte: hoy, $lt: hasta } } },
      { $lookup: { from: 'usuarios', localField: 'usuario', foreignField: '_id', as: 'u' } },
      { $unwind: '$u' },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$fechaVencimiento', timezone: TZ } },
          dia: { $first: { $dayOfWeek: { date: '$fechaVencimiento', timezone: TZ } } },
          total: { $sum: 1 },
          prestamos: {
            $push: {
              folio: '$folio',
              titulo: '$titulo',
              colocacion: '$colocacion',
              credencial: exprCredencial('u.numRegistro'),
              lector: exprNombre('u.nombre'),
            },
          },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          fecha: '$_id',
          diaSemana: { $arrayElemAt: [DIAS_SEMANA, { $subtract: ['$dia', 1] }] },
          total: 1,
          prestamos: 1,
        },
      },
    ];
  },
};

// 3. Puntualidad de devoluciones mes por mes
export const puntualidadMensual = {
  coleccion: 'prestamos',
  descripcion: 'Por mes: devoluciones a tiempo, con retraso, % de puntualidad y promedio de días de retraso',
  pipeline: ({ anio = new Date().getFullYear() } = {}) => [
    { $match: { estado: 'DEVUELTO', fechaPrestamo: { $gte: new Date(anio, 0, 1), $lt: new Date(anio + 1, 0, 1) } } },
    {
      $group: {
        _id: { $month: { date: '$fechaPrestamo', timezone: TZ } },
        devueltos: { $sum: 1 },
        aTiempo: { $sum: { $cond: [{ $eq: ['$diasRetraso', 0] }, 1, 0] } },
        conRetraso: { $sum: { $cond: [{ $gt: ['$diasRetraso', 0] }, 1, 0] } },
        sumaRetraso: { $sum: '$diasRetraso' },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        mes: '$_id',
        nombreMes: { $arrayElemAt: [MESES, { $subtract: ['$_id', 1] }] },
        devueltos: 1,
        aTiempo: 1,
        conRetraso: 1,
        porcentajePuntualidad: porcentaje('$aTiempo', '$devueltos'),
        promedioDiasRetraso: {
          $cond: [{ $gt: ['$conRetraso', 0] }, { $round: [{ $divide: ['$sumaRetraso', '$conRetraso'] }, 1] }, 0],
        },
      },
    },
  ],
};

// 4. Cuánto tiempo se quedan los libros por categoría y cuántos se renuevan
export const duracionPorCategoria = {
  coleccion: 'prestamos',
  descripcion: 'Días reales que dura un préstamo por categoría, retraso promedio y % de renovación',
  pipeline: () => [
    { $match: { estado: 'DEVUELTO' } },
    { $addFields: { diasPrestado: exprDias('$fechaPrestamo', '$fechaDevolucion') } },
    { $lookup: { from: 'libros', localField: 'libro', foreignField: '_id', as: 'l' } },
    { $unwind: '$l' },
    {
      $group: {
        _id: '$l.categoria',
        prestamos: { $sum: 1 },
        promedioDias: { $avg: '$diasPrestado' },
        maximoDias: { $max: '$diasPrestado' },
        promedioRetraso: { $avg: '$diasRetraso' },
        renovados: { $sum: { $cond: [{ $gt: [{ $size: '$renovaciones' }, 0] }, 1, 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        categoria: '$_id',
        prestamos: 1,
        promedioDiasPrestado: { $round: ['$promedioDias', 1] },
        maximoDias: 1,
        promedioDiasRetraso: { $round: ['$promedioRetraso', 2] },
        porcentajeRenovados: porcentaje('$renovados', '$prestamos'),
      },
    },
    { $sort: { promedioDiasPrestado: -1 } },
  ],
};

// 5. Carga de trabajo del mostrador: por día de la semana, por hora y por mes
export const cargaMostrador = {
  coleccion: 'prestamos',
  descripcion: 'Cantidad de préstamos por día de la semana, hora del día y mes (para organizar turnos)',
  pipeline: ({ desde, hasta = new Date() } = {}) => {
    const inicio = desde ? new Date(desde) : new Date(new Date().setFullYear(new Date().getFullYear() - 1));
    return [
      { $match: { fechaPrestamo: { $gte: inicio, $lte: new Date(hasta) } } },
      {
        $facet: {
          porDiaSemana: [
            { $group: { _id: { $dayOfWeek: { date: '$fechaPrestamo', timezone: TZ } }, total: { $sum: 1 } } },
            { $sort: { _id: 1 } },
          ],
          porHora: [
            { $group: { _id: { $hour: { date: '$fechaPrestamo', timezone: TZ } }, total: { $sum: 1 } } },
            { $sort: { _id: 1 } },
          ],
          porMes: [
            { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$fechaPrestamo', timezone: TZ } }, total: { $sum: 1 } } },
            { $sort: { _id: 1 } },
          ],
        },
      },
      {
        $project: {
          porDiaSemana: {
            $map: {
              input: '$porDiaSemana',
              as: 'x',
              in: { clave: { $arrayElemAt: [DIAS_SEMANA, { $subtract: ['$$x._id', 1] }] }, total: '$$x.total' },
            },
          },
          porHora: {
            $map: { input: '$porHora', as: 'x', in: { clave: { $concat: [{ $toString: '$$x._id' }, ':00'] }, total: '$$x.total' } },
          },
          porMes: { $map: { input: '$porMes', as: 'x', in: { clave: '$$x._id', total: '$$x.total' } } },
        },
      },
    ];
  },
};

// 6. Libros que más se renuevan y usuarios que más renuevan
export const renovacionesFrecuentes = {
  coleccion: 'prestamos',
  descripcion: 'Ranking de libros más renovados y de usuarios que más renuevan',
  pipeline: ({ limite = 10 } = {}) => [
    { $match: { 'renovaciones.0': { $exists: true } } },
    { $addFields: { nRenov: { $size: '$renovaciones' } } },
    {
      $facet: {
        libros: [
          { $group: { _id: '$libro', titulo: { $first: '$titulo' }, colocacion: { $first: '$colocacion' }, total: { $sum: '$nRenov' } } },
          { $sort: { total: -1 } },
          { $limit: limite },
          { $project: { _id: 0, id: { $toString: '$_id' }, nombre: '$titulo', detalle: '$colocacion', total: 1 } },
        ],
        usuarios: [
          { $group: { _id: '$usuario', total: { $sum: '$nRenov' }, prestamos: { $sum: 1 } } },
          { $sort: { total: -1 } },
          { $limit: limite },
          { $lookup: { from: 'usuarios', localField: '_id', foreignField: '_id', as: 'u' } },
          { $unwind: '$u' },
          {
            $project: {
              _id: 0,
              id: { $toString: '$_id' },
              nombre: exprNombre('u.nombre'),
              detalle: { $concat: ['Credencial ', exprCredencial('u.numRegistro'), ' · ', { $toString: '$prestamos' }, ' préstamos'] },
              total: 1,
            },
          },
        ],
        totales: [{ $group: { _id: null, prestamos: { $sum: 1 }, renovaciones: { $sum: '$nRenov' } } }],
      },
    },
    {
      $project: {
        libros: 1,
        usuarios: 1,
        prestamosRenovados: { $ifNull: [{ $arrayElemAt: ['$totales.prestamos', 0] }, 0] },
        totalRenovaciones: { $ifNull: [{ $arrayElemAt: ['$totales.renovaciones', 0] }, 0] },
      },
    },
  ],
};

// 7. Usuarios con préstamos vencidos y 2 o más recordatorios sin respuesta:
//    según el reglamento se cancela el servicio y responde el fiador
export const candidatosCancelacion = {
  coleccion: 'prestamos',
  descripcion: 'Usuarios con libros vencidos y 2+ recordatorios, candidatos a cancelación, con su fiador',
  pipeline: ({ minRecordatorios = 2 } = {}) => {
    const hoy = new Date();
    const inicioHoy = new Date(new Date().setHours(0, 0, 0, 0));
    return [
      {
        $match: {
          estado: 'ACTIVO',
          fechaVencimiento: { $lt: inicioHoy },
          [`recordatorios.${minRecordatorios - 1}`]: { $exists: true },
        },
      },
      ...conLectorYFiador,
      {
        $group: {
          _id: '$usuario',
          credencial: { $first: exprCredencial('u.numRegistro') },
          lector: { $first: exprNombre('u.nombre') },
          estadoCredencial: { $first: '$u.estado' },
          fiadorNombre: { $first: exprNombre('f.nombre') },
          fiadorTelefono: { $first: telefono('f') },
          fiadorTrabajo: { $first: '$f.trabajo.nombre' },
          libros: {
            $push: {
              folio: '$folio',
              titulo: '$titulo',
              diasRetraso: exprDias('$fechaVencimiento', hoy),
              recordatorios: { $size: '$recordatorios' },
            },
          },
          maxRetraso: { $max: exprDias('$fechaVencimiento', hoy) },
        },
      },
      { $sort: { maxRetraso: -1 } },
      {
        $project: {
          _id: 0,
          usuarioId: { $toString: '$_id' },
          credencial: 1,
          lector: 1,
          estadoCredencial: 1,
          maxRetraso: 1,
          libros: 1,
          fiadorNombre: 1,
          fiadorTelefono: 1,
          fiadorTrabajo: 1,
        },
      },
    ];
  },
};

// 8. Cómo funcionan los apartados: estados, días de espera y % que sí se recogen
export const estadisticaApartados = {
  coleccion: 'libros',
  descripcion: 'Apartados por estado, días promedio de espera, % recogidos y libros más apartados',
  pipeline: ({ desde } = {}) => {
    const inicio = desde ? new Date(desde) : new Date(new Date().setFullYear(new Date().getFullYear() - 1));
    return [
      { $match: { 'apartados.0': { $exists: true } } },
      { $unwind: '$apartados' },
      { $match: { 'apartados.fechaSolicitud': { $gte: inicio } } },
      { $project: { titulo: 1, a: '$apartados' } },
      {
        $facet: {
          porEstado: [{ $group: { _id: '$a.estado', total: { $sum: 1 } } }, { $sort: { total: -1 } }],
          espera: [
            { $match: { 'a.fechaDisponible': { $ne: null } } },
            { $project: { dias: exprDias('$a.fechaSolicitud', '$a.fechaDisponible') } },
            { $group: { _id: null, promedio: { $avg: '$dias' }, maximo: { $max: '$dias' } } },
          ],
          cierre: [
            { $match: { 'a.estado': { $in: ['RECOGIDO', 'VENCIDO'] } } },
            { $group: { _id: null, recogidos: { $sum: { $cond: [{ $eq: ['$a.estado', 'RECOGIDO'] }, 1, 0] } }, total: { $sum: 1 } } },
          ],
          masApartados: [
            { $group: { _id: '$_id', titulo: { $first: '$titulo' }, total: { $sum: 1 } } },
            { $sort: { total: -1, titulo: 1 } },
            { $limit: 5 },
            { $project: { _id: 0, clave: '$titulo', total: 1 } },
          ],
          total: [{ $count: 'n' }],
        },
      },
      {
        $project: {
          totalApartados: { $ifNull: [{ $arrayElemAt: ['$total.n', 0] }, 0] },
          porEstado: { $map: { input: '$porEstado', as: 'x', in: { clave: '$$x._id', total: '$$x.total' } } },
          promedioDiasEspera: { $round: [{ $ifNull: [{ $arrayElemAt: ['$espera.promedio', 0] }, 0] }, 1] },
          maximoDiasEspera: { $ifNull: [{ $arrayElemAt: ['$espera.maximo', 0] }, 0] },
          porcentajeRecogidos: porcentaje(
            { $ifNull: [{ $arrayElemAt: ['$cierre.recogidos', 0] }, 0] },
            { $ifNull: [{ $arrayElemAt: ['$cierre.total', 0] }, 0] }
          ),
          librosMasApartados: '$masApartados',
        },
      },
    ];
  },
};

// 9. Libros que regresaron en peor estado del que salieron (deterioro por sala)
export const deterioroEnDevoluciones = {
  coleccion: 'prestamos',
  descripcion: 'Devoluciones donde el libro regresó en peor estado, por sala, con el lector responsable',
  pipeline: () => {
    const nivel = (campo) => ({
      $switch: {
        branches: [
          { case: { $eq: [campo, 'BUENO'] }, then: 0 },
          { case: { $eq: [campo, 'REGULAR'] }, then: 1 },
          { case: { $eq: [campo, 'DANADO'] }, then: 2 },
        ],
        default: 0,
      },
    });
    return [
      { $match: { estado: 'DEVUELTO', condicionDevolucion: { $ne: null } } },
      { $addFields: { empeoro: { $gt: [nivel('$condicionDevolucion'), nivel('$condicionEntrega')] } } },
      { $lookup: { from: 'libros', localField: 'libro', foreignField: '_id', as: 'l' } },
      { $unwind: '$l' },
      { $lookup: { from: 'usuarios', localField: 'usuario', foreignField: '_id', as: 'u' } },
      { $unwind: '$u' },
      { $sort: { fechaDevolucion: -1 } },
      {
        $group: {
          _id: '$l.sala',
          devoluciones: { $sum: 1 },
          conDeterioro: { $sum: { $cond: ['$empeoro', 1, 0] } },
          casos: {
            $push: {
              $cond: [
                '$empeoro',
                {
                  folio: '$folio',
                  titulo: '$titulo',
                  lector: exprNombre('u.nombre'),
                  entrega: '$condicionEntrega',
                  devolucion: '$condicionDevolucion',
                  fecha: '$fechaDevolucion',
                },
                null,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          sala: '$_id',
          devoluciones: 1,
          conDeterioro: 1,
          porcentaje: porcentaje('$conDeterioro', '$devoluciones'),
          casos: { $slice: [{ $filter: { input: '$casos', as: 'c', cond: { $ne: ['$$c', null] } } }, 10] },
        },
      },
      { $sort: { porcentaje: -1 } },
    ];
  },
};

// 10. Informe mensual de la biblioteca (todo en una sola consulta)
export const informeMensual = {
  coleccion: 'prestamos',
  descripcion: 'Informe del mes: préstamos, devoluciones, retrasos, extravíos, lectores, nuevas credenciales y tops',
  pipeline: ({ anio = new Date().getFullYear(), mes = new Date().getMonth() + 1 } = {}) => {
    const inicio = new Date(anio, mes - 1, 1);
    const fin = new Date(anio, mes, 1);
    return [
      {
        $facet: {
          prestados: [
            { $match: { fechaPrestamo: { $gte: inicio, $lt: fin } } },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                lectores: { $addToSet: '$usuario' },
                renovaciones: { $sum: { $size: '$renovaciones' } },
              },
            },
          ],
          devueltos: [
            { $match: { fechaDevolucion: { $gte: inicio, $lt: fin } } },
            { $group: { _id: null, total: { $sum: 1 }, conRetraso: { $sum: { $cond: [{ $gt: ['$diasRetraso', 0] }, 1, 0] } } } },
          ],
          extraviados: [
            { $match: { estado: 'EXTRAVIADO', fechaPrestamo: { $gte: inicio, $lt: fin } } },
            { $count: 'n' },
          ],
          topLibros: [
            { $match: { fechaPrestamo: { $gte: inicio, $lt: fin } } },
            { $group: { _id: '$titulo', total: { $sum: 1 } } },
            { $sort: { total: -1, _id: 1 } },
            { $limit: 5 },
            { $project: { _id: 0, clave: '$_id', total: 1 } },
          ],
          topCategorias: [
            { $match: { fechaPrestamo: { $gte: inicio, $lt: fin } } },
            { $lookup: { from: 'libros', localField: 'libro', foreignField: '_id', as: 'l' } },
            { $unwind: '$l' },
            { $group: { _id: '$l.categoria', total: { $sum: 1 } } },
            { $sort: { total: -1 } },
            { $limit: 5 },
            { $project: { _id: 0, clave: '$_id', total: 1 } },
          ],
        },
      },
      {
        $lookup: {
          from: 'usuarios',
          pipeline: [{ $match: { fechaExpedicion: { $gte: inicio, $lt: fin } } }, { $count: 'n' }],
          as: 'altas',
        },
      },
      {
        $lookup: {
          from: 'libros',
          pipeline: [
            { $match: { 'apartados.0': { $exists: true } } },
            { $unwind: '$apartados' },
            { $match: { 'apartados.fechaSolicitud': { $gte: inicio, $lt: fin } } },
            { $count: 'n' },
          ],
          as: 'aps',
        },
      },
      {
        $project: {
          anio: { $literal: anio },
          mes: { $literal: mes },
          nombreMes: { $literal: MESES[mes - 1] },
          prestamos: { $ifNull: [{ $arrayElemAt: ['$prestados.total', 0] }, 0] },
          lectoresDistintos: { $size: { $ifNull: [{ $arrayElemAt: ['$prestados.lectores', 0] }, []] } },
          renovaciones: { $ifNull: [{ $arrayElemAt: ['$prestados.renovaciones', 0] }, 0] },
          devoluciones: { $ifNull: [{ $arrayElemAt: ['$devueltos.total', 0] }, 0] },
          devolucionesConRetraso: { $ifNull: [{ $arrayElemAt: ['$devueltos.conRetraso', 0] }, 0] },
          extraviados: { $ifNull: [{ $arrayElemAt: ['$extraviados.n', 0] }, 0] },
          nuevasCredenciales: { $ifNull: [{ $arrayElemAt: ['$altas.n', 0] }, 0] },
          apartados: { $ifNull: [{ $arrayElemAt: ['$aps.n', 0] }, 0] },
          librosMasPrestados: '$topLibros',
          categoriasMasPrestadas: '$topCategorias',
        },
      },
    ];
  },
};

export default {
  prestamosVencidos,
  agendaDevoluciones,
  puntualidadMensual,
  duracionPorCategoria,
  cargaMostrador,
  renovacionesFrecuentes,
  candidatosCancelacion,
  estadisticaApartados,
  deterioroEnDevoluciones,
  informeMensual,
};
