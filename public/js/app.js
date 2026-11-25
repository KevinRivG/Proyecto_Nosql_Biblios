// Arranque del front: pestañas y encabezado
import { gql } from './api.js';
import { $, $$, cerrarModal } from './util.js';
import { iniciarCatalogo } from './catalogo.js';
import { iniciarCredencial } from './credencial.js';
import { iniciarPrestamos } from './prestamos.js';
import { iniciarNuevoPrestamo } from './nuevoPrestamo.js';
import { iniciarUsuarios } from './usuarios.js';
import { iniciarConsultas } from './consultas.js';

function cambiarPantalla(id) {
  $$('nav.pestanas button').forEach((b) => b.classList.toggle('activa', b.dataset.pantalla === id));
  $$('.pantalla').forEach((p) => p.classList.toggle('activa', p.id === id));
  history.replaceState(null, '', `#${id}`);

  // al entrar a Préstamos activos se vuelve a consultar, para no mostrar datos viejos
  if (id === 'prestamos' && $('#pre-credencial').value.trim()) $('#pre-form').requestSubmit();
  cargarResumen();
}

async function cargarResumen() {
  try {
    const { resumen: r } = await gql('query { resumen { numeroBiblioteca titulos ejemplares usuariosActivos prestamosActivos prestamosVencidos } }');
    const dato = (texto, valor, alerta = false) =>
      `<div class="dato${alerta && valor > 0 ? ' alerta' : ''}"><span>${texto}</span><b>${valor.toLocaleString('es-MX')}</b></div>`;
    $('#resumen').innerHTML =
      dato('Títulos', r.titulos) +
      dato('Ejemplares', r.ejemplares) +
      dato('Credenciales vigentes', r.usuariosActivos) +
      dato('Préstamos activos', r.prestamosActivos) +
      dato('Vencidos', r.prestamosVencidos, true);
  } catch {
    $('#resumen').innerHTML = '<div class="pie">Sin conexión con el servidor</div>';
  }
}

$$('nav.pestanas button').forEach((b) => b.addEventListener('click', () => cambiarPantalla(b.dataset.pantalla)));
$('#modal-cerrar').addEventListener('click', cerrarModal);
$('#modal').addEventListener('click', (e) => {
  if (e.target.id === 'modal') cerrarModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') cerrarModal();
});

iniciarCatalogo();
iniciarCredencial();
iniciarPrestamos();
iniciarNuevoPrestamo();
iniciarUsuarios();
iniciarConsultas();

const inicial = location.hash.slice(1);
if (inicial && $(`#${inicial}.pantalla`)) cambiarPantalla(inicial);
else cargarResumen();