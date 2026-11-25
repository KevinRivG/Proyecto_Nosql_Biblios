# Proyecto_Nosql_Biblios — BIBLIOS

Sistema de gestión bibliotecaria para la **Biblioteca Pública Central Estatal "José Solón Argüello"** (Biblioteca No. 0165, Tepic, Nayarit).

Pasa a digital el servicio de préstamo a domicilio que hoy se lleva en papel: la cédula de registro, la tarjeta del fiador, la credencial amarilla, la ficha de préstamo y el libro azul de registro.

Proyecto final de **Laboratorio de Bases de Datos NoSQL** — Instituto Tecnológico de Tepic.

| Integrante | Parte del sistema |
|---|---|
| Durán Castañeda Luis | Usuarios, credenciales y fiadores |
| Rivera González Kevin | Catálogo y ejemplares |
| Zepeda Castañeda María Fernanda | Préstamos, devoluciones y apartados |

---

## Contenido

1. [Tecnologías](#tecnologías)
2. [Requisitos](#requisitos)
3. [Instalación](#instalación)
4. [Comandos](#comandos)
5. [Guía de uso](#guía-de-uso)
6. [Reglas del reglamento que aplica el sistema](#reglas-del-reglamento-que-aplica-el-sistema)
7. [API GraphQL](#api-graphql)
8. [Las 30 consultas](#las-30-consultas)
9. [Base de datos](#base-de-datos)
10. [Estructura del proyecto](#estructura-del-proyecto)
11. [Problemas comunes](#problemas-comunes)

---

## Tecnologías

| Capa | Tecnología |
|---|---|
| Base de datos | MongoDB Atlas (plan gratuito) con Mongoose 9 |
| API | Apollo Server 5 + GraphQL sobre Express 5, endpoint único `POST /graphql` |
| Front | HTML, CSS y JavaScript sin frameworks, conectado con `fetch()` a GraphQL |

La comparación entre MongoDB y Neo4j que justifica esta elección está en el documento técnico del proyecto.

## Requisitos

- **Node.js 20 o más reciente** (`node -v` para revisar)
- Una cuenta de **MongoDB Atlas** con un clúster (el gratuito alcanza)
- Git

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/KevinRivG/Proyecto_Nosql_Biblios.git
cd Proyecto_Nosql_Biblios
npm install
```

### 2. Configurar la conexión a Atlas

Copia `.env.example` como `.env` y llena tus datos:

```
MONGO_URI=mongodb+srv://usuario:password@cluster0.xxxxx.mongodb.net/
DB_NAME=biblios
PORT=4000
```

- La cadena de conexión está en Atlas: **Database → Connect → Drivers**.
- En **Network Access** agrega tu IP (o `0.0.0.0/0` mientras se prueba).
- El archivo `.env` **no se sube** al repositorio, ya viene en `.gitignore`.

### 3. Los datos

La base `biblios` en Atlas ya tiene **1000 documentos en cada colección**: fiadores, usuarios, libros y préstamos. Los datos simulan dos años de operación de la biblioteca y cumplen el reglamento. No hay que cargar nada: basta con que el `.env` apunte al cluster del equipo.

### 4. Levantar el servidor

```bash
npm run dev
```

| Dirección | Qué es |
|---|---|
| http://localhost:4000 | El sistema (front) |
| http://localhost:4000/graphql | Apollo Sandbox, para probar Queries y Mutations |

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta el servidor y se reinicia solo al guardar cambios |
| `npm start` | Levanta el servidor sin reinicio automático |

## Guía de uso

La barra lateral agrupa las pantallas por tarea. Abajo muestra los números generales: títulos, ejemplares, credenciales vigentes, préstamos activos y vencidos.

### Acervo

**Catálogo**
- Busca por título, autor, número de clasificación, ISBN o materia. Se puede filtrar por sala o ver solo lo disponible.
- Cada libro muestra su colocación (por ejemplo `I 780 A54`) y cuántos ejemplares hay disponibles.
- **+ Nuevo libro**: alta con clasificación Dewey y librística. La colocación, la categoría y los números de inventario (`0165-000123`) se generan solos.
- Al abrir un libro se puede editar, agregar ejemplares, cambiar su estado físico, darlos de baja y ver la lista de espera.

### Lectores

**Usuarios**
- Lista de credenciales con su situación: vigente, vencida, suspendida o cancelada, y si tiene libros pendientes.
- **+ Nuevo registro**: captura la cédula de registro y el fiador. Se puede escoger un fiador ya registrado o capturar uno nuevo.
- Al abrir un usuario: editar sus datos, ver su credencial, cancelarla o reactivarla, o eliminarlo (solo si no debe libros).

**Credencial**
- **+ Nueva credencial**: registra al lector con su fiador. Al guardar se le asigna el siguiente número de registro y se muestra la credencial lista para imprimir.
- Escribe un número (por ejemplo `4821` o `004821`) para ver la credencial digital, igual a la amarilla de la Red Nacional de Bibliotecas Públicas.
- **Renovar credencial**: se permite 30 días antes de que venza, o ya vencida.
- **Expedir duplicado**: uno solo por periodo de vigencia.
- **Imprimir**: imprime el frente y el reverso.

### Circulación

**Nuevo préstamo**
1. Captura la credencial del lector. Aparece su nombre y cuántos libros lleva.
2. Escribe el título o la clasificación del libro y elígelo de la lista.
3. **Registrar préstamo** genera el comprobante con folio y fecha de devolución (7 días).
4. Si no hay ejemplares disponibles aparece **Apartar libro**, que pone al lector en la lista de espera.

**Préstamos activos**
- Con la credencial se ven sus préstamos, fechas y estado (al día o vencido), y sus apartados.
- **Devolver**: registra el estado en que regresa el libro. Si hubo retraso, se anota en el registro del lector.
- **Renovar**: solo si está al día y nadie más espera el libro.
- **Recordatorio**: para préstamos vencidos.
- **Extravío**: marca el ejemplar como extraviado.
- **Ver todos los vencidos**: lista general con los teléfonos del lector y del fiador.

**Historial**
- Todos los préstamos del lector, indicando si devolvió a tiempo o con retraso, más su porcentaje de puntualidad.

### Informes

**Consultas**
- Se elige una de las 30 consultas, agrupadas por área. Debajo se explica qué hace.
- Se llenan los parámetros si los pide (año, mes, días, etc.) y se da **Ejecutar consulta**.

## Reglas del reglamento que aplica el sistema

Tomadas del *Reglamento del Servicio de Préstamo a Domicilio* de la Red Nacional de Bibliotecas Públicas y de las indicaciones internas de la biblioteca:

| Regla | Dónde se aplica |
|---|---|
| La credencial dura **dos años** y solo se expide **un duplicado** por vigencia | Credencial |
| Todo lector necesita un **fiador** mayor de 18 años que viva en Tepic | Registro |
| Máximo **3 libros** al mismo tiempo, por **una semana** | Nuevo préstamo |
| No se presta a quien tiene libros vencidos, ni con credencial vencida, suspendida o cancelada | Nuevo préstamo |
| Se **renueva** si va al día y nadie más pidió el libro | Préstamos activos |
| Si el libro está prestado se puede **apartar**. Al regresar se le asigna al primero de la fila, que tiene **3 días** para recogerlo | Apartados |
| Cada retraso se anota. **3 retrasos en un año = suspensión de un año** | Devolución |
| Tras **2 recordatorios** sin respuesta se puede cancelar el servicio | Recordatorios y cancelación |
| El material de la sala de **consulta** no sale a domicilio | Catálogo y préstamos |

## API GraphQL

Todas las operaciones van a **`POST /graphql`**. En el navegador, http://localhost:4000/graphql abre Apollo Sandbox con todo el esquema documentado.

Ejemplos para probar en Sandbox:

**Buscar libros disponibles**
```graphql
query {
  libros(busqueda: "soledad", soloDisponibles: true) {
    total
    items { id titulo autores colocacion disponibles }
  }
}
```

**Consultar una credencial**
```graphql
query {
  usuarioPorCredencial(credencial: "004821") {
    nombreCompleto situacion fechaVencimiento prestamosActivos adeudos
    fiador { nombreCompleto }
  }
}
```

**Registrar un préstamo**
```graphql
mutation {
  crearPrestamo(credencial: "004821", libroId: "<id del libro>") {
    folioTexto titulo fechaVencimiento
    usuario { nombreCompleto prestamosActivos }
  }
}
```

**Devolver un préstamo**
```graphql
mutation {
  devolverPrestamo(folio: 917, condicion: BUENO) {
    situacion diasRetraso
  }
}
```

**Una de las consultas complejas**
```graphql
query {
  informeMensual(anio: 2026, mes: 11) {
    nombreMes prestamos devoluciones devolucionesConRetraso nuevasCredenciales
    librosMasPrestados { clave total }
  }
}
```

### Operaciones disponibles

| Área | Queries | Mutations |
|---|---|---|
| Catálogo | `libros`, `libro`, `libroPorInventario`, `categorias` | `crearLibro`, `actualizarLibro`, `eliminarLibro`, `agregarEjemplar`, `actualizarEjemplar`, `eliminarEjemplar` |
| Usuarios | `usuarios`, `usuario`, `usuarioPorCredencial`, `fiadores`, `fiador` | `crearUsuario`, `actualizarUsuario`, `eliminarUsuario`, `renovarCredencial`, `expedirDuplicado`, `cancelarCredencial`, `reactivarCredencial`, `crearFiador`, `actualizarFiador`, `eliminarFiador` |
| Préstamos | `prestamos`, `prestamo`, `prestamosActivos`, `historial`, `apartados` | `crearPrestamo`, `devolverPrestamo`, `renovarPrestamo`, `registrarRecordatorio`, `reportarExtravio`, `eliminarPrestamo`, `crearApartado`, `cancelarApartado` |
| General | `resumen` | — |

## Las 30 consultas

Hechas con *aggregation pipeline* (`$lookup`, `$group`, `$facet`, `$bucket`, `$filter`, entre otras). Cada una es una Query de GraphQL y también se ejecuta desde la pantalla **Consultas**.

**Catálogo y acervo** (`src/consultas/catalogo.js`)

| # | Consulta | Query |
|---|---|---|
| 1 | Libros más prestados | `librosMasPrestados` |
| 2 | Disponibilidad por sala y categoría | `disponibilidadPorSala` |
| 3 | Libros sin préstamos en N meses | `librosSinMovimiento` |
| 4 | Autores más leídos | `autoresMasLeidos` |
| 5 | Índice de rotación por categoría | `rotacionPorCategoria` |
| 6 | Libros con alta demanda | `librosConAltaDemanda` |
| 7 | Ejemplares para reparar o reponer | `inventarioMantenimiento` |
| 8 | Búsqueda avanzada con facetas | `busquedaAvanzada` |
| 9 | Antigüedad del acervo | `antiguedadAcervo` |
| 10 | Categorías preferidas por ocupación | `preferenciasPorOcupacion` |

**Usuarios y credenciales** (`src/consultas/usuarios.js`)

| # | Consulta | Query |
|---|---|---|
| 11 | Credenciales por vencer | `credencialesPorVencer` |
| 12 | Usuarios a un retraso de la suspensión | `usuariosEnRiesgo` |
| 13 | Fiadores de varios usuarios | `fiadoresConVariosUsuarios` |
| 14 | Usuarios por colonia, C.P. y ocupación | `distribucionUsuarios` |
| 15 | Lectores más activos del año | `lectoresMasActivos` |
| 16 | Usuarios vigentes sin préstamos recientes | `usuariosInactivos` |
| 17 | Lectores por rango de edad | `lectoresPorEdad` |
| 18 | Usuarios suspendidos o cancelados | `usuariosSancionados` |
| 19 | Credenciales expedidas por mes | `altasPorMes` |
| 20 | Perfil completo de un lector | `perfilLector` |

**Préstamos y apartados** (`src/consultas/prestamos.js`)

| # | Consulta | Query |
|---|---|---|
| 21 | Préstamos vencidos | `prestamosVencidos` |
| 22 | Agenda de devoluciones | `agendaDevoluciones` |
| 23 | Puntualidad por mes | `puntualidadMensual` |
| 24 | Duración real de préstamos por categoría | `duracionPorCategoria` |
| 25 | Carga del mostrador | `cargaMostrador` |
| 26 | Renovaciones frecuentes | `renovacionesFrecuentes` |
| 27 | Candidatos a cancelación | `candidatosCancelacion` |
| 28 | Estadística de apartados | `estadisticaApartados` |
| 29 | Libros que regresaron dañados | `deterioroEnDevoluciones` |
| 30 | Informe mensual | `informeMensual` |

## Base de datos

| Colección | Documentos | Equivale a | Qué lleva anidado |
|---|---|---|---|
| `fiadores` | 1000 | Tarjeta verde "FIADOR" | Domicilio, teléfonos, trabajo |
| `usuarios` | 1000 | Cédula de registro + credencial | Domicilio, teléfonos, retrasos anotados |
| `libros` | 1000 | Ficha del libro | **Ejemplares** y **lista de espera (apartados)** |
| `prestamos` | 1000 | Ficha de préstamo a domicilio | Renovaciones y recordatorios |

Los ejemplares y los apartados van dentro del libro porque siempre se consultan juntos. Los préstamos tienen su propia colección porque crecen sin límite y se consultan por lector, por fecha y por estado.

## Estructura del proyecto

```
src/
  index.js                  servidor Express + Apollo
  config/db.js              conexión a MongoDB Atlas
  models/                   esquemas de Mongoose (Libro, Usuario, Fiador, Prestamo)
  graphql/typeDefs/         esquema GraphQL por área
  graphql/resolvers/        Queries y Mutations con las reglas del reglamento
  consultas/                las 30 consultas (aggregation pipeline)
  utils/reglas.js           constantes del reglamento (3 libros, 7 días, 2 años...)
public/
  index.html                estructura del front
  css/estilos.css           estilos
  js/                       una pantalla por archivo + api.js (fetch a GraphQL)
```

## Problemas comunes

| Problema | Solución |
|---|---|
| `No se pudo conectar a MongoDB` | Revisa `MONGO_URI` en `.env` y que tu IP esté en **Network Access** de Atlas |
| `Falta la variable MONGO_URI` | No existe el `.env`: cópialo de `.env.example` |
| `EADDRINUSE: 4000` | El puerto está ocupado: cierra el otro servidor o cambia `PORT` en `.env` |
| La página no muestra cambios | Recarga con **Ctrl + Shift + R** |
| Las pantallas salen vacías | Revisa que `DB_NAME` sea `biblios` y que `MONGO_URI` sea la del cluster del equipo |
