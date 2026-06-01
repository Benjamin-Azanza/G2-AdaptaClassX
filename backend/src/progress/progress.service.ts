import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HeartbeatDto } from './dto/heartbeat.dto';

// Reward granted once per assignment the first time it crosses to "completed".
// Centralised so changing the value (or making it per-game) is a single edit
// instead of four scattered literals.
const XP_PER_COMPLETION = 100;
// Defensive cap on accumulated minutes per assignment to prevent runaway
// values from a malicious or buggy client sending huge heartbeats.
const MAX_PLAYED_MINUTES = 999;

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async processHeartbeat(dto: HeartbeatDto, studentId: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: dto.assignment_id },
    });

    if (!assignment) {
      throw new NotFoundException('Asignación no encontrada');
    }

    const progress = await this.prisma.studentProgress.findUnique({
      where: {
        student_id_assignment_id: {
          student_id: studentId,
          assignment_id: dto.assignment_id,
        },
      },
    });

    let newMinutes = dto.played_minutes;

    if (progress) {
      newMinutes = Math.min(
        Number(progress.minutos_jugados) + dto.played_minutes,
        MAX_PLAYED_MINUTES,
      );

      const isNowCompleted =
        !progress.completado && newMinutes >= Number(assignment.minutos_requeridos);

      if (isNowCompleted && !progress.xp_otorgado) {
        await this.grantXpAndRacha(studentId, XP_PER_COMPLETION);
      }

      return this.prisma.studentProgress.update({
        where: { id: progress.id },
        data: {
          minutos_jugados: newMinutes,
          ...(isNowCompleted && {
            completado: true,
            xp_otorgado: true,
            completed_at: new Date(),
          }),
        },
      });
    } else {
      newMinutes = Math.min(newMinutes, MAX_PLAYED_MINUTES);

      const isCompleted = newMinutes >= Number(assignment.minutos_requeridos);

      if (isCompleted) {
        await this.grantXpAndRacha(studentId, XP_PER_COMPLETION);
      }

      return this.prisma.studentProgress.create({
        data: {
          student_id: studentId,
          assignment_id: dto.assignment_id,
          minutos_jugados: newMinutes,
          completado: isCompleted,
          ...(isCompleted && {
            xp_otorgado: true,
            completed_at: new Date(),
          }),
        },
      });
    }
  }

  async markAsCompleted(assignmentId: string, studentId: string) {
    const progress = await this.prisma.studentProgress.findUnique({
      where: {
        student_id_assignment_id: {
          student_id: studentId,
          assignment_id: assignmentId,
        },
      },
    });

    if (!progress) {
      await this.grantXpAndRacha(studentId, XP_PER_COMPLETION);
      return this.prisma.studentProgress.create({
        data: {
          student_id: studentId,
          assignment_id: assignmentId,
          completado: true,
          xp_otorgado: true,
          completed_at: new Date(),
        },
      });
    }

    if (progress.completado) {
      return progress;
    }

    await this.grantXpAndRacha(studentId, XP_PER_COMPLETION);
    return this.prisma.studentProgress.update({
      where: { id: progress.id },
      data: {
        completado: true,
        xp_otorgado: true,
        completed_at: new Date(),
      },
    });
  }

  private async grantXpAndRacha(studentId: string, xpAmount: number) {
    // Simplificación: otorgamos XP directamente. En un sistema más complejo se verificarían
    // rachas diarias con una tabla extra de actividad.
    return this.prisma.student.update({
      where: { user_id: studentId },
      data: {
        puntos_xp: { increment: xpAmount },
      },
    });
  }
}
