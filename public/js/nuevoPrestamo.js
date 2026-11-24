// Pantalla 4: Nuevo préstamo — Zepeda Castañeda María Fernanda
import { gql } from './api.js';
import { $, $$, escapar, etiqueta, fecha, fechaHora, aviso, intentar, normalizarCredencial, hoyMasDias } from './util.js';

const Q_USUARIO = `
  query UsuarioPrestamo($credencial: String!) {
    usuarioPorCredencial(credencial: $credencial) { credencial nombreCompleto situacion prestamosActivos adeudos }
  }`;

const Q_BUSCAR = `
  query BuscarLibro($busqueda: String) {
    libros(busqueda: $busqueda, porPagina: 6) {
      items { id titulo autores colocacion prestable disponibles totalEjemplares listaEspera }
    }
  }`;

const M_PRESTAR = `
  mutation Prestar($credencial: String!, $libroId: ID!) {
    crearPrestamo(credencial: $credencial, libroId: $libroId) {
      folio folioTexto titulo colocacion inventario fechaPrestamo fechaVencimiento
      usuario { credencial nombreCompleto prestamosActivos }
    }
  }`;

const M_APARTAR = `
  mutation Apartar($credencial: String!, $libroId: ID!) {
    crearApartado(credencial: $credencial, libroId: $libroId) { titulo lugarEnFila estado }
  }`;

let libroElegido = null;
let temporizador;

function ponerFechas() {
  $('#np-fecha').value = fecha(new Date());
  $('#np-limite').value = fecha(hoyMasDias(7));
}

async function buscarUsuario() {
  const num = normalizarCredencial($('#np-credencial').value);
  if (!num) return;
  $('#np-credencial').value = num;
  const datos = await intentar(() => gql(Q_USUARIO, { credencial: num }));
  const u = datos?.usuarioPorCredencial;
  if (!u) {
    $('#np-usuario').value = 'No existe la credencial';
    return;
  }
  let nota = '';
  if (u.situacion !== 'ACTIVA') nota = ` (credencial ${u.situacion.toLowerCase()})`;
  else if (u.adeudos) nota = ' (tiene libros vencidos)';
  else nota = ` (${u.prestamosActivos}/3 libros)`;
  $('#np-usuario').value = u.nombreCompleto + nota;
}

async function buscarLibros() {
  const texto = $('#np-libro').value.trim();
  const cont = $('#np-resultados');
  if (texto.length < 3) {
    cont.innerHTML = '';
    return;
  }
  const datos = await intentar(() => gql(Q_BUSCAR, { busqueda: texto }));
  if (!datos) return;
  cont.innerHTML =
    datos.libros.items
      .map((l) => {
        let estado;
        if (!l.prestable) estado = etiqueta('CONSULTA', 'consulta');
        else if (l.disponibles) estado = etiqueta('DISPONIBLE', `${l.disponibles} disp.`);
        else estado = etiqueta('PRESTADO', l.listaEspera ? `${l.listaEspera} en espera` : 'prestado');
        return `<div class="tarjeta" data-id="${l.id}" data-disp="${l.disponibles}" data-prestable="${l.prestable}" data-titulo="${escapar(l.titulo)}">
          <div><div class="titulo">${escapar(l.titulo)}</div><div class="meta">${escapar(l.autores.join(', '))}</div></div>
          <div class="codigo">${escapar(l.colocacion)}</div><div>${estado}</div></div>`;
      })
      .join('') || '<div class="vacio">Sin resultados</div>';

  $$('.tarjeta', cont).forEach((t) =>
    t.addEventListener('click', () => {
      libroElegido = { id: t.dataset.id, titulo: t.dataset.titulo };
      $('#np-libro').value = t.dataset.titulo;
      cont.innerHTML = '';
      const sinEjemplares = t.dataset.disp === '0' && t.dataset.prestable === 'true';
      $('#np-apartar').classList.toggle('oculto', !sinEjemplares);
    })
  );
}

function comprobante(p) {
  return `
    <div class="comprobante">
      <div class="tit">COMPROBANTE DE PRÉSTAMO A DOMICILIO · BIBLIOTECA No. 0165</div>
      Folio <b>${p.folioTexto}</b> · ${escapar(p.titulo)} · Vence ${fecha(p.fechaVencimiento)}<br/>
      Colocación: ${escapar(p.colocacion)} · Inventario: ${p.inventario}<br/>
      Lector: ${p.usuario.credencial} — ${escapar(p.usuario.nombreCompleto)} · Registrado: ${fechaHora(p.fechaPrestamo)}<br/>
      <span class="detalle">Préstamos activos del usuario: ${p.usuario.prestamosActivos} de 3. Si no lo ha pedido otra persona, puede renovarlo al devolverlo a tiempo.</span>
    </div>`;
}

export function iniciarNuevoPrestamo() {
  ponerFechas();
  $('#np-credencial').addEventListener('change', buscarUsuario);
  $('#np-credencial').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      buscarUsuario();
    }
  });
  $('#np-libro').addEventListener('input', () => {
    libroElegido = null;
    $('#np-apartar').classList.add('oculto');
    clearTimeout(temporizador);
    temporizador = setTimeout(buscarLibros, 350);
  });

  $('#np-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const credencial = normalizarCredencial($('#np-credencial').value);
    if (!credencial) return aviso('Captura la credencial del usuario', 'error');
    if (!libroElegido) return aviso('Selecciona un libro de la lista', 'error');
    const r = await intentar(() => gql(M_PRESTAR, { credencial, libroId: libroElegido.id }), e.target);
    if (!r) return;
    $('#np-comprobante').innerHTML = comprobante(r.crearPrestamo) + $('#np-comprobante').innerHTML;
    aviso(`Préstamo registrado con folio ${r.crearPrestamo.folioTexto}`);
    libroElegido = null;
    $('#np-libro').value = '';
    ponerFechas();
    buscarUsuario();
  });

  $('#np-apartar').addEventListener('click', async () => {
    const credencial = normalizarCredencial($('#np-credencial').value);
    if (!credencial || !libroElegido) return aviso('Captura la credencial y selecciona el libro', 'error');
    const r = await intentar(() => gql(M_APARTAR, { credencial, libroId: libroElegido.id }));
    if (r) {
      aviso(`"${r.crearApartado.titulo}" apartado. Lugar en la fila: ${r.crearApartado.lugarEnFila}`);
      $('#np-apartar').classList.add('oculto');
    }
  });
}
