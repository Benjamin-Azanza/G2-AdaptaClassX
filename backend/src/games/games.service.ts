import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve the teacher_id whose question bank should feed `userId`:
   *  - teachers see their own bank
   *  - students see the bank of the teacher who owns their paralelo
   *  - students without a paralelo see no bank (returns null)
   */
  private async resolveTeacherIdFor(
    userId: string,
    role: Role,
  ): Promise<string | null> {
    if (role === Role.TEACHER) return userId;

    const student = await this.prisma.student.findUnique({
      where: { user_id: userId },
    });
    if (!student?.paralelo_id) return null;

    const paralelo = await this.prisma.paralelo.findUnique({
      where: { id: student.paralelo_id },
    });
    return paralelo?.teacher_id ?? null;
  }

  /**
   * Lists every game in the catalog. Each row includes `questionsCount`,
   * which is the size of the active teacher's bank — the SAME number for
   * every game, because every question now applies to every game.
   */
  async findAllForUser(userId: string, role: Role) {
    const [games, teacherId] = await Promise.all([
      this.prisma.game.findMany({ orderBy: { titulo: 'asc' } }),
      this.resolveTeacherIdFor(userId, role),
    ]);

    const questionsCount = teacherId
      ? await this.prisma.question.count({
          where: { teacher_id: teacherId },
        })
      : 0;

    return games.map((game) => ({ ...game, questionsCount }));
  }

  /**
   * Returns the teacher's full bank for any requested game id, in the
   * legacy `[{ preguntas_json: [...] }]` shape the Phaser scenes already
   * understand. The `tema` of the game is intentionally ignored — the
   * teacher's bank is global and shared across all games.
   */
  async getQuestionsForUser(gameId: string, userId: string, role: Role) {
    const game = await this.prisma.game.findUnique({ where: { id: gameId } });
    if (!game) {
      throw new NotFoundException('Juego no encontrado');
    }

    const teacherId = await this.resolveTeacherIdFor(userId, role);
    if (!teacherId) return [];

    const dbQuestions = await this.prisma.question.findMany({
      where: { teacher_id: teacherId },
      orderBy: { created_at: 'desc' },
    });

    const preguntas_json = dbQuestions.map((q) => {
      const opciones = Array.isArray(q.opciones)
        ? (q.opciones as string[])
        : [];
      const correctIndex = opciones.indexOf(q.respuesta_correcta);
      return {
        id: q.id,
        texto: q.texto,
        opciones,
        respuestaCorrecta: correctIndex !== -1 ? correctIndex : 0,
      };
    });

    return [{ preguntas_json }];
  }
}
