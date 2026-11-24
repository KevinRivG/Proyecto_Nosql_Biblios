// Tipos que comparten todos los módulos
export default `#graphql
  "Fecha en formato ISO 8601"
  scalar Fecha

  type Nombre {
    paterno: String!
    materno: String
    nombres: String!
  }

  type Domicilio {
    calle: String!
    colonia: String!
    cp: String!
    ciudad: String
  }

  type Telefonos {
    fijo: String
    movil: String
  }

  "Par clave / total que regresan varias consultas agrupadas"
  type Conteo {
    clave: String
    total: Int!
  }

  input NombreInput {
    paterno: String!
    materno: String
    nombres: String!
  }

  input DomicilioInput {
    calle: String!
    colonia: String!
    cp: String!
    ciudad: String
  }

  input TelefonosInput {
    fijo: String
    movil: String
  }

  type Resumen {
    biblioteca: String!
    numeroBiblioteca: String!
    usuariosActivos: Int!
    titulos: Int!
    ejemplares: Int!
    prestamosActivos: Int!
    prestamosVencidos: Int!
  }

  type Query {
    "Números generales para el encabezado del sistema"
    resumen: Resumen!
  }

  type Mutation {
    _vacio: Boolean
  }
`;
