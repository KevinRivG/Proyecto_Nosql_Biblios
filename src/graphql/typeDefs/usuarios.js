// Usuarios, credenciales y fiadores — Durán Castañeda Luis
export default `#graphql
  enum Ocupacion {
    ESTUDIANTE
    DOCENTE
    EMPLEADO
    COMERCIANTE
    HOGAR
    JUBILADO
    PROFESIONISTA
    OTRO
  }

  enum EstadoCredencial {
    ACTIVA
    SUSPENDIDA
    CANCELADA
  }

  "Estado real calculado con las fechas (incluye VENCIDA)"
  enum SituacionCredencial {
    ACTIVA
    VENCIDA
    SUSPENDIDA
    CANCELADA
  }

  enum Identificacion {
    INE
    CARTILLA
    PASAPORTE
    LICENCIA
    CRED_ESCOLAR
    CURP
  }

  type Trabajo {
    nombre: String
    direccion: String
    telefono: String
  }

  type Fiador {
    id: ID!
    nombre: Nombre!
    nombreCompleto: String!
    edad: Int!
    domicilio: Domicilio!
    telefonos: Telefonos!
    correo: String
    ocupacion: String
    trabajo: Trabajo
    identificacion: Identificacion
    usuarios: [Usuario!]!
    createdAt: Fecha
  }

  type Amonestacion {
    fecha: Fecha!
    folio: Int
    diasRetraso: Int
  }

  type Usuario {
    id: ID!
    numRegistro: Int!
    "Número de credencial con ceros (004821)"
    credencial: String!
    nombre: Nombre!
    nombreCompleto: String!
    edad: Int!
    domicilio: Domicilio!
    telefonos: Telefonos!
    correo: String
    ocupacion: Ocupacion!
    escuelaTrabajo: String
    identificacion: Identificacion
    fiador: Fiador
    fechaExpedicion: Fecha!
    fechaVencimiento: Fecha!
    duplicadoExpedido: Boolean!
    estado: EstadoCredencial!
    situacion: SituacionCredencial!
    vigente: Boolean!
    suspendidoHasta: Fecha
    motivoEstado: String
    amonestaciones: [Amonestacion!]!
    "Retrasos en los últimos 12 meses (3 = suspensión)"
    retrasosUltimoAnio: Int!
    prestamosActivos: Int!
    "Libros vencidos o extraviados que no ha devuelto"
    adeudos: Int!
    createdAt: Fecha
  }

  type UsuarioPagina {
    total: Int!
    pagina: Int!
    paginas: Int!
    items: [Usuario!]!
  }

  type FiadorPagina {
    total: Int!
    pagina: Int!
    paginas: Int!
    items: [Fiador!]!
  }

  input TrabajoInput {
    nombre: String
    direccion: String
    telefono: String
  }

  input FiadorInput {
    nombre: NombreInput!
    edad: Int!
    domicilio: DomicilioInput!
    telefonos: TelefonosInput
    correo: String
    ocupacion: String
    trabajo: TrabajoInput
    identificacion: Identificacion
  }

  input FiadorUpdateInput {
    nombre: NombreInput
    edad: Int
    domicilio: DomicilioInput
    telefonos: TelefonosInput
    correo: String
    ocupacion: String
    trabajo: TrabajoInput
    identificacion: Identificacion
  }

  input UsuarioInput {
    nombre: NombreInput!
    edad: Int!
    domicilio: DomicilioInput!
    telefonos: TelefonosInput
    correo: String
    ocupacion: Ocupacion!
    escuelaTrabajo: String
    identificacion: Identificacion
  }

  input UsuarioUpdateInput {
    nombre: NombreInput
    edad: Int
    domicilio: DomicilioInput
    telefonos: TelefonosInput
    correo: String
    ocupacion: Ocupacion
    escuelaTrabajo: String
    identificacion: Identificacion
    fiadorId: ID
  }

  # ---------- tipos de las consultas complejas ----------

  type CredencialPorVencer {
    usuarioId: ID!
    credencial: String!
    nombreCompleto: String!
    telefono: String
    correo: String
    fechaVencimiento: Fecha!
    diasRestantes: Int!
    prestamosActivos: Int!
  }

  type UsuarioEnRiesgo {
    usuarioId: ID!
    credencial: String!
    nombreCompleto: String!
    retrasosUltimoAnio: Int!
    diasRetrasoAcumulados: Int!
    ultimoRetraso: Fecha
    prestamosActivos: Int!
    prestamosVencidos: Int!
    fiadorNombre: String
    fiadorTelefono: String
  }

  type FiadorMultiple {
    fiadorId: ID!
    fiadorNombre: String!
    telefono: String
    ocupacion: String
    totalUsuarios: Int!
    usuarios: [String!]!
    usuariosConAdeudo: Int!
    librosPendientes: Int!
  }

  type DistribucionUsuarios {
    totalActivos: Int!
    porColonia: [Conteo!]!
    porCodigoPostal: [Conteo!]!
    porOcupacion: [Conteo!]!
  }

  type LectorActivo {
    usuarioId: ID!
    credencial: String!
    nombreCompleto: String!
    ocupacion: String
    totalPrestamos: Int!
    titulosDistintos: Int!
    devueltosATiempo: Int!
    devueltosConRetraso: Int!
    porcentajePuntualidad: Float!
  }

  type UsuarioInactivo {
    usuarioId: ID!
    credencial: String!
    nombreCompleto: String!
    telefono: String
    correo: String
    fechaExpedicion: Fecha
    ultimoPrestamo: Fecha
    diasSinPrestamo: Int!
  }

  type RangoEdad {
    rango: String!
    usuarios: Int!
    edadPromedio: Float
    prestamos: Int!
    promedioPrestamos: Float!
  }

  type UsuarioSancionado {
    usuarioId: ID!
    credencial: String!
    nombreCompleto: String!
    estado: EstadoCredencial!
    motivo: String
    suspendidoHasta: Fecha
    diasRestantesSuspension: Int
    totalAmonestaciones: Int!
    librosPendientes: [String!]!
    fiadorNombre: String
    fiadorTelefono: String
  }

  type AltasMes {
    mes: Int!
    nombreMes: String!
    total: Int!
    porOcupacion: [Conteo!]!
  }

  type PrestamoBreve {
    folio: Int!
    titulo: String
    fechaPrestamo: Fecha
    estado: String
    diasRetraso: Int
  }

  type PerfilLector {
    usuarioId: ID!
    credencial: String!
    nombreCompleto: String!
    edad: Int
    ocupacion: String
    estado: EstadoCredencial!
    vigente: Boolean!
    fechaVencimiento: Fecha
    fiadorNombre: String
    totalPrestamos: Int!
    activos: Int!
    extraviados: Int!
    devueltosATiempo: Int!
    devueltosConRetraso: Int!
    categoriaFavorita: String
    amonestaciones: Int!
    apartadosActivos: Int!
    ultimosPrestamos: [PrestamoBreve!]!
  }

  extend type Query {
    usuarios(busqueda: String, situacion: SituacionCredencial, ocupacion: Ocupacion, pagina: Int = 1, porPagina: Int = 10): UsuarioPagina!
    usuario(id: ID!): Usuario
    "Acepta 004821 o 4821"
    usuarioPorCredencial(credencial: String!): Usuario
    fiadores(busqueda: String, pagina: Int = 1, porPagina: Int = 10): FiadorPagina!
    fiador(id: ID!): Fiador

    "L1. Credenciales que vencen en los próximos N días"
    credencialesPorVencer(dias: Int = 30): [CredencialPorVencer!]!
    "L2. Usuarios con 2+ retrasos en el último año"
    usuariosEnRiesgo: [UsuarioEnRiesgo!]!
    "L3. Fiadores que avalan a varios usuarios"
    fiadoresConVariosUsuarios(minimo: Int = 2): [FiadorMultiple!]!
    "L4. Distribución de usuarios por colonia, C.P. y ocupación"
    distribucionUsuarios(top: Int = 15): DistribucionUsuarios!
    "L5. Lectores más activos del año"
    lectoresMasActivos(anio: Int, limite: Int = 10): [LectorActivo!]!
    "L6. Usuarios vigentes sin préstamos recientes"
    usuariosInactivos(meses: Int = 6, limite: Int = 50): [UsuarioInactivo!]!
    "L7. Lectores por rango de edad"
    lectoresPorEdad: [RangoEdad!]!
    "L8. Usuarios suspendidos o cancelados"
    usuariosSancionados: [UsuarioSancionado!]!
    "L9. Credenciales expedidas por mes"
    altasPorMes(anio: Int): [AltasMes!]!
    "L10. Perfil completo de un lector"
    perfilLector(credencial: String!): PerfilLector
  }

  extend type Mutation {
    "Registra un usuario. Manda fiadorId si el fiador ya existe o los datos del fiador nuevo"
    crearUsuario(input: UsuarioInput!, fiadorId: ID, fiador: FiadorInput): Usuario!
    actualizarUsuario(id: ID!, input: UsuarioUpdateInput!): Usuario!
    eliminarUsuario(id: ID!): Boolean!
    renovarCredencial(credencial: String!): Usuario!
    expedirDuplicado(credencial: String!): Usuario!
    cancelarCredencial(credencial: String!, motivo: String!): Usuario!
    reactivarCredencial(credencial: String!): Usuario!

    crearFiador(input: FiadorInput!): Fiador!
    actualizarFiador(id: ID!, input: FiadorUpdateInput!): Fiador!
    eliminarFiador(id: ID!): Boolean!
  }
`;
