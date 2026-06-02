import 'dotenv/config';
import { PrismaClient, Role, Tema, TipoJuego, MissionType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database with the new learning model...');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Crear Profesores
  const teacher1 = await prisma.user.upsert({
    where: { email: 'maria@escuela.edu' },
    update: {},
    create: {
      email: 'maria@escuela.edu',
      password_hash: passwordHash,
      role: Role.TEACHER,
      teacher: {
        create: {
          nombre: 'Maria Garcia',
          cedula: '1712345678',
        },
      },
    },
  });

  const teacher2 = await prisma.user.upsert({
    where: { email: 'carlos@escuela.edu' },
    update: {},
    create: {
      email: 'carlos@escuela.edu',
      password_hash: passwordHash,
      role: Role.TEACHER,
      teacher: {
        create: {
          nombre: 'Carlos Lopez',
          cedula: '1798765432',
        },
      },
    },
  });
  console.log('  2 profesores creados');

  // 2. Crear Paralelos
  const paralelo3A = await prisma.paralelo.upsert({
    where: { codigo_acceso: 'KX7T2M' },
    update: {},
    create: {
      nombre: '3ro A',
      grado: 3,
      teacher_id: teacher1.id,
      codigo_acceso: 'KX7T2M',
    },
  });

  const paralelo4B = await prisma.paralelo.upsert({
    where: { codigo_acceso: 'NP4R8W' },
    update: {},
    create: {
      nombre: '4to B',
      grado: 4,
      teacher_id: teacher2.id,
      codigo_acceso: 'NP4R8W',
    },
  });
  console.log('  2 paralelos creados');

  // 3. Crear Estudiantes
  const studentNames = [
    'Ana Martinez',
    'Luis Perez',
    'Sofia Torres',
    'Diego Ramirez',
    'Valentina Suarez',
    'Mateo Gonzalez',
    'Camila Herrera',
    'Sebastian Rojas',
    'Isabella Castro',
    'Nicolas Vargas',
  ];

  const students: string[] = [];
  for (let i = 0; i < studentNames.length; i++) {
    const email = `estudiante${i + 1}@escuela.edu`;
    // Asignar los primeros 5 a 3ro A (de la profesora Maria) y los otros 5 a 4to B (del profesor Carlos)
    const paraleloId = i < 5 ? paralelo3A.id : paralelo4B.id;
    const student = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        password_hash: passwordHash,
        role: Role.STUDENT,
        student: {
          create: {
            nombre: studentNames[i],
            puntos_xp: Math.floor(Math.random() * 300),
            racha_dias: Math.floor(Math.random() * 7),
            paralelo_id: paraleloId,
          },
        },
      },
    });
    students.push(student.id);
  }
  console.log(`  ${students.length} estudiantes creados`);

  // 4. Crear Juegos
  const juegosImportados = [
    {
      titulo: 'Quiz Rapido - Lectura',
      tema: Tema.LECTURA,
      tipo: TipoJuego.CAMBIANTE,
      acepta_preguntas_ia: true,
      grado_min: 3,
      grado_max: 5,
      descripcion: 'Responde preguntas sobre textos y mejora tu velocidad lectora.',
      config_default: {
        rutaJuego: '/games/bomb-game',
        tiempoLimitePreguntaSegundos: 30,
        cantidadPreguntasPorSesion: 10,
        xpPorSesionLibre: 0,
        permitirPistas: true,
      },
    },
    {
      titulo: 'Avoid the Germs',
      tema: Tema.LENGUA_CULTURA,
      tipo: TipoJuego.CAMBIANTE,
      acepta_preguntas_ia: true,
      grado_min: 2,
      grado_max: 7,
      descripcion: 'Esquiva los germenes y mantente sano el mayor tiempo posible.',
      config_default: { rutaJuego: '/games/avoid-germs' },
    },
    {
      titulo: 'Bank Panic',
      tema: Tema.COMUNICACION_ORAL,
      tipo: TipoJuego.CAMBIANTE,
      acepta_preguntas_ia: true,
      grado_min: 3,
      grado_max: 7,
      descripcion: 'Dispara a los bandidos y evita a los inocentes en este clasico arcade.',
      config_default: { rutaJuego: '/games/bank-panic' },
    },
    {
      titulo: 'Breakout',
      tema: Tema.LECTURA,
      tipo: TipoJuego.CAMBIANTE,
      acepta_preguntas_ia: true,
      grado_min: 2,
      grado_max: 6,
      descripcion: 'Rompe todos los bloques rebotando la pelota con tu plataforma.',
      config_default: { rutaJuego: '/games/breakout' },
    },
    {
      titulo: 'Card Memory',
      tema: Tema.LITERATURA,
      tipo: TipoJuego.CAMBIANTE,
      acepta_preguntas_ia: true,
      grado_min: 2,
      grado_max: 5,
      descripcion: 'Encuentra las parejas de cartas iguales y entrena tu memoria.',
      config_default: { rutaJuego: '/games/card-memory' },
    },
    {
      titulo: 'Emoji Match',
      tema: Tema.LENGUA_CULTURA,
      tipo: TipoJuego.CAMBIANTE,
      acepta_preguntas_ia: true,
      grado_min: 2,
      grado_max: 6,
      descripcion: 'Empareja emojis identicos en este desafio visual.',
      config_default: { rutaJuego: '/games/emoji-match' },
    },
    {
      titulo: 'Sliding Puzzle',
      tema: Tema.ESCRITURA,
      tipo: TipoJuego.CAMBIANTE,
      acepta_preguntas_ia: true,
      grado_min: 3,
      grado_max: 7,
      descripcion: 'Desliza las piezas para reconstruir la imagen completa.',
      config_default: { rutaJuego: '/games/sliding-puzzle' },
    },
    {
      titulo: 'Snake',
      tema: Tema.LECTURA,
      tipo: TipoJuego.CAMBIANTE,
      acepta_preguntas_ia: true,
      grado_min: 2,
      grado_max: 6,
      descripcion: 'El clasico Snake: come y crece sin chocar contigo mismo.',
      config_default: { rutaJuego: '/games/snake' },
    },
    {
      titulo: 'Snowmen Attack',
      tema: Tema.COMUNICACION_ORAL,
      tipo: TipoJuego.CAMBIANTE,
      acepta_preguntas_ia: true,
      grado_min: 3,
      grado_max: 7,
      descripcion: 'Defiendete de los munecos de nieve lanzando bolas con puntería.',
      config_default: { rutaJuego: '/games/snowmen-attack' },
    },
    {
      titulo: 'Stacker',
      tema: Tema.ESCRITURA,
      tipo: TipoJuego.CAMBIANTE,
      acepta_preguntas_ia: true,
      grado_min: 4,
      grado_max: 7,
      descripcion: 'Apila bloques con precision y llega lo mas alto posible.',
      config_default: { rutaJuego: '/games/stacker' },
    },
    {
      titulo: 'Tom',
      tema: Tema.LITERATURA,
      tipo: TipoJuego.CAMBIANTE,
      acepta_preguntas_ia: true,
      grado_min: 2,
      grado_max: 6,
      descripcion: 'Una demo interactiva con animaciones y sonidos divertidos.',
      config_default: { rutaJuego: '/games/tom' },
    },
    {
      titulo: 'Pirate Survival',
      tema: Tema.COMUNICACION_ORAL,
      tipo: TipoJuego.CAMBIANTE,
      acepta_preguntas_ia: true,
      grado_min: 3,
      grado_max: 7,
      descripcion: 'Sobrevive oleadas de esqueletos como un pirata. Responde preguntas entre rondas para recuperar vida.',
      config_default: { rutaJuego: '/games/pirate-survival' },
    },
  ];

  for (const juegoData of juegosImportados) {
    await prisma.game.upsert({
      where: { titulo: juegoData.titulo },
      update: { config_default: juegoData.config_default },
      create: juegoData,
    });
  }
  console.log(`  ${juegosImportados.length} juegos creados/actualizados`);

  // 5. Crear QuestionSources (Historial de PDF/materiales subidos)
  const sourceLectura1 = await prisma.questionSource.create({
    data: {
      teacher_id: teacher1.id,
      filename: 'comprension_lectora_3ero.pdf',
      source_hash: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
      tema: Tema.LECTURA,
    },
  });

  const sourceEscritura1 = await prisma.questionSource.create({
    data: {
      teacher_id: teacher1.id,
      filename: 'reglas_ortograficas_basicas.pdf',
      source_hash: '8f4305af2f778d9b1390f77ff181bf372dc458b0f8cd4384a6c8e8886266e7bf',
      tema: Tema.ESCRITURA,
    },
  });

  const sourceLectura2 = await prisma.questionSource.create({
    data: {
      teacher_id: teacher2.id,
      filename: 'lecturas_avanzadas_4to.pdf',
      source_hash: '48f305af2f778d9b1390f77ff181bf372dc458b0f8cd4384a6c8e8886266e7cf',
      tema: Tema.LECTURA,
    },
  });
  console.log('  3 fuentes de preguntas creadas (QuestionSource)');

  // 6. Crear Banco de Preguntas (Questions) vinculadas a los profesores y opcionalmente a las fuentes
  const defaultQuestionsLectura = [
    {
      texto: '¿Cuál es el sinónimo de alegre?',
      opciones: ['triste', 'feliz', 'enojado', 'cansado'],
      respuesta_correcta: 'feliz',
    },
    {
      texto: '¿Qué tipo de texto es una fábula?',
      opciones: ['Informativo', 'Narrativo', 'Científico', 'Instructivo'],
      respuesta_correcta: 'Narrativo',
    },
    {
      texto: '¿Qué signo se pone al final de una pregunta?',
      opciones: ['Punto', 'Coma', 'Signo de interrogación', 'Punto y coma'],
      respuesta_correcta: 'Signo de interrogación',
    },
  ];

  const defaultQuestionsEscritura = [
    {
      texto: '¿Qué palabra está escrita correctamente?',
      opciones: ['aveses', 'a veces', 'aveces', 'habeces'],
      respuesta_correcta: 'a veces',
    },
    {
      texto: '¿Qué es un sustantivo?',
      opciones: ['Una acción', 'Un nombre de persona, animal o cosa', 'Un color', 'Un número'],
      respuesta_correcta: 'Un nombre de persona, animal o cosa',
    },
    {
      texto: '¿Cuál de estas palabras es un adjetivo?',
      opciones: ['correr', 'hermoso', 'mesa', 'rápidamente'],
      respuesta_correcta: 'hermoso',
    },
  ];

  const defaultQuestionsOtros = [
    {
      tema: Tema.LENGUA_CULTURA,
      texto: '¿Cuántas vocales tiene el abecedario español?',
      opciones: ['3', '4', '5', '6'],
      respuesta_correcta: '5',
    },
    {
      tema: Tema.COMUNICACION_ORAL,
      texto: '¿Qué hacemos al escuchar con atención a alguien?',
      opciones: ['Interrumpir', 'Mirar a los ojos y prestar atención', 'Mirar el celular', 'Hablar más fuerte'],
      respuesta_correcta: 'Mirar a los ojos y prestar atención',
    },
    {
      tema: Tema.LITERATURA,
      texto: '¿Quién escribió un poema?',
      opciones: ['El reportero', 'El poeta', 'El científico', 'El panadero'],
      respuesta_correcta: 'El poeta',
    },
  ];

  // Poblar preguntas de lectura para Profesora Maria (Teacher 1)
  for (const q of defaultQuestionsLectura) {
    await prisma.question.create({
      data: {
        teacher_id: teacher1.id,
        source_id: sourceLectura1.id,
        tema: Tema.LECTURA,
        texto: q.texto,
        opciones: q.opciones,
        respuesta_correcta: q.respuesta_correcta,
      },
    });
  }

  // Poblar preguntas de escritura para Profesora Maria (Teacher 1)
  for (const q of defaultQuestionsEscritura) {
    await prisma.question.create({
      data: {
        teacher_id: teacher1.id,
        source_id: sourceEscritura1.id,
        tema: Tema.ESCRITURA,
        texto: q.texto,
        opciones: q.opciones,
        respuesta_correcta: q.respuesta_correcta,
      },
    });
  }

  // Poblar otras temáticas para Profesora Maria para que tenga cubiertos todos los juegos
  for (const q of defaultQuestionsOtros) {
    await prisma.question.create({
      data: {
        teacher_id: teacher1.id,
        tema: q.tema,
        texto: q.texto,
        opciones: q.opciones,
        respuesta_correcta: q.respuesta_correcta,
      },
    });
  }

  // Poblar preguntas de lectura para Profesor Carlos (Teacher 2)
  for (const q of defaultQuestionsLectura) {
    await prisma.question.create({
      data: {
        teacher_id: teacher2.id,
        source_id: sourceLectura2.id,
        tema: Tema.LECTURA,
        texto: q.texto,
        opciones: q.opciones,
        respuesta_correcta: q.respuesta_correcta,
      },
    });
  }
  console.log('  Preguntas creadas en el banco global de preguntas para ambos profesores');

  // 7. Crear una Misión Activa (Mission)
  // Tipo: PLAY_TIME de 15 minutos en el paralelo de la profesora María (3ro A)
  const mission = await prisma.mission.create({
    data: {
      paralelo_id: paralelo3A.id,
      tipo: MissionType.PLAY_TIME,
      goal_value: 15,
      fecha_limite: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días límite
      created_by: teacher1.id,
    },
  });

  // 8. Crear progreso inicial y notificaciones de misión para estudiantes de 3ro A
  const students3A = await prisma.student.findMany({
    where: { paralelo_id: paralelo3A.id },
  });

  for (const s of students3A) {
    await prisma.studentMissionProgress.create({
      data: {
        student_id: s.user_id,
        mission_id: mission.id,
        current_value: 0,
        completado: false,
        xp_otorgado: false,
      },
    });

    await prisma.notification.create({
      data: {
        student_id: s.user_id,
        mission_id: mission.id,
        mensaje: `¡Nueva Misión asignada! Juega un total de 15 minutos a cualquier juego de la clase.`,
      },
    });
  }
  console.log('  1 misión de ejemplo activa (PLAY_TIME, 15 min) creada con progreso y notificaciones');

  console.log('Seed completado exitosamente.');
}

main()
  .catch((error) => {
    console.error('Error en seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
