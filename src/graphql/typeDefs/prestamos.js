// Préstamos, devoluciones y apartados — Zepeda Castañeda María Fernanda
export default `#graphql
  enum EstadoPrestamo {
    ACTIVO
    DEVUELTO
    EXTRAVIADO
  }

  "Cómo se ve el préstamo hoy"
  enum SituacionPrestamo {
    AL_DIA
    VENCIDO
    A_TIEMPO
    CON_RETRASO
    EXTRAVIADO
  }

  enum MedioRecordatorio {
    TELEFONO
    CORREO
    PRESENCIAL
  }

  enum DirigidoA {
    USUARIO
    FIADOR
  }

  type Renovacion {
    fecha: Fecha!
    venceAnterior: Fecha
    venceNueva: Fecha
  }

  type Recordatorio {
    fecha: Fecha!
    medio: MedioRecordatorio!
    dirigidoA: DirigidoA!
  }

  type Prestamo {
    id: ID!
    folio: Int!
    "Folio con ceros (000917)"
    folioTexto: String!
    usuario: Usuario
    libro: Libro
    inventario: String!
    titulo: String
    colocacion: String
    fechaPrestamo: Fecha!
    fechaVencimiento: Fecha!
    fechaDevolucion: Fecha
    estado: EstadoPrestamo!
    situacion: SituacionPrestamo!
    diasRetraso: Int!
    condicionEntrega: EstadoFisico
    condicionDevolucion: EstadoFisico
    renovaciones: [Renovacion!]!
    recordatorios: [Recordatorio!]!
    atendio: String
  }

  type PrestamoPagina {
    total: Int!
    pagina: Int!
    paginas: Int!
    items: [Prestamo!]!
  }

  type ApartadoDetalle {
    id: ID!
    libroId: ID!
    titulo: String!
    colocacion: String
    usuario: Usuario
    fechaSolicitud: Fecha!
    fechaDisponible: Fecha
    fechaLimiteRecoger: Fecha
    inventarioAsignado: String
    estado: EstadoApartado!
    lugarEnFila: Int
  }

  # ---------- tipos de las consultas complejas ----------

  type PrestamoVencido {
    folio: Int!
    titulo: String
    colocacion: String
    fechaPrestamo: Fecha!
    fechaVencimiento: Fecha!
    diasRetraso: Int!
    recordatorios: Int!
    credencial: String!
    lector: String!
    telefonoLector: String
    fiador: String
    telefonoFiador: String
  }

  type DevolucionAgenda {
    folio: Int!
    titulo: String
    colocacion: String
    credencial: String!
    lector: String!
  }

  type DiaAgenda {
    fecha: String!
    diaSemana: String!
    total: Int!
    prestamos: [DevolucionAgenda!]!
  }

  type PuntualidadMes {
    mes: Int!
    nombreMes: String!
    devueltos: Int!
    aTiempo: Int!
    conRetraso: Int!
    porcentajePuntualidad: Float!
    promedioDiasRetraso: Float!
  }

  type DuracionCategoria {
    categoria: String!
    prestamos: Int!
    promedioDiasPrestado: Float!
    maximoDias: Int!
    promedioDiasRetraso: Float!
    porcentajeRenovados: Float!
  }

  type CargaMostrador {
    porDiaSemana: [Conteo!]!
    porHora: [Conteo!]!
    porMes: [Conteo!]!
  }

  type Ranking {
    id: ID!
    nombre: String!
    detalle: String
    total: Int!
  }

  type RenovacionesFrecuentes {
    prestamosRenovados: Int!
    totalRenovaciones: Int!
    libros: [Ranking!]!
    usuarios: [Ranking!]!
  }

  type LibroPendiente {
    folio: Int!
    titulo: String
    diasRetraso: Int!
    recordatorios: Int!
  }

  type CandidatoCancelacion {
    usuarioId: ID!
    credencial: String!
    lector: String!
    estadoCredencial: String
    maxRetraso: Int!
    libros: [LibroPendiente!]!
    fiadorNombre: String
    fiadorTelefono: String
    fiadorTrabajo: String
  }

  type EstadisticaApartados {
    totalApartados: Int!
    porEstado: [Conteo!]!
    promedioDiasEspera: Float!
    maximoDiasEspera: Int!
    porcentajeRecogidos: Float!
    librosMasApartados: [Conteo!]!
  }

  type CasoDeterioro {
    folio: Int!
    titulo: String
    lector: String
    entrega: EstadoFisico
    devolucion: EstadoFisico
    fecha: Fecha
  }

  type DeterioroSala {
    sala: Sala!
    devoluciones: Int!
    conDeterioro: Int!
    porcentaje: Float!
    casos: [CasoDeterioro!]!
  }

  type InformeMensual {
    anio: Int!
    mes: Int!
    nombreMes: String!
    prestamos: Int!
    lectoresDistintos: Int!
    renovaciones: Int!
    devoluciones: Int!
    devolucionesConRetraso: Int!
    extraviados: Int!
    nuevasCredenciales: Int!
    apartados: Int!
    librosMasPrestados: [Conteo!]!
    categoriasMasPrestadas: [Conteo!]!
  }

  extend type Query {
    prestamos(estado: EstadoPrestamo, credencial: String, soloVencidos: Boolean, pagina: Int = 1, porPagina: Int = 10): PrestamoPagina!
    prestamo(folio: Int!): Prestamo
    "Préstamos que el usuario todavía no devuelve"
    prestamosActivos(credencial: String!): [Prestamo!]!
    "Todos los préstamos del usuario, del más reciente al más antiguo"
    historial(credencial: String!): [Prestamo!]!
    apartados(estado: EstadoApartado, credencial: String): [ApartadoDetalle!]!

    "M1. Préstamos vencidos con contacto de lector y fiador"
    prestamosVencidos: [PrestamoVencido!]!
    "M2. Agenda de devoluciones de los próximos días"
    agendaDevoluciones(dias: Int = 7): [DiaAgenda!]!
    "M3. Puntualidad de devoluciones por mes"
    puntualidadMensual(anio: Int): [PuntualidadMes!]!
    "M4. Duración real de préstamos por categoría"
    duracionPorCategoria: [DuracionCategoria!]!
    "M5. Carga del mostrador por día, hora y mes"
    cargaMostrador(desde: Fecha, hasta: Fecha): CargaMostrador!
    "M6. Libros y usuarios con más renovaciones"
    renovacionesFrecuentes(limite: Int = 10): RenovacionesFrecuentes!
    "M7. Candidatos a cancelación por recordatorios sin respuesta"
    candidatosCancelacion(minRecordatorios: Int = 2): [CandidatoCancelacion!]!
    "M8. Estadística de apartados"
    estadisticaApartados(desde: Fecha): EstadisticaApartados!
    "M9. Libros que regresaron en peor estado"
    deterioroEnDevoluciones: [DeterioroSala!]!
    "M10. Informe mensual de la biblioteca"
    informeMensual(anio: Int, mes: Int): InformeMensual!
  }

  extend type Mutation {
    crearPrestamo(credencial: String!, libroId: ID!, inventario: String, atendio: String): Prestamo!
    devolverPrestamo(folio: Int!, condicion: EstadoFisico = BUENO): Prestamo!
    renovarPrestamo(folio: Int!): Prestamo!
    registrarRecordatorio(folio: Int!, medio: MedioRecordatorio = TELEFONO, dirigidoA: DirigidoA = USUARIO): Prestamo!
    reportarExtravio(folio: Int!): Prestamo!
    "Solo para corregir un préstamo capturado por error el mismo día"
    eliminarPrestamo(folio: Int!): Boolean!

    crearApartado(credencial: String!, libroId: ID!): ApartadoDetalle!
    cancelarApartado(libroId: ID!, apartadoId: ID!): ApartadoDetalle!
  }
`;
