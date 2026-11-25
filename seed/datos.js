// Catálogos base para generar los datos de prueba

export const CATEGORIAS = {
  '000': 'Generalidades e Informática',
  100: 'Filosofía y Psicología',
  200: 'Religión',
  300: 'Ciencias Sociales',
  400: 'Lenguas',
  500: 'Ciencias Naturales y Matemáticas',
  600: 'Tecnología y Ciencias Aplicadas',
  700: 'Artes y Recreación',
  800: 'Literatura',
  900: 'Historia y Geografía',
};

// titulo | autores (;) | editorial | año | dewey | sala
export const LIBROS_REALES = `
Cien años de soledad|Gabriel García Márquez|Diana|2017|863|GENERAL
El amor en los tiempos del cólera|Gabriel García Márquez|Diana|2015|863|GENERAL
Crónica de una muerte anunciada|Gabriel García Márquez|Diana|2014|863|JUVENIL
El coronel no tiene quien le escriba|Gabriel García Márquez|Diana|2013|863|GENERAL
Pedro Páramo|Juan Rulfo|RM|2016|863|GENERAL
El llano en llamas|Juan Rulfo|RM|2017|863|GENERAL
La muerte de Artemio Cruz|Carlos Fuentes|Alfaguara|2011|863|GENERAL
Aura|Carlos Fuentes|Era|2014|863|JUVENIL
La región más transparente|Carlos Fuentes|Alfaguara|2008|863|GENERAL
El laberinto de la soledad|Octavio Paz|Fondo de Cultura Económica|2015|864|GENERAL
Piedra de sol|Octavio Paz|Era|2010|861|GENERAL
Como agua para chocolate|Laura Esquivel|Debolsillo|2016|863|GENERAL
Arráncame la vida|Ángeles Mastretta|Booket|2012|863|GENERAL
Balún Canán|Rosario Castellanos|Fondo de Cultura Económica|2013|863|GENERAL
Los de abajo|Mariano Azuela|Fondo de Cultura Económica|2015|863|GENERAL
Las batallas en el desierto|José Emilio Pacheco|Era|2011|863|JUVENIL
El principio del placer|José Emilio Pacheco|Era|2009|863|GENERAL
Los recuerdos del porvenir|Elena Garro|Joaquín Mortiz|2010|863|GENERAL
La noche de Tlatelolco|Elena Poniatowska|Era|2012|972.08|GENERAL
Hasta no verte Jesús mío|Elena Poniatowska|Era|2014|863|GENERAL
Santa|Federico Gamboa|Porrúa|2006|863|GENERAL
Al filo del agua|Agustín Yáñez|Porrúa|2008|863|GENERAL
El periquillo sarniento|José Joaquín Fernández de Lizardi|Porrúa|2005|863|GENERAL
Ensayo sobre la ceguera|José Saramago|Alfaguara|2015|869.3|GENERAL
Rayuela|Julio Cortázar|Alfaguara|2013|863|GENERAL
Bestiario|Julio Cortázar|Alfaguara|2012|863|GENERAL
Ficciones|Jorge Luis Borges|Debolsillo|2014|863|GENERAL
El Aleph|Jorge Luis Borges|Debolsillo|2015|863|GENERAL
La casa de los espíritus|Isabel Allende|Debolsillo|2016|863|GENERAL
Veinte poemas de amor y una canción desesperada|Pablo Neruda|Seix Barral|2014|861|GENERAL
La ciudad y los perros|Mario Vargas Llosa|Alfaguara|2012|863|GENERAL
La tregua|Mario Benedetti|Booket|2015|863|GENERAL
El túnel|Ernesto Sabato|Booket|2014|863|GENERAL
Don Quijote de la Mancha|Miguel de Cervantes Saavedra|Real Academia Española|2015|863|GENERAL
La Celestina|Fernando de Rojas|Cátedra|2010|862|GENERAL
Bodas de sangre|Federico García Lorca|Cátedra|2012|862|GENERAL
La casa de Bernarda Alba|Federico García Lorca|Cátedra|2013|862|JUVENIL
Cumbres borrascosas|Emily Brontë|Penguin Clásicos|2016|823|GENERAL
Orgullo y prejuicio|Jane Austen|Penguin Clásicos|2015|823|GENERAL
Frankenstein|Mary Shelley|Penguin Clásicos|2017|823|JUVENIL
Drácula|Bram Stoker|Penguin Clásicos|2014|823|JUVENIL
1984|George Orwell|Debolsillo|2018|823|GENERAL
Rebelión en la granja|George Orwell|Debolsillo|2017|823|JUVENIL
Un mundo feliz|Aldous Huxley|Debolsillo|2016|823|GENERAL
Fahrenheit 451|Ray Bradbury|Debolsillo|2015|813|JUVENIL
Crónicas marcianas|Ray Bradbury|Minotauro|2014|813|JUVENIL
El viejo y el mar|Ernest Hemingway|Debolsillo|2013|813|GENERAL
Matar a un ruiseñor|Harper Lee|HarperCollins|2016|813|GENERAL
El gran Gatsby|F. Scott Fitzgerald|Debolsillo|2014|813|GENERAL
Crimen y castigo|Fiódor Dostoievski|Alianza|2012|891.73|GENERAL
Los hermanos Karamázov|Fiódor Dostoievski|Alianza|2011|891.73|GENERAL
Ana Karenina|León Tolstói|Alianza|2010|891.73|GENERAL
La metamorfosis|Franz Kafka|Alianza|2015|833|JUVENIL
El proceso|Franz Kafka|Alianza|2013|833|GENERAL
Siddhartha|Hermann Hesse|Debolsillo|2016|833|GENERAL
El extranjero|Albert Camus|Alianza|2014|843|GENERAL
La peste|Albert Camus|Edhasa|2012|843|GENERAL
Los miserables|Victor Hugo|Penguin Clásicos|2013|843|GENERAL
El conde de Montecristo|Alexandre Dumas|Penguin Clásicos|2012|843|JUVENIL
Veinte mil leguas de viaje submarino|Julio Verne|Anaya|2014|843|JUVENIL
La vuelta al mundo en ochenta días|Julio Verne|Anaya|2015|843|JUVENIL
El principito|Antoine de Saint-Exupéry|Salamandra|2018|843|INFANTIL
La Odisea|Homero|Gredos|2010|883|GENERAL
La Ilíada|Homero|Gredos|2010|883|GENERAL
Hamlet|William Shakespeare|Austral|2014|822.33|GENERAL
Romeo y Julieta|William Shakespeare|Austral|2016|822.33|JUVENIL
Macbeth|William Shakespeare|Austral|2013|822.33|GENERAL
La divina comedia|Dante Alighieri|Cátedra|2011|851|GENERAL
El nombre de la rosa|Umberto Eco|Debolsillo|2015|853|GENERAL
Harry Potter y la piedra filosofal|J. K. Rowling|Salamandra|2015|823|JUVENIL
Harry Potter y la cámara secreta|J. K. Rowling|Salamandra|2015|823|JUVENIL
Harry Potter y el prisionero de Azkaban|J. K. Rowling|Salamandra|2016|823|JUVENIL
El Hobbit|J. R. R. Tolkien|Minotauro|2012|823|JUVENIL
El señor de los anillos: la comunidad del anillo|J. R. R. Tolkien|Minotauro|2012|823|JUVENIL
Las crónicas de Narnia: el león, la bruja y el ropero|C. S. Lewis|Destino|2014|823|JUVENIL
Los juegos del hambre|Suzanne Collins|Océano|2012|813|JUVENIL
Bajo la misma estrella|John Green|Nube de Tinta|2014|813|JUVENIL
El diario de Ana Frank|Ana Frank|Debolsillo|2016|940.53|JUVENIL
Momo|Michael Ende|Alfaguara|2016|833|INFANTIL
La historia interminable|Michael Ende|Alfaguara|2015|833|JUVENIL
Matilda|Roald Dahl|Alfaguara|2016|823|INFANTIL
Charlie y la fábrica de chocolate|Roald Dahl|Alfaguara|2017|823|INFANTIL
Las brujas|Roald Dahl|Alfaguara|2016|823|INFANTIL
Alicia en el país de las maravillas|Lewis Carroll|Anaya|2014|823|INFANTIL
Pinocho|Carlo Collodi|Anaya|2013|853|INFANTIL
Corazón: diario de un niño|Edmondo De Amicis|Porrúa|2012|853|INFANTIL
Cuentos de la selva|Horacio Quiroga|Losada|2014|863|INFANTIL
El niño con el pijama de rayas|John Boyne|Salamandra|2015|823|JUVENIL
Donde viven los monstruos|Maurice Sendak|Kalandraka|2014|813|INFANTIL
El monstruo de colores|Anna Llenas|Flamboyant|2016|863|INFANTIL
Willy el tímido|Anthony Browne|Fondo de Cultura Económica|2013|823|INFANTIL
Gorila|Anthony Browne|Fondo de Cultura Económica|2014|823|INFANTIL
El túnel|Anthony Browne|Fondo de Cultura Económica|2012|823|INFANTIL
La peor señora del mundo|Francisco Hinojosa|Fondo de Cultura Económica|2015|863|INFANTIL
Cuentos para jugar|Gianni Rodari|Alfaguara|2013|853|INFANTIL
Frida Kahlo: una biografía|María Hesse|Lumen|2016|759.972|GENERAL
La oruga muy hambrienta|Eric Carle|Kókinos|2016|813|INFANTIL
Elmer|David McKee|Ediciones SM|2014|823|INFANTIL
El grúfalo|Julia Donaldson|Bruño|2015|823|INFANTIL
Mi primer atlas de México|Equipo Larousse|Larousse|2018|912.72|INFANTIL
Animales de México para niños|Varios autores|Larousse|2016|591.972|INFANTIL
Sapiens: de animales a dioses|Yuval Noah Harari|Debate|2016|909|GENERAL
Breve historia del tiempo|Stephen Hawking|Crítica|2011|523.1|GENERAL
Cosmos|Carl Sagan|Planeta|2013|520|GENERAL
El origen de las especies|Charles Darwin|Austral|2012|576.82|GENERAL
El gen egoísta|Richard Dawkins|Salvat|2014|576.5|GENERAL
Armas, gérmenes y acero|Jared Diamond|Debate|2015|303.4|GENERAL
El hombre en busca de sentido|Viktor Frankl|Herder|2015|150.195|GENERAL
Inteligencia emocional|Daniel Goleman|Kairós|2014|152.4|GENERAL
Así habló Zaratustra|Friedrich Nietzsche|Alianza|2011|193|GENERAL
El mundo de Sofía|Jostein Gaarder|Siruela|2014|109|JUVENIL
Meditaciones|Marco Aurelio|Gredos|2010|188|GENERAL
El arte de la guerra|Sun Tzu|Edaf|2015|355.02|GENERAL
El contrato social|Jean-Jacques Rousseau|Alianza|2012|320.1|GENERAL
El príncipe|Nicolás Maquiavelo|Alianza|2013|320.1|GENERAL
Visión de los vencidos|Miguel León-Portilla|UNAM|2016|972.02|GENERAL
Historia verdadera de la conquista de la Nueva España|Bernal Díaz del Castillo|Porrúa|2011|972.02|CONSULTA
Historia general de México|El Colegio de México|El Colegio de México|2010|972|CONSULTA
México profundo|Guillermo Bonfil Batalla|Debolsillo|2013|305.897|GENERAL
Las venas abiertas de América Latina|Eduardo Galeano|Siglo XXI|2014|980|GENERAL
Constitución Política de los Estados Unidos Mexicanos|Cámara de Diputados|Cámara de Diputados|2024|342.72|CONSULTA
Diccionario de la lengua española|Real Academia Española|Espasa|2014|463|CONSULTA
Pequeño Larousse ilustrado|Equipo Larousse|Larousse|2023|463|CONSULTA
Atlas de México|INEGI|INEGI|2019|912.72|CONSULTA
Enciclopedia de México|José Rogelio Álvarez|Enciclopedia de México|1998|972.003|CONSULTA
Gramática de la lengua española|Real Academia Española|Espasa|2010|465|CONSULTA
Ortografía de la lengua española|Real Academia Española|Espasa|2011|465|GENERAL
Cálculo diferencial e integral|Frank Ayres;Elliott Mendelson|McGraw-Hill|2010|515.33|GENERAL
Cálculo de una variable|James Stewart|Cengage|2018|515|GENERAL
Álgebra|Aurelio Baldor|Patria|2017|512|GENERAL
Aritmética|Aurelio Baldor|Patria|2016|513|GENERAL
Geometría y trigonometría|Aurelio Baldor|Patria|2015|516|GENERAL
Física|Paul E. Tippens|McGraw-Hill|2011|530|GENERAL
Química|Raymond Chang|McGraw-Hill|2017|540|GENERAL
Biología|Neil A. Campbell;Jane B. Reece|Panamericana|2016|570|GENERAL
Estructuras de datos y algoritmos|Alfred V. Aho;John E. Hopcroft;Jeffrey D. Ullman|Addison-Wesley|1998|005.73|GENERAL
Compiladores: principios, técnicas y herramientas|Alfred V. Aho;Monica S. Lam;Ravi Sethi;Jeffrey D. Ullman|Pearson|2008|005.453|GENERAL
Introducción a la teoría de autómatas, lenguajes y computación|John E. Hopcroft;Rajeev Motwani;Jeffrey D. Ullman|Pearson|2007|511.35|GENERAL
Redes de computadoras|Andrew S. Tanenbaum|Pearson|2012|004.6|GENERAL
Sistemas operativos modernos|Andrew S. Tanenbaum|Pearson|2009|005.43|GENERAL
Fundamentos de sistemas de bases de datos|Ramez Elmasri;Shamkant B. Navathe|Pearson|2007|005.74|GENERAL
Cómo programar en Java|Paul Deitel;Harvey Deitel|Pearson|2016|005.133|GENERAL
Ingeniería del software: un enfoque práctico|Roger S. Pressman|McGraw-Hill|2010|005.1|GENERAL
Inteligencia artificial: un enfoque moderno|Stuart Russell;Peter Norvig|Pearson|2004|006.3|GENERAL
Código limpio|Robert C. Martin|Anaya Multimedia|2012|005.1|GENERAL
Sistemas digitales: principios y aplicaciones|Ronald J. Tocci|Pearson|2007|621.395|GENERAL
Circuitos eléctricos|James W. Nilsson;Susan A. Riedel|Pearson|2005|621.3192|GENERAL
Administración|Stephen P. Robbins;Mary Coulter|Pearson|2014|658|GENERAL
Contabilidad financiera|Gerardo Guajardo Cantú|McGraw-Hill|2014|657|GENERAL
Mercadotecnia|Philip Kotler;Gary Armstrong|Pearson|2013|658.8|GENERAL
Psicología|David G. Myers|Panamericana|2011|150|GENERAL
Historia del arte|E. H. Gombrich|Phaidon|2013|709|GENERAL
Cocina mexicana tradicional|Varios autores|Océano|2010|641.5972|GENERAL
Guía práctica de primeros auxilios|Cruz Roja Mexicana|Cruz Roja Mexicana|2018|616.0252|GENERAL
Agricultura orgánica|Varios autores|Trillas|2012|631.584|GENERAL
Manual del ganadero|Varios autores|Trillas|2009|636.2|GENERAL
El cultivo del maíz|Varios autores|Trillas|2011|633.15|GENERAL
Poemas|Amado Nervo|Porrúa|2010|861|NAYARITA
La amada inmóvil|Amado Nervo|Porrúa|2008|861|NAYARITA
Plenitud|Amado Nervo|Porrúa|2009|868|NAYARITA
El bachiller|Amado Nervo|Porrúa|2007|863|NAYARITA
Perlas negras|Amado Nervo|Porrúa|2006|861|NAYARITA
Elevación|Amado Nervo|Porrúa|2011|861|NAYARITA
Palabras en reposo|Alí Chumacero|Fondo de Cultura Económica|2008|861|NAYARITA
Páramo de sueños|Alí Chumacero|Fondo de Cultura Económica|2009|861|NAYARITA
Imágenes desterradas|Alí Chumacero|Fondo de Cultura Económica|2010|861|NAYARITA
Breve historia de Nayarit|Jean Meyer|Fondo de Cultura Económica|1997|972.34|NAYARITA
Los coras de Nayarit|Varios autores|INAH|2008|305.8974|NAYARITA
Las fiestas de la Casa Grande: ritual agrícola wixárika|Johannes Neurath|INAH|2002|299.7845|NAYARITA
Monografía del estado de Nayarit|Gobierno del Estado de Nayarit|Gobierno del Estado|2015|972.34|NAYARITA
Mexcaltitán: la isla de Aztlán|Varios autores|Universidad Autónoma de Nayarit|2005|972.34|NAYARITA
San Blas y su historia|Varios autores|Universidad Autónoma de Nayarit|2008|972.34|NAYARITA
Lozada: el Tigre de Álica|Varios autores|Universidad Autónoma de Nayarit|2009|972.34|NAYARITA
Leyendas de Tepic|Varios autores|Universidad Autónoma de Nayarit|2012|398.2097234|NAYARITA
`.trim().split('\n');

// para completar el acervo con material de las demás clases
export const TEMAS = {
  '000': ['Computación básica', 'Uso de Internet', 'Programación en Python', 'Bases de datos', 'Ofimática', 'Ciberseguridad', 'Redes sociales', 'Bibliotecología', 'Periodismo', 'Robótica educativa'],
  100: ['Ética', 'Lógica', 'Psicología del desarrollo', 'Autoestima', 'Filosofía griega', 'Superación personal', 'Psicología infantil', 'Hábitos de estudio', 'Pensamiento crítico', 'Manejo del estrés'],
  200: ['Mitología griega', 'Mitología mexica', 'Religiones del mundo', 'Historia de las religiones', 'Tradiciones religiosas de México'],
  300: ['Derecho civil', 'Educación', 'Economía', 'Sociología', 'Derechos humanos', 'Ciencia política', 'Pedagogía', 'Finanzas personales', 'Comercio internacional', 'Educación ambiental', 'Costumbres de México', 'Leyendas mexicanas'],
  400: ['Inglés', 'Redacción', 'Ortografía', 'Lectura y redacción', 'Gramática española', 'Francés', 'Náhuatl', 'Comunicación oral y escrita'],
  500: ['Matemáticas', 'Álgebra lineal', 'Estadística', 'Probabilidad', 'Física', 'Química orgánica', 'Biología celular', 'Ecología', 'Astronomía', 'Geología', 'Botánica', 'Zoología', 'Ecuaciones diferenciales', 'Genética'],
  600: ['Enfermería', 'Nutrición', 'Electricidad', 'Electrónica', 'Mecánica automotriz', 'Agricultura', 'Ganadería', 'Cocina', 'Primeros auxilios', 'Administración de empresas', 'Contabilidad', 'Carpintería', 'Apicultura', 'Riego agrícola'],
  700: ['Dibujo', 'Pintura', 'Fotografía', 'Música', 'Guitarra', 'Teatro', 'Danza folklórica', 'Arquitectura', 'Artesanías', 'Fútbol', 'Ajedrez', 'Cine'],
  800: ['Poesía', 'Cuento', 'Teatro', 'Ensayo literario', 'Literatura mexicana', 'Literatura latinoamericana', 'Literatura infantil'],
  900: ['Historia de México', 'Historia universal', 'Geografía de México', 'La Revolución Mexicana', 'La Independencia de México', 'Culturas prehispánicas', 'Geografía universal', 'Biografías', 'Historia de Nayarit', 'Viajes por México'],
};

export const FORMATOS_TITULO = [
  '{T}', 'Manual de {t}', 'Fundamentos de {t}', '{T}: teoría y práctica', 'Curso de {t}', 'Guía de {t}',
  'Temas de {t}', '{T} para bachillerato', 'Todo sobre {t}', 'Lecciones de {t}', 'Elementos de {t}',
  'Apuntes de {t}', '{T} paso a paso', '{T} para todos', '{T}: conceptos básicos', 'Cuaderno de {t}',
];

export const FORMATOS_INFANTIL = [
  'Mi primer libro de {t}', '{T} para niños', 'Mi gran libro de {t}', '{T} para pequeños lectores',
];

export const TITULOS_INFANTILES = [
  'El dragón que no sabía volar', 'La tortuga Matilde', 'Un gato en el tejado', 'La niña que contaba estrellas',
  'El oso que perdió su sombrero', 'Pepe y el volcán', 'La ballena azul', 'El ratón de biblioteca',
  'Los colores de la selva', 'Las aventuras de Tito el tlacuache', 'El perro que quería ser lobo',
  'La luna en el río', 'El jaguar dormilón', 'La abuela y el colibrí', 'Un día en el mar de San Blas',
  'La semilla mágica', 'El robot y la mariposa', 'Cuentos de la Sierra del Nayar', 'El monstruo de debajo de la cama',
  'Las travesuras de Lupita', 'La iguana presumida', 'Mi amigo el árbol', 'El zorro y las uvas',
];

export const EDITORIALES = [
  'Trillas', 'Limusa', 'McGraw-Hill', 'Pearson', 'Fondo de Cultura Económica', 'Patria', 'Alfaomega',
  'Porrúa', 'Siglo XXI', 'Ediciones SM', 'Santillana', 'Océano', 'Larousse', 'Planeta', 'Grijalbo',
  'Norma', 'Paidós', 'Cengage', 'Esfinge', 'Castillo', 'Edelvives', 'Alfaguara Infantil',
];

// subclase Dewey por tema para que la colocación tenga sentido
export const DEWEY_TEMA = {
  'Computación básica': '004', 'Uso de Internet': '004.678', 'Programación en Python': '005.133', 'Bases de datos': '005.74',
  Ofimática: '005.5', Ciberseguridad: '005.8', 'Redes sociales': '302.231', Bibliotecología: '020', Periodismo: '070',
  'Robótica educativa': '629.892', Ética: '170', Lógica: '160', 'Psicología del desarrollo': '155', Autoestima: '158.1',
  'Filosofía griega': '180', 'Superación personal': '158.1', 'Psicología infantil': '155.4', 'Hábitos de estudio': '371.3',
  'Pensamiento crítico': '160', 'Manejo del estrés': '155.9', 'Mitología griega': '292', 'Mitología mexica': '299.78',
  'Religiones del mundo': '200', 'Historia de las religiones': '209', 'Tradiciones religiosas de México': '263.0972',
  'Derecho civil': '346', Educación: '370', Economía: '330', Sociología: '301', 'Derechos humanos': '323',
  'Ciencia política': '320', Pedagogía: '370.1', 'Finanzas personales': '332.024', 'Comercio internacional': '382',
  'Educación ambiental': '363.7', 'Costumbres de México': '390.972', 'Leyendas mexicanas': '398.2', Inglés: '428',
  Redacción: '808', Ortografía: '465', 'Lectura y redacción': '808', 'Gramática española': '465', Francés: '448',
  Náhuatl: '497.452', 'Comunicación oral y escrita': '302.2', Matemáticas: '510', 'Álgebra lineal': '512.5',
  Estadística: '519.5', Probabilidad: '519.2', Física: '530', 'Química orgánica': '547', 'Biología celular': '571.6',
  Ecología: '577', Astronomía: '520', Geología: '550', Botánica: '580', Zoología: '590', 'Ecuaciones diferenciales': '515.35',
  Genética: '576.5', Enfermería: '610.73', Nutrición: '613.2', Electricidad: '621.3', Electrónica: '621.381',
  'Mecánica automotriz': '629.287', Agricultura: '630', Ganadería: '636', Cocina: '641.5', 'Primeros auxilios': '616.0252',
  'Administración de empresas': '658', Contabilidad: '657', Carpintería: '694', Apicultura: '638.1', 'Riego agrícola': '631.587',
  Dibujo: '741', Pintura: '750', Fotografía: '770', Música: '780', Guitarra: '787.87', Teatro: '792', 'Danza folklórica': '793.31',
  Arquitectura: '720', Artesanías: '745.5', Fútbol: '796.334', Ajedrez: '794.1', Cine: '791.43', Poesía: '861', Cuento: '863',
  'Ensayo literario': '864', 'Literatura mexicana': '860.9972', 'Literatura latinoamericana': '860.98', 'Literatura infantil': '808.068',
  'Historia de México': '972', 'Historia universal': '909', 'Geografía de México': '917.2', 'La Revolución Mexicana': '972.081',
  'La Independencia de México': '972.03', 'Culturas prehispánicas': '972.01', 'Geografía universal': '910', Biografías: '920',
  'Historia de Nayarit': '972.34', 'Viajes por México': '917.2',
};

export const COLONIAS_TEPIC = [
  ['Centro', '63000'], ['Mololoa', '63050'], ['San José', '63039'], ['Los Fresnos', '63190'], ['Ciudad del Valle', '63157'],
  ['Jacarandas', '63175'], ['Lagos del Country', '63173'], ['San Juan', '63130'], ['Indeco', '63170'],
  ['Valle de Matatipac', '63195'], ['Lindavista', '63110'], ['Las Brisas', '63117'], ['Burócrata Federal', '63156'],
  ['El Rodeo', '63060'], ['Juan Escutia', '63120'], ['Vistas de la Cantera', '63180'], ['Fraccionamiento Moctezuma', '63180'],
  ['La Loma', '63070'], ['Puerta de la Laguna', '63150'], ['Fovissste Las Aves', '63177'], ['El Tecolote', '63136'],
  ['Morelos', '63020'], ['Heriberto Casas', '63048'], ['Santa Teresita', '63090'], ['Los Sauces', '63197'],
  ['Infonavit Solidaridad', '63162'], ['2 de Agosto', '63158'], ['Prieto Crispín', '63118'], ['Comerciantes', '63167'],
  ['Villas del Roble', '63196'],
];

export const CALLES = [
  'Av. México', 'Av. Insurgentes', 'Av. Allende', 'Av. Juárez', 'Av. Prisciliano Sánchez', 'Av. Victoria', 'Calle Zacatecas',
  'Calle Hidalgo', 'Calle Lerdo', 'Calle Puebla', 'Calle Veracruz', 'Calle Durango', 'Calle Amado Nervo', 'Calle Mina',
  'Calle Morelos', 'Calle Abasolo', 'Av. Jacarandas', 'Calle Oaxaca', 'Calle Bravo', 'Calle Querétaro', 'Calle Nayarit',
  'Calle Sonora', 'Av. Tecnológico', 'Calle Laureles', 'Calle Fresno', 'Calle Cedro', 'Calle Roble', 'Av. Aguamilpa',
  'Calle Montes de Oca', 'Calle Guerrero',
];

export const ESCUELAS = [
  'Instituto Tecnológico de Tepic', 'Universidad Autónoma de Nayarit', 'Preparatoria No. 1 UAN', 'Preparatoria No. 13 UAN',
  'CBTIS No. 100', 'CECyTEN Plantel Tepic', 'CONALEP Tepic', 'Secundaria Técnica No. 1', 'Secundaria Federal No. 2',
  'Escuela Primaria Juan Escutia', 'Escuela Primaria Amado Nervo', 'Escuela Primaria Benito Juárez',
  'Universidad Vizcaya de las Américas', 'Escuela Normal Superior de Nayarit', 'Universidad Tecnológica de Nayarit',
];

export const TRABAJOS = [
  'Gobierno del Estado de Nayarit', 'H. Ayuntamiento de Tepic', 'IMSS Delegación Nayarit', 'ISSSTE Tepic',
  'Secretaría de Educación de Nayarit', 'Comisión Federal de Electricidad', 'Hospital Civil Dr. Antonio González Guevara',
  'Walmart Tepic', 'Soriana Tepic', 'Coppel Tepic', 'Banco Azteca', 'Despacho contable particular', 'Negocio propio',
  'Universidad Autónoma de Nayarit', 'Instituto Tecnológico de Tepic', 'Mercado Juan Escutia', 'Cervecería del Pacífico',
  'Taller mecánico particular', 'Consultorio particular', 'Farmacias Guadalajara',
];

export const NOMBRES = [
  'José Luis', 'Juan Carlos', 'Miguel Ángel', 'Luis Fernando', 'Jorge', 'Alejandro', 'Ricardo', 'Fernando', 'Eduardo', 'Roberto',
  'Daniel', 'Carlos', 'Francisco', 'Javier', 'Sergio', 'Diego', 'Emiliano', 'Santiago', 'Mateo', 'Sebastián', 'Leonardo',
  'Kevin', 'Brandon', 'Ángel', 'Omar', 'Héctor', 'Raúl', 'Arturo', 'Rodolfo', 'Tomás', 'Armando', 'Hugo', 'David', 'Iván',
  'Óscar', 'Manuel', 'Pedro', 'Ramón', 'Gerardo', 'Alberto', 'Martín', 'Joel', 'Uriel', 'Erick', 'Axel', 'Cristian',
  'María Fernanda', 'Ana Sofía', 'Guadalupe', 'María José', 'Daniela', 'Valeria', 'Ximena', 'Camila', 'Regina', 'Renata',
  'Fernanda', 'Andrea', 'Mariana', 'Paola', 'Karla', 'Alejandra', 'Gabriela', 'Patricia', 'Claudia', 'Verónica', 'Elizabeth',
  'Jennifer', 'Carmen', 'Amparo', 'Rosa María', 'Leticia', 'Silvia', 'Adriana', 'Laura', 'Diana', 'Itzel', 'Citlali',
  'Brenda', 'Yesenia', 'Araceli', 'Martha', 'Norma', 'Lucía', 'Isabella', 'Victoria', 'Natalia', 'Jimena', 'Sofía', 'Abril',
];

export const APELLIDOS = [
  'García', 'Hernández', 'Martínez', 'López', 'González', 'Rodríguez', 'Pérez', 'Sánchez', 'Ramírez', 'Cruz', 'Flores',
  'Gómez', 'Morales', 'Vázquez', 'Reyes', 'Jiménez', 'Torres', 'Díaz', 'Gutiérrez', 'Ruiz', 'Mendoza', 'Aguilar', 'Ortiz',
  'Moreno', 'Castillo', 'Romero', 'Álvarez', 'Méndez', 'Chávez', 'Rivera', 'Juárez', 'Ramos', 'Domínguez', 'Herrera',
  'Medina', 'Castro', 'Vargas', 'Guzmán', 'Velázquez', 'Muñoz', 'Rojas', 'Contreras', 'Salazar', 'Luna', 'Ortega',
  'Cervantes', 'Durán', 'Zepeda', 'Castañeda', 'Ibarra', 'Navarro', 'Delgado', 'Bernal', 'Robles', 'Partida', 'Arellano',
  'Peña', 'Lara', 'Rosales', 'Montes', 'Ceja', 'Becerra', 'Andrade', 'Villaseñor', 'Haro', 'Curiel', 'Parra', 'Ulloa',
  'Carrillo', 'Bañuelos', 'Plascencia', 'Lomelí', 'Solís', 'Ávila', 'Valdez', 'Espinoza', 'Sandoval', 'Cortés', 'Escobedo',
];
