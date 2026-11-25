// Genera 1000 documentos por colección simulando ~2 años de operación
// de la biblioteca y respetando el reglamento (3 libros, 7 días,
// renovaciones, apartados, retrasos y suspensiones).
import { Types } from 'mongoose';
import { fakerES_MX as faker } from '@faker-js/faker';
import {
  CATEGORIAS, LIBROS_REALES, TEMAS, FORMATOS_TITULO, FORMATOS_INFANTIL, TITULOS_INFANTILES,
  EDITORIALES, DEWEY_TEMA, COLONIAS_TEPIC, CALLES, ESCUELAS, TRABAJOS, NOMBRES, APELLIDOS,
} from './datos.js';

const DIA = 86400000;
const TOTAL = 1000;

const oid = () => new Types.ObjectId();
const azar = () => faker.number.float({ min: 0, max: 1 });
const entero = (min, max) => faker.number.int({ min, max });
const elegir = (arr) => faker.helpers.arrayElement(arr);
const sumarDias = (f, d) => new Date(f.getTime() + d * DIA);
const nombre = () => elegir(NOMBRES);
const apellido = () => elegir(APELLIDOS);

function elegirPonderado(items, pesos, total) {
  let r = azar() * total;
  for (let i = 0; i < items.length; i++) {
    r -= pesos[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

// la biblioteca atiende de lunes a sábado de 9 a 19 h
function horarioBiblioteca(fecha) {
  const d = new Date(fecha);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  d.setHours(entero(9, 18), entero(0, 59), entero(0, 59), 0);
  return d;
}

function quitarAcentos(txt) {
  return txt.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function cutter(autor, titulo) {
  let base = autor;
  if (!autor || /varios autores|equipo|real academia|cámara|gobierno|inegi|colegio|cruz roja/i.test(autor)) {
    base = titulo.replace(/^(el|la|los|las|un|una|mi)\s+/i, '');
  } else {
    const p = autor.split(' ');
    base = p.length >= 3 ? p[p.length - 2] : p[p.length - 1];
  }
  const letra = quitarAcentos(base).toUpperCase().replace(/[^A-Z]/g, '')[0] || 'X';
  let h = 0;
  for (const c of base) h = (h * 31 + c.charCodeAt(0)) % 89;
  return `${letra}${String(h + 10)}`;
}

function telefono() {
  return `311${entero(1000000, 9999999)}`;
}

function correoDe(nombres, paterno) {
  const n = quitarAcentos(nombres.split(' ')[0]).toLowerCase();
  const p = quitarAcentos(paterno).toLowerCase().replace(/\s/g, '');
  const dom = elegir(['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com.mx', 'gmail.com']);
  return `${n}.${p}${entero(1, 99)}@${dom}`;
}

function domicilio() {
  const [colonia, cp] = elegir(COLONIAS_TEPIC);
  return { calle: `${elegir(CALLES)} ${entero(1, 1500)}`, colonia, cp, ciudad: 'Tepic' };
}

// ------------------------------------------------------------------ libros
function generarLibros(inicioOperacion) {
  const libros = [];
  const usados = new Set();
  let inv = 1;

  const prefijos = { GENERAL: '', INFANTIL: 'I', JUVENIL: 'J', CONSULTA: 'R', NAYARITA: 'N' };

  const nuevo = ({ titulo, autores, editorial, anio, dewey, sala, popularidad, materias }) => {
    const clase = String(Math.floor(parseFloat(dewey) / 100) * 100).padStart(3, '0');
    const categoria = CATEGORIAS[clase === '000' ? '000' : Number(clase)];
    const cut = cutter(autores[0], titulo);
    const prefijo = prefijos[sala];
    let nEj;
    if (sala === 'CONSULTA') nEj = entero(1, 2);
    else if (popularidad > 3) nEj = elegirPonderado([1, 2, 3], [3, 4, 2], 9);
    else nEj = elegirPonderado([1, 2], [7, 3], 10);

    const ejemplares = [];
    for (let i = 1; i <= nEj; i++) {
      ejemplares.push({
        _id: oid(),
        inventario: `0165-${String(inv++).padStart(6, '0')}`,
        numero: i,
        estadoFisico: elegirPonderado(['BUENO', 'REGULAR', 'DANADO'], [80, 17, 3], 100),
        situacion: 'DISPONIBLE',
        fechaAlta: new Date(inicioOperacion.getTime() - entero(30, 3000) * DIA),
      });
    }
    usados.add(titulo.toLowerCase());
    libros.push({
      _id: oid(),
      titulo,
      autores,
      editorial,
      anioPublicacion: anio,
      isbn: `978-${elegir(['607', '968', '970', '84'])}-${entero(10000, 99999)}-${entero(100, 999)}-${entero(0, 9)}`,
      paginas: sala === 'INFANTIL' ? entero(24, 96) : entero(90, 680),
      idioma: 'Español',
      sala,
      clasificacion: { prefijo, dewey, cutter: cut },
      colocacion: [prefijo, dewey, cut].filter(Boolean).join(' '),
      categoria,
      materias: materias || [categoria],
      ejemplares,
      apartados: [],
      popularidad, // solo para la simulación, se quita antes de guardar
    });
  };

  for (const linea of LIBROS_REALES) {
    const [titulo, autores, editorial, anio, dewey, sala] = linea.split('|');
    nuevo({
      titulo,
      autores: autores.split(';'),
      editorial,
      anio: Number(anio),
      dewey,
      sala,
      popularidad: sala === 'CONSULTA' ? 0 : entero(3, 12),
    });
  }

  const clases = Object.keys(TEMAS);
  let intentos = 0;
  while (libros.length < TOTAL && intentos < 20000) {
    intentos++;
    const clase = elegir(clases);
    const tema = elegir(TEMAS[clase]);
    let sala = elegirPonderado(['GENERAL', 'INFANTIL', 'JUVENIL', 'CONSULTA'], [58, 16, 16, 10], 100);
    if (tema === 'Historia de Nayarit') sala = 'NAYARITA';

    let titulo;
    const t = tema.charAt(0).toLowerCase() + tema.slice(1);
    const armar = (formato) => formato.replace('{T}', tema).replace('{t}', t);
    if (sala === 'INFANTIL' && azar() < 0.35) {
      titulo = elegir(TITULOS_INFANTILES);
      if (usados.has(titulo.toLowerCase())) continue;
    } else if (sala === 'INFANTIL') {
      titulo = armar(elegir(FORMATOS_INFANTIL));
    } else {
      titulo = armar(elegir(FORMATOS_TITULO));
    }
    if (sala === 'CONSULTA' && azar() < 0.5) titulo = `Enciclopedia de ${t}`;
    if (usados.has(titulo.toLowerCase())) {
      titulo = `${titulo} ${elegir(['I', 'II', 'III', 'IV'])}`;
      if (usados.has(titulo.toLowerCase())) continue;
    }

    const nAut = elegirPonderado([1, 2, 3], [70, 22, 8], 100);
    const autores = Array.from({ length: nAut }, () => `${nombre()} ${apellido()}`);
    const dewey = TITULOS_INFANTILES.includes(titulo) ? '863' : DEWEY_TEMA[tema] || `${clase === '000' ? '00' : clase}`;
    const anio = elegirPonderado([entero(1975, 1999), entero(2000, 2014), entero(2015, 2025)], [2, 4, 5], 11);

    nuevo({
      titulo,
      autores,
      editorial: sala === 'INFANTIL' ? elegir(['Ediciones SM', 'Santillana', 'Edelvives', 'Alfaguara Infantil', 'Castillo', 'Larousse']) : elegir(EDITORIALES),
      anio,
      dewey,
      sala,
      popularidad: sala === 'CONSULTA' ? 0 : Number((0.3 + azar() * 2).toFixed(2)),
      materias: [tema, CATEGORIAS[clase === '000' ? '000' : Number(clase)]],
    });
  }
  return libros;
}

// ------------------------------------------------- fiadores y usuarios
function generarPersonas(ahora) {
  const fiadores = [];
  const usuarios = [];
  const padres = []; // fiadores que pueden avalar a otro hijo

  const nuevoFiador = (paterno) => {
    const nombres = nombre();
    const p = paterno || apellido();
    const ocupacion = elegir(['Empleado', 'Docente', 'Comerciante', 'Contador', 'Enfermera', 'Ingeniero', 'Abogado', 'Médico', 'Burócrata', 'Mecánico']);
    const f = {
      _id: oid(),
      nombre: { paterno: p, materno: apellido(), nombres },
      edad: entero(28, 68),
      domicilio: domicilio(),
      telefonos: { fijo: azar() < 0.4 ? telefono() : '', movil: telefono() },
      correo: azar() < 0.8 ? correoDe(nombres, p) : '',
      ocupacion,
      trabajo: { nombre: elegir(TRABAJOS), direccion: `${elegir(CALLES)} ${entero(1, 900)}, Tepic`, telefono: telefono() },
      identificacion: elegirPonderado(['INE', 'LICENCIA', 'PASAPORTE'], [85, 10, 5], 100),
      createdAt: null,
      updatedAt: null,
    };
    fiadores.push(f);
    return f;
  };

  const rangoEdad = () =>
    elegirPonderado(
      [[6, 12], [13, 17], [18, 24], [25, 34], [35, 49], [50, 64], [65, 85]],
      [11, 13, 30, 15, 13, 10, 8],
      100
    );

  const inicioRegistros = new Date(ahora.getTime() - 30 * 30 * DIA); // ~30 meses

  for (let i = 0; i < TOTAL; i++) {
    const [eMin, eMax] = rangoEdad();
    const edad = entero(eMin, eMax);
    const menor = edad < 18;

    let fiador;
    let paterno = apellido();
    if (menor && padres.length && azar() < 0.22) {
      fiador = elegir(padres); // hermanos con el mismo fiador
      paterno = fiador.nombre.paterno;
    } else if (menor) {
      fiador = nuevoFiador(paterno);
      padres.push(fiador);
    } else if (fiadores.length && azar() < 0.06) {
      fiador = elegir(fiadores); // un mismo aval para dos adultos
    } else {
      fiador = nuevoFiador();
    }

    const nombres = nombre();
    let ocupacion;
    let escuelaTrabajo;
    if (menor) {
      ocupacion = 'ESTUDIANTE';
      escuelaTrabajo = edad < 12 ? elegir(ESCUELAS.filter((e) => e.includes('Primaria'))) : elegir(ESCUELAS.filter((e) => /Secundaria|Preparatoria|CBTIS|CECyTEN|CONALEP/.test(e)));
    } else if (edad < 25) {
      ocupacion = azar() < 0.78 ? 'ESTUDIANTE' : 'EMPLEADO';
      escuelaTrabajo = ocupacion === 'ESTUDIANTE' ? elegir(ESCUELAS.filter((e) => /Tecnológico|Universidad|Normal|Preparatoria/.test(e))) : elegir(TRABAJOS);
    } else if (edad >= 65) {
      ocupacion = elegir(['JUBILADO', 'JUBILADO', 'HOGAR', 'COMERCIANTE']);
      escuelaTrabajo = ocupacion === 'COMERCIANTE' ? 'Negocio propio' : '';
    } else {
      ocupacion = elegirPonderado(['EMPLEADO', 'DOCENTE', 'PROFESIONISTA', 'COMERCIANTE', 'HOGAR', 'OTRO', 'ESTUDIANTE'], [30, 18, 16, 12, 14, 5, 5], 100);
      escuelaTrabajo = ocupacion === 'HOGAR' || ocupacion === 'OTRO' ? '' : ocupacion === 'ESTUDIANTE' ? elegir(ESCUELAS.slice(0, 2)) : ocupacion === 'DOCENTE' ? elegir(ESCUELAS) : elegir(TRABAJOS);
    }

    const fechaExpedicion = horarioBiblioteca(new Date(inicioRegistros.getTime() + azar() * (ahora.getTime() - 3 * DIA - inicioRegistros.getTime())));
    const fechaVencimiento = new Date(fechaExpedicion);
    fechaVencimiento.setFullYear(fechaVencimiento.getFullYear() + 2);

    usuarios.push({
      _id: oid(),
      numRegistro: 0,
      nombre: { paterno, materno: apellido(), nombres },
      edad,
      domicilio: menor && azar() < 0.8 ? { ...fiador.domicilio } : domicilio(),
      telefonos: { fijo: azar() < 0.3 ? telefono() : '', movil: menor && edad < 13 ? '' : telefono() },
      correo: !menor || azar() < 0.3 ? correoDe(nombres, paterno) : '',
      ocupacion,
      escuelaTrabajo,
      identificacion: menor ? elegir(['CURP', 'CRED_ESCOLAR']) : elegirPonderado(['INE', 'LICENCIA', 'PASAPORTE', 'CRED_ESCOLAR'], [80, 8, 4, 8], 100),
      fiador: fiador._id,
      fechaExpedicion,
      fechaVencimiento,
      duplicadoExpedido: azar() < 0.03,
      estado: 'ACTIVA',
      suspendidoHasta: null,
      motivoEstado: '',
      amonestaciones: [],
      createdAt: fechaExpedicion,
      updatedAt: fechaExpedicion,
      // datos de la simulación
      actividad: azar() < 0.22 ? 0.05 : Math.exp(faker.number.float({ min: -1, max: 1.8 })),
      prestamos: [],
    });

    if (!fiador.createdAt || fechaExpedicion < fiador.createdAt) fiador.createdAt = fechaExpedicion;
  }

  // completar hasta 1000 fiadores (avales registrados en la cédula verde)
  while (fiadores.length < TOTAL) nuevoFiador();

  // número de registro en orden de expedición (libro azul)
  usuarios.sort((a, b) => a.fechaExpedicion - b.fechaExpedicion);
  usuarios.forEach((u, i) => (u.numRegistro = 3901 + i));

  for (const f of fiadores) {
    if (!f.createdAt) f.createdAt = horarioBiblioteca(new Date(ahora.getTime() - entero(5, 900) * DIA));
    f.updatedAt = f.createdAt;
  }
  return { fiadores, usuarios };
}

// ------------------------------------------------------------- préstamos
// Se repite la simulación con más o menos visitas hasta que salgan
// exactamente 1000 préstamos repartidos hasta el día de hoy.
export function generarDatos({ ahora = new Date(), semilla = 2026 } = {}) {
  let n = 780;
  for (let intento = 0; intento < 80; intento++) {
    const datos = simular({ ahora, semilla, nEventos: n });
    const ultimo = datos.prestamos[datos.prestamos.length - 1].fechaPrestamo;
    if (datos.prestamos.length === TOTAL && ahora - ultimo < 4 * DIA) return datos;
    n += datos.prestamos.length < TOTAL ? 12 : -5;
  }
  throw new Error('No se pudo generar la simulación');
}

function simular({ ahora, semilla, nEventos }) {
  faker.seed(semilla);
  const inicioOperacion = new Date(ahora.getTime() - 730 * DIA);

  const libros = generarLibros(inicioOperacion);
  const { fiadores, usuarios } = generarPersonas(ahora);

  const prestables = libros.filter((l) => l.sala !== 'CONSULTA');
  const pesosLibros = prestables.map((l) => l.popularidad);
  const totalPesoLibros = pesosLibros.reduce((a, b) => a + b, 0);
  const pesosUsuarios = usuarios.map((u) => u.actividad);
  const totalPesoUsuarios = pesosUsuarios.reduce((a, b) => a + b, 0);

  // cuándo queda libre cada ejemplar
  const libreDesde = new Map();
  for (const l of libros) for (const e of l.ejemplares) libreDesde.set(e.inventario, 0);

  const prestamos = [];
  const eventos = [];
  for (let i = 0; i < nEventos; i++) {
    eventos.push({ t: horarioBiblioteca(new Date(inicioOperacion.getTime() + azar() * (ahora - inicioOperacion))), tipo: 'normal' });
  }
  eventos.sort((a, b) => a.t - b.t);

  const insertarEvento = (ev) => {
    let i = eventos.findIndex((e) => e.t > ev.t);
    if (i === -1) i = eventos.length;
    eventos.splice(i, 0, ev);
  };

  const activosEn = (u, t) => u.prestamos.filter((p) => p.fechaPrestamo <= t && (!p.fechaDevolucion || p.fechaDevolucion > t));

  const puedePedir = (u, t) => {
    if (t < u.fechaExpedicion || t > u.fechaVencimiento) return false;
    if (u.canceladoDesde && t >= u.canceladoDesde) return false;
    if (u.suspensiones?.some((s) => t >= s.desde && t < s.hasta)) return false;
    const act = activosEn(u, t);
    if (act.length >= 3) return false;
    if (act.some((p) => p.fechaVencimiento < t)) return false; // tiene un libro vencido
    return true;
  };

  const ejemplarLibre = (libro, t) =>
    libro.ejemplares.find((e) => e.situacion !== 'BAJA' && libreDesde.get(e.inventario) <= t.getTime());

  let folio = 1;

  const registrarPrestamo = (u, libro, ej, t, apartado = null) => {
    const venceOriginal = sumarDias(t, 7);
    const p = {
      _id: oid(),
      folio: 0,
      usuario: u._id,
      libro: libro._id,
      inventario: ej.inventario,
      titulo: libro.titulo,
      colocacion: libro.colocacion,
      fechaPrestamo: t,
      fechaVencimiento: venceOriginal,
      fechaDevolucion: null,
      estado: 'ACTIVO',
      diasRetraso: 0,
      condicionEntrega: ej.estadoFisico,
      condicionDevolucion: null,
      renovaciones: [],
      recordatorios: [],
      atendio: elegir(['Mostrador', 'Mostrador', 'Sala General', 'Sala Infantil']),
      createdAt: t,
      updatedAt: t,
    };

    // renovaciones (solo si lo devolvió puntual y nadie más lo pidió)
    let vence = venceOriginal;
    const rRen = azar();
    const nRen = rRen < 0.04 ? 2 : rRen < 0.2 ? 1 : 0;
    for (let i = 0; i < nRen && vence < ahora; i++) {
      const nueva = sumarDias(vence, 7);
      p.renovaciones.push({ fecha: horarioBiblioteca(vence), venceAnterior: vence, venceNueva: nueva });
      vence = nueva;
    }
    p.fechaVencimiento = vence;

    // qué pasó con el préstamo
    const r = azar();
    const reciente = ahora - t < 90 * DIA;
    if (r < 0.012 && !reciente) {
      p.estado = 'EXTRAVIADO';
    } else if (r < 0.05 && reciente) {
      p.estado = 'ACTIVO'; // se quedó sin devolver
    } else if (r < 0.23) {
      p.fechaDevolucion = horarioBiblioteca(sumarDias(vence, entero(1, 18)));
    } else {
      const dias = Math.max(1, Math.round((vence - t) / DIA));
      p.fechaDevolucion = horarioBiblioteca(sumarDias(t, entero(1, dias)));
      if (p.fechaDevolucion > vence) p.fechaDevolucion = new Date(vence.getTime() - 3600000);
    }
    if (p.fechaDevolucion && p.fechaDevolucion > ahora) p.fechaDevolucion = null;

    if (p.fechaDevolucion) {
      p.estado = 'DEVUELTO';
      const venceDia = new Date(vence); venceDia.setHours(0, 0, 0, 0);
      const devDia = new Date(p.fechaDevolucion); devDia.setHours(0, 0, 0, 0);
      p.diasRetraso = Math.max(0, Math.round((devDia - venceDia) / DIA));
      p.condicionDevolucion = azar() < 0.07 ? (ej.estadoFisico === 'BUENO' ? 'REGULAR' : 'DANADO') : ej.estadoFisico;
      ej.estadoFisico = p.condicionDevolucion;
      p.updatedAt = p.fechaDevolucion;
      libreDesde.set(ej.inventario, p.fechaDevolucion.getTime());

      if (p.diasRetraso > 0) {
        u.amonestaciones.push({ fecha: p.fechaDevolucion, prestamo: p._id, folio: 0, diasRetraso: p.diasRetraso });
        if (p.diasRetraso > 3) p.recordatorios.push({ fecha: horarioBiblioteca(sumarDias(vence, 3)), medio: 'TELEFONO', dirigidoA: 'USUARIO' });
        if (p.diasRetraso > 10) p.recordatorios.push({ fecha: horarioBiblioteca(sumarDias(vence, 10)), medio: 'TELEFONO', dirigidoA: 'USUARIO' });
        // tres retrasos en un año = suspensión por un año
        const haceUnAnio = p.fechaDevolucion.getTime() - 365 * DIA;
        const enAnio = u.amonestaciones.filter((a) => a.fecha.getTime() > haceUnAnio);
        if (enAnio.length >= 3 && !(u.suspensiones || []).some((s) => p.fechaDevolucion < s.hasta)) {
          const hasta = new Date(p.fechaDevolucion);
          hasta.setFullYear(hasta.getFullYear() + 1);
          u.suspensiones = [...(u.suspensiones || []), { desde: p.fechaDevolucion, hasta }];
        }
      }
    } else {
      libreDesde.set(ej.inventario, Infinity);
      if (p.estado === 'ACTIVO' && vence < ahora) {
        const retraso = Math.floor((ahora - vence) / DIA);
        if (retraso > 3) p.recordatorios.push({ fecha: horarioBiblioteca(sumarDias(vence, 3)), medio: 'TELEFONO', dirigidoA: 'USUARIO' });
        if (retraso > 10) p.recordatorios.push({ fecha: horarioBiblioteca(sumarDias(vence, 10)), medio: 'CORREO', dirigidoA: 'USUARIO' });
        if (retraso > 20) p.recordatorios.push({ fecha: horarioBiblioteca(sumarDias(vence, 20)), medio: 'TELEFONO', dirigidoA: 'FIADOR' });
        if (retraso > 30 && azar() < 0.5) {
          u.canceladoDesde = horarioBiblioteca(sumarDias(vence, 30));
          u.motivoCancelacion = 'Sin respuesta a dos recordatorios de devolución';
        }
      }
      if (p.estado === 'EXTRAVIADO') p.updatedAt = sumarDias(vence, 15);
    }

    if (apartado) {
      apartado.estado = 'RECOGIDO';
    }
    u.prestamos.push(p);
    prestamos.push(p);

    // si ya no quedan ejemplares libres, a veces alguien más lo aparta
    if (!ejemplarLibre(libro, t) && azar() < 0.45 && libro.apartados.length < 15) {
      const tSol = horarioBiblioteca(new Date(t.getTime() + azar() * Math.max(DIA, Math.min(vence, ahora) - t)));
      if (tSol < ahora) {
        const otro = elegirPonderado(usuarios, pesosUsuarios, totalPesoUsuarios);
        if (otro !== u && puedePedir(otro, tSol)) crearApartado(otro, libro, tSol);
      }
    }
    return p;
  };

  const crearApartado = (u, libro, tSol) => {
    const ap = {
      _id: oid(),
      usuario: u._id,
      fechaSolicitud: tSol,
      fechaDisponible: null,
      fechaLimiteRecoger: null,
      inventarioAsignado: null,
      estado: 'EN_ESPERA',
    };
    libro.apartados.push(ap);

    // primer ejemplar que se libera después de la solicitud
    const candidatos = libro.ejemplares
      .filter((e) => e.situacion !== 'BAJA' && libreDesde.get(e.inventario) !== Infinity)
      .sort((a, b) => libreDesde.get(a.inventario) - libreDesde.get(b.inventario));
    const ej = candidatos[0];

    if (azar() < 0.12) {
      ap.estado = 'CANCELADO';
      return;
    }
    if (!ej) {
      if (ahora - tSol > 45 * DIA) ap.estado = 'CANCELADO';
      return; // sigue en espera
    }
    const libre = new Date(Math.max(libreDesde.get(ej.inventario), tSol.getTime()));
    ap.fechaDisponible = libre;
    ap.fechaLimiteRecoger = sumarDias(libre, 3);
    ap.inventarioAsignado = ej.inventario;

    if (ap.fechaLimiteRecoger > ahora) {
      ap.estado = 'DISPONIBLE';
      libreDesde.set(ej.inventario, Infinity);
      ej.reservadoPara = ap;
      return;
    }
    if (azar() < 0.72) {
      // pasa a recogerlo dentro de los 3 días
      const tRec = horarioBiblioteca(new Date(libre.getTime() + azar() * 2.5 * DIA));
      libreDesde.set(ej.inventario, tRec.getTime());
      insertarEvento({ t: tRec, tipo: 'recoger', usuario: u, libro, inventario: ej.inventario, apartado: ap });
    } else {
      ap.estado = 'VENCIDO';
    }
  };

  for (let i = 0; i < eventos.length && prestamos.length < TOTAL; i++) {
    const ev = eventos[i];
    if (ev.t > ahora) break;

    if (ev.tipo === 'recoger') {
      const ej = ev.libro.ejemplares.find((e) => e.inventario === ev.inventario);
      if (puedePedir(ev.usuario, ev.t) && libreDesde.get(ej.inventario) <= ev.t.getTime()) {
        registrarPrestamo(ev.usuario, ev.libro, ej, ev.t, ev.apartado);
      } else {
        ev.apartado.estado = 'VENCIDO';
      }
      continue;
    }

    let usuario = null;
    for (let k = 0; k < 25 && !usuario; k++) {
      const u = elegirPonderado(usuarios, pesosUsuarios, totalPesoUsuarios);
      if (puedePedir(u, ev.t)) usuario = u;
    }
    if (!usuario) continue;

    for (let k = 0; k < 15; k++) {
      const libro = elegirPonderado(prestables, pesosLibros, totalPesoLibros);
      // los niños se llevan sobre todo libros de la sala infantil
      if (usuario.edad < 12 && libro.sala !== 'INFANTIL' && azar() < 0.8) continue;
      if (usuario.edad >= 18 && libro.sala === 'INFANTIL' && usuario.ocupacion !== 'HOGAR' && azar() < 0.85) continue;
      const ej = ejemplarLibre(libro, ev.t);
      if (ej) {
        registrarPrestamo(usuario, libro, ej, ev.t);
        break;
      }
      if (libro.apartados.length < 15 && azar() < 0.5) {
        crearApartado(usuario, libro, ev.t);
      }
    }
  }

  // folios en orden de fecha (como la libreta)
  prestamos.sort((a, b) => a.fechaPrestamo - b.fechaPrestamo);
  prestamos.forEach((p, i) => (p.folio = folio + i));
  const porId = new Map(prestamos.map((p) => [String(p._id), p]));

  // estado final de usuarios
  for (const u of usuarios) {
    for (const a of u.amonestaciones) a.folio = porId.get(String(a.prestamo))?.folio;
    const susp = (u.suspensiones || []).find((s) => s.hasta > ahora && s.desde <= ahora);
    if (u.canceladoDesde && u.canceladoDesde <= ahora) {
      u.estado = 'CANCELADA';
      u.motivoEstado = u.motivoCancelacion;
      u.updatedAt = u.canceladoDesde;
    } else if (susp) {
      u.estado = 'SUSPENDIDA';
      u.suspendidoHasta = susp.hasta;
      u.motivoEstado = 'Tres retrasos en la devolución durante un año';
      u.updatedAt = susp.desde;
    }
  }

  // estado final de ejemplares
  for (const p of prestamos) {
    const libro = libros.find((l) => l._id === p.libro);
    const ej = libro.ejemplares.find((e) => e.inventario === p.inventario);
    if (p.estado === 'ACTIVO') ej.situacion = 'PRESTADO';
    if (p.estado === 'EXTRAVIADO') ej.situacion = 'EXTRAVIADO';
  }
  for (const l of libros) {
    for (const e of l.ejemplares) {
      if (e.reservadoPara && e.situacion === 'DISPONIBLE') e.situacion = 'APARTADO';
      else if (e.reservadoPara) e.reservadoPara.estado = 'EN_ESPERA';
      if (e.situacion === 'DISPONIBLE' && azar() < 0.01) e.situacion = 'BAJA';
      delete e.reservadoPara;
    }
    // un apartado "recogido" que nunca se convirtió en préstamo se da por vencido
    for (const a of l.apartados) {
      if (a.estado === 'EN_ESPERA' && a.fechaLimiteRecoger && a.fechaLimiteRecoger < ahora) a.estado = 'VENCIDO';
    }
    l.apartados.sort((a, b) => a.fechaSolicitud - b.fechaSolicitud);
    l.createdAt = l.ejemplares.reduce((m, e) => (e.fechaAlta < m ? e.fechaAlta : m), ahora);
    l.updatedAt = l.createdAt;
    delete l.popularidad;
  }

  // la usuaria de la maqueta para la demo
  const demo = usuarios.find((u) => u.numRegistro === 4821);
  if (demo) {
    demo.nombre = { paterno: 'García', materno: 'Pérez', nombres: 'Ana Sofía' };
    demo.ocupacion = 'ESTUDIANTE';
    demo.escuelaTrabajo = 'Instituto Tecnológico de Tepic';
    demo.edad = 21;
    demo.correo = 'anasofia.garcia21@gmail.com';

    // le pasamos algunos préstamos para que se vea como en la maqueta
    const suyos = prestamos.filter((p) => p.fechaPrestamo > demo.fechaExpedicion);
    const vencido = suyos.find((p) => p.estado === 'ACTIVO' && p.fechaVencimiento < ahora);
    const alDia = suyos.find((p) => p.estado === 'ACTIVO' && p.fechaVencimiento >= ahora && (!vencido || p.fechaPrestamo <= vencido.fechaVencimiento));
    const devueltos = [
      ...suyos.filter((p) => p.estado === 'DEVUELTO' && p.diasRetraso === 0).slice(0, 2),
      ...suyos.filter((p) => p.estado === 'DEVUELTO' && p.diasRetraso > 0).slice(0, 1),
    ];
    for (const p of [vencido, alDia, ...devueltos].filter(Boolean)) {
      const anterior = usuarios.find((u) => u._id === p.usuario);
      const i = anterior.amonestaciones.findIndex((a) => a.prestamo === p._id);
      if (i >= 0) demo.amonestaciones.push(...anterior.amonestaciones.splice(i, 1));
      p.usuario = demo._id;
    }
  }

  for (const u of usuarios) {
    delete u.actividad;
    delete u.prestamos;
    delete u.suspensiones;
    delete u.canceladoDesde;
    delete u.motivoCancelacion;
  }

  return { fiadores, usuarios, libros, prestamos };
}
