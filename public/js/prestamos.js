// Pantallas 3 y 5: Préstamos activos e Historial — Zepeda Castañeda María Fernanda
import { gql } from './api.js';
import { $, $$, escapar, etiqueta, fecha, aviso, abrirModal, cerrarModal, intentar, normalizarCredencial } from './util.js';

const CAMPOS_PRESTAMO = `
  folio folioTexto titulo colocacion inventario fechaPrestamo fechaVencimiento fechaDevolucion
  estado situacion diasRetraso condicionEntrega condicionDevolucion
  renovaciones { fecha } recordatorios { fecha medio dirigidoA }
`;

const Q_ACTIVOS = `
  query Activos($credencial: String!) {
    usuarioPorCredencial(credencial: $credencial) { credencial nombreCompleto situacion prestamosActivos }
    prestamosActivos(credencial: $credencial) { ${CAMPOS_PRESTAMO} }
    apartados(credencial: $credencial) { id libroId titulo colocacion estado fechaSolicitud fechaLimiteRecoger lugarEnFila }
  }`;

const Q_HISTORIAL = `
  query Historial($credencial: String!) {
    usuarioPorCredencial(credencial: $credencial) { credencial nombreCompleto situacion retrasosUltimoAnio }
    historial(credencial: $credencial) { ${CAMPOS_PRESTAMO} }
  }`;

const Q_VENCIDOS = `
  query Vencidos {
    prestamosVencidos { folio titulo fechaVencimiento diasRetraso recordatorios credencial lector telefonoLector fiador telefonoFiador }
  }`;

const M_DEVOLVER = `
  mutation Devolver($folio: Int!, $condicion: EstadoFisico) {
    devolverPrestamo(folio: $folio, condicion: $condicion) { folio diasRetraso situacion usuario { situacion } }
  }`;
const M_RENOVAR = `mutation Renovar($folio: Int!) { renovarPrestamo(folio: $folio) { folio fechaVencimiento } }`;
const M_RECORDATORIO = `
  mutation Recordatorio($folio: Int!, $medio: MedioRecordatorio, $dirigidoA: DirigidoA) {
    registrarRecordatorio(folio: $folio, medio: $medio, dirigidoA: $dirigidoA) { folio recordatorios { fecha } }
  }`;
const M_EXTRAVIO = `mutation Extravio($folio: Int!) { reportarExtravio(folio: $folio) { folio estado } }`;
const M_CANCELAR_APARTADO = `
  mutation CancelarApartado($libroId: ID!, $apartadoId: ID!) { cancelarApartado(libroId: $libroId, apartadoId: $apartadoId) { id estado } }`;

let credencialActual = '';

// ---------------------------------------------------------------- activos
async function cargarActivos(credencial) {
  credencialActual = normalizarCredencial(credencial);
  if (!credencialActual) return;
  const cont = $('#pre-contenido');
  const datos = await intentar(() => gql(Q_ACTIVOS, { credencial: credencialActual }), cont);
  if (!datos) return;
  const u = datos.usuarioPorCredencial;
  $('#pre-usuario').textContent = `Usuario N° ${u.credencial} — ${u.nombreCompleto} · credencial ${u.situacion.toLowerCase()}`;

  const prestamos = datos.prestamosActivos;
  const apartados = datos.apartados.filter((a) => ['EN_ESPERA', 'DISPONIBLE'].includes(a.estado));

  cont.innerHTML = `
    ${
      prestamos.length
        ? `<table>
        <thead><tr><th>Título</th><th>Folio</th><th>Prestado</th><th>Vence</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          ${prestamos
            .map(
              (p) => `
            <tr data-folio="${p.folio}">
              <td>${escapar(p.titulo)}<div class="detalle" style="margin:0">${escapar(p.colocacion)} · ${p.inventario}${p.renovaciones.length ? ` · renovado ${p.renovaciones.length}x` : ''}</div></td>
              <td class="mono">${p.folioTexto}</td>
              <td class="mono">${fecha(p.fechaPrestamo)}</td>
              <td class="mono">${fecha(p.fechaVencimiento)}</td>
              <td>${etiqueta(p.situacion, p.situacion === 'VENCIDO' ? `vencido ${p.diasRetraso} d` : null)}</td>
              <td class="acciones">
                ${
                  p.estado === 'ACTIVO'
                    ? `<button class="btn chico p-devolver">Devolver</button>
                       ${p.situacion === 'AL_DIA' ? '<button class="btn chico borde p-renovar">Renovar</button>' : '<button class="btn chico borde p-recordatorio">Recordatorio</button>'}
                       <button class="btn chico rojo p-extravio">Extravío</button>`
                    : ''
                }
              </td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>`
        : '<div class="vacio">El usuario no tiene préstamos activos</div>'
    }
    ${
      apartados.length
        ? `<h3 style="margin-top:28px">Libros apartados</h3>
        <table><thead><tr><th>Título</th><th>Solicitado</th><th>Estado</th><th></th></tr></thead><tbody>
        ${apartados
          .map(
            (a) => `<tr data-libro="${a.libroId}" data-apartado="${a.id}">
              <td>${escapar(a.titulo)}<div class="detalle" style="margin:0">${escapar(a.colocacion)}</div></td>
              <td class="mono">${fecha(a.fechaSolicitud)}</td>
              <td>${a.estado === 'DISPONIBLE' ? etiqueta('DISPONIBLE', `listo · recoger antes del ${fecha(a.fechaLimiteRecoger)}`) : etiqueta('EN_ESPERA', `en espera · lugar ${a.lugarEnFila}`)}</td>
              <td><button class="btn chico borde a-cancelar">Cancelar</button></td></tr>`
          )
          .join('')}
        </tbody></table>`
        : ''
    }`;

  $$('tr[data-folio]', cont).forEach((fila) => {
    const folio = Number(fila.dataset.folio);
    $('.p-devolver', fila)?.addEventListener('click', () => devolver(folio));
    $('.p-renovar', fila)?.addEventListener('click', async () => {
      const r = await intentar(() => gql(M_RENOVAR, { folio }), fila);
      if (r) {
        aviso(`Renovado. Nueva fecha de devolución: ${fecha(r.renovarPrestamo.fechaVencimiento)}`);
        cargarActivos(credencialActual);
      }
    });
    $('.p-recordatorio', fila)?.addEventListener('click', async () => {
      const r = await intentar(() => gql(M_RECORDATORIO, { folio, medio: 'TELEFONO', dirigidoA: 'USUARIO' }), fila);
      if (r) {
        const n = r.registrarRecordatorio.recordatorios.length;
        aviso(n >= 2 ? `Recordatorio ${n} registrado. Con dos sin respuesta procede la cancelación.` : 'Recordatorio registrado');
      }
    });
    $('.p-extravio', fila)?.addEventListener('click', async () => {
      if (!confirm('El usuario deberá reponer el material; si no lo hace, lo repone su fiador. ¿Registrar extravío?')) return;
      if (await intentar(() => gql(M_EXTRAVIO, { folio }), fila)) {
        aviso('Extravío registrado');
        cargarActivos(credencialActual);
      }
    });
  });

  $$('tr[data-apartado]', cont).forEach((fila) => {
    $('.a-cancelar', fila).addEventListener('click', async () => {
      if (await intentar(() => gql(M_CANCELAR_APARTADO, { libroId: fila.dataset.libro, apartadoId: fila.dataset.apartado }), fila)) {
        aviso('Apartado cancelado');
        cargarActivos(credencialActual);
      }
    });
  });
}

function devolver(folio) {
  const cont = abrirModal(`
    <h2>Devolución · folio ${String(folio).padStart(6, '0')}</h2>
    <div class="detalle">Verifique que el material regrese en buenas condiciones</div>
    <form id="form-devolucion">
      <label>Estado en que se recibe</label>
      <select name="condicion" style="width:100%">
        <option value="BUENO">Bueno</option>
        <option value="REGULAR">Regular</option>
        <option value="DANADO">Dañado</option>
      </select>
      <div class="barra" style="margin-top:16px"><button class="btn" type="submit">Sellar como DEVUELTO</button></div>
    </form>`);
  $('#form-devolucion', cont).addEventListener('submit', async (e) => {
    e.preventDefault();
    const condicion = e.target.condicion.value;
    const r = await intentar(() => gql(M_DEVOLVER, { folio, condicion }), e.target);
    if (!r) return;
    const p = r.devolverPrestamo;
    if (p.diasRetraso > 0) {
      aviso(`Devuelto con ${p.diasRetraso} día(s) de retraso. Se anotó en el registro.`, 'error');
      if (p.usuario?.situacion === 'SUSPENDIDA') aviso('Tercer retraso en el año: servicio suspendido por un año', 'error');
    } else {
      aviso('Devuelto a tiempo');
    }
    cerrarModal();
    cargarActivos(credencialActual);
  });
}

async function verVencidos() {
  const cont = $('#pre-contenido');
  const datos = await intentar(() => gql(Q_VENCIDOS), cont);
  if (!datos) return;
  $('#pre-usuario').textContent = `${datos.prestamosVencidos.length} préstamos vencidos en toda la biblioteca`;
  cont.innerHTML = datos.prestamosVencidos.length
    ? `<table><thead><tr><th>Folio</th><th>Título</th><th>Lector</th><th>Retraso</th><th>Recordat.</th><th>Fiador</th></tr></thead><tbody>
      ${datos.prestamosVencidos
        .map(
          (p) => `<tr>
          <td class="mono">${String(p.folio).padStart(6, '0')}</td>
          <td>${escapar(p.titulo)}</td>
          <td><a href="#" class="ver-usuario" data-cred="${p.credencial}" style="color:var(--primario);font-weight:500">${p.credencial}</a> ${escapar(p.lector)}<div class="detalle" style="margin:0">${escapar(p.telefonoLector || '')}</div></td>
          <td class="mono">${p.diasRetraso} días</td>
          <td class="mono">${p.recordatorios}</td>
          <td>${escapar(p.fiador || '—')}<div class="detalle" style="margin:0">${escapar(p.telefonoFiador || '')}</div></td></tr>`
        )
        .join('')}</tbody></table>`
    : '<div class="vacio">No hay préstamos vencidos</div>';
  $$('.ver-usuario', cont).forEach((a) =>
    a.addEventListener('click', (e) => {
      e.preventDefault();
      $('#pre-credencial').value = a.dataset.cred;
      cargarActivos(a.dataset.cred);
    })
  );
}

// ---------------------------------------------------------------- historial
async function cargarHistorial(credencial) {
  const num = normalizarCredencial(credencial);
  if (!num) return;
  const cont = $('#his-contenido');
  const datos = await intentar(() => gql(Q_HISTORIAL, { credencial: num }), cont);
  if (!datos) return;
  const u = datos.usuarioPorCredencial;
  const lista = datos.historial;
  const aTiempo = lista.filter((p) => p.situacion === 'A_TIEMPO').length;
  const conRetraso = lista.filter((p) => p.situacion === 'CON_RETRASO').length;
  $('#his-usuario').textContent = `Usuario N° ${u.credencial} — ${u.nombreCompleto}`;

  cont.innerHTML = lista.length
    ? `<div class="caja detalle" style="margin-bottom:14px">
        ${lista.length} préstamos · ${aTiempo} devueltos a tiempo · ${conRetraso} con retraso ·
        puntualidad ${aTiempo + conRetraso ? Math.round((aTiempo * 100) / (aTiempo + conRetraso)) : 100}% ·
        retrasos en el último año: ${u.retrasosUltimoAnio} de 3
      </div>
      <table><thead><tr><th>Título</th><th>Folio</th><th>Prestado</th><th>Devuelto</th><th>Estado</th></tr></thead><tbody>
      ${lista
        .map(
          (p) => `<tr>
          <td>${escapar(p.titulo)}<div class="detalle" style="margin:0">${escapar(p.colocacion)}</div></td>
          <td class="mono">${p.folioTexto}</td>
          <td class="mono">${fecha(p.fechaPrestamo)}</td>
          <td class="mono">${fecha(p.fechaDevolucion)}</td>
          <td>${etiqueta(p.situacion, p.situacion === 'CON_RETRASO' ? `con retraso (${p.diasRetraso} d)` : null)}</td></tr>`
        )
        .join('')}</tbody></table>`
    : '<div class="vacio">El usuario todavía no tiene préstamos</div>';
}

export function iniciarPrestamos() {
  $('#pre-form').addEventListener('submit', (e) => {
    e.preventDefault();
    cargarActivos($('#pre-credencial').value);
  });
  $('#pre-vencidos').addEventListener('click', verVencidos);
  $('#his-form').addEventListener('submit', (e) => {
    e.preventDefault();
    cargarHistorial($('#his-credencial').value);
  });
}
