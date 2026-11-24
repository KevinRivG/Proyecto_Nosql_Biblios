// Pantalla 7: las 30 consultas complejas (10 por integrante)
import { gql } from './api.js';
import { $, escapar, fecha, intentar } from './util.js';

const C = 'clave total';

// cada consulta: qué query manda, de qué área es y qué parámetros pide
const CONSULTAS = [
  // ---------------- catálogo y acervo ----------------
  { id: 'librosMasPrestados', area: 'catalogo', titulo: 'Libros más prestados', desc: 'Top de libros más prestados en un periodo, con lectores distintos y ejemplares disponibles', params: [['desde', 'fecha'], ['hasta', 'fecha'], ['limite', 'int', 10]],
    campos: 'titulo autores colocacion categoria totalPrestamos lectoresDistintos renovaciones ejemplares disponibles' },
  { id: 'disponibilidadPorSala', area: 'catalogo', titulo: 'Disponibilidad por sala y categoría', desc: 'Ejemplares disponibles, prestados, apartados y fuera de servicio por sala y categoría', params: [],
    campos: 'sala totalEjemplares disponibles prestados apartados fueraDeServicio porcentajeOcupacion categorias { categoria total disponibles prestados }' },
  { id: 'librosSinMovimiento', area: 'catalogo', titulo: 'Libros sin préstamos en N meses', desc: 'Libros que se pueden prestar pero no han salido en los últimos N meses', params: [['meses', 'int', 12], ['sala', 'sala'], ['limite', 'int', 50]],
    campos: 'titulo autores colocacion sala categoria anioPublicacion ejemplares ultimoPrestamo' },
  { id: 'autoresMasLeidos', area: 'catalogo', titulo: 'Autores más leídos', desc: 'Autores con más préstamos, lectores distintos y sus títulos más pedidos', params: [['desde', 'fecha'], ['limite', 'int', 10]],
    campos: 'autor prestamos lectoresDistintos titulosDistintos titulos' },
  { id: 'rotacionPorCategoria', area: 'catalogo', titulo: 'Índice de rotación por categoría', desc: 'Índice de rotación (préstamos por ejemplar) de cada clase Dewey', params: [['desde', 'fecha']],
    campos: 'categoria titulos ejemplares prestamos indiceRotacion' },
  { id: 'librosConAltaDemanda', area: 'catalogo', titulo: 'Libros con alta demanda', desc: 'Libros con muchos apartados por ejemplar y sugerencia de adquisición', params: [['meses', 'int', 12], ['minApartados', 'int', 2]],
    campos: 'titulo colocacion apartados enEspera vencidos prestamos ejemplaresActivos demandaPorEjemplar sugerencia' },
  { id: 'inventarioMantenimiento', area: 'catalogo', titulo: 'Ejemplares para reparar o reponer', desc: 'Ejemplares que requieren reparación o reposición, con responsable del extravío', params: [],
    campos: 'sala danados regulares extraviados totalAtender ejemplares { inventario titulo estadoFisico situacion responsable }' },
  { id: 'busquedaAvanzada', area: 'catalogo', titulo: 'Búsqueda avanzada con facetas', desc: 'Búsqueda por texto con conteos por sala, categoría y década en una sola consulta', params: [['texto', 'texto', 'historia'], ['sala', 'sala'], ['soloDisponibles', 'bool'], ['pagina', 'int', 1]],
    campos: `total resultados { titulo autores colocacion sala disponibles ejemplares } porSala { ${C} } porCategoria { ${C} } porDecada { ${C} }` },
  { id: 'antiguedadAcervo', area: 'catalogo', titulo: 'Antigüedad del acervo', desc: 'Distribución del acervo por año de publicación y antigüedad promedio por sala', params: [],
    campos: 'rangos { desde titulos ejemplares promedioPaginas } porSala { sala anioPromedio masAntiguo masReciente antiguedadPromedio }' },
  { id: 'preferenciasPorOcupacion', area: 'catalogo', titulo: 'Categorías preferidas por ocupación', desc: 'Top de categorías que lee cada ocupación de usuario', params: [['top', 'int', 3], ['desde', 'fecha']],
    campos: `ocupacion totalPrestamos categorias { ${C} }` },

  // ---------------- usuarios, credenciales y fiadores ----------------
  { id: 'credencialesPorVencer', area: 'usuarios', titulo: 'Credenciales por vencer', desc: 'Credenciales activas que vencen en los próximos N días, con préstamos activos', params: [['dias', 'int', 30]],
    campos: 'credencial nombreCompleto telefono correo fechaVencimiento diasRestantes prestamosActivos' },
  { id: 'usuariosEnRiesgo', area: 'usuarios', titulo: 'Usuarios a un retraso de la suspensión', desc: 'Usuarios activos con 2 o más retrasos en los últimos 12 meses y datos de su fiador', params: [],
    campos: 'credencial nombreCompleto retrasosUltimoAnio diasRetrasoAcumulados ultimoRetraso prestamosActivos prestamosVencidos fiadorNombre fiadorTelefono' },
  { id: 'fiadoresConVariosUsuarios', area: 'usuarios', titulo: 'Fiadores de varios usuarios', desc: 'Fiadores que avalan a 2 o más usuarios y cuántos de esos usuarios tienen libros vencidos', params: [['minimo', 'int', 2]],
    campos: 'fiadorNombre telefono ocupacion totalUsuarios usuarios usuariosConAdeudo librosPendientes' },
  { id: 'distribucionUsuarios', area: 'usuarios', titulo: 'Usuarios por colonia, C.P. y ocupación', desc: 'Usuarios agrupados por colonia, código postal y ocupación (solo credenciales activas)', params: [['top', 'int', 15]],
    campos: `totalActivos porColonia { ${C} } porCodigoPostal { ${C} } porOcupacion { ${C} }` },
  { id: 'lectoresMasActivos', area: 'usuarios', titulo: 'Lectores más activos del año', desc: 'Usuarios con más préstamos en el año y su porcentaje de puntualidad', params: [['anio', 'int', new Date().getFullYear()], ['limite', 'int', 10]],
    campos: 'credencial nombreCompleto ocupacion totalPrestamos titulosDistintos devueltosATiempo devueltosConRetraso porcentajePuntualidad' },
  { id: 'usuariosInactivos', area: 'usuarios', titulo: 'Usuarios vigentes sin préstamos recientes', desc: 'Usuarios con credencial vigente sin préstamos en los últimos N meses', params: [['meses', 'int', 6], ['limite', 'int', 50]],
    campos: 'credencial nombreCompleto telefono correo fechaExpedicion ultimoPrestamo diasSinPrestamo' },
  { id: 'lectoresPorEdad', area: 'usuarios', titulo: 'Lectores por rango de edad', desc: 'Usuarios por rango de edad con total y promedio de préstamos por persona', params: [],
    campos: 'rango usuarios edadPromedio prestamos promedioPrestamos' },
  { id: 'usuariosSancionados', area: 'usuarios', titulo: 'Usuarios suspendidos o cancelados', desc: 'Usuarios suspendidos o cancelados con libros pendientes y fiador responsable', params: [],
    campos: 'credencial nombreCompleto estado motivo suspendidoHasta diasRestantesSuspension totalAmonestaciones librosPendientes fiadorNombre fiadorTelefono' },
  { id: 'altasPorMes', area: 'usuarios', titulo: 'Credenciales expedidas por mes', desc: 'Credenciales expedidas por mes en un año, desglosadas por ocupación', params: [['anio', 'int', new Date().getFullYear()]],
    campos: `mes nombreMes total porOcupacion { ${C} }` },
  { id: 'perfilLector', area: 'usuarios', titulo: 'Perfil completo de un lector', desc: 'Ficha completa de un usuario: fiador, estadísticas, categoría favorita, apartados y últimos préstamos', params: [['credencial', 'texto', '004821', true]],
    campos: 'credencial nombreCompleto edad ocupacion estado vigente fechaVencimiento fiadorNombre totalPrestamos activos extraviados devueltosATiempo devueltosConRetraso categoriaFavorita amonestaciones apartadosActivos ultimosPrestamos { folio titulo fechaPrestamo estado diasRetraso }' },

  // ---------------- préstamos, devoluciones y apartados ----------------
  { id: 'prestamosVencidos', area: 'prestamos', titulo: 'Préstamos vencidos', desc: 'Préstamos activos ya vencidos con días de retraso, recordatorios y contacto de lector y fiador', params: [],
    campos: 'folio titulo fechaVencimiento diasRetraso recordatorios credencial lector telefonoLector fiador telefonoFiador' },
  { id: 'agendaDevoluciones', area: 'prestamos', titulo: 'Agenda de devoluciones', desc: 'Préstamos activos agrupados por la fecha en que se deben devolver (próximos N días)', params: [['dias', 'int', 7]],
    campos: 'fecha diaSemana total prestamos { folio titulo credencial lector }' },
  { id: 'puntualidadMensual', area: 'prestamos', titulo: 'Puntualidad por mes', desc: 'Por mes: devoluciones a tiempo, con retraso, % de puntualidad y promedio de días de retraso', params: [['anio', 'int', new Date().getFullYear()]],
    campos: 'nombreMes devueltos aTiempo conRetraso porcentajePuntualidad promedioDiasRetraso' },
  { id: 'duracionPorCategoria', area: 'prestamos', titulo: 'Duración real de préstamos por categoría', desc: 'Días reales que dura un préstamo por categoría, retraso promedio y % de renovación', params: [],
    campos: 'categoria prestamos promedioDiasPrestado maximoDias promedioDiasRetraso porcentajeRenovados' },
  { id: 'cargaMostrador', area: 'prestamos', titulo: 'Carga del mostrador', desc: 'Cantidad de préstamos por día de la semana, hora del día y mes (para organizar turnos)', params: [['desde', 'fecha'], ['hasta', 'fecha']],
    campos: `porDiaSemana { ${C} } porHora { ${C} } porMes { ${C} }` },
  { id: 'renovacionesFrecuentes', area: 'prestamos', titulo: 'Renovaciones frecuentes', desc: 'Ranking de libros más renovados y de usuarios que más renuevan', params: [['limite', 'int', 10]],
    campos: 'prestamosRenovados totalRenovaciones libros { nombre detalle total } usuarios { nombre detalle total }' },
  { id: 'candidatosCancelacion', area: 'prestamos', titulo: 'Candidatos a cancelación', desc: 'Usuarios con libros vencidos y 2+ recordatorios, candidatos a cancelación, con su fiador', params: [['minRecordatorios', 'int', 2]],
    campos: 'credencial lector estadoCredencial maxRetraso libros { folio titulo diasRetraso recordatorios } fiadorNombre fiadorTelefono fiadorTrabajo' },
  { id: 'estadisticaApartados', area: 'prestamos', titulo: 'Estadística de apartados', desc: 'Apartados por estado, días promedio de espera, % recogidos y libros más apartados', params: [['desde', 'fecha']],
    campos: `totalApartados porEstado { ${C} } promedioDiasEspera maximoDiasEspera porcentajeRecogidos librosMasApartados { ${C} }` },
  { id: 'deterioroEnDevoluciones', area: 'prestamos', titulo: 'Libros que regresaron dañados', desc: 'Devoluciones donde el libro regresó en peor estado, por sala, con el lector responsable', params: [],
    campos: 'sala devoluciones conDeterioro porcentaje casos { folio titulo lector entrega devolucion fecha }' },
  { id: 'informeMensual', area: 'prestamos', titulo: 'Informe mensual', desc: 'Informe del mes: préstamos, devoluciones, retrasos, extravíos, lectores, nuevas credenciales y tops', params: [['anio', 'int', new Date().getFullYear()], ['mes', 'int', new Date().getMonth() + 1]],
    campos: `nombreMes anio prestamos lectoresDistintos renovaciones devoluciones devolucionesConRetraso extraviados nuevasCredenciales apartados librosMasPrestados { ${C} } categoriasMasPrestadas { ${C} }` },
];

const AREAS = {
  catalogo: { nombre: 'Catálogo y acervo', trata: 'Libros, ejemplares, autores y estado del acervo' },
  usuarios: { nombre: 'Usuarios y credenciales', trata: 'Lectores, credenciales, fiadores y sanciones' },
  prestamos: { nombre: 'Préstamos y apartados', trata: 'Préstamos, devoluciones, renovaciones y apartados' },
};

const TIPOS_GQL = { fecha: 'Fecha', int: 'Int', texto: 'String', sala: 'Sala', bool: 'Boolean' };

// lo que ve el usuario en cada campo (en GraphQL no se puede usar la ñ)
const ETIQUETAS = {
  anio: 'Año', mes: 'Mes (1 a 12)', desde: 'Desde', hasta: 'Hasta', dias: 'Días', meses: 'Meses',
  limite: 'Máximo de resultados', top: 'Cuántas categorías', texto: 'Texto a buscar', pagina: 'Página',
  minApartados: 'Mínimo de apartados', minimo: 'Mínimo de usuarios', minRecordatorios: 'Mínimo de recordatorios',
  credencial: 'Credencial', soloDisponibles: 'Solo disponibles',
};
const etiquetaDe = (n) => ETIQUETAS[n] || n;

function armarQuery(c) {
  if (!c.params.length) return `query { ${c.id} { ${c.campos} } }`;
  const defs = c.params.map(([n, t, , req]) => `$${n}: ${TIPOS_GQL[t]}${req ? '!' : ''}`).join(', ');
  const args = c.params.map(([n]) => `${n}: $${n}`).join(', ');
  return `query (${defs}) { ${c.id}(${args}) { ${c.campos} } }`;
}

// lectoresDistintos -> lectores distintos
function nombreCampo(clave) {
  return clave.replace(/([A-Z])/g, ' $1').toLowerCase();
}

function esFecha(clave, v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v) && /fecha|ultimo|suspendido|desde/i.test(clave);
}

function celda(clave, v) {
  if (v === null || v === undefined) return '—';
  if (esFecha(clave, v)) return fecha(v);
  if (typeof v === 'boolean') return v ? 'sí' : 'no';
  if (Array.isArray(v)) {
    if (!v.length) return '—';
    if (typeof v[0] !== 'object') return escapar(v.join(', '));
    if ('clave' in v[0]) return `<ul>${v.map((x) => `<li>${escapar(x.clave)}: <b>${x.total}</b></li>`).join('')}</ul>`;
    return tabla(v);
  }
  if (typeof v === 'object') return `<pre>${escapar(JSON.stringify(v, null, 1))}</pre>`;
  return escapar(v);
}

function tabla(filas) {
  if (!filas.length) return '<div class="vacio">Sin resultados</div>';
  const columnas = Object.keys(filas[0]);
  return `<table><thead><tr>${columnas.map((c) => `<th>${escapar(nombreCampo(c))}</th>`).join('')}</tr></thead>
    <tbody>${filas.map((f) => `<tr>${columnas.map((c) => `<td>${celda(c, f[c])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function mostrarResultado(resultado) {
  if (Array.isArray(resultado)) return tabla(resultado);
  if (!resultado) return '<div class="vacio">Sin resultados</div>';
  // un solo objeto: datos sueltos arriba y las listas abajo
  const sueltos = Object.entries(resultado).filter(([, v]) => !Array.isArray(v));
  const listas = Object.entries(resultado).filter(([, v]) => Array.isArray(v));
  return `
    ${sueltos.length ? `<div class="caja">${sueltos.map(([k, v]) => `<span class="detalle">${escapar(nombreCampo(k))}:</span> <b>${celda(k, v)}</b>`).join(' &nbsp; ')}</div>` : ''}
    ${listas.map(([k, v]) => `<h3>${escapar(nombreCampo(k))}</h3>${typeof v[0] === 'object' && v[0] && 'clave' in v[0] ? tabla(v) : celda(k, v)}`).join('')}`;
}

function elegir(id) {
  const c = CONSULTAS.find((x) => x.id === id);
  $('#con-descripcion').innerHTML = `<b>${AREAS[c.area].nombre}</b> · ${escapar(c.desc)}`;
  $('#con-resultado').innerHTML = '';
  $('#con-form').innerHTML = `
    ${c.params
      .map(([n, t, def]) => {
        if (t === 'sala') {
          return `<select name="${n}"><option value="">sala (todas)</option>${['GENERAL', 'INFANTIL', 'JUVENIL', 'CONSULTA', 'NAYARITA'].map((s) => `<option>${s}</option>`).join('')}</select>`;
        }
        if (t === 'bool') return `<label class="check"><input type="checkbox" name="${n}" /> ${etiquetaDe(n)}</label>`;
        const tipo = t === 'fecha' ? 'date' : t === 'int' ? 'number' : 'text';
        return `<div><label>${etiquetaDe(n)}</label><input type="${tipo}" name="${n}" value="${def ?? ''}" /></div>`;
      })
      .join('')}
    <button class="btn" type="submit" style="align-self:flex-end">Ejecutar consulta</button>`;
  $('#con-form').onsubmit = async (e) => {
    e.preventDefault();
    const variables = {};
    for (const [n, t] of c.params) {
      const campo = e.target.elements[n];
      if (t === 'bool') variables[n] = campo.checked;
      else if (campo.value === '') continue;
      else variables[n] = t === 'int' ? Number(campo.value) : campo.value;
    }
    const inicio = performance.now();
    const datos = await intentar(() => gql(armarQuery(c), variables), $('#con-resultado'));
    if (!datos) return;
    const ms = Math.round(performance.now() - inicio);
    const r = datos[c.id];
    $('#con-resultado').innerHTML = `<p class="detalle">${Array.isArray(r) ? r.length + ' filas · ' : ''}${ms} ms</p>${mostrarResultado(r)}`;
  };
}

export function iniciarConsultas() {
  const sel = $('#con-lista');
  let numero = 0;
  sel.innerHTML = Object.entries(AREAS)
    .map(
      ([clave, area]) =>
        `<optgroup label="${area.nombre} — ${area.trata}">${CONSULTAS.filter((c) => c.area === clave)
          .map((c) => `<option value="${c.id}">${++numero}. ${c.titulo}</option>`)
          .join('')}</optgroup>`
    )
    .join('');
  sel.addEventListener('change', () => elegir(sel.value));
  elegir(CONSULTAS[0].id);
}

export { CONSULTAS, armarQuery };
