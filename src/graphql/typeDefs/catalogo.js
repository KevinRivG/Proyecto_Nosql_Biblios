// Catálogo / acervo — Rivera González Kevin
export default `#graphql
  enum Sala {
    GENERAL
    INFANTIL
    JUVENIL
    CONSULTA
    NAYARITA
  }

  enum EstadoFisico {
    BUENO
    REGULAR
    DANADO
  }

  enum SituacionEjemplar {
    DISPONIBLE
    PRESTADO
    APARTADO
    EXTRAVIADO
    BAJA
  }

  enum EstadoApartado {
    EN_ESPERA
    DISPONIBLE
    RECOGIDO
    CANCELADO
    VENCIDO
  }

  type Clasificacion {
    prefijo: String
    dewey: String!
    cutter: String!
  }

  type Ejemplar {
    id: ID!
    inventario: String!
    numero: Int!
    estadoFisico: EstadoFisico!
    situacion: SituacionEjemplar!
    fechaAlta: Fecha
  }

  type Apartado {
    id: ID!
    usuario: Usuario
    fechaSolicitud: Fecha!
    fechaDisponible: Fecha
    fechaLimiteRecoger: Fecha
    inventarioAsignado: String
    estado: EstadoApartado!
  }

  type Libro {
    id: ID!
    titulo: String!
    autores: [String!]!
    editorial: String
    anioPublicacion: Int
    isbn: String
    paginas: Int
    idioma: String
    sala: Sala!
    clasificacion: Clasificacion!
    colocacion: String!
    categoria: String!
    materias: [String!]!
    prestable: Boolean!
    ejemplares: [Ejemplar!]!
    totalEjemplares: Int!
    disponibles: Int!
    apartados: [Apartado!]!
    "Apartados que siguen en espera o listos para recoger"
    listaEspera: Int!
    createdAt: Fecha
    updatedAt: Fecha
  }

  type LibroPagina {
    total: Int!
    pagina: Int!
    paginas: Int!
    items: [Libro!]!
  }

  input ClasificacionInput {
    dewey: String!
    cutter: String!
  }

  input LibroInput {
    titulo: String!
    autores: [String!]!
    editorial: String
    anioPublicacion: Int
    isbn: String
    paginas: Int
    idioma: String
    sala: Sala!
    clasificacion: ClasificacionInput!
    materias: [String!]
  }

  input LibroUpdateInput {
    titulo: String
    autores: [String!]
    editorial: String
    anioPublicacion: Int
    isbn: String
    paginas: Int
    idioma: String
    sala: Sala
    clasificacion: ClasificacionInput
    materias: [String!]
  }

  # ---------- tipos de las consultas complejas ----------

  type LibroPrestado {
    libroId: ID!
    titulo: String!
    autores: [String!]
    colocacion: String
    categoria: String
    totalPrestamos: Int!
    lectoresDistintos: Int!
    renovaciones: Int!
    ejemplares: Int!
    disponibles: Int!
  }

  type CategoriaSala {
    categoria: String!
    total: Int!
    disponibles: Int!
    prestados: Int!
  }

  type DisponibilidadSala {
    sala: Sala!
    totalEjemplares: Int!
    disponibles: Int!
    prestados: Int!
    apartados: Int!
    fueraDeServicio: Int!
    porcentajeOcupacion: Float!
    categorias: [CategoriaSala!]!
  }

  type LibroSinMovimiento {
    libroId: ID!
    titulo: String!
    autores: [String!]
    colocacion: String
    sala: Sala
    categoria: String
    anioPublicacion: Int
    ejemplares: Int!
    ultimoPrestamo: Fecha
  }

  type AutorLeido {
    autor: String!
    prestamos: Int!
    lectoresDistintos: Int!
    titulosDistintos: Int!
    titulos: [String!]!
  }

  type RotacionCategoria {
    categoria: String!
    titulos: Int!
    ejemplares: Int!
    prestamos: Int!
    indiceRotacion: Float!
  }

  type LibroDemanda {
    libroId: ID!
    titulo: String!
    colocacion: String
    apartados: Int!
    enEspera: Int!
    vencidos: Int!
    prestamos: Int!
    ejemplaresActivos: Int!
    demandaPorEjemplar: Float!
    sugerencia: String!
  }

  type EjemplarAtender {
    inventario: String!
    titulo: String!
    colocacion: String
    estadoFisico: EstadoFisico!
    situacion: SituacionEjemplar!
    responsable: String
  }

  type MantenimientoSala {
    sala: Sala!
    danados: Int!
    regulares: Int!
    extraviados: Int!
    totalAtender: Int!
    ejemplares: [EjemplarAtender!]!
  }

  type LibroResultado {
    libroId: ID!
    titulo: String!
    autores: [String!]
    colocacion: String
    sala: Sala
    categoria: String
    disponibles: Int!
    ejemplares: Int!
  }

  type ResultadoBusqueda {
    total: Int!
    resultados: [LibroResultado!]!
    porSala: [Conteo!]!
    porCategoria: [Conteo!]!
    porDecada: [Conteo!]!
  }

  type RangoAntiguedad {
    desde: Int
    titulos: Int!
    ejemplares: Int!
    promedioPaginas: Int
  }

  type AntiguedadSala {
    sala: Sala!
    anioPromedio: Int
    masAntiguo: Int
    masReciente: Int
    antiguedadPromedio: Int
  }

  type AntiguedadAcervo {
    rangos: [RangoAntiguedad!]!
    porSala: [AntiguedadSala!]!
  }

  type PreferenciaOcupacion {
    ocupacion: String!
    totalPrestamos: Int!
    categorias: [Conteo!]!
  }

  extend type Query {
    libros(busqueda: String, sala: Sala, categoria: String, soloDisponibles: Boolean, pagina: Int = 1, porPagina: Int = 10): LibroPagina!
    libro(id: ID!): Libro
    libroPorInventario(inventario: String!): Libro
    categorias: [String!]!

    "K1. Libros más prestados en un periodo"
    librosMasPrestados(desde: Fecha, hasta: Fecha, limite: Int = 10): [LibroPrestado!]!
    "K2. Disponibilidad y ocupación por sala y categoría"
    disponibilidadPorSala: [DisponibilidadSala!]!
    "K3. Libros sin préstamos en los últimos N meses"
    librosSinMovimiento(meses: Int = 12, sala: Sala, limite: Int = 50): [LibroSinMovimiento!]!
    "K4. Autores más leídos"
    autoresMasLeidos(desde: Fecha, limite: Int = 10): [AutorLeido!]!
    "K5. Índice de rotación por categoría"
    rotacionPorCategoria(desde: Fecha): [RotacionCategoria!]!
    "K6. Libros con alta demanda (apartados vs ejemplares)"
    librosConAltaDemanda(meses: Int = 12, minApartados: Int = 2): [LibroDemanda!]!
    "K7. Ejemplares dañados, regulares o extraviados"
    inventarioMantenimiento: [MantenimientoSala!]!
    "K8. Búsqueda avanzada con facetas"
    busquedaAvanzada(texto: String, sala: Sala, categoria: String, soloDisponibles: Boolean, pagina: Int = 1, limite: Int = 10): ResultadoBusqueda!
    "K9. Antigüedad del acervo"
    antiguedadAcervo: AntiguedadAcervo!
    "K10. Categorías preferidas por ocupación"
    preferenciasPorOcupacion(top: Int = 3, desde: Fecha): [PreferenciaOcupacion!]!
  }

  extend type Mutation {
    crearLibro(input: LibroInput!, ejemplares: Int = 1): Libro!
    actualizarLibro(id: ID!, input: LibroUpdateInput!): Libro!
    eliminarLibro(id: ID!): Boolean!
    agregarEjemplar(libroId: ID!, estadoFisico: EstadoFisico = BUENO): Libro!
    actualizarEjemplar(libroId: ID!, inventario: String!, estadoFisico: EstadoFisico, situacion: SituacionEjemplar): Libro!
    eliminarEjemplar(libroId: ID!, inventario: String!): Libro!
  }
`;
