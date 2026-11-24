// Resolvers de usuarios, credenciales y fiadores — Durán Castañeda Luis
import Usuario from '../../models/Usuario.js';
import Fiador from '../../models/Fiador.js';
import Prestamo from '../../models/Prestamo.js';
import Libro from '../../models/Libro.js';
import consultas from '../../consultas/usuarios.js';
import { REGLAS, formatoCredencial, sumarMeses } from '../../utils/reglas.js';
import {
  errorRegla, validarId, paginar, textoABuscar, ejecutarConsulta, usuarioPorCredencial, liberarEjemplar,
} from './comun.js';

const nombreCompleto = (n) => `${n.paterno} ${n.materno || ''}, ${n.nombres}`.replace(' ,', ',');

function situacionDe(usuario) {
  const hoy = new Date();
  if (usuario.estado === 'CANCELADA') return 'CANCELADA';
  if (usuario.estado === 'SUSPENDIDA' && (!usuario.suspendidoHasta || usuario.suspendidoHasta > hoy)) return 'SUSPENDIDA';
  if (usuario.fechaVencimiento < hoy) return 'VENCIDA';
  return 'ACTIVA';
}

// filtro de Mongo equivalente a cada situación calculada
function filtroSituacion(situacion) {
  const hoy = new Date();
  switch (situacion) {
    case 'CANCELADA':
      return { estado: 'CANCELADA' };
    case 'SUSPENDIDA':
      return { estado: 'SUSPENDIDA', $or: [{ suspendidoHasta: null }, { suspendidoHasta: { $gt: hoy } }] };
    case 'VENCIDA':
      return { estado: { $ne: 'CANCELADA' }, fechaVencimiento: { $lt: hoy } };
    case 'ACTIVA':
      return { estado: { $ne: 'CANCELADA' }, fechaVencimiento: { $gte: hoy }, $or: [{ estado: 'ACTIVA' }, { suspendidoHasta: { $lte: hoy } }] };
    default:
      return {};
  }
}

function vigenciaNueva(desde = new Date()) {
  return sumarMeses(desde, REGLAS.ANIOS_VIGENCIA_CREDENCIAL * 12);
}

async function buscarUsuario(id) {
  validarId(id);
  const u = await Usuario.findById(id);
  if (!u) throw errorRegla('No existe el usuario');
  return u;
}

async function buscarFiador(id) {
  validarId(id);
  const f = await Fiador.findById(id);
  if (!f) throw errorRegla('No existe el fiador');
  return f;
}

export default {
  Query: {
    usuarios: async (_, { busqueda, situacion, ocupacion, pagina, porPagina }) => {
      const condiciones = [filtroSituacion(situacion)];
      if (ocupacion) condiciones.push({ ocupacion });
      if (busqueda?.trim()) {
        const soloNumeros = busqueda.replace(/\D/g, '');
        if (soloNumeros && soloNumeros.length === busqueda.trim().length) {
          condiciones.push({ numRegistro: parseInt(soloNumeros, 10) });
        } else {
          // se busca cada palabra en apellidos o nombres
          for (const palabra of busqueda.trim().split(/\s+/)) {
            const rx = textoABuscar(palabra);
            condiciones.push({ $or: [{ 'nombre.paterno': rx }, { 'nombre.materno': rx }, { 'nombre.nombres': rx }] });
          }
        }
      }
      return paginar(Usuario, { $and: condiciones }, { pagina, porPagina, orden: { 'nombre.paterno': 1, 'nombre.materno': 1 } });
    },
    usuario: (_, { id }) => buscarUsuario(id),
    usuarioPorCredencial: (_, { credencial }) => usuarioPorCredencial(credencial, { obligatorio: false }),
    fiadores: (_, { busqueda, pagina, porPagina }) => {
      const filtro = {};
      if (busqueda?.trim()) {
        const rx = textoABuscar(busqueda);
        filtro.$or = [{ 'nombre.paterno': rx }, { 'nombre.materno': rx }, { 'nombre.nombres': rx }];
      }
      return paginar(Fiador, filtro, { pagina, porPagina, orden: { 'nombre.paterno': 1 } });
    },
    fiador: (_, { id }) => buscarFiador(id),

    credencialesPorVencer: (_, args) => ejecutarConsulta(consultas.credencialesPorVencer, args),
    usuariosEnRiesgo: () => ejecutarConsulta(consultas.usuariosEnRiesgo),
    fiadoresConVariosUsuarios: (_, args) => ejecutarConsulta(consultas.fiadoresConVariosUsuarios, args),
    distribucionUsuarios: (_, args) => ejecutarConsulta(consultas.distribucionUsuarios, args, { uno: true }),
    lectoresMasActivos: (_, args) => ejecutarConsulta(consultas.lectoresMasActivos, args),
    usuariosInactivos: (_, args) => ejecutarConsulta(consultas.usuariosInactivos, args),
    lectoresPorEdad: () => ejecutarConsulta(consultas.lectoresPorEdad),
    usuariosSancionados: () => ejecutarConsulta(consultas.usuariosSancionados),
    altasPorMes: (_, args) => ejecutarConsulta(consultas.altasPorMes, args),
    perfilLector: (_, { credencial }) =>
      ejecutarConsulta(consultas.perfilLector, { credencial: parseInt(credencial.replace(/\D/g, ''), 10) }, { uno: true }),
  },

  Mutation: {
    crearUsuario: async (_, { input, fiadorId, fiador }) => {
      if (!fiadorId && !fiador) throw errorRegla('El reglamento pide un fiador: selecciona uno o captura sus datos');
      let aval;
      if (fiadorId) {
        aval = await buscarFiador(fiadorId);
      } else {
        aval = await Fiador.create(fiador);
      }
      if (input.edad < 18 && aval.edad < 18) throw errorRegla('El fiador debe ser mayor de edad');

      const ultimo = await Usuario.findOne().sort({ numRegistro: -1 }).select('numRegistro');
      const hoy = new Date();
      try {
        return await Usuario.create({
          ...input,
          numRegistro: (ultimo?.numRegistro || 0) + 1,
          fiador: aval._id,
          fechaExpedicion: hoy,
          fechaVencimiento: vigenciaNueva(hoy),
        });
      } catch (err) {
        if (!fiadorId) await Fiador.deleteOne({ _id: aval._id }); // no dejar el fiador suelto
        throw err;
      }
    },

    actualizarUsuario: async (_, { id, input }) => {
      const usuario = await buscarUsuario(id);
      const { fiadorId, ...datos } = input;
      if (fiadorId) {
        await buscarFiador(fiadorId);
        usuario.fiador = fiadorId;
      }
      usuario.set(datos);
      return usuario.save();
    },

    eliminarUsuario: async (_, { id }) => {
      const usuario = await buscarUsuario(id);
      const pendientes = await Prestamo.countDocuments({ usuario: usuario._id, estado: { $in: ['ACTIVO', 'EXTRAVIADO'] } });
      if (pendientes > 0) throw errorRegla(`No se puede eliminar: tiene ${pendientes} libro(s) sin devolver o reponer`);

      // quitarlo de las listas de espera
      const libros = await Libro.find({ apartados: { $elemMatch: { usuario: usuario._id, estado: { $in: ['EN_ESPERA', 'DISPONIBLE'] } } } });
      for (const libro of libros) {
        for (const a of libro.apartados) {
          if (String(a.usuario) === String(usuario._id) && ['EN_ESPERA', 'DISPONIBLE'].includes(a.estado)) {
            const teniaEjemplar = a.estado === 'DISPONIBLE' && a.inventarioAsignado;
            a.estado = 'CANCELADO';
            if (teniaEjemplar) liberarEjemplar(libro, a.inventarioAsignado);
          }
        }
        await libro.save();
      }
      await usuario.deleteOne();
      return true;
    },

    renovarCredencial: async (_, { credencial }) => {
      const usuario = await usuarioPorCredencial(credencial);
      if (usuario.estado === 'CANCELADA') throw errorRegla('Una credencial cancelada no se puede renovar');
      const dias = (usuario.fechaVencimiento - new Date()) / 86400000;
      if (dias > 30) throw errorRegla(`Todavía le quedan ${Math.floor(dias)} días de vigencia; se renueva 30 días antes de vencer`);
      usuario.fechaExpedicion = new Date();
      usuario.fechaVencimiento = vigenciaNueva();
      usuario.duplicadoExpedido = false;
      return usuario.save();
    },

    expedirDuplicado: async (_, { credencial }) => {
      const usuario = await usuarioPorCredencial(credencial);
      if (usuario.fechaVencimiento < new Date()) throw errorRegla('La credencial está vencida; hay que renovarla');
      if (usuario.duplicadoExpedido) throw errorRegla('Ya se expidió un duplicado; solo se permite uno por periodo de vigencia');
      usuario.duplicadoExpedido = true;
      return usuario.save();
    },

    cancelarCredencial: async (_, { credencial, motivo }) => {
      const usuario = await usuarioPorCredencial(credencial);
      usuario.estado = 'CANCELADA';
      usuario.motivoEstado = motivo;
      usuario.suspendidoHasta = null;
      return usuario.save();
    },

    reactivarCredencial: async (_, { credencial }) => {
      const usuario = await usuarioPorCredencial(credencial);
      if (usuario.estado === 'ACTIVA') throw errorRegla('La credencial ya está activa');
      const pendientes = await Prestamo.countDocuments({ usuario: usuario._id, estado: { $in: ['ACTIVO', 'EXTRAVIADO'] } });
      if (pendientes > 0) throw errorRegla('Primero debe devolver o reponer los libros pendientes');
      usuario.estado = 'ACTIVA';
      usuario.suspendidoHasta = null;
      usuario.motivoEstado = '';
      return usuario.save();
    },

    crearFiador: (_, { input }) => Fiador.create(input),

    actualizarFiador: async (_, { id, input }) => {
      const fiador = await buscarFiador(id);
      fiador.set(input);
      return fiador.save();
    },

    eliminarFiador: async (_, { id }) => {
      const fiador = await buscarFiador(id);
      const n = await Usuario.countDocuments({ fiador: fiador._id });
      if (n > 0) throw errorRegla(`No se puede eliminar: es fiador de ${n} usuario(s)`);
      await fiador.deleteOne();
      return true;
    },
  },

  Usuario: {
    credencial: (u) => formatoCredencial(u.numRegistro),
    nombreCompleto: (u) => nombreCompleto(u.nombre),
    fiador: (u) => Fiador.findById(u.fiador).exec(),
    situacion: (u) => situacionDe(u),
    vigente: (u) => situacionDe(u) === 'ACTIVA',
    retrasosUltimoAnio: (u) => {
      const haceUnAnio = sumarMeses(new Date(), -12);
      return u.amonestaciones.filter((a) => a.fecha >= haceUnAnio).length;
    },
    prestamosActivos: (u) => Prestamo.countDocuments({ usuario: u._id, estado: 'ACTIVO' }).exec(),
    adeudos: (u) =>
      Prestamo.countDocuments({
        usuario: u._id,
        $or: [{ estado: 'EXTRAVIADO' }, { estado: 'ACTIVO', fechaVencimiento: { $lt: new Date() } }],
      }).exec(),
  },

  Fiador: {
    nombreCompleto: (f) => nombreCompleto(f.nombre),
    usuarios: (f) => Usuario.find({ fiador: f._id }).exec(),
  },
};
