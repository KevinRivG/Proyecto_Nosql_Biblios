// Cosas que usan los tres archivos de consultas

export const TZ = 'America/Mazatlan'; // horario de Tepic
export const DIA_MS = 86400000;

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// expresión para "A. Paterno A. Materno, Nombre(s)" desde un campo nombre
export function exprNombre(campo) {
  return {
    $concat: [`$${campo}.paterno`, ' ', `$${campo}.materno`, ', ', `$${campo}.nombres`],
  };
}

// número de credencial con ceros a la izquierda (004821)
export function exprCredencial(campo) {
  const txt = { $toString: `$${campo}` };
  return {
    $concat: [
      {
        $substrCP: [
          '000000',
          0,
          { $max: [0, { $subtract: [6, { $strLenCP: txt }] }] },
        ],
      },
      txt,
    ],
  };
}

// días completos entre dos fechas (b - a)
export function exprDias(a, b) {
  return { $floor: { $divide: [{ $subtract: [b, a] }, DIA_MS] } };
}

export function porcentaje(parte, total) {
  return {
    $cond: [
      { $gt: [total, 0] },
      { $round: [{ $multiply: [{ $divide: [parte, total] }, 100] }, 1] },
      0,
    ],
  };
}

export function inicioDeAnio(anio) {
  return new Date(anio, 0, 1);
}
