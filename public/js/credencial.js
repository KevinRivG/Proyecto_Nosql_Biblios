// Pantalla 2: Credencial digital (como la amarilla de la Red Nacional) — Durán Castañeda Luis
import { gql } from './api.js';
import { $, escapar, etiqueta, fecha, iniciales, aviso, intentar, normalizarCredencial } from './util.js';
import { nuevoUsuario } from './usuarios.js';

const Q_CREDENCIAL = `
  query Credencial($credencial: String!) {
    usuarioPorCredencial(credencial: $credencial) {
      id numRegistro credencial nombreCompleto edad ocupacion escuelaTrabajo
      nombre { paterno materno nombres }
      domicilio { calle colonia cp ciudad }
      fechaExpedicion fechaVencimiento duplicadoExpedido situacion motivoEstado suspendidoHasta
      prestamosActivos adeudos retrasosUltimoAnio
      amonestaciones { fecha folio diasRetraso }
      fiador { nombreCompleto telefonos { movil fijo } }
    }
    resumen { numeroBiblioteca }
  }`;

const M_RENOVAR = `mutation Renovar($credencial: String!) { renovarCredencial(credencial: $credencial) { id fechaVencimiento } }`;
const M_DUPLICADO = `mutation Duplicado($credencial: String!) { expedirDuplicado(credencial: $credencial) { id duplicadoExpedido } }`;

function dibujar(u, numBiblioteca) {
  const marca = { VENCIDA: 'VENCIDA', SUSPENDIDA: 'SUSPENDIDA', CANCELADA: 'CANCELADA' }[u.situacion];
  return `
    <div class="caja no-imprimir">
      ${etiqueta(u.situacion)}
      ${u.duplicadoExpedido ? '<span class="etiqueta gris">duplicado expedido</span>' : ''}
      <span class="detalle" style="margin-left:8px">
        ${u.prestamosActivos} préstamo(s) activo(s) · ${u.adeudos} adeudo(s) · ${u.retrasosUltimoAnio} retraso(s) en el último año
      </span>
      ${u.motivoEstado ? `<p class="detalle" style="margin:8px 0 0">${escapar(u.motivoEstado)}${u.suspendidoHasta ? ' — hasta el ' + fecha(u.suspendidoHasta) : ''}</p>` : ''}
    </div>

    <div class="credenciales">
      <div class="credencial">
        ${marca ? `<div class="marca">${marca}</div>` : ''}
        <div class="cab"><span>SEP · Secretaría de Educación Pública</span><span>Dirección General de Bibliotecas</span></div>
        <div class="red">Red Nacional de Bibliotecas Públicas</div>
        <div class="serv">Servicio de préstamo a domicilio</div>
        <div class="cuerpo">
          <div class="foto">
            <span class="num">N° ${u.credencial}</span>
            ${iniciales(u.nombre.paterno + ' ' + u.nombre.nombres)}
            <span class="sello">BIBLIOTECA<br/>${numBiblioteca}</span>
          </div>
          <div class="campos">
            <div class="campo"><small>Biblioteca No.</small>${numBiblioteca}</div>
            <div class="campo"><small>Lector (A. Paterno · A. Materno · Nombre(s))</small>${escapar(u.nombre.paterno)} ${escapar(u.nombre.materno || '')} ${escapar(u.nombre.nombres)}</div>
            <div class="campo"><small>Domicilio</small>${escapar(u.domicilio.calle)}, Col. ${escapar(u.domicilio.colonia)}, C.P. ${escapar(u.domicilio.cp)}</div>
            <div class="campo"><small>Fecha de vencimiento</small>${fecha(u.fechaVencimiento)}</div>
          </div>
        </div>
      </div>

      <div class="credencial reverso">
        <p><b>Se acredita al lector para:</b></p>
        <ul>
          <li>Obtener en préstamo a domicilio hasta tres libros simultáneamente durante una semana.</li>
          <li>Renovar el préstamo siempre que otra persona no lo haya solicitado.</li>
          <li>Apartar libros que se encuentren prestados.</li>
        </ul>
        <p><b>El lector se obliga a:</b></p>
        <ul>
          <li>Conservar en buen estado los materiales de la biblioteca.</li>
          <li>Devolver los libros prestados a domicilio en la fecha indicada.</li>
        </ul>
        <div class="firmas"><div>Firma del lector</div><div>Firma del encargado de la biblioteca</div></div>
      </div>
    </div>

    <div class="barra no-imprimir" style="justify-content:center">
      <button class="btn" id="cred-renovar">Renovar credencial</button>
      <button class="btn borde" id="cred-duplicado">Expedir duplicado</button>
      <button class="btn borde" id="cred-imprimir">Imprimir</button>
    </div>

    ${
      u.amonestaciones.length
        ? `<div class="caja no-imprimir"><b>Registro de retrasos</b>
            <table style="margin-top:8px"><thead><tr><th>Fecha</th><th>Folio</th><th>Días de retraso</th></tr></thead><tbody>
            ${u.amonestaciones
              .map((a) => `<tr><td class="mono">${fecha(a.fecha)}</td><td class="mono">${String(a.folio ?? '').padStart(6, '0')}</td><td class="mono">${a.diasRetraso}</td></tr>`)
              .join('')}
            </tbody></table></div>`
        : ''
    }
    <p class="detalle no-imprimir">Fiador: ${escapar(u.fiador?.nombreCompleto || '—')} · Tel. ${escapar(u.fiador?.telefonos.movil || u.fiador?.telefonos.fijo || '—')}</p>`;
}

async function mostrar(credencial) {
  const num = normalizarCredencial(credencial);
  const cont = $('#cred-contenido');
  if (!num) return;
  const datos = await intentar(() => gql(Q_CREDENCIAL, { credencial: num }), cont);
  if (!datos) return;
  const u = datos.usuarioPorCredencial;
  if (!u) {
    cont.innerHTML = `<div class="vacio">No existe la credencial ${num}</div>`;
    return;
  }
  cont.innerHTML = dibujar(u, datos.resumen.numeroBiblioteca);

  $('#cred-renovar').addEventListener('click', async () => {
    if (await intentar(() => gql(M_RENOVAR, { credencial: num }))) {
      aviso('Credencial renovada por dos años');
      mostrar(num);
    }
  });
  $('#cred-duplicado').addEventListener('click', async () => {
    if (!confirm('Solo se permite un duplicado por periodo de vigencia. ¿Continuar?')) return;
    if (await intentar(() => gql(M_DUPLICADO, { credencial: num }))) {
      aviso('Duplicado registrado');
      mostrar(num);
    }
  });
  $('#cred-imprimir').addEventListener('click', () => window.print());
}

export function iniciarCredencial() {
  $('#cred-form').addEventListener('submit', (e) => {
    e.preventDefault();
    mostrar($('#cred-numero').value);
  });
  // expedir una credencial nueva = registrar al lector con su fiador
  $('#cred-nueva').addEventListener('click', nuevoUsuario);
}

// para abrir la credencial desde otras pantallas
export function verCredencial(credencial) {
  $('#cred-numero').value = credencial;
  mostrar(credencial);
}
