"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const bcrypt = __importStar(require("bcrypt"));
const adapter = new adapter_pg_1.PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    console.log('🌱 Seeding database...');
    const cedulas = await Promise.all([
        prisma.cedulaAutorizada.upsert({
            where: { cedula: '1712345678' },
            update: {},
            create: { cedula: '1712345678', nombre_referencia: 'Prof. María García' },
        }),
        prisma.cedulaAutorizada.upsert({
            where: { cedula: '1798765432' },
            update: {},
            create: { cedula: '1798765432', nombre_referencia: 'Prof. Carlos López' },
        }),
        prisma.cedulaAutorizada.upsert({
            where: { cedula: '1750706572' },
            update: {},
            create: { cedula: '1750706572', nombre_referencia: 'Prof. Gatitos' },
        }),
    ]);
    console.log(`  ✅ ${cedulas.length} cédulas autorizadas creadas`);
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const teacher1 = await prisma.user.upsert({
        where: { email: 'maria@escuela.edu' },
        update: {},
        create: {
            email: 'maria@escuela.edu',
            password_hash: passwordHash,
            role: client_1.Role.TEACHER,
            teacher: {
                create: {
                    nombre: 'María García',
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
            role: client_1.Role.TEACHER,
            teacher: {
                create: {
                    nombre: 'Carlos López',
                    cedula: '1798765432',
                },
            },
        },
    });
    console.log('  ✅ 2 profesores creados');
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
    console.log('  ✅ 2 paralelos creados (3ro A: KX7T2M, 4to B: NP4R8W)');
    const studentNames = [
        'Ana Martínez', 'Luis Pérez', 'Sofía Torres', 'Diego Ramírez', 'Valentina Suárez',
        'Mateo González', 'Camila Herrera', 'Sebastián Rojas', 'Isabella Castro', 'Nicolás Vargas',
    ];
    const students = [];
    for (let i = 0; i < studentNames.length; i++) {
        const email = `estudiante${i + 1}@escuela.edu`;
        const paraleloId = i < 5 ? paralelo3A.id : paralelo4B.id;
        const student = await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
                email,
                password_hash: passwordHash,
                role: client_1.Role.STUDENT,
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
        students.push(student);
    }
    console.log(`  ✅ ${students.length} estudiantes creados`);
    const juegosBase = [
        {
            titulo: 'Aventura de Lectura',
            tema: client_1.Tema.LECTURA,
            descripcion: 'Explora mundos fantásticos mientras mejoras tu comprensión lectora.',
        },
        {
            titulo: 'Comprensión Oral',
            tema: client_1.Tema.COMUNICACION_ORAL,
            descripcion: 'Escucha con atención y demuestra lo que entendiste.',
        },
        {
            titulo: 'El Mundo de las Letras',
            tema: client_1.Tema.LENGUA_CULTURA,
            descripcion: 'Descubre la magia del lenguaje y la cultura.',
        },
        {
            titulo: 'Taller de Escritores',
            tema: client_1.Tema.ESCRITURA,
            descripcion: 'Conviértete en un gran escritor creando historias increíbles.',
        },
        {
            titulo: 'Cuentos Mágicos',
            tema: client_1.Tema.LITERATURA,
            descripcion: 'Sumérgete en el mundo de la literatura infantil.',
        },
    ];
    for (const juego of juegosBase) {
        await prisma.game.upsert({
            where: { id: juego.titulo.toLowerCase().replace(/\s/g, '-') },
            update: {},
            create: {
                titulo: juego.titulo,
                tema: juego.tema,
                tipo: client_1.TipoJuego.BASE,
                acepta_preguntas_ia: false,
                grado_min: 3,
                grado_max: 5,
                descripcion: juego.descripcion,
                config_default: {
                    tiempoLimitePreguntaSegundos: 30,
                    cantidadPreguntasPorSesion: 10,
                    xpPorSesionLibre: 0,
                    permitirPistas: true,
                },
            },
        });
    }
    console.log(`  ✅ ${juegosBase.length} juegos BASE creados`);
    const juegosCambiantes = [
        {
            titulo: 'Quiz Rápido — Lectura',
            tema: client_1.Tema.LECTURA,
            descripcion: 'Responde preguntas sobre textos y mejora tu velocidad lectora.',
        },
        {
            titulo: 'Sopa de Letras',
            tema: client_1.Tema.ESCRITURA,
            descripcion: 'Encuentra las palabras escondidas y enriquece tu vocabulario.',
        },
        {
            titulo: 'Palabras Cruzadas',
            tema: client_1.Tema.LENGUA_CULTURA,
            descripcion: 'Resuelve crucigramas y aprende nuevas palabras.',
        },
    ];
    const createdCambiantes = [];
    for (const juego of juegosCambiantes) {
        const created = await prisma.game.create({
            data: {
                titulo: juego.titulo,
                tema: juego.tema,
                tipo: client_1.TipoJuego.CAMBIANTE,
                acepta_preguntas_ia: true,
                grado_min: 3,
                grado_max: 5,
                descripcion: juego.descripcion,
                config_default: {
                    tiempoLimitePreguntaSegundos: 30,
                    cantidadPreguntasPorSesion: 10,
                    xpPorSesionLibre: 0,
                    permitirPistas: true,
                },
            },
        });
        createdCambiantes.push(created);
    }
    console.log(`  ✅ ${juegosCambiantes.length} juegos CAMBIANTE creados`);
    const defaultQuestions = [
        {
            id: 'q1',
            texto: '¿Cuál es el sinónimo de "alegre"?',
            opciones: ['triste', 'feliz', 'enojado', 'cansado'],
            respuestaCorrecta: 1,
            pista: 'Es lo que sientes en tu cumpleaños',
        },
        {
            id: 'q2',
            texto: '¿Qué es un sustantivo?',
            opciones: ['Una acción', 'Un nombre', 'Un color', 'Un número'],
            respuestaCorrecta: 1,
            pista: 'Es el nombre de algo o alguien',
        },
        {
            id: 'q3',
            texto: '¿Cuántas vocales tiene el abecedario español?',
            opciones: ['3', '4', '5', '6'],
            respuestaCorrecta: 2,
            pista: 'A, E, I...',
        },
        {
            id: 'q4',
            texto: '¿Cuál de estas palabras es un adjetivo?',
            opciones: ['correr', 'hermoso', 'mesa', 'rápidamente'],
            respuestaCorrecta: 1,
            pista: 'Describe una cualidad',
        },
        {
            id: 'q5',
            texto: '¿Qué signo se pone al final de una pregunta?',
            opciones: ['Punto', 'Coma', 'Signo de interrogación', 'Punto y coma'],
            respuestaCorrecta: 2,
            pista: 'Lo estás viendo en esta misma pregunta',
        },
    ];
    for (const game of createdCambiantes) {
        await prisma.gameQuestion.create({
            data: {
                game_id: game.id,
                paralelo_id: null,
                preguntas_json: defaultQuestions,
                tipo_fuente: client_1.TipoFuente.DEFAULT,
            },
        });
    }
    console.log('  ✅ Preguntas por defecto creadas para juegos CAMBIANTE');
    const quizLectura = createdCambiantes.find((g) => g.titulo.includes('Lectura'));
    if (quizLectura) {
        const assignment = await prisma.assignment.create({
            data: {
                paralelo_id: paralelo3A.id,
                game_id: quizLectura.id,
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
                    mensaje: `Tu profe asignó nueva actividad: 15 min de ${quizLectura.titulo}`,
                },
            });
        }
        console.log('  ✅ 1 asignación de ejemplo creada con progreso y notificaciones');
    }
    console.log('\n🎉 Seed completado exitosamente!');
}
main()
    .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map