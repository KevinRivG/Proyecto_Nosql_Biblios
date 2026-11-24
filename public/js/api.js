// Todas las pantallas hablan con el backend por aquí: POST /graphql
const URL_API = '/graphql';

export async function gql(query, variables = {}) {
  let respuesta;
  try {
    respuesta = await fetch(URL_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
  } catch {
    throw new Error('No hay conexión con el servidor');
  }
  const json = await respuesta.json();
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join(' · '));
  }
  return json.data;
}
