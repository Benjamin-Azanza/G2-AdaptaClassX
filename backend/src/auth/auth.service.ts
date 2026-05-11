import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
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

  async register(dto: RegisterDto) {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    // Determine role based on cédula
    let role: Role = Role.STUDENT;
    if (dto.cedula) {
      const authorizedCedula = await this.prisma.cedulaAutorizada.findUnique({
        where: { cedula: dto.cedula },
      });
      if (authorizedCedula) {
        role = Role.TEACHER;
      }
    }

    // Hash password
    const password_hash = await bcrypt.hash(dto.password, 10);

    // Create user with the appropriate profile
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password_hash,
        role,
        ...(role === Role.TEACHER
          ? {
              teacher: {
                create: {
                  nombre: dto.nombre,
                  cedula: dto.cedula!,
                },
              },
            }
          : {
              student: {
                create: {
                  nombre: dto.nombre,
                },
              },
            }),
      },
      include: {
        student: true,
        teacher: true,
      },
    });

    // Generate JWT
    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        nombre: user.teacher?.nombre || user.student?.nombre,
      },
    };
  }

  async login(dto: LoginDto) {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        student: true,
        teacher: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Update racha if student
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
          // Consecutive day
          await this.prisma.student.update({
            where: { user_id: user.id },
            data: {
              racha_dias: { increment: 1 },
              last_login_date: today,
            },
          });
        } else if (diffDays > 1) {
          // Streak broken
          await this.prisma.student.update({
            where: { user_id: user.id },
            data: {
              racha_dias: 1,
              last_login_date: today,
            },
          });
        }
        // diffDays === 0: same day, no change
      } else {
        // First login
        await this.prisma.student.update({
          where: { user_id: user.id },
          data: {
            racha_dias: 1,
            last_login_date: today,
          },
        });
      }
    }

    // Generate JWT
    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        nombre: user.teacher?.nombre || user.student?.nombre,
      },
    };
  }
}
