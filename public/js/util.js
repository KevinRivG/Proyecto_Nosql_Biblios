// Funciones de apoyo que usan todas las pantallas

export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

export function escapar(texto) {
  return String(texto ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function fecha(valor) {
  if (!valor) return '—';
  return new Date(valor).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function fechaHora(valor) {
  if (!valor) return '—';
  return new Date(valor).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function iniciales(nombre) {
  return (nombre || '?')
    .replace(',', '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

// "4821" -> "004821"
export function normalizarCredencial(txt) {
  const solo = String(txt || '').replace(/\D/g, '');
  return solo ? solo.padStart(6, '0') : '';
}

const COLORES = {
  DISPONIBLE: 'verde', AL_DIA: 'verde', A_TIEMPO: 'verde', ACTIVA: 'verde', DEVUELTO: 'verde', RECOGIDO: 'verde', BUENO: 'verde',
  PRESTADO: 'rojo', VENCIDO: 'rojo', CON_RETRASO: 'rojo', EXTRAVIADO: 'rojo', CANCELADA: 'rojo', DANADO: 'rojo', SUSPENDIDA: 'rojo',
  APARTADO: 'amarillo', EN_ESPERA: 'amarillo', VENCIDA: 'amarillo', REGULAR: 'amarillo',
};

const TEXTOS = {
  AL_DIA: 'al día', A_TIEMPO: 'a tiempo', CON_RETRASO: 'con retraso', DANADO: 'dañado', EN_ESPERA: 'en espera',
};

export function etiqueta(valor, texto) {
  const color = COLORES[valor] || 'gris';
  return `<span class="etiqueta ${color}">${escapar(texto || TEXTOS[valor] || String(valor).toLowerCase())}</span>`;
}

export function aviso(mensaje, tipo = 'ok') {
  const div = document.createElement('div');
  div.className = `aviso ${tipo === 'error' ? 'error' : ''}`;
  div.textContent = mensaje;
  $('#avisos').appendChild(div);
  setTimeout(() => div.remove(), tipo === 'error' ? 7000 : 4000);
}

export function abrirModal(html) {
  $('#modal-contenido').innerHTML = html;
  $('#modal').classList.add('abierto');
  return $('#modal-contenido');
}

export function cerrarModal() {
  $('#modal').classList.remove('abierto');
  $('#modal-contenido').innerHTML = '';
}

export function paginacion(contenedor, datos, alCambiar) {
  if (!datos || datos.paginas <= 1) {
    contenedor.innerHTML = '';
    return;
  }
  contenedor.innerHTML = `
    <button class="btn borde chico" ${datos.pagina <= 1 ? 'disabled' : ''} data-p="${datos.pagina - 1}">&larr; Anterior</button>
    <span>Página ${datos.pagina} de ${datos.paginas}</span>
    <button class="btn borde chico" ${datos.pagina >= datos.paginas ? 'disabled' : ''} data-p="${datos.pagina + 1}">Siguiente &rarr;</button>`;
  $$('button', contenedor).forEach((b) => b.addEventListener('click', () => alCambiar(Number(b.dataset.p))));
}

// ejecuta una acción mostrando error si falla
export async function intentar(accion, elemento) {
  elemento?.classList.add('cargando');
  try {
    return await accion();
  } catch (err) {
    aviso(err.message, 'error');
    return null;
  } finally {
    elemento?.classList.remove('cargando');
  }
}

// lee los campos de un form a un objeto (name="domicilio.cp" -> { domicilio: { cp } })
export function leerFormulario(form) {
  const datos = {};
  for (const campo of form.querySelectorAll('[name]')) {
    if (campo.disabled) continue;
    let valor = campo.value.trim();
    if (campo.type === 'number') valor = valor === '' ? null : Number(valor);
    if (valor === '' && !campo.required) continue;
    const partes = campo.name.split('.');
    let obj = datos;
    partes.slice(0, -1).forEach((p) => (obj = obj[p] ??= {}));
    obj[partes[partes.length - 1]] = valor;
  }
  return datos;
}

export function hoyMasDias(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d;
}
