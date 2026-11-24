// Resolvers de préstamos y apartados — Zepeda Castañeda María Fernanda
import Prestamo from '../../models/Prestamo.js';
import Usuario from '../../models/Usuario.js';
import Libro from '../../models/Libro.js';
import consultas from '../../consultas/prestamos.js';
import { REGLAS, sumarDias, sumarMeses, diasEntre, inicioDelDia, formatoFolio } from '../../utils/reglas.js';
import {
  errorRegla, validarId, paginar, ejecutarConsulta, usuarioPorCredencial, validarUsuarioParaServicio,
  liberarEjemplar, vencerApartados,
} from './comun.js';

function situacionDe(p) {
  if (p.estado === 'EXTRAVIADO') return 'EXTRAVIADO';
  if (p.estado === 'DEVUELTO') return p.diasRetraso > 0 ? 'CON_RETRASO' : 'A_TIEMPO';
  return p.fechaVencimiento < inicioDelDia() ? 'VENCIDO' : 'AL_DIA';
}

async function buscarPrestamo(folio) {
  const p = await Prestamo.findOne({ folio });
  if (!p) throw errorRegla(`No existe el folio ${formatoFolio(folio)}`);
  return p;
}

async function siguienteFolio() {
  const ultimo = await Prestamo.findOne().sort({ folio: -1 }).select('folio');
  return (ultimo?.folio || 0) + 1;
}

function detalleApartado(libro, a) {
  const fila = libro.apartados
    .filter((x) => x.estado === 'EN_ESPERA')
    .sort((x, y) => x.fechaSolicitud - y.fechaSolicitud);
  const lugar = fila.findIndex((x) => String(x._id) === String(a._id));
  return {
    id: String(a._id),
    libroId: String(libro._id),
    titulo: libro.titulo,
    colocacion: libro.colocacion,
    usuario: a.usuario,
    fechaSolicitud: a.fechaSolicitud,
    fechaDisponible: a.fechaDisponible,
    fechaLimiteRecoger: a.fechaLimiteRecoger,
    inventarioAsignado: a.inventarioAsignado,
    estado: a.estado,
    lugarEnFila: lugar >= 0 ? lugar + 1 : null,
  };
}

export default {
  Query: {
    prestamos: async (_, { estado, credencial, soloVencidos, pagina, porPagina }) => {
      const filtro = {};
      if (estado) filtro.estado = estado;
      if (credencial) {
        const u = await usuarioPorCredencial(credencial);
        filtro.usuario = u._id;
      }
      if (soloVencidos) {
        filtro.estado = 'ACTIVO';
        filtro.fechaVencimiento = { $lt: inicioDelDia() };
      }
      return paginar(Prestamo, filtro, { pagina, porPagina, orden: { fechaPrestamo: -1 } });
    },
    prestamo: (_, { folio }) => Prestamo.findOne({ folio }).exec(),
    prestamosActivos: async (_, { credencial }) => {
      const u = await usuarioPorCredencial(credencial);
      return Prestamo.find({ usuario: u._id, estado: { $in: ['ACTIVO', 'EXTRAVIADO'] } }).sort({ fechaVencimiento: 1 }).exec();
    },
    historial: async (_, { credencial }) => {
      const u = await usuarioPorCredencial(credencial);
      return Prestamo.find({ usuario: u._id }).sort({ fechaPrestamo: -1 }).exec();
    },
    apartados: async (_, { estado, credencial }) => {
      await vencerApartados();
      const filtroAp = {};
      if (estado) filtroAp.estado = estado;
      if (credencial) filtroAp.usuario = (await usuarioPorCredencial(credencial))._id;
      const libros = await Libro.find(Object.keys(filtroAp).length ? { apartados: { $elemMatch: filtroAp } } : { 'apartados.0': { $exists: true } });
      const lista = [];
      for (const libro of libros) {
        for (const a of libro.apartados) {
          if (estado && a.estado !== estado) continue;
          if (filtroAp.usuario && String(a.usuario) !== String(filtroAp.usuario)) continue;
          lista.push(detalleApartado(libro, a));
        }
      }
      return lista.sort((x, y) => y.fechaSolicitud - x.fechaSolicitud).slice(0, 200);
    },

    prestamosVencidos: () => ejecutarConsulta(consultas.prestamosVencidos),
    agendaDevoluciones: (_, args) => ejecutarConsulta(consultas.agendaDevoluciones, args),
    puntualidadMensual: (_, args) => ejecutarConsulta(consultas.puntualidadMensual, args),
    duracionPorCategoria: () => ejecutarConsulta(consultas.duracionPorCategoria),
    cargaMostrador: (_, args) => ejecutarConsulta(consultas.cargaMostrador, args, { uno: true }),
    renovacionesFrecuentes: (_, args) => ejecutarConsulta(consultas.renovacionesFrecuentes, args, { uno: true }),
    candidatosCancelacion: (_, args) => ejecutarConsulta(consultas.candidatosCancelacion, args),
    estadisticaApartados: (_, args) => ejecutarConsulta(consultas.estadisticaApartados, args, { uno: true }),
    deterioroEnDevoluciones: () => ejecutarConsulta(consultas.deterioroEnDevoluciones),
    informeMensual: (_, args) => ejecutarConsulta(consultas.informeMensual, args, { uno: true }),
  },

  Mutation: {
    crearPrestamo: async (_, { credencial, libroId, inventario, atendio }) => {
      validarId(libroId);
      await vencerApartados();
      const usuario = await usuarioPorCredencial(credencial);
      await validarUsuarioParaServicio(usuario);

      const activos = await Prestamo.find({ usuario: usuario._id, estado: 'ACTIVO' });
      if (activos.length >= REGLAS.MAX_LIBROS_SIMULTANEOS) {
        throw errorRegla(`Ya tiene ${REGLAS.MAX_LIBROS_SIMULTANEOS} libros prestados, que es el máximo`);
      }
      if (activos.some((p) => p.fechaVencimiento < inicioDelDia())) {
        throw errorRegla('Tiene libros vencidos sin devolver; primero debe entregarlos');
      }

      const libro = await Libro.findById(libroId);
      if (!libro) throw errorRegla('No existe el libro');
      if (libro.sala === 'CONSULTA') throw errorRegla('Es material de consulta: no sale a domicilio');
      if (activos.some((p) => String(p.libro) === String(libro._id))) throw errorRegla('Ya tiene prestado un ejemplar de este libro');

      // ¿lo tenía apartado y ya está listo para recoger?
      const apartado = libro.apartados.find((a) => String(a.usuario) === String(usuario._id) && a.estado === 'DISPONIBLE');
      let ejemplar;
      if (apartado) {
        ejemplar = libro.ejemplares.find((e) => e.inventario === apartado.inventarioAsignado);
        apartado.estado = 'RECOGIDO';
      } else {
        ejemplar = libro.ejemplares.find(
          (e) => e.situacion === 'DISPONIBLE' && (!inventario || e.inventario === inventario)
        );
      }
      if (!ejemplar) {
        throw errorRegla(inventario ? `El ejemplar ${inventario} no está disponible` : 'No hay ejemplares disponibles; se puede apartar');
      }
      ejemplar.situacion = 'PRESTADO';
      await libro.save(); // si otro bibliotecario lo prestó al mismo tiempo, Mongoose marca error de versión

      const hoy = new Date();
      try {
        return await Prestamo.create({
          folio: await siguienteFolio(),
          usuario: usuario._id,
          libro: libro._id,
          inventario: ejemplar.inventario,
          titulo: libro.titulo,
          colocacion: libro.colocacion,
          fechaPrestamo: hoy,
          fechaVencimiento: sumarDias(hoy, REGLAS.DIAS_PRESTAMO),
          condicionEntrega: ejemplar.estadoFisico,
          atendio: atendio || 'Mostrador',
        });
      } catch (err) {
        // regresar el ejemplar si no se pudo guardar el préstamo
        ejemplar.situacion = apartado ? 'APARTADO' : 'DISPONIBLE';
        if (apartado) apartado.estado = 'DISPONIBLE';
        await libro.save();
        throw err;
      }
    },

    devolverPrestamo: async (_, { folio, condicion }) => {
      const prestamo = await buscarPrestamo(folio);
      if (prestamo.estado !== 'ACTIVO') throw errorRegla(`El folio ${formatoFolio(folio)} ya está ${prestamo.estado.toLowerCase()}`);

      const hoy = new Date();
      prestamo.fechaDevolucion = hoy;
      prestamo.estado = 'DEVUELTO';
      prestamo.condicionDevolucion = condicion;
      prestamo.diasRetraso = Math.max(0, diasEntre(prestamo.fechaVencimiento, hoy));
      await prestamo.save();

      const libro = await Libro.findById(prestamo.libro);
      if (libro) {
        const ejemplar = libro.ejemplares.find((e) => e.inventario === prestamo.inventario);
        if (ejemplar) {
          ejemplar.estadoFisico = condicion;
          liberarEjemplar(libro, prestamo.inventario);
          await libro.save();
        }
      }

      // retraso = amonestación; 3 en un año = suspensión por un año
      if (prestamo.diasRetraso > 0) {
        const usuario = await Usuario.findById(prestamo.usuario);
        if (usuario) {
          usuario.amonestaciones.push({ fecha: hoy, prestamo: prestamo._id, folio: prestamo.folio, diasRetraso: prestamo.diasRetraso });
          const haceUnAnio = sumarMeses(hoy, -12);
          const enElAnio = usuario.amonestaciones.filter((a) => a.fecha >= haceUnAnio).length;
          if (enElAnio >= REGLAS.RETRASOS_PARA_SUSPENSION && usuario.estado === 'ACTIVA') {
            usuario.estado = 'SUSPENDIDA';
            usuario.suspendidoHasta = sumarMeses(hoy, REGLAS.MESES_SUSPENSION);
            usuario.motivoEstado = 'Tres retrasos en la devolución durante un año';
          }
          await usuario.save();
        }
      }
      return prestamo;
    },

    renovarPrestamo: async (_, { folio }) => {
      const prestamo = await buscarPrestamo(folio);
      if (prestamo.estado !== 'ACTIVO') throw errorRegla('Solo se renuevan préstamos activos');
      if (prestamo.fechaVencimiento < inicioDelDia()) throw errorRegla('No se puede renovar: el préstamo ya está vencido');

      const usuario = await Usuario.findById(prestamo.usuario);
      await validarUsuarioParaServicio(usuario);

      const libro = await Libro.findById(prestamo.libro);
      if (libro?.apartados.some((a) => a.estado === 'EN_ESPERA')) {
        throw errorRegla('No se puede renovar: otro usuario está esperando este libro');
      }
      const hoy = new Date();
      const nueva = sumarDias(hoy, REGLAS.DIAS_PRESTAMO);
      prestamo.renovaciones.push({ fecha: hoy, venceAnterior: prestamo.fechaVencimiento, venceNueva: nueva });
      prestamo.fechaVencimiento = nueva;
      return prestamo.save();
    },

    registrarRecordatorio: async (_, { folio, medio, dirigidoA }) => {
      const prestamo = await buscarPrestamo(folio);
      if (prestamo.estado !== 'ACTIVO' || prestamo.fechaVencimiento >= inicioDelDia()) {
        throw errorRegla('Solo se mandan recordatorios de préstamos vencidos');
      }
      prestamo.recordatorios.push({ fecha: new Date(), medio, dirigidoA });
      return prestamo.save();
    },

    reportarExtravio: async (_, { folio }) => {
      const prestamo = await buscarPrestamo(folio);
      if (prestamo.estado !== 'ACTIVO') throw errorRegla('Solo se reporta extravío de un préstamo activo');
      prestamo.estado = 'EXTRAVIADO';
      await prestamo.save();
      await Libro.updateOne(
        { _id: prestamo.libro, 'ejemplares.inventario': prestamo.inventario },
        { $set: { 'ejemplares.$.situacion': 'EXTRAVIADO' } }
      );
      return prestamo;
    },

    eliminarPrestamo: async (_, { folio }) => {
      const prestamo = await buscarPrestamo(folio);
      if (prestamo.estado !== 'ACTIVO' || diasEntre(prestamo.fechaPrestamo, new Date()) > 0) {
        throw errorRegla('Solo se puede eliminar un préstamo activo capturado hoy');
      }
      const libro = await Libro.findById(prestamo.libro);
      if (libro) {
        liberarEjemplar(libro, prestamo.inventario);
        await libro.save();
      }
      await prestamo.deleteOne();
      return true;
    },

    crearApartado: async (_, { credencial, libroId }) => {
      validarId(libroId);
      await vencerApartados();
      const usuario = await usuarioPorCredencial(credencial);
      await validarUsuarioParaServicio(usuario);
      const libro = await Libro.findById(libroId);
      if (!libro) throw errorRegla('No existe el libro');
      if (libro.sala === 'CONSULTA') throw errorRegla('El material de consulta no se aparta');
      if (libro.ejemplares.some((e) => e.situacion === 'DISPONIBLE')) {
        throw errorRegla('Hay ejemplares disponibles; se puede prestar directamente');
      }
      if (libro.apartados.some((a) => String(a.usuario) === String(usuario._id) && ['EN_ESPERA', 'DISPONIBLE'].includes(a.estado))) {
        throw errorRegla('El usuario ya tiene apartado este libro');
      }
      const loTiene = await Prestamo.exists({ usuario: usuario._id, libro: libro._id, estado: 'ACTIVO' });
      if (loTiene) throw errorRegla('El usuario tiene este libro prestado ahora mismo');

      libro.apartados.push({ usuario: usuario._id, fechaSolicitud: new Date() });
      await libro.save();
      return detalleApartado(libro, libro.apartados[libro.apartados.length - 1]);
    },

    cancelarApartado: async (_, { libroId, apartadoId }) => {
      validarId(libroId);
      const libro = await Libro.findById(libroId);
      const apartado = libro?.apartados.id(apartadoId);
      if (!apartado) throw errorRegla('No existe el apartado');
      if (!['EN_ESPERA', 'DISPONIBLE'].includes(apartado.estado)) throw errorRegla(`El apartado ya está ${apartado.estado.toLowerCase()}`);
      const teniaEjemplar = apartado.estado === 'DISPONIBLE' && apartado.inventarioAsignado;
      apartado.estado = 'CANCELADO';
      if (teniaEjemplar) liberarEjemplar(libro, apartado.inventarioAsignado);
      await libro.save();
      return detalleApartado(libro, apartado);
    },
  },

  Prestamo: {
    folioTexto: (p) => formatoFolio(p.folio),
    situacion: (p) => situacionDe(p),
    // si sigue activo se calculan los días de retraso al día de hoy
    diasRetraso: (p) => (p.estado === 'ACTIVO' ? Math.max(0, diasEntre(p.fechaVencimiento, new Date())) : p.diasRetraso),
    usuario: (p) => Usuario.findById(p.usuario).exec(),
    libro: (p) => Libro.findById(p.libro).exec(),
  },

  ApartadoDetalle: {
    usuario: (a) => Usuario.findById(a.usuario).exec(),
  },
};
