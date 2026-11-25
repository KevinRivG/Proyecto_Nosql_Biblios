// Prueba rápida de todo el sistema contra el servidor corriendo.
// 1) npm run seed   2) npm run dev   3) en otra terminal: npm run prueba
// Crea datos de prueba, revisa las reglas del reglamento, corre las 30
// consultas y al final borra lo que creó.
import 'dotenv/config';
import mongoose from 'mongoose';
import Libro from '../src/models/Libro.js';
import Usuario from '../src/models/Usuario.js';
import Fiador from '../src/models/Fiador.js';
import Prestamo from '../src/models/Prestamo.js';

const URL = `http://localhost:${process.env.PORT || 4000}/graphql`;
const TITULO_PRUEBA = 'LIBRO DE PRUEBA BIBLIOS';
let ok = 0;
let fallas = 0;

async function gql(query, variables = {}) {
  const r = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await r.json();
  if (json.errors) throw new Error(json.errors.map((e) => e.message).join(' | '));
  return json.data;
}

async function paso(nombre, fn) {
  try {
    const r = await fn();
    ok++;
    console.log(`  OK   ${nombre}${typeof r === 'string' ? ` (${r})` : ''}`);
    return r;
  } catch (err) {
    fallas++;
    console.log(`  FALLA ${nombre}: ${err.message}`);
    return null;
  }
}

// la operación DEBE fallar con un mensaje que contenga "esperado"
async function debeFallar(nombre, esperado, fn) {
  return paso(nombre, async () => {
    try {
      await fn();
    } catch (err) {
      if (err.message.toLowerCase().includes(esperado.toLowerCase())) return;
      throw new Error(`falló pero con otro mensaje: ${err.message}`);
    }
    throw new Error('debía marcar error y no lo hizo');
  });
}

const PERSONA = (paterno, edad = 22) => ({
  nombre: { paterno, materno: 'Prueba', nombres: 'Usuario' },
  edad,
  domicilio: { calle: 'Av. Tecnológico 2595', colonia: 'Lagos del Country', cp: '63175' },
  telefonos: { movil: '3110000000' },
});

async function main() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME || 'biblios' });
  console.log(`\nProbando ${URL}\n`);

  console.log('Conteos');
  await paso('cada colección tiene 1000 documentos', async () => {
    const c = [await Fiador.countDocuments(), await Usuario.countDocuments(), await Libro.countDocuments(), await Prestamo.countDocuments()];
    if (c.some((n) => n < 1000)) throw new Error(`fiadores/usuarios/libros/prestamos = ${c.join('/')}`);
  });
  await paso('resumen', () => gql('{ resumen { titulos ejemplares prestamosActivos } }'));

  console.log('\nCatálogo (Kevin)');
  const libro = await paso('crearLibro con 2 ejemplares', async () => {
    const d = await gql(
      `mutation($input: LibroInput!) { crearLibro(input: $input, ejemplares: 2) { id colocacion totalEjemplares disponibles } }`,
      { input: { titulo: TITULO_PRUEBA, autores: ['Equipo BIBLIOS'], sala: 'GENERAL', clasificacion: { dewey: '005.74', cutter: 'B53' } } }
    );
    if (d.crearLibro.colocacion !== '005.74 B53') throw new Error('colocación incorrecta');
    return d.crearLibro;
  });
  await paso('buscar el libro en el catálogo', async () => {
    const d = await gql(`{ libros(busqueda: "${TITULO_PRUEBA}") { total } }`);
    if (d.libros.total !== 1) throw new Error('no aparece');
  });
  await debeFallar('Dewey inválido', 'Dewey', () =>
    gql(`mutation { crearLibro(input: { titulo: "x", autores: ["x"], sala: GENERAL, clasificacion: { dewey: "abc", cutter: "A1" } }) { id } }`)
  );

  console.log('\nUsuarios (Luis)');
  const crearUsuario = (paterno, fiadorId) =>
    gql(
      `mutation($input: UsuarioInput!, $fiadorId: ID, $fiador: FiadorInput) {
        crearUsuario(input: $input, fiadorId: $fiadorId, fiador: $fiador) { id credencial situacion fiador { id } } }`,
      { input: { ...PERSONA(paterno), ocupacion: 'ESTUDIANTE' }, fiadorId, fiador: fiadorId ? null : { ...PERSONA('Aval', 45) } }
    ).then((d) => d.crearUsuario);
  const u1 = await paso('crear usuario con fiador nuevo', () => crearUsuario('Uno'));
  const u2 = await paso('crear usuario con fiador existente', () => crearUsuario('Dos', u1?.fiador.id));
  const u3 = await paso('crear tercer usuario', () => crearUsuario('Tres', u1?.fiador.id));
  await debeFallar('usuario sin fiador', 'fiador', () =>
    gql(`mutation($input: UsuarioInput!) { crearUsuario(input: $input) { id } }`, { input: { ...PERSONA('Sin'), ocupacion: 'OTRO' } })
  );
  await debeFallar('fiador menor de edad', 'mayor de 18', () => gql(`mutation($i: FiadorInput!) { crearFiador(input: $i) { id } }`, { i: PERSONA('Chico', 15) }));
  await paso('credencial vigente por 2 años', async () => {
    const d = await gql(`{ usuarioPorCredencial(credencial: "${u1.credencial}") { fechaExpedicion fechaVencimiento vigente } }`);
    const u = d.usuarioPorCredencial;
    const anios = (new Date(u.fechaVencimiento) - new Date(u.fechaExpedicion)) / (365 * 86400000);
    if (!u.vigente || anios < 1.99) throw new Error(`vigencia de ${anios.toFixed(2)} años`);
  });
  await debeFallar('renovar credencial recién expedida', 'vigencia', () => gql(`mutation { renovarCredencial(credencial: "${u1.credencial}") { id } }`));
  await paso('expedir duplicado', () => gql(`mutation { expedirDuplicado(credencial: "${u1.credencial}") { duplicadoExpedido } }`));
  await debeFallar('segundo duplicado', 'duplicado', () => gql(`mutation { expedirDuplicado(credencial: "${u1.credencial}") { id } }`));

  console.log('\nPréstamos y apartados (María)');
  const prestar = (cred) =>
    gql(`mutation { crearPrestamo(credencial: "${cred}", libroId: "${libro.id}") { folio situacion fechaVencimiento inventario } }`).then((d) => d.crearPrestamo);
  const p1 = await paso('prestar a usuario 1', async () => {
    const p = await prestar(u1.credencial);
    const dias = Math.round((new Date(p.fechaVencimiento) - Date.now()) / 86400000);
    if (dias !== 7) throw new Error(`vence en ${dias} días`);
    return p;
  });
  await debeFallar('mismo libro dos veces al mismo usuario', 'ya tiene prestado', () => prestar(u1.credencial));
  const p2 = await paso('prestar el segundo ejemplar a usuario 2', () => prestar(u2.credencial));
  await debeFallar('prestar sin ejemplares disponibles', 'apartar', () => prestar(u3.credencial));
  await paso('usuario 3 aparta el libro', async () => {
    const d = await gql(`mutation { crearApartado(credencial: "${u3.credencial}", libroId: "${libro.id}") { estado lugarEnFila } }`);
    if (d.crearApartado.estado !== 'EN_ESPERA' || d.crearApartado.lugarEnFila !== 1) throw new Error(JSON.stringify(d.crearApartado));
  });
  await debeFallar('renovar con alguien esperando', 'esperando', () => gql(`mutation { renovarPrestamo(folio: ${p1.folio}) { folio } }`));
  await debeFallar('recordatorio de préstamo al día', 'vencidos', () => gql(`mutation { registrarRecordatorio(folio: ${p1.folio}) { folio } }`));
  await paso('devolver préstamo 1 (pasa al apartado)', async () => {
    const d = await gql(`mutation { devolverPrestamo(folio: ${p1.folio}, condicion: BUENO) { situacion diasRetraso } }`);
    if (d.devolverPrestamo.situacion !== 'A_TIEMPO') throw new Error(d.devolverPrestamo.situacion);
    const l = await gql(`{ libro(id: "${libro.id}") { ejemplares { inventario situacion } apartados { estado } } }`);
    const ej = l.libro.ejemplares.find((e) => e.inventario === p1.inventario);
    if (ej.situacion !== 'APARTADO' || l.libro.apartados[0].estado !== 'DISPONIBLE') throw new Error('el ejemplar no quedó apartado');
  });
  const p3 = await paso('usuario 3 recoge su apartado', async () => {
    const p = await prestar(u3.credencial);
    if (p.inventario !== p1.inventario) throw new Error('no le dieron el ejemplar apartado');
    return p;
  });
  await paso('renovar préstamo 2 (ya nadie espera)', () => gql(`mutation { renovarPrestamo(folio: ${p2.folio}) { renovaciones { fecha } } }`));
  await paso('historial y préstamos activos', async () => {
    const d = await gql(`{ historial(credencial: "${u1.credencial}") { folio situacion } prestamosActivos(credencial: "${u2.credencial}") { folio } }`);
    if (d.historial.length !== 1 || d.prestamosActivos.length !== 1) throw new Error(JSON.stringify(d));
  });
  await debeFallar('eliminar usuario con libro prestado', 'sin devolver', () => gql(`mutation { eliminarUsuario(id: "${u2.id}") }`));
  await debeFallar('eliminar libro con ejemplares prestados', 'prestados', () => gql(`mutation { eliminarLibro(id: "${libro.id}") }`));
  await paso('reportar extravío del préstamo 3', () => gql(`mutation { reportarExtravio(folio: ${p3.folio}) { estado } }`));
  await paso('eliminar préstamo capturado hoy', () => gql(`mutation { eliminarPrestamo(folio: ${p2.folio}) }`));

  console.log('\nLas 30 consultas complejas');
  const consultas = [
    '{ librosMasPrestados { titulo totalPrestamos } }',
    '{ disponibilidadPorSala { sala porcentajeOcupacion } }',
    '{ librosSinMovimiento { titulo ultimoPrestamo } }',
    '{ autoresMasLeidos { autor prestamos } }',
    '{ rotacionPorCategoria { categoria indiceRotacion } }',
    '{ librosConAltaDemanda { titulo sugerencia } }',
    '{ inventarioMantenimiento { sala totalAtender } }',
    '{ busquedaAvanzada(texto: "historia") { total porSala { clave total } } }',
    '{ antiguedadAcervo { rangos { desde titulos } } }',
    '{ preferenciasPorOcupacion { ocupacion categorias { clave total } } }',
    '{ credencialesPorVencer { credencial diasRestantes } }',
    '{ usuariosEnRiesgo { credencial retrasosUltimoAnio } }',
    '{ fiadoresConVariosUsuarios { fiadorNombre totalUsuarios } }',
    '{ distribucionUsuarios { totalActivos porColonia { clave total } } }',
    '{ lectoresMasActivos { credencial totalPrestamos } }',
    '{ usuariosInactivos { credencial diasSinPrestamo } }',
    '{ lectoresPorEdad { rango usuarios } }',
    '{ usuariosSancionados { credencial estado } }',
    '{ altasPorMes { nombreMes total } }',
    '{ perfilLector(credencial: "004821") { nombreCompleto totalPrestamos } }',
    '{ prestamosVencidos { folio diasRetraso } }',
    '{ agendaDevoluciones { fecha total } }',
    '{ puntualidadMensual { nombreMes porcentajePuntualidad } }',
    '{ duracionPorCategoria { categoria promedioDiasPrestado } }',
    '{ cargaMostrador { porDiaSemana { clave total } } }',
    '{ renovacionesFrecuentes { totalRenovaciones } }',
    '{ candidatosCancelacion { credencial maxRetraso } }',
    '{ estadisticaApartados { totalApartados porcentajeRecogidos } }',
    '{ deterioroEnDevoluciones { sala porcentaje } }',
    '{ informeMensual { nombreMes prestamos } }',
  ];
  for (const q of consultas) {
    const nombre = q.match(/\{ (\w+)/)[1];
    await paso(nombre, async () => {
      const inicio = Date.now();
      const d = await gql(q);
      const r = d[nombre];
      const filas = Array.isArray(r) ? `${r.length} filas` : r ? '1 objeto' : 'vacío';
      return `${filas}, ${Date.now() - inicio} ms`;
    });
  }

  // limpieza: se borra todo lo de prueba para dejar los 1000 exactos
  const libroDoc = await Libro.findOne({ titulo: TITULO_PRUEBA });
  const usuarios = await Usuario.find({ 'nombre.materno': 'Prueba', 'nombre.nombres': 'Usuario' });
  await Prestamo.deleteMany({ libro: libroDoc?._id });
  await Usuario.deleteMany({ _id: { $in: usuarios.map((u) => u._id) } });
  await Fiador.deleteMany({ 'nombre.paterno': 'Aval', 'nombre.materno': 'Prueba' });
  await Libro.deleteMany({ titulo: TITULO_PRUEBA });

  console.log(`\nResultado: ${ok} OK, ${fallas} fallas`);
  await mongoose.disconnect();
  process.exit(fallas ? 1 : 0);
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
