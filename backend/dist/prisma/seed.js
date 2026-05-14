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
    console.log('Seeding database...');
    const cedulas = await Promise.all([
        prisma.cedulaAutorizada.upsert({
            where: { cedula: '1712345678' },
            update: {},
            create: { cedula: '1712345678', nombre_referencia: 'Prof. Maria Garcia' },
        }),
        prisma.cedulaAutorizada.upsert({
            where: { cedula: '1798765432' },
            update: {},
            create: { cedula: '1798765432', nombre_referencia: 'Prof. Carlos Lopez' },
        }),
        prisma.cedulaAutorizada.upsert({
            where: { cedula: '1750706572' },
            update: {},
            create: { cedula: '1750706572', nombre_referencia: 'Prof. Gatitos' },
        }),
    ]);
    console.log(`  ${cedulas.length} cedulas autorizadas creadas`);
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
            role: client_1.Role.TEACHER,
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
    const students = [];
    for (let i = 0; i < studentNames.length; i++) {
        const email = `estudiante${i + 1}@escuela.edu`;
        const paraleloId = i < 5 ? paralelo3A.id : null;
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
        students.push(student.id);
    }
    console.log(`  ${students.length} estudiantes creados`);
    const juegoPrincipal = await prisma.game.upsert({
        where: { titulo: 'Quiz Rapido - Lectura' },
        update: {},
        create: {
            titulo: 'Quiz Rapido - Lectura',
            tema: client_1.Tema.LECTURA,
            tipo: client_1.TipoJuego.CAMBIANTE,
            acepta_preguntas_ia: true,
            grado_min: 3,
            grado_max: 5,
            descripcion: 'Responde preguntas sobre textos y mejora tu velocidad lectora.',
            config_default: {
                tiempoLimitePreguntaSegundos: 30,
                cantidadPreguntasPorSesion: 10,
                xpPorSesionLibre: 0,
                permitirPistas: true,
            },
        },
    });
    console.log('  1 juego creado');
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
    const existingQuestionSet = await prisma.gameQuestion.findFirst({
        where: {
            game_id: juegoPrincipal.id,
            paralelo_id: null,
        },
    });
    if (existingQuestionSet) {
        await prisma.gameQuestion.update({
            where: { id: existingQuestionSet.id },
            data: {
                preguntas_json: defaultQuestions,
                tipo_fuente: client_1.TipoFuente.DEFAULT,
            },
        });
    }
    else {
        await prisma.gameQuestion.create({
            data: {
                game_id: juegoPrincipal.id,
                paralelo_id: null,
                preguntas_json: defaultQuestions,
                tipo_fuente: client_1.TipoFuente.DEFAULT,
            },
        });
    }
    console.log('  Preguntas por defecto creadas para el juego principal');
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
//# sourceMappingURL=seed.js.map