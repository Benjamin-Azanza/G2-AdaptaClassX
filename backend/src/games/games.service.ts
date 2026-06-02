import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForUser(userId: string, role: Role) {
    const games = await this.prisma.game.findMany({
      orderBy: { titulo: 'asc' },
    });

    let teacherId: string | null = null;
    if (role === Role.TEACHER) {
      teacherId = userId;
    } else {
      const student = await this.prisma.student.findUnique({
        where: { user_id: userId },
      });
      if (student?.paralelo_id) {
        const paralelo = await this.prisma.paralelo.findUnique({
          where: { id: student.paralelo_id },
        });
        teacherId = paralelo?.teacher_id || null;
      }
    }

    const questionCounts = teacherId
      ? await this.prisma.question.groupBy({
          by: ['tema'],
          where: { teacher_id: teacherId },
          _count: { id: true },
        })
      : [];

    const countMap = new Map(questionCounts.map((q) => [q.tema, q._count.id]));

    return games.map((game) => {
      const questionsCount = countMap.get(game.tema) ?? 0;
      return { ...game, questionsCount };
    });
  }

  async getQuestionsForUser(gameId: string, userId: string, role: Role) {
    const game = await this.prisma.game.findUnique({ where: { id: gameId } });
    if (!game) {
      throw new NotFoundException('Juego no encontrado');
    }

    let teacherId: string | null = null;
    if (role === Role.TEACHER) {
      teacherId = userId;
    } else {
      const student = await this.prisma.student.findUnique({
        where: { user_id: userId },
      });
      if (student?.paralelo_id) {
        const paralelo = await this.prisma.paralelo.findUnique({
          where: { id: student.paralelo_id },
        });
        teacherId = paralelo?.teacher_id || null;
      }
    }

    if (!teacherId) return [];

    const dbQuestions = await this.prisma.question.findMany({
      where: {
        teacher_id: teacherId,
        tema: game.tema,
      },
    });

    // Devuelve en el formato heredado que espera frontend para no romper la sesión
    const preguntas_json = dbQuestions.map((q) => {
      const opciones = Array.isArray(q.opciones)
        ? (q.opciones as string[])
        : [];
      const correctIndex = opciones.indexOf(q.respuesta_correcta);
      return {
        id: q.id,
        texto: q.texto,
        opciones: opciones,
        respuestaCorrecta: correctIndex !== -1 ? correctIndex : 0,
      };
    });

    return [{ preguntas_json }];
  }
}
