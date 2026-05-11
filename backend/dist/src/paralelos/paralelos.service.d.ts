import { PrismaService } from '../prisma/prisma.service';
import { CreateParaleloDto, JoinParaleloDto } from './dto/paralelos.dto';
export declare class ParalelosService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private generateCode;
    private generateUniqueCode;
    create(dto: CreateParaleloDto, teacherId: string): Promise<{
        id: string;
        created_at: Date;
        nombre: string;
        codigo_acceso: string;
        grado: number;
        teacher_id: string;
        activo: boolean;
    }>;
    join(dto: JoinParaleloDto, studentUserId: string): Promise<{
        paralelo: {
            id: string;
            created_at: Date;
            nombre: string;
            codigo_acceso: string;
            grado: number;
            teacher_id: string;
            activo: boolean;
        } | null;
    } & {
        nombre: string;
        puntos_xp: number;
        racha_dias: number;
        last_login_date: Date | null;
        paralelo_id: string | null;
        user_id: string;
    }>;
    findAll(): Promise<({
        teacher: {
            teacher: {
                cedula: string;
                nombre: string;
                user_id: string;
            } | null;
        } & {
            id: string;
            email: string;
            password_hash: string;
            role: import("@prisma/client").$Enums.Role;
            created_at: Date;
        };
        _count: {
            students: number;
        };
    } & {
        id: string;
        created_at: Date;
        nombre: string;
        codigo_acceso: string;
        grado: number;
        teacher_id: string;
        activo: boolean;
    })[]>;
    findOne(id: string): Promise<{
        students: ({
            user: {
                id: string;
                email: string;
                password_hash: string;
                role: import("@prisma/client").$Enums.Role;
                created_at: Date;
            };
        } & {
            nombre: string;
            puntos_xp: number;
            racha_dias: number;
            last_login_date: Date | null;
            paralelo_id: string | null;
            user_id: string;
        })[];
        _count: {
            students: number;
        };
    } & {
        id: string;
        created_at: Date;
        nombre: string;
        codigo_acceso: string;
        grado: number;
        teacher_id: string;
        activo: boolean;
    }>;
}
