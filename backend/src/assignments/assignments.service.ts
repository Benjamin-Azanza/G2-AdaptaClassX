import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

@Injectable()
export class AssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAssignmentDto, teacherId: string) {
    const paralelo = await this.prisma.paralelo.findUnique({
      where: { id: dto.paralelo_id },
    });

    if (!paralelo || paralelo.teacher_id !== teacherId) {
      throw new NotFoundException('Paralelo no encontrado o no autorizado');
    }

    const assignment = await this.prisma.assignment.create({
      data: {
        paralelo_id: dto.paralelo_id,
        game_id: dto.game_id,
        created_by: teacherId,
        minutos_requeridos: Math.round(dto.minutos_requeridos),
        fecha_limite: new Date(dto.fecha_limite),
      },
    });

    const students = await this.prisma.student.findMany({
      where: { paralelo_id: dto.paralelo_id },
    });

    if (students.length > 0) {
      await this.prisma.notification.createMany({
        data: students.map((student) => ({
          student_id: student.user_id,
          assignment_id: assignment.id,
          mensaje: 'Tienes una nueva tarea asignada.',
        })),
      });
    }

    return assignment;
  }

  async getMyAssignments(studentUserId: string) {
    const student = await this.prisma.student.findUnique({
      where: { user_id: studentUserId },
    });

    if (!student || !student.paralelo_id) {
      return { pending: [], completed: [] };
    }

    const assignments = await this.prisma.assignment.findMany({
      where: { paralelo_id: student.paralelo_id },
      include: {
        game: true,
        progress: {
          where: { student_id: studentUserId },
        },
      },
      orderBy: { fecha_limite: 'asc' },
    });

    const pending = [];
    const completed = [];

    for (const task of assignments) {
      const studentProgress = task.progress[0];
      const isCompleted = studentProgress?.completado ?? false;
      const route = `/games/bomb-game?assignmentId=${task.id}&gameId=${task.game.id}`;

      const formattedTask = {
        id: task.id,
        gameId: task.game.id,
        gameTitle: task.game.titulo,
        gameCategory: task.game.tema,
        gameRoute: route,
        minutosRequeridos: Number(task.minutos_requeridos),
        minutosJugados: studentProgress ? Number(studentProgress.minutos_jugados) : 0,
        completado: isCompleted,
        fechaLimite: task.fecha_limite.toISOString(),
        xpGanado: studentProgress?.xp_otorgado ? 100 : 0,
        completadoAt: studentProgress?.completed_at?.toISOString(),
      };

      if (isCompleted) {
        completed.push(formattedTask);
      } else {
        pending.push(formattedTask);
      }
    }

    return { pending, completed };
  }
}
