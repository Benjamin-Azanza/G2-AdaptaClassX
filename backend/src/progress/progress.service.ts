import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HeartbeatDto } from './dto/heartbeat.dto';

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
      newMinutes = Number(progress.minutos_jugados) + dto.played_minutes;
      
      // Límite de seguridad
      if (newMinutes > 999) newMinutes = 999;
      
      const isNowCompleted = !progress.completado && newMinutes >= Number(assignment.minutos_requeridos);
      let xpToGrant = 0;

      if (isNowCompleted && !progress.xp_otorgado) {
        xpToGrant = 100; // Hardcoded XP for now
        await this.grantXpAndRacha(studentId, xpToGrant);
      }

      return this.prisma.studentProgress.update({
        where: { id: progress.id },
        data: {
          minutos_jugados: newMinutes,
          ...(isNowCompleted && { 
            completado: true, 
            xp_otorgado: true, 
            completed_at: new Date() 
          }),
        },
      });
    } else {
      if (newMinutes > 999) newMinutes = 999;
      
      const isCompleted = newMinutes >= Number(assignment.minutos_requeridos);
      let xpToGrant = 0;

      if (isCompleted) {
        xpToGrant = 100;
        await this.grantXpAndRacha(studentId, xpToGrant);
      }

      return this.prisma.studentProgress.create({
        data: {
          student_id: studentId,
          assignment_id: dto.assignment_id,
          minutos_jugados: newMinutes,
          completado: isCompleted,
          ...(isCompleted && { 
            xp_otorgado: true,
            completed_at: new Date() 
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
      const xpToGrant = 100;
      await this.grantXpAndRacha(studentId, xpToGrant);
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

    const xpToGrant = 100;
    await this.grantXpAndRacha(studentId, xpToGrant);
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
