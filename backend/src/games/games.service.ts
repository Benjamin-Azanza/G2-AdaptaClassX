import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import type { GameQuestion, Prisma } from '@prisma/client';

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForUser(userId: string, role: Role) {
    // Single query that pulls every game plus the question rows the user is
    // allowed to see (own + global defaults). We then collapse per game in
    // memory, preferring custom rows and falling back to defaults so the
    // counter never reads 0 when defaults exist.
    //
    // Replaces the previous Promise.all(...) loop that ran ~25-37 queries
    // for the seed of 12 games. With Supabase PgBouncer the loop reliably
    // exhausted the pool under modest concurrency.
    const where = await this.buildQuestionsFilter(userId, role);

    const games = await this.prisma.game.findMany({
      orderBy: { titulo: 'asc' },
      include: { questions: { where } },
    });

    return games.map((game) => {
      const visible = pickVisibleQuestions(game.questions);
      const questionsCount = visible.reduce(
        (total, q) =>
          total + (Array.isArray(q.preguntas_json) ? q.preguntas_json.length : 0),
        0,
      );
      // Don't ship the full questions payload from the list endpoint —
      // /games/:id/questions handles that. Keeps the response light.
      const { questions: _omit, ...gameWithoutQuestions } = game;
      void _omit;
      return { ...gameWithoutQuestions, questionsCount };
    });
  }

  async getQuestionsForUser(gameId: string, userId: string, role: Role) {
    const game = await this.prisma.game.findUnique({ where: { id: gameId } });
    if (!game) {
      throw new NotFoundException('Juego no encontrado');
    }

    const where = await this.buildQuestionsFilter(userId, role, gameId);
    const questions = await this.prisma.gameQuestion.findMany({ where });
    return pickVisibleQuestions(questions);
  }

  /**
   * Build the `where` clause that selects the question rows visible to this
   * user. Centralised so the list endpoint and the per-game endpoint apply
   * the exact same authorization rules.
   *
   * The clause includes global defaults (paralelo_id null) too; callers must
   * collapse via `pickVisibleQuestions` to prefer custom over defaults.
   */
  private async buildQuestionsFilter(
    userId: string,
    role: Role,
    gameId?: string,
  ): Promise<Prisma.GameQuestionWhereInput> {
    const gameFilter: Prisma.GameQuestionWhereInput = gameId
      ? { game_id: gameId }
      : {};

    if (role === Role.STUDENT) {
      const student = await this.prisma.student.findUnique({
        where: { user_id: userId },
        select: { paralelo_id: true },
      });
      const paraleloId = student?.paralelo_id;
      return {
        ...gameFilter,
        OR: paraleloId
          ? [{ paralelo_id: paraleloId }, { paralelo_id: null }]
          : [{ paralelo_id: null }],
      };
    }

    // TEACHER: their own custom rows, rows from their paralelos, plus defaults.
    return {
      ...gameFilter,
      OR: [
        { created_by: userId },
        { paralelo: { teacher_id: userId } },
        { paralelo_id: null },
      ],
    };
  }
}

/**
 * If any non-default questions exist (paralelo_id !== null), return only
 * those — they override the global defaults. Otherwise return the defaults
 * unchanged. Keeps the legacy "custom wins over default" UX.
 */
function pickVisibleQuestions(rows: GameQuestion[]): GameQuestion[] {
  const custom = rows.filter((r) => r.paralelo_id !== null);
  return custom.length > 0 ? custom : rows;
}
