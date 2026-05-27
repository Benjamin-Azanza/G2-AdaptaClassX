import 'dotenv/config';
import { PrismaClient, Role, Tema, TipoJuego, TipoFuente } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');


  const passwordHash = await bcrypt.hash('Password123!', 10);

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

  await prisma.paralelo.upsert({
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
    const paraleloId = i < 5 ? paralelo3A.id : null;
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

  const juegoPrincipal = await prisma.game.upsert({
    where: { titulo: 'Quiz Rapido - Lectura' },
    update: {},
    create: {
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
  });
  console.log('  1 juego creado');

  // ─── 10 juegos importados desde examples-master ──────────
  const juegosImportados = [
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
  console.log(`  ${juegosImportados.length} juegos importados desde examples-master`);

  const defaultQuestions = [
    {
      id: 'q1',
      texto: 'Cual es el sinonimo de alegre?',
      opciones: ['triste', 'feliz', 'enojado', 'cansado'],
      respuestaCorrecta: 1,
      pista: 'Es lo que sientes en tu cumpleanos',
    },
    {
      id: 'q2',
      texto: 'Que es un sustantivo?',
      opciones: ['Una accion', 'Un nombre', 'Un color', 'Un numero'],
      respuestaCorrecta: 1,
      pista: 'Es el nombre de algo o alguien',
    },
    {
      id: 'q3',
      texto: 'Cuantas vocales tiene el abecedario espanol?',
      opciones: ['3', '4', '5', '6'],
      respuestaCorrecta: 2,
      pista: 'A, E, I...',
    },
    {
      id: 'q4',
      texto: 'Cual de estas palabras es un adjetivo?',
      opciones: ['correr', 'hermoso', 'mesa', 'rapidamente'],
      respuestaCorrecta: 1,
      pista: 'Describe una cualidad',
    },
    {
      id: 'q5',
      texto: 'Que signo se pone al final de una pregunta?',
      opciones: ['Punto', 'Coma', 'Signo de interrogacion', 'Punto y coma'],
      respuestaCorrecta: 2,
      pista: 'Lo estas viendo en esta misma pregunta',
    },
  ];

  const allGames = await prisma.game.findMany();
  for (const g of allGames) {
    const existingQuestionSet = await prisma.gameQuestion.findFirst({
      where: {
        game_id: g.id,
        paralelo_id: null,
      },
    });

    if (existingQuestionSet) {
      await prisma.gameQuestion.update({
        where: { id: existingQuestionSet.id },
        data: {
          preguntas_json: defaultQuestions.map((q) => ({
            texto: q.texto,
            opciones: q.opciones,
            respuestaCorrecta: q.respuestaCorrecta,
          })),
          tipo_fuente: TipoFuente.DEFAULT,
        },
      });
    } else {
      await prisma.gameQuestion.create({
        data: {
          game_id: g.id,
          paralelo_id: null,
          preguntas_json: defaultQuestions.map((q) => ({
            texto: q.texto,
            opciones: q.opciones,
            respuestaCorrecta: q.respuestaCorrecta,
          })),
          tipo_fuente: TipoFuente.DEFAULT,
        },
      });
    }
  }
  console.log('  Preguntas por defecto creadas para TODOS los juegos');

  const assignment = await prisma.assignment.create({
    data: {
      paralelo_id: paralelo3A.id,
      game_id: juegoPrincipal.id,
      minutos_requeridos: 15,
      fecha_limite: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      created_by: teacher1.id,
    },
  });

  const students3A = await prisma.student.findMany({
    where: { paralelo_id: paralelo3A.id },
  });

  for (const student of students3A) {
    await prisma.studentProgress.create({
      data: {
        student_id: student.user_id,
        assignment_id: assignment.id,
      },
    });

    await prisma.notification.create({
      data: {
        student_id: student.user_id,
        assignment_id: assignment.id,
        mensaje: `Tu profe asigno nueva actividad: 15 min de ${juegoPrincipal.titulo}`,
      },
    });
  }
  console.log('  1 asignacion de ejemplo creada con progreso y notificaciones');

  console.log('Seed completado exitosamente');
}

main()
  .catch((error) => {
    console.error('Error en seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
