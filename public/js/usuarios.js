// Pantalla 6: Usuarios (CRUD de usuarios y fiadores) — Durán Castañeda Luis
import { gql } from './api.js';
import { $, $$, escapar, etiqueta, fecha, iniciales, aviso, abrirModal, cerrarModal, paginacion, intentar, leerFormulario } from './util.js';
import { verCredencial } from './credencial.js';

const Q_USUARIOS = `
  query Usuarios($busqueda: String, $situacion: SituacionCredencial, $pagina: Int) {
    usuarios(busqueda: $busqueda, situacion: $situacion, pagina: $pagina, porPagina: 10) {
      total pagina paginas
      items { id credencial nombreCompleto ocupacion escuelaTrabajo situacion prestamosActivos adeudos }
    }
  }`;

const Q_USUARIO = `
  query Usuario($id: ID!) {
    usuario(id: $id) {
      id credencial nombreCompleto edad correo ocupacion escuelaTrabajo identificacion
      nombre { paterno materno nombres }
      domicilio { calle colonia cp ciudad }
      telefonos { fijo movil }
      fechaExpedicion fechaVencimiento situacion motivoEstado suspendidoHasta
      retrasosUltimoAnio prestamosActivos adeudos
      fiador { id nombreCompleto edad ocupacion telefonos { fijo movil } domicilio { calle colonia } trabajo { nombre } }
    }
  }`;

const Q_FIADORES = `
  query Fiadores($busqueda: String) {
    fiadores(busqueda: $busqueda, porPagina: 8) { items { id nombreCompleto edad domicilio { colonia } } }
  }`;

const M_CREAR = `
  mutation CrearUsuario($input: UsuarioInput!, $fiadorId: ID, $fiador: FiadorInput) {
    crearUsuario(input: $input, fiadorId: $fiadorId, fiador: $fiador) { id credencial nombreCompleto }
  }`;

const M_ACTUALIZAR = `
  mutation ActualizarUsuario($id: ID!, $input: UsuarioUpdateInput!) {
    actualizarUsuario(id: $id, input: $input) { id credencial }
  }`;

const M_ELIMINAR = `mutation EliminarUsuario($id: ID!) { eliminarUsuario(id: $id) }`;

const M_CANCELAR = `
  mutation Cancelar($credencial: String!, $motivo: String!) {
    cancelarCredencial(credencial: $credencial, motivo: $motivo) { id situacion }
  }`;

const M_REACTIVAR = `mutation Reactivar($credencial: String!) { reactivarCredencial(credencial: $credencial) { id situacion } }`;

const OCUPACIONES = ['ESTUDIANTE', 'DOCENTE', 'EMPLEADO', 'COMERCIANTE', 'HOGAR', 'JUBILADO', 'PROFESIONISTA', 'OTRO'];
const IDENTIFICACIONES = ['INE', 'CARTILLA', 'PASAPORTE', 'LICENCIA', 'CRED_ESCOLAR', 'CURP'];

let paginaActual = 1;

function etiquetaUsuario(u) {
  if (u.situacion !== 'ACTIVA') return etiqueta(u.situacion);
  if (u.adeudos > 0) return etiqueta('VENCIDO', `${u.adeudos} con adeudo`);
  if (u.prestamosActivos > 0) return etiqueta('PRESTADO', `${u.prestamosActivos} préstamo${u.prestamosActivos > 1 ? 's' : ''} activo${u.prestamosActivos > 1 ? 's' : ''}`);
  return etiqueta('ACTIVA', 'sin adeudos');
}

async function cargar(pagina = 1) {
  paginaActual = pagina;
  const lista = $('#usu-lista');
  const datos = await intentar(
    () => gql(Q_USUARIOS, { busqueda: $('#usu-busqueda').value || null, situacion: $('#usu-situacion').value || null, pagina }),
    lista
  );
  if (!datos) return;
  const { usuarios } = datos;
  $('#usu-total').textContent = `${usuarios.total} credenciales`;
  lista.innerHTML = usuarios.items.length
    ? usuarios.items
        .map(
          (u) => `
      <div class="tarjeta" data-id="${u.id}">
        <div class="con-avatar">
          <span class="avatar">${iniciales(u.nombreCompleto)}</span>
          <div>
            <div class="titulo">${escapar(u.nombreCompleto)}</div>
            <div class="meta">${escapar(u.ocupacion.toLowerCase())}${u.escuelaTrabajo ? ' · ' + escapar(u.escuelaTrabajo) : ''}</div>
          </div>
        </div>
        <div class="codigo">${u.credencial}</div>
        <div>${etiquetaUsuario(u)}</div>
      </div>`
        )
        .join('')
    : '<div class="vacio">No hay usuarios con esos datos</div>';
  $$('.tarjeta', lista).forEach((t) => t.addEventListener('click', () => verUsuario(t.dataset.id)));
  paginacion($('#usu-paginas'), usuarios, cargar);
}

function camposPersona(prefijo, p = {}) {
  const n = p.nombre || {};
  const d = p.domicilio || {};
  const t = p.telefonos || {};
  return `
    <div><label>Apellido paterno *</label><input name="${prefijo}nombre.paterno" required value="${escapar(n.paterno)}" /></div>
    <div><label>Apellido materno</label><input name="${prefijo}nombre.materno" value="${escapar(n.materno)}" /></div>
    <div><label>Nombre(s) *</label><input name="${prefijo}nombre.nombres" required value="${escapar(n.nombres)}" /></div>
    <div><label>Edad *</label><input name="${prefijo}edad" type="number" min="3" max="110" required value="${p.edad ?? ''}" /></div>
    <div class="ancho"><label>Domicilio (calle y número) *</label><input name="${prefijo}domicilio.calle" required value="${escapar(d.calle)}" /></div>
    <div><label>Colonia *</label><input name="${prefijo}domicilio.colonia" required value="${escapar(d.colonia)}" /></div>
    <div><label>C.P. *</label><input name="${prefijo}domicilio.cp" required pattern="\\d{5}" value="${escapar(d.cp)}" /></div>
    <div><label>Teléfono fijo</label><input name="${prefijo}telefonos.fijo" value="${escapar(t.fijo)}" /></div>
    <div><label>Teléfono móvil</label><input name="${prefijo}telefonos.movil" value="${escapar(t.movil)}" /></div>
    <div><label>Correo electrónico</label><input name="${prefijo}correo" type="email" value="${escapar(p.correo)}" /></div>`;
}

function formularioUsuario(u = {}) {
  return `
    <form id="form-usuario">
      <fieldset><legend>Cédula de registro — datos del lector</legend>
        <div class="rejilla">
          ${camposPersona('', u)}
          <div><label>Ocupación *</label>
            <select name="ocupacion">${OCUPACIONES.map((o) => `<option ${u.ocupacion === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
          <div class="ancho"><label>Escuela o trabajo</label><input name="escuelaTrabajo" value="${escapar(u.escuelaTrabajo)}" /></div>
          <div><label>Identificación presentada</label>
            <select name="identificacion">${IDENTIFICACIONES.map((o) => `<option ${u.identificacion === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
        </div>
      </fieldset>
      ${
        u.id
          ? ''
          : `
      <fieldset><legend>Fiador (mayor de 18 años, que radique en Tepic)</legend>
        <div class="barra">
          <input type="search" id="buscar-fiador" placeholder="Buscar un fiador ya registrado..." />
          <button class="btn borde chico" type="button" id="btn-buscar-fiador">Buscar</button>
        </div>
        <div class="lista" id="fiadores-encontrados"></div>
        <input type="hidden" id="fiador-id" />
        <div class="detalle" id="fiador-elegido">O captura los datos de un fiador nuevo:</div>
        <div class="rejilla" id="campos-fiador">
          ${camposPersona('f.')}
          <div><label>Ocupación</label><input name="f.ocupacion" /></div>
          <div><label>Lugar de trabajo</label><input name="f.trabajo.nombre" /></div>
          <div class="ancho"><label>Dirección del trabajo</label><input name="f.trabajo.direccion" /></div>
        </div>
      </fieldset>`
      }
      <button class="btn" type="submit">${u.id ? 'Guardar cambios' : 'Registrar y expedir credencial'}</button>
    </form>`;
}

function separarDatos(form) {
  const todo = leerFormulario(form);
  const { f: fiador, ...input } = todo;
  return { input, fiador };
}

export function nuevoUsuario() {
  const cont = abrirModal(`<h2>Nuevo registro</h2><div class="detalle">Vigencia de la credencial: 2 años</div>${formularioUsuario()}`);
  const camposFiador = $('#campos-fiador', cont);

  const buscar = async () => {
    const datos = await intentar(() => gql(Q_FIADORES, { busqueda: $('#buscar-fiador', cont).value }));
    if (!datos) return;
    $('#fiadores-encontrados', cont).innerHTML =
      datos.fiadores.items
        .map(
          (f) => `<div class="tarjeta" data-id="${f.id}" data-nombre="${escapar(f.nombreCompleto)}">
            <div><div class="titulo">${escapar(f.nombreCompleto)}</div><div class="meta">${f.edad} años · ${escapar(f.domicilio.colonia)}</div></div><div></div>
            <div><span class="etiqueta gris">elegir</span></div></div>`
        )
        .join('') || '<div class="vacio">Sin resultados</div>';
    $$('#fiadores-encontrados .tarjeta', cont).forEach((t) =>
      t.addEventListener('click', () => {
        $('#fiador-id', cont).value = t.dataset.id;
        $('#fiador-elegido', cont).innerHTML = `Fiador seleccionado: <b>${t.dataset.nombre}</b> <button type="button" class="btn borde chico" id="quitar-fiador">Quitar</button>`;
        $('#fiadores-encontrados', cont).innerHTML = '';
        camposFiador.classList.add('oculto');
        $$('input', camposFiador).forEach((i) => (i.disabled = true));
        $('#quitar-fiador', cont).addEventListener('click', () => {
          $('#fiador-id', cont).value = '';
          $('#fiador-elegido', cont).textContent = 'O captura los datos de un fiador nuevo:';
          camposFiador.classList.remove('oculto');
          $$('input', camposFiador).forEach((i) => (i.disabled = false));
        });
      })
    );
  };
  $('#btn-buscar-fiador', cont).addEventListener('click', buscar);
  $('#buscar-fiador', cont).addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      buscar();
    }
  });

  $('#form-usuario', cont).addEventListener('submit', async (e) => {
    e.preventDefault();
    const { input, fiador } = separarDatos(e.target);
    const fiadorId = $('#fiador-id', cont).value || null;
    const r = await intentar(() => gql(M_CREAR, { input, fiadorId, fiador: fiadorId ? null : fiador }), e.target);
    if (r) {
      aviso(`Credencial ${r.crearUsuario.credencial} expedida a ${r.crearUsuario.nombreCompleto}`);
      cerrarModal();
      cargar(1);
      // se muestra la credencial nueva para imprimirla
      $('nav.pestanas button[data-pantalla="credencial"]').click();
      verCredencial(r.crearUsuario.credencial);
    }
  });
}

async function verUsuario(id) {
  const datos = await intentar(() => gql(Q_USUARIO, { id }));
  if (!datos?.usuario) return;
  const u = datos.usuario;
  const f = u.fiador;
  const cont = abrirModal(`
    <h2>${escapar(u.nombreCompleto)}</h2>
    <div class="detalle">Credencial ${u.credencial} · expedida ${fecha(u.fechaExpedicion)} · vence ${fecha(u.fechaVencimiento)}</div>
    <div class="caja">
      ${etiqueta(u.situacion)} ${u.motivoEstado ? `<span class="detalle"> ${escapar(u.motivoEstado)}${u.suspendidoHasta ? ' · hasta ' + fecha(u.suspendidoHasta) : ''}</span>` : ''}
      <p class="detalle" style="margin:10px 0 0">Préstamos activos: ${u.prestamosActivos} · Adeudos: ${u.adeudos} · Retrasos en el último año: ${u.retrasosUltimoAnio} de 3</p>
      ${f ? `<p class="detalle" style="margin:6px 0 0">Fiador: ${escapar(f.nombreCompleto)} (${f.edad} años) · Tel. ${escapar(f.telefonos.movil || f.telefonos.fijo || '—')} · ${escapar(f.trabajo?.nombre || '')}</p>` : ''}
    </div>
    ${formularioUsuario(u)}
    <div class="barra" style="margin-top:14px">
      <button class="btn borde" id="u-credencial">Ver credencial</button>
      ${u.situacion === 'CANCELADA' || u.situacion === 'SUSPENDIDA' ? '<button class="btn borde" id="u-reactivar">Reactivar credencial</button>' : '<button class="btn borde" id="u-cancelar">Cancelar credencial</button>'}
      <button class="btn rojo" id="u-eliminar">Eliminar usuario</button>
    </div>`);

  $('#form-usuario', cont).addEventListener('submit', async (e) => {
    e.preventDefault();
    const { input } = separarDatos(e.target);
    if (await intentar(() => gql(M_ACTUALIZAR, { id, input }), e.target)) {
      aviso('Datos actualizados');
      cerrarModal();
      cargar(paginaActual);
    }
  });

  $('#u-credencial', cont).addEventListener('click', () => {
    cerrarModal();
    $('nav.pestanas button[data-pantalla="credencial"]').click();
    verCredencial(u.credencial);
  });

  $('#u-cancelar', cont)?.addEventListener('click', async () => {
    const motivo = prompt('Motivo de la cancelación (ej. no respondió a dos recordatorios):');
    if (!motivo) return;
    if (await intentar(() => gql(M_CANCELAR, { credencial: u.credencial, motivo }))) {
      aviso('Credencial cancelada');
      verUsuario(id);
      cargar(paginaActual);
    }
  });

  $('#u-reactivar', cont)?.addEventListener('click', async () => {
    if (await intentar(() => gql(M_REACTIVAR, { credencial: u.credencial }))) {
      aviso('Credencial reactivada');
      verUsuario(id);
      cargar(paginaActual);
    }
  });

  $('#u-eliminar', cont).addEventListener('click', async () => {
    if (!confirm(`¿Eliminar a ${u.nombreCompleto}? Su historial de préstamos se conserva.`)) return;
    if (await intentar(() => gql(M_ELIMINAR, { id }))) {
      aviso('Usuario eliminado');
      cerrarModal();
      cargar(paginaActual);
    }
  });
}

export function iniciarUsuarios() {
  $('#usu-form').addEventListener('submit', (e) => {
    e.preventDefault();
    cargar(1);
  });
  $('#usu-situacion').addEventListener('change', () => cargar(1));
  $('#usu-nuevo').addEventListener('click', nuevoUsuario);
  cargar(1);
}
