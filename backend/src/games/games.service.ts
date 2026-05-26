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

    const gamesWithCount = await Promise.all(
      games.map(async (game) => {
        const questions = await this.getQuestionsForUser(game.id, userId, role);
        let questionsCount = 0;
        for (const q of questions) {
          if (q.preguntas_json && Array.isArray(q.preguntas_json)) {
            questionsCount += q.preguntas_json.length;
          }
        }
        return {
          ...game,
          questionsCount,
        };
      }),
    );

    return gamesWithCount;
  }

  async getQuestionsForUser(gameId: string, userId: string, role: Role) {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      throw new NotFoundException('Juego no encontrado');
    }

    let questions: any[] = [];

    if (role === Role.STUDENT) {
      const student = await this.prisma.student.findUnique({
        where: { user_id: userId },
      });

      if (student && student.paralelo_id) {
        questions = await this.prisma.gameQuestion.findMany({
          where: {
            game_id: gameId,
            paralelo_id: student.paralelo_id,
          },
        });
      }
    } else if (role === Role.TEACHER) {
      questions = await this.prisma.gameQuestion.findMany({
        where: {
          game_id: gameId,
          OR: [
            { created_by: userId },
            { paralelo: { teacher_id: userId } },
          ],
        },
      });
    }

    if (questions.length === 0) {
      questions = await this.prisma.gameQuestion.findMany({
        where: {
          game_id: gameId,
          paralelo_id: null,
        },
      });
    }

    return questions;
  }
}
