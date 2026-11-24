// Consultas complejas de usuarios, credenciales y fiadores
// Integrante: Durán Castañeda Luis
import { TZ, MESES, exprNombre, exprCredencial, exprDias, porcentaje } from './comun.js';

// 1. Credenciales que vencen pronto y que todavía tienen libros prestados
export const credencialesPorVencer = {
  coleccion: 'usuarios',
  descripcion: 'Credenciales activas que vencen en los próximos N días, con préstamos activos',
  pipeline: ({ dias = 30 } = {}) => {
    const hoy = new Date();
    const limite = new Date(hoy.getTime() + dias * 86400000);
    return [
      { $match: { estado: 'ACTIVA', fechaVencimiento: { $gte: hoy, $lte: limite } } },
      {
        $lookup: {
          from: 'prestamos',
          let: { id: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$usuario', '$$id'] }, { $eq: ['$estado', 'ACTIVO'] }] } } },
            { $count: 'n' },
          ],
          as: 'act',
        },
      },
      {
        $project: {
          _id: 0,
          usuarioId: { $toString: '$_id' },
          credencial: exprCredencial('numRegistro'),
          nombreCompleto: exprNombre('nombre'),
          telefono: { $cond: [{ $ne: ['$telefonos.movil', ''] }, '$telefonos.movil', '$telefonos.fijo'] },
          correo: 1,
          fechaVencimiento: 1,
          diasRestantes: exprDias(hoy, '$fechaVencimiento'),
          prestamosActivos: { $ifNull: [{ $arrayElemAt: ['$act.n', 0] }, 0] },
        },
      },
      { $sort: { diasRestantes: 1 } },
    ];
  },
};

// 2. Usuarios con 2 retrasos en el último año: uno más y se suspenden
export const usuariosEnRiesgo = {
  coleccion: 'usuarios',
  descripcion: 'Usuarios activos con 2 o más retrasos en los últimos 12 meses y datos de su fiador',
  pipeline: () => {
    const haceUnAnio = new Date();
    haceUnAnio.setFullYear(haceUnAnio.getFullYear() - 1);
    return [
      { $match: { estado: 'ACTIVA' } },
      {
        $addFields: {
          retrasosAnio: {
            $filter: { input: '$amonestaciones', as: 'a', cond: { $gte: ['$$a.fecha', haceUnAnio] } },
          },
        },
      },
      { $match: { 'retrasosAnio.1': { $exists: true } } },
      { $lookup: { from: 'fiadores', localField: 'fiador', foreignField: '_id', as: 'f' } },
      { $unwind: { path: '$f', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'prestamos',
          let: { id: '$_id' },
          pipeline: [{ $match: { $expr: { $and: [{ $eq: ['$usuario', '$$id'] }, { $eq: ['$estado', 'ACTIVO'] }] } } }],
          as: 'activos',
        },
      },
      {
        $project: {
          _id: 0,
          usuarioId: { $toString: '$_id' },
          credencial: exprCredencial('numRegistro'),
          nombreCompleto: exprNombre('nombre'),
          retrasosUltimoAnio: { $size: '$retrasosAnio' },
          diasRetrasoAcumulados: { $sum: '$retrasosAnio.diasRetraso' },
          ultimoRetraso: { $max: '$retrasosAnio.fecha' },
          prestamosActivos: { $size: '$activos' },
          prestamosVencidos: {
            $size: { $filter: { input: '$activos', as: 'p', cond: { $lt: ['$$p.fechaVencimiento', new Date()] } } },
          },
          fiadorNombre: exprNombre('f.nombre'),
          fiadorTelefono: { $cond: [{ $ne: ['$f.telefonos.movil', ''] }, '$f.telefonos.movil', '$f.telefonos.fijo'] },
        },
      },
      { $sort: { retrasosUltimoAnio: -1, diasRetrasoAcumulados: -1 } },
    ];
  },
};

// 3. Fiadores que responden por varios lectores y cuántos de ellos deben libros
export const fiadoresConVariosUsuarios = {
  coleccion: 'usuarios',
  descripcion: 'Fiadores que avalan a 2 o más usuarios y cuántos de esos usuarios tienen libros vencidos',
  pipeline: ({ minimo = 2 } = {}) => [
    {
      $group: {
        _id: '$fiador',
        usuarios: { $push: { id: '$_id', nombre: exprNombre('nombre') } },
      },
    },
    { $match: { [`usuarios.${minimo - 1}`]: { $exists: true } } },
    { $lookup: { from: 'fiadores', localField: '_id', foreignField: '_id', as: 'f' } },
    { $unwind: '$f' },
    {
      $lookup: {
        from: 'prestamos',
        let: { ids: '$usuarios.id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $in: ['$usuario', '$$ids'] },
                  { $in: ['$estado', ['ACTIVO', 'EXTRAVIADO']] },
                  { $or: [{ $eq: ['$estado', 'EXTRAVIADO'] }, { $lt: ['$fechaVencimiento', new Date()] }] },
                ],
              },
            },
          },
        ],
        as: 'pend',
      },
    },
    {
      $project: {
        _id: 0,
        fiadorId: { $toString: '$_id' },
        fiadorNombre: exprNombre('f.nombre'),
        telefono: { $cond: [{ $ne: ['$f.telefonos.movil', ''] }, '$f.telefonos.movil', '$f.telefonos.fijo'] },
        ocupacion: '$f.ocupacion',
        totalUsuarios: { $size: '$usuarios' },
        usuarios: '$usuarios.nombre',
        usuariosConAdeudo: { $size: { $setUnion: ['$pend.usuario', []] } },
        librosPendientes: { $size: '$pend' },
      },
    },
    { $sort: { librosPendientes: -1, totalUsuarios: -1 } },
  ],
};

// 4. De dónde vienen los lectores: colonias, códigos postales y ocupaciones
export const distribucionUsuarios = {
  coleccion: 'usuarios',
  descripcion: 'Usuarios agrupados por colonia, código postal y ocupación (solo credenciales activas)',
  pipeline: ({ top = 15 } = {}) => [
    { $match: { estado: 'ACTIVA' } },
    {
      $facet: {
        porColonia: [
          { $group: { _id: '$domicilio.colonia', total: { $sum: 1 } } },
          { $sort: { total: -1 } },
          { $limit: top },
        ],
        porCodigoPostal: [
          { $group: { _id: '$domicilio.cp', total: { $sum: 1 } } },
          { $sort: { total: -1 } },
          { $limit: top },
        ],
        porOcupacion: [{ $group: { _id: '$ocupacion', total: { $sum: 1 } } }, { $sort: { total: -1 } }],
        total: [{ $count: 'n' }],
      },
    },
    {
      $project: {
        totalActivos: { $ifNull: [{ $arrayElemAt: ['$total.n', 0] }, 0] },
        porColonia: { $map: { input: '$porColonia', as: 'x', in: { clave: '$$x._id', total: '$$x.total' } } },
        porCodigoPostal: { $map: { input: '$porCodigoPostal', as: 'x', in: { clave: '$$x._id', total: '$$x.total' } } },
        porOcupacion: { $map: { input: '$porOcupacion', as: 'x', in: { clave: '$$x._id', total: '$$x.total' } } },
      },
    },
  ],
};

// 5. Lectores más activos del año y qué tan puntuales son
export const lectoresMasActivos = {
  coleccion: 'prestamos',
  descripcion: 'Usuarios con más préstamos en el año y su porcentaje de puntualidad',
  pipeline: ({ anio = new Date().getFullYear(), limite = 10 } = {}) => [
    { $match: { fechaPrestamo: { $gte: new Date(anio, 0, 1), $lt: new Date(anio + 1, 0, 1) } } },
    {
      $group: {
        _id: '$usuario',
        totalPrestamos: { $sum: 1 },
        devueltosATiempo: {
          $sum: { $cond: [{ $and: [{ $eq: ['$estado', 'DEVUELTO'] }, { $eq: ['$diasRetraso', 0] }] }, 1, 0] },
        },
        devueltosConRetraso: {
          $sum: { $cond: [{ $and: [{ $eq: ['$estado', 'DEVUELTO'] }, { $gt: ['$diasRetraso', 0] }] }, 1, 0] },
        },
        libros: { $addToSet: '$libro' },
      },
    },
    { $sort: { totalPrestamos: -1 } },
    { $limit: limite },
    { $lookup: { from: 'usuarios', localField: '_id', foreignField: '_id', as: 'u' } },
    { $unwind: '$u' },
    {
      $project: {
        _id: 0,
        usuarioId: { $toString: '$_id' },
        credencial: exprCredencial('u.numRegistro'),
        nombreCompleto: exprNombre('u.nombre'),
        ocupacion: '$u.ocupacion',
        totalPrestamos: 1,
        titulosDistintos: { $size: '$libros' },
        devueltosATiempo: 1,
        devueltosConRetraso: 1,
        porcentajePuntualidad: porcentaje('$devueltosATiempo', { $add: ['$devueltosATiempo', '$devueltosConRetraso'] }),
      },
    },
  ],
};

// 6. Usuarios con credencial vigente que ya no vienen (para invitarlos de regreso)
export const usuariosInactivos = {
  coleccion: 'usuarios',
  descripcion: 'Usuarios con credencial vigente sin préstamos en los últimos N meses',
  pipeline: ({ meses = 6, limite = 50 } = {}) => {
    const hoy = new Date();
    const corte = new Date();
    corte.setMonth(corte.getMonth() - meses);
    return [
      { $match: { estado: 'ACTIVA', fechaVencimiento: { $gte: hoy } } },
      {
        $lookup: {
          from: 'prestamos',
          let: { id: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$usuario', '$$id'] } } },
            { $sort: { fechaPrestamo: -1 } },
            { $limit: 1 },
          ],
          as: 'ult',
        },
      },
      { $addFields: { ultimoPrestamo: { $arrayElemAt: ['$ult.fechaPrestamo', 0] } } },
      { $match: { $or: [{ ultimoPrestamo: { $exists: false } }, { ultimoPrestamo: null }, { ultimoPrestamo: { $lt: corte } }] } },
      {
        $project: {
          _id: 0,
          usuarioId: { $toString: '$_id' },
          credencial: exprCredencial('numRegistro'),
          nombreCompleto: exprNombre('nombre'),
          telefono: { $cond: [{ $ne: ['$telefonos.movil', ''] }, '$telefonos.movil', '$telefonos.fijo'] },
          correo: 1,
          fechaExpedicion: 1,
          ultimoPrestamo: { $ifNull: ['$ultimoPrestamo', null] },
          diasSinPrestamo: {
            $cond: [{ $ifNull: ['$ultimoPrestamo', false] }, exprDias('$ultimoPrestamo', hoy), exprDias('$fechaExpedicion', hoy)],
          },
        },
      },
      { $sort: { diasSinPrestamo: -1 } },
      { $limit: limite },
    ];
  },
};

// 7. Rangos de edad de los lectores y cuántos préstamos hace cada rango
export const lectoresPorEdad = {
  coleccion: 'usuarios',
  descripcion: 'Usuarios por rango de edad con total y promedio de préstamos por persona',
  pipeline: () => [
    {
      $bucket: {
        groupBy: '$edad',
        boundaries: [0, 13, 18, 25, 35, 50, 65, 120],
        default: 'otro',
        output: { usuarios: { $sum: 1 }, ids: { $push: '$_id' }, edadPromedio: { $avg: '$edad' } },
      },
    },
    {
      $lookup: {
        from: 'prestamos',
        let: { ids: '$ids' },
        pipeline: [{ $match: { $expr: { $in: ['$usuario', '$$ids'] } } }, { $count: 'n' }],
        as: 'p',
      },
    },
    {
      $project: {
        _id: 0,
        rango: {
          $switch: {
            branches: [
              { case: { $eq: ['$_id', 0] }, then: 'Niños (0-12)' },
              { case: { $eq: ['$_id', 13] }, then: 'Adolescentes (13-17)' },
              { case: { $eq: ['$_id', 18] }, then: 'Jóvenes (18-24)' },
              { case: { $eq: ['$_id', 25] }, then: 'Adultos jóvenes (25-34)' },
              { case: { $eq: ['$_id', 35] }, then: 'Adultos (35-49)' },
              { case: { $eq: ['$_id', 50] }, then: 'Adultos maduros (50-64)' },
              { case: { $eq: ['$_id', 65] }, then: 'Adultos mayores (65+)' },
            ],
            default: 'Sin dato',
          },
        },
        usuarios: 1,
        edadPromedio: { $round: ['$edadPromedio', 1] },
        prestamos: { $ifNull: [{ $arrayElemAt: ['$p.n', 0] }, 0] },
      },
    },
    {
      $addFields: {
        promedioPrestamos: { $round: [{ $divide: ['$prestamos', { $max: ['$usuarios', 1] }] }, 2] },
      },
    },
  ],
};

// 8. Usuarios suspendidos o cancelados, qué libros deben y quién es su fiador
export const usuariosSancionados = {
  coleccion: 'usuarios',
  descripcion: 'Usuarios suspendidos o cancelados con libros pendientes y fiador responsable',
  pipeline: () => {
    const hoy = new Date();
    return [
      { $match: { estado: { $in: ['SUSPENDIDA', 'CANCELADA'] } } },
      { $lookup: { from: 'fiadores', localField: 'fiador', foreignField: '_id', as: 'f' } },
      { $unwind: { path: '$f', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'prestamos',
          let: { id: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$usuario', '$$id'] }, { $in: ['$estado', ['ACTIVO', 'EXTRAVIADO']] }] } } },
            { $project: { _id: 0, titulo: 1 } },
          ],
          as: 'pend',
        },
      },
      {
        $project: {
          _id: 0,
          usuarioId: { $toString: '$_id' },
          credencial: exprCredencial('numRegistro'),
          nombreCompleto: exprNombre('nombre'),
          estado: 1,
          motivo: '$motivoEstado',
          suspendidoHasta: 1,
          diasRestantesSuspension: {
            $cond: [{ $ifNull: ['$suspendidoHasta', false] }, { $max: [0, exprDias(hoy, '$suspendidoHasta')] }, null],
          },
          totalAmonestaciones: { $size: '$amonestaciones' },
          librosPendientes: '$pend.titulo',
          fiadorNombre: exprNombre('f.nombre'),
          fiadorTelefono: { $cond: [{ $ne: ['$f.telefonos.movil', ''] }, '$f.telefonos.movil', '$f.telefonos.fijo'] },
        },
      },
      { $sort: { estado: 1, diasRestantesSuspension: -1 } },
    ];
  },
};

// 9. Nuevas credenciales por mes y por ocupación (tendencia de registro)
export const altasPorMes = {
  coleccion: 'usuarios',
  descripcion: 'Credenciales expedidas por mes en un año, desglosadas por ocupación',
  pipeline: ({ anio = new Date().getFullYear() } = {}) => [
    { $match: { fechaExpedicion: { $gte: new Date(anio, 0, 1), $lt: new Date(anio + 1, 0, 1) } } },
    {
      $group: {
        _id: { mes: { $month: { date: '$fechaExpedicion', timezone: TZ } }, ocupacion: '$ocupacion' },
        total: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
    {
      $group: {
        _id: '$_id.mes',
        total: { $sum: '$total' },
        porOcupacion: { $push: { clave: '$_id.ocupacion', total: '$total' } },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        mes: '$_id',
        nombreMes: { $arrayElemAt: [MESES, { $subtract: ['$_id', 1] }] },
        total: 1,
        porOcupacion: 1,
      },
    },
  ],
};

// 10. Perfil completo de un lector en una sola consulta
export const perfilLector = {
  coleccion: 'usuarios',
  descripcion: 'Ficha completa de un usuario: fiador, estadísticas, categoría favorita, apartados y últimos préstamos',
  pipeline: ({ credencial }) => {
    const hoy = new Date();
    return [
      { $match: { numRegistro: Number(credencial) } },
      { $lookup: { from: 'fiadores', localField: 'fiador', foreignField: '_id', as: 'f' } },
      { $unwind: { path: '$f', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'prestamos',
          let: { id: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$usuario', '$$id'] } } },
            { $lookup: { from: 'libros', localField: 'libro', foreignField: '_id', as: 'l' } },
            { $unwind: '$l' },
            {
              $facet: {
                resumen: [
                  {
                    $group: {
                      _id: null,
                      total: { $sum: 1 },
                      activos: { $sum: { $cond: [{ $eq: ['$estado', 'ACTIVO'] }, 1, 0] } },
                      extraviados: { $sum: { $cond: [{ $eq: ['$estado', 'EXTRAVIADO'] }, 1, 0] } },
                      aTiempo: {
                        $sum: { $cond: [{ $and: [{ $eq: ['$estado', 'DEVUELTO'] }, { $eq: ['$diasRetraso', 0] }] }, 1, 0] },
                      },
                      conRetraso: {
                        $sum: { $cond: [{ $and: [{ $eq: ['$estado', 'DEVUELTO'] }, { $gt: ['$diasRetraso', 0] }] }, 1, 0] },
                      },
                    },
                  },
                ],
                favorita: [{ $group: { _id: '$l.categoria', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 1 }],
                ultimos: [
                  { $sort: { fechaPrestamo: -1 } },
                  { $limit: 5 },
                  { $project: { _id: 0, folio: 1, titulo: '$l.titulo', fechaPrestamo: 1, estado: 1, diasRetraso: 1 } },
                ],
              },
            },
          ],
          as: 'p',
        },
      },
      { $unwind: '$p' },
      {
        $lookup: {
          from: 'libros',
          let: { id: '$_id' },
          pipeline: [
            { $match: { 'apartados.0': { $exists: true } } },
            { $unwind: '$apartados' },
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ['$apartados.usuario', '$$id'] }, { $in: ['$apartados.estado', ['EN_ESPERA', 'DISPONIBLE']] }],
                },
              },
            },
            { $count: 'n' },
          ],
          as: 'ap',
        },
      },
      {
        $project: {
          _id: 0,
          usuarioId: { $toString: '$_id' },
          credencial: exprCredencial('numRegistro'),
          nombreCompleto: exprNombre('nombre'),
          edad: 1,
          ocupacion: 1,
          estado: 1,
          vigente: { $gte: ['$fechaVencimiento', hoy] },
          fechaVencimiento: 1,
          fiadorNombre: exprNombre('f.nombre'),
          totalPrestamos: { $ifNull: [{ $arrayElemAt: ['$p.resumen.total', 0] }, 0] },
          activos: { $ifNull: [{ $arrayElemAt: ['$p.resumen.activos', 0] }, 0] },
          extraviados: { $ifNull: [{ $arrayElemAt: ['$p.resumen.extraviados', 0] }, 0] },
          devueltosATiempo: { $ifNull: [{ $arrayElemAt: ['$p.resumen.aTiempo', 0] }, 0] },
          devueltosConRetraso: { $ifNull: [{ $arrayElemAt: ['$p.resumen.conRetraso', 0] }, 0] },
          categoriaFavorita: { $ifNull: [{ $arrayElemAt: ['$p.favorita._id', 0] }, null] },
          amonestaciones: { $size: '$amonestaciones' },
          apartadosActivos: { $ifNull: [{ $arrayElemAt: ['$ap.n', 0] }, 0] },
          ultimosPrestamos: '$p.ultimos',
        },
      },
    ];
  },
};

export default {
  credencialesPorVencer,
  usuariosEnRiesgo,
  fiadoresConVariosUsuarios,
  distribucionUsuarios,
  lectoresMasActivos,
  usuariosInactivos,
  lectoresPorEdad,
  usuariosSancionados,
  altasPorMes,
  perfilLector,
};
