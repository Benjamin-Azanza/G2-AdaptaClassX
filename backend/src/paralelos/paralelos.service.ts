import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateParaleloDto, JoinParaleloDto } from './dto/paralelos.dto';

@Injectable()
export class ParalelosService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a 6-character alphanumeric code.
   * Excludes confusing characters: O, 0, I, 1
   */
  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Generate a unique code that doesn't exist among active paralelos.
   */
  private async generateUniqueCode(): Promise<string> {
    let code: string;
    let attempts = 0;
    do {
      code = this.generateCode();
      const existing = await this.prisma.paralelo.findUnique({
        where: { codigo_acceso: code },
      });
      if (!existing) return code;
      attempts++;
    } while (attempts < 10);
    throw new Error('No se pudo generar un código único');
  }

  async create(dto: CreateParaleloDto, teacherId: string) {
    const codigoAcceso = await this.generateUniqueCode();

    return this.prisma.paralelo.create({
      data: {
        nombre: dto.nombre,
        grado: dto.grado,
        teacher_id: teacherId,
        codigo_acceso: codigoAcceso,
      },
    });
  }

  async join(dto: JoinParaleloDto, studentUserId: string) {
    // Find the paralelo by code
    const paralelo = await this.prisma.paralelo.findUnique({
      where: { codigo_acceso: dto.codigo_acceso.toUpperCase() },
    });

    if (!paralelo) {
      throw new NotFoundException('Código no encontrado');
    }

    if (!paralelo.activo) {
      throw new BadRequestException('Este paralelo está archivado');
    }

    // Check if student exists
    const student = await this.prisma.student.findUnique({
      where: { user_id: studentUserId },
    });

    if (!student) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    // Check if student already belongs to a paralelo
    if (student.paralelo_id) {
      throw new ConflictException(
        'Ya perteneces a un paralelo. Debes salir del actual antes de unirte a otro.',
      );
    }

    // Join the paralelo
    return this.prisma.student.update({
      where: { user_id: studentUserId },
      data: { paralelo_id: paralelo.id },
      include: {
        paralelo: true,
      },
    });
  }

  async findAll() {
    return this.prisma.paralelo.findMany({
      where: { activo: true },
      include: {
        _count: {
          select: { students: true },
        },
        teacher: {
          include: { teacher: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    const paralelo = await this.prisma.paralelo.findUnique({
      where: { id },
      include: {
        students: {
          include: { user: true },
        },
        _count: {
          select: { students: true },
        },
      },
    });

    if (!paralelo) {
      throw new NotFoundException('Paralelo no encontrado');
    }

    return paralelo;
  }
}
