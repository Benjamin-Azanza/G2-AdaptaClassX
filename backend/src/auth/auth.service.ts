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
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('El email ya esta registrado');
    }

    let role: Role = Role.STUDENT;
    const cedula = dto.cedula?.trim();

    if (cedula) {
      const authorizedCedula = await this.prisma.cedulaAutorizada.findUnique({
        where: { cedula },
      });

      if (!authorizedCedula) {
        throw new ForbiddenException(
          'La cedula ingresada no esta autorizada para crear cuentas docentes',
        );
      }

      const existingTeacher = await this.prisma.teacher.findUnique({
        where: { cedula },
      });

      if (existingTeacher) {
        throw new ConflictException(
          'Esta cedula docente ya esta asociada a una cuenta existente',
        );
      }

      role = Role.TEACHER;
    }

    const password_hash = await bcrypt.hash(dto.password, 10);

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
                  cedula: cedula!,
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
