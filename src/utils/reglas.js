// Reglas del Reglamento del Servicio de Préstamo a Domicilio
// (Red Nacional de Bibliotecas Públicas) que aplica la Biblioteca
// Pública Central Estatal "José Solón Argüello", Biblioteca No. 0165.

export const BIBLIOTECA = {
  numero: '0165',
  nombre: 'Biblioteca Pública Central Estatal "José Solón Argüello"',
  ciudad: 'Tepic, Nayarit',
};

export const REGLAS = {
  MAX_LIBROS_SIMULTANEOS: 3,   // hasta tres libros a la vez
  DIAS_PRESTAMO: 7,            // duración máxima de una semana
  ANIOS_VIGENCIA_CREDENCIAL: 2, // la credencial tiene vigencia de dos años
  RETRASOS_PARA_SUSPENSION: 3, // tres retrasos en un año...
  MESES_SUSPENSION: 12,        // ...suspensión del servicio por un año
  RECORDATORIOS_PARA_CANCELAR: 2, // después de dos recordatorios sin respuesta
  DIAS_PARA_RECOGER_APARTADO: 3,  // días para pasar por un libro apartado
  EDAD_MINIMA_FIADOR: 18,
};

const DIA_MS = 24 * 60 * 60 * 1000;

export function inicioDelDia(fecha = new Date()) {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function sumarDias(fecha, dias) {
  const d = new Date(fecha);
  d.setDate(d.getDate() + dias);
  return d;
}

export function sumarMeses(fecha, meses) {
  const d = new Date(fecha);
  d.setMonth(d.getMonth() + meses);
  return d;
}

// días completos de diferencia (b - a), sin contar horas
export function diasEntre(a, b) {
  return Math.round((inicioDelDia(b) - inicioDelDia(a)) / DIA_MS);
}

export function formatoCredencial(numRegistro) {
  return String(numRegistro).padStart(6, '0');
}

export function formatoFolio(folio) {
  return String(folio).padStart(6, '0');
}
