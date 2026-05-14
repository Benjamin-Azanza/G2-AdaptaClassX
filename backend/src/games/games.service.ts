import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.game.findMany({
      orderBy: { titulo: 'asc' },
      take: 1,
    });
  }

  async getQuestionsForUser(gameId: string, userId: string, role: Role) {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      throw new NotFoundException('Juego no encontrado');
    }

    if (game.tipo === 'BASE') {
      return this.prisma.gameQuestion.findMany({
        where: {
          game_id: gameId,
          paralelo_id: null,
        },
      });
    }

    if (role === Role.STUDENT) {
      const student = await this.prisma.student.findUnique({
        where: { user_id: userId },
      });

      if (!student || !student.paralelo_id) {
        // Estudiante sin paralelo no tiene acceso a preguntas de juegos cambiantes
        return [];
      }

      return this.prisma.gameQuestion.findMany({
        where: {
          game_id: gameId,
          paralelo_id: student.paralelo_id,
        },
      });
    }

    // Si es profe, podría necesitar un query param para el paralelo, 
    // pero por defecto para previsualizar no hay contexto de paralelo aún.
    return [];
  }
}
