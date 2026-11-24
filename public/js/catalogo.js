// Pantalla 1: Catálogo (CRUD de libros y ejemplares) — Rivera González Kevin
import { gql } from './api.js';
import { $, $$, escapar, etiqueta, fecha, aviso, abrirModal, cerrarModal, paginacion, intentar, leerFormulario } from './util.js';

const CAMPOS_LIBRO = `
  id titulo autores editorial anioPublicacion isbn paginas idioma sala
  clasificacion { prefijo dewey cutter }
  colocacion categoria materias prestable totalEjemplares disponibles listaEspera
`;

const Q_LIBROS = `
  query Libros($busqueda: String, $sala: Sala, $soloDisponibles: Boolean, $pagina: Int) {
    libros(busqueda: $busqueda, sala: $sala, soloDisponibles: $soloDisponibles, pagina: $pagina, porPagina: 10) {
      total pagina paginas
      items { ${CAMPOS_LIBRO} }
    }
  }`;

const Q_LIBRO = `
  query Libro($id: ID!) {
    libro(id: $id) {
      ${CAMPOS_LIBRO}
      ejemplares { inventario numero estadoFisico situacion fechaAlta }
      apartados { id estado fechaSolicitud fechaLimiteRecoger usuario { credencial nombreCompleto } }
    }
  }`;

const M_CREAR = `
  mutation CrearLibro($input: LibroInput!, $ejemplares: Int) {
    crearLibro(input: $input, ejemplares: $ejemplares) { id titulo colocacion }
  }`;

const M_ACTUALIZAR = `
  mutation ActualizarLibro($id: ID!, $input: LibroUpdateInput!) {
    actualizarLibro(id: $id, input: $input) { id titulo colocacion }
  }`;

const M_ELIMINAR = `mutation EliminarLibro($id: ID!) { eliminarLibro(id: $id) }`;

const M_AGREGAR_EJ = `
  mutation AgregarEjemplar($libroId: ID!, $estadoFisico: EstadoFisico) {
    agregarEjemplar(libroId: $libroId, estadoFisico: $estadoFisico) { id totalEjemplares }
  }`;

const M_ACTUALIZAR_EJ = `
  mutation ActualizarEjemplar($libroId: ID!, $inventario: String!, $estadoFisico: EstadoFisico, $situacion: SituacionEjemplar) {
    actualizarEjemplar(libroId: $libroId, inventario: $inventario, estadoFisico: $estadoFisico, situacion: $situacion) { id }
  }`;

const M_ELIMINAR_EJ = `
  mutation EliminarEjemplar($libroId: ID!, $inventario: String!) {
    eliminarEjemplar(libroId: $libroId, inventario: $inventario) { id }
  }`;

let paginaActual = 1;

async function cargar(pagina = 1) {
  paginaActual = pagina;
  const lista = $('#cat-lista');
  const datos = await intentar(
    () =>
      gql(Q_LIBROS, {
        busqueda: $('#cat-busqueda').value || null,
        sala: $('#cat-sala').value || null,
        soloDisponibles: $('#cat-disponibles').checked,
        pagina,
      }),
    lista
  );
  if (!datos) return;
  const { libros } = datos;
  $('#cat-total').textContent = `${libros.total} títulos encontrados`;
  if (!libros.items.length) {
    lista.innerHTML = '<div class="vacio">No se encontraron libros con esa búsqueda</div>';
  } else {
    lista.innerHTML = libros.items
      .map((l) => {
        let estado;
        if (!l.prestable) estado = etiqueta('CONSULTA', 'solo consulta');
        else if (l.disponibles > 0) estado = etiqueta('DISPONIBLE', `disponible (${l.disponibles}/${l.totalEjemplares})`);
        else estado = etiqueta('PRESTADO', l.listaEspera ? `prestado · ${l.listaEspera} en espera` : 'prestado');
        return `
          <div class="tarjeta" data-id="${l.id}">
            <div>
              <div class="titulo">${escapar(l.titulo)}</div>
              <div class="meta">${escapar(l.autores.join(', '))} · ${escapar(l.editorial || '')} ${l.anioPublicacion || ''}</div>
            </div>
            <div class="codigo">${escapar(l.colocacion)}</div>
            <div>${estado}</div>
          </div>`;
      })
      .join('');
    $$('.tarjeta', lista).forEach((t) => t.addEventListener('click', () => verLibro(t.dataset.id)));
  }
  paginacion($('#cat-paginas'), libros, cargar);
}

function formularioLibro(l = {}) {
  const c = l.clasificacion || {};
  const salas = ['GENERAL', 'INFANTIL', 'JUVENIL', 'CONSULTA', 'NAYARITA'];
  return `
    <form id="form-libro">
      <div class="rejilla">
        <div class="ancho"><label>Título *</label><input name="titulo" required value="${escapar(l.titulo)}" /></div>
        <div class="ancho"><label>Autores * (separados por ;)</label><input name="autores" required value="${escapar((l.autores || []).join('; '))}" /></div>
        <div><label>Editorial</label><input name="editorial" value="${escapar(l.editorial)}" /></div>
        <div><label>Año de publicación</label><input name="anioPublicacion" type="number" min="1500" max="2100" value="${l.anioPublicacion ?? ''}" /></div>
        <div><label>ISBN</label><input name="isbn" value="${escapar(l.isbn)}" /></div>
        <div><label>Páginas</label><input name="paginas" type="number" min="1" value="${l.paginas ?? ''}" /></div>
        <div><label>Sala *</label>
          <select name="sala">${salas.map((s) => `<option ${l.sala === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
        </div>
        <div><label>Idioma</label><input name="idioma" value="${escapar(l.idioma || 'Español')}" /></div>
        <div><label>Clasificación Dewey * (ej. 863 o 005.73)</label><input name="clasificacion.dewey" required value="${escapar(c.dewey)}" /></div>
        <div><label>Librística / Cutter * (ej. A54)</label><input name="clasificacion.cutter" required value="${escapar(c.cutter)}" /></div>
        <div class="ancho"><label>Materias (separadas por ;)</label><input name="materias" value="${escapar((l.materias || []).join('; '))}" /></div>
        ${l.id ? '' : '<div><label>Ejemplares a dar de alta</label><input name="ejemplares" type="number" min="1" max="20" value="1" /></div>'}
      </div>
      <div class="barra" style="margin-top: 16px"><button class="btn" type="submit">${l.id ? 'Guardar cambios' : 'Dar de alta'}</button></div>
    </form>`;
}

function datosDelFormulario(form) {
  const d = leerFormulario(form);
  const separar = (txt) => (txt || '').split(';').map((x) => x.trim()).filter(Boolean);
  const ejemplares = d.ejemplares || 1;
  delete d.ejemplares;
  return { input: { ...d, autores: separar(d.autores), materias: separar(d.materias) }, ejemplares };
}

function nuevoLibro() {
  const cont = abrirModal(`<h2>Nuevo libro</h2><div class="detalle">Alta en el acervo</div>${formularioLibro()}`);
  $('#form-libro', cont).addEventListener('submit', async (e) => {
    e.preventDefault();
    const { input, ejemplares } = datosDelFormulario(e.target);
    const r = await intentar(() => gql(M_CREAR, { input, ejemplares }), e.target);
    if (r) {
      aviso(`Libro registrado con colocación ${r.crearLibro.colocacion}`);
      cerrarModal();
      cargar(paginaActual);
    }
  });
}

async function verLibro(id) {
  const datos = await intentar(() => gql(Q_LIBRO, { id }));
  if (!datos?.libro) return;
  const l = datos.libro;
  const espera = l.apartados.filter((a) => ['EN_ESPERA', 'DISPONIBLE'].includes(a.estado));

  const cont = abrirModal(`
    <h2>${escapar(l.titulo)}</h2>
    <div class="detalle">${escapar(l.colocacion)} · ${escapar(l.categoria)} · Sala ${escapar(l.sala.toLowerCase())}</div>
    <p style="margin-top:0">${escapar(l.autores.join(', '))}<br/>
      <span class="detalle">${escapar(l.editorial || '')} ${l.anioPublicacion || ''} · ISBN ${escapar(l.isbn || '—')} · ${l.paginas || '?'} págs.</span></p>

    <h3>Ejemplares</h3>
    <table>
      <thead><tr><th>Inventario</th><th>Ej.</th><th>Estado físico</th><th>Situación</th><th></th></tr></thead>
      <tbody>
        ${l.ejemplares
          .map(
            (e) => `
          <tr data-inv="${e.inventario}">
            <td class="mono">${e.inventario}</td>
            <td class="mono">${e.numero}</td>
            <td><select class="ej-fisico">${['BUENO', 'REGULAR', 'DANADO'].map((x) => `<option ${x === e.estadoFisico ? 'selected' : ''}>${x}</option>`).join('')}</select></td>
            <td>${
              ['PRESTADO', 'APARTADO'].includes(e.situacion)
                ? etiqueta(e.situacion)
                : `<select class="ej-situacion">${['DISPONIBLE', 'EXTRAVIADO', 'BAJA'].map((x) => `<option ${x === e.situacion ? 'selected' : ''}>${x}</option>`).join('')}</select>`
            }</td>
            <td class="acciones">
              <button class="btn chico ej-guardar">Guardar</button>
              <button class="btn chico rojo ej-eliminar">Eliminar</button>
            </td>
          </tr>`
          )
          .join('')}
      </tbody>
    </table>
    <div class="barra" style="margin-top:10px"><button class="btn borde chico" id="ej-agregar">+ Agregar ejemplar</button></div>

    ${
      espera.length
        ? `<h3>Lista de espera</h3>
          <table><thead><tr><th>Credencial</th><th>Usuario</th><th>Solicitó</th><th>Estado</th></tr></thead><tbody>
          ${espera
            .map(
              (a) => `<tr><td class="mono">${a.usuario?.credencial || '—'}</td><td>${escapar(a.usuario?.nombreCompleto || 'Usuario eliminado')}</td>
              <td class="mono">${fecha(a.fechaSolicitud)}</td><td>${etiqueta(a.estado, a.estado === 'DISPONIBLE' ? `recoger antes del ${fecha(a.fechaLimiteRecoger)}` : null)}</td></tr>`
            )
            .join('')}
          </tbody></table>`
        : ''
    }

    <h3>Editar datos</h3>
    ${formularioLibro(l)}
    <div class="barra" style="margin-top:14px"><button class="btn rojo" id="libro-eliminar">Eliminar libro</button></div>
  `);

  const refrescar = () => {
    verLibro(id);
    cargar(paginaActual);
  };

  $$('tr[data-inv]', cont).forEach((fila) => {
    const inventario = fila.dataset.inv;
    $('.ej-guardar', fila).addEventListener('click', async () => {
      const variables = { libroId: id, inventario, estadoFisico: $('.ej-fisico', fila).value };
      const sel = $('.ej-situacion', fila);
      if (sel) variables.situacion = sel.value;
      if (await intentar(() => gql(M_ACTUALIZAR_EJ, variables), fila)) {
        aviso(`Ejemplar ${inventario} actualizado`);
        refrescar();
      }
    });
    $('.ej-eliminar', fila).addEventListener('click', async () => {
      if (!confirm(`¿Eliminar el ejemplar ${inventario}?`)) return;
      if (await intentar(() => gql(M_ELIMINAR_EJ, { libroId: id, inventario }), fila)) {
        aviso('Ejemplar eliminado');
        refrescar();
      }
    });
  });

  $('#ej-agregar', cont).addEventListener('click', async () => {
    if (await intentar(() => gql(M_AGREGAR_EJ, { libroId: id, estadoFisico: 'BUENO' }))) {
      aviso('Ejemplar agregado');
      refrescar();
    }
  });

  $('#form-libro', cont).addEventListener('submit', async (e) => {
    e.preventDefault();
    const { input } = datosDelFormulario(e.target);
    if (await intentar(() => gql(M_ACTUALIZAR, { id, input }), e.target)) {
      aviso('Cambios guardados');
      refrescar();
    }
  });

  $('#libro-eliminar', cont).addEventListener('click', async () => {
    if (!confirm(`¿Eliminar "${l.titulo}" del catálogo?`)) return;
    if (await intentar(() => gql(M_ELIMINAR, { id }))) {
      aviso('Libro eliminado');
      cerrarModal();
      cargar(paginaActual);
    }
  });
}

export function iniciarCatalogo() {
  $('#cat-form').addEventListener('submit', (e) => {
    e.preventDefault();
    cargar(1);
  });
  $('#cat-sala').addEventListener('change', () => cargar(1));
  $('#cat-disponibles').addEventListener('change', () => cargar(1));
  $('#cat-nuevo').addEventListener('click', nuevoLibro);
  cargar(1);
}
