import { Fecha, resumen } from './comun.js';
import catalogo from './catalogo.js';
import usuarios from './usuarios.js';
import prestamos from './prestamos.js';

export default [
  { Fecha, Query: { resumen } },
  catalogo,
  usuarios,
  prestamos,
];
