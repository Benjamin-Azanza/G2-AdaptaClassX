import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async deleteUserAndRelations(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { teacher: true, student: true },
    });
    if (!user) return;

    if (user.role === Role.STUDENT) {
      // Delete student progress
      await this.prisma.studentProgress.deleteMany({
        where: { student_id: userId },
      });
      // Delete notifications
      await this.prisma.notification.deleteMany({
        where: { student_id: userId },
      });
      // Delete student
      await this.prisma.student.delete({
        where: { user_id: userId },
      });
    } else if (user.role === Role.TEACHER) {
      // Find all paralelos created by this teacher
      const paralelos = await this.prisma.paralelo.findMany({
        where: { teacher_id: userId },
      });
      const paraleloIds = paralelos.map(p => p.id);

      // Delete student progress for assignments in these paralelos
      await this.prisma.studentProgress.deleteMany({
        where: {
          assignment: {
            paralelo_id: { in: paraleloIds },
          },
        },
      });

      // Delete notifications for assignments in these paralelos
      await this.prisma.notification.deleteMany({
        where: {
          assignment: {
            paralelo_id: { in: paraleloIds },
          },
        },
      });

      // Delete assignments in these paralelos
      await this.prisma.assignment.deleteMany({
        where: { paralelo_id: { in: paraleloIds } },
      });

      // Delete assignments created by teacher directly
      await this.prisma.assignment.deleteMany({
        where: { created_by: userId },
      });

      // Set paralelo_id to null for students in these paralelos
      await this.prisma.student.updateMany({
        where: { paralelo_id: { in: paraleloIds } },
        data: { paralelo_id: null },
      });

      // Delete questions in these paralelos or created by this teacher
      await this.prisma.gameQuestion.deleteMany({
        where: {
          OR: [
            { paralelo_id: { in: paraleloIds } },
            { created_by: userId },
          ],
        },
      });

      // Delete paralelos
      await this.prisma.paralelo.deleteMany({
        where: { teacher_id: userId },
      });

      // Delete teacher
      await this.prisma.teacher.delete({
        where: { user_id: userId },
      });
    }

    // Finally delete the user
    await this.prisma.user.delete({
      where: { id: userId },
    });
  }

  getAuthResponse(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        nombre: user.teacher?.nombre || user.student?.nombre,
        paralelo_id: user.student?.paralelo_id ?? null,
      },
    };
  }

  async register(dto: RegisterDto) {
    const password_hash = await bcrypt.hash(dto.password, 10);
    const role: Role = dto.isDocente ? Role.TEACHER : Role.STUDENT;

    // 1. Check if there is an existing user with this email
    const existingUserByEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { student: true, teacher: true },
    });

    if (existingUserByEmail) {
      if (existingUserByEmail.role === role) {
        // Same role — update password and name
        if (role === Role.TEACHER) {
          const updatedUser = await this.prisma.user.update({
            where: { id: existingUserByEmail.id },
            data: {
              password_hash,
              teacher: { update: { nombre: dto.nombre } },
            },
            include: { student: true, teacher: true },
          });
          return this.getAuthResponse(updatedUser);
        } else {
          const updatedUser = await this.prisma.user.update({
            where: { id: existingUserByEmail.id },
            data: {
              password_hash,
              student: { update: { nombre: dto.nombre } },
            },
            include: { student: true, teacher: true },
          });
          return this.getAuthResponse(updatedUser);
        }
      } else {
        // Role changed — delete old user and recreate
        await this.deleteUserAndRelations(existingUserByEmail.id);
      }
    }

    // 2. Create a brand new user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password_hash,
        role,
        ...(role === Role.TEACHER
          ? { teacher: { create: { nombre: dto.nombre } } }
          : { student: { create: { nombre: dto.nombre } } }),
      },
      include: { student: true, teacher: true },
    });

    return this.getAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        student: true,
        teacher: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    if (user.role === Role.STUDENT && user.student) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (user.student.last_login_date) {
        const lastLogin = new Date(user.student.last_login_date);
        lastLogin.setHours(0, 0, 0, 0);
        const diffDays = Math.floor(
          (today.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (diffDays === 1) {
          await this.prisma.student.update({
            where: { user_id: user.id },
            data: {
              racha_dias: { increment: 1 },
              last_login_date: today,
            },
          });
        } else if (diffDays > 1) {
          await this.prisma.student.update({
            where: { user_id: user.id },
            data: {
              racha_dias: 1,
              last_login_date: today,
            },
          });
        }
      } else {
        await this.prisma.student.update({
          where: { user_id: user.id },
          data: {
            racha_dias: 1,
            last_login_date: today,
          },
        });
      }
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        nombre: user.teacher?.nombre || user.student?.nombre,
        paralelo_id: user.student?.paralelo_id ?? null,
      },
    };
  }
}
