import { ParalelosService } from './paralelos.service';
import { CreateParaleloDto, JoinParaleloDto } from './dto/paralelos.dto';
export declare class ParalelosController {
    private readonly paralelosService;
    constructor(paralelosService: ParalelosService);
    create(dto: CreateParaleloDto, req: any): Promise<{
        id: string;
        created_at: Date;
        nombre: string;
        codigo_acceso: string;
        grado: number;
        teacher_id: string;
        activo: boolean;
    }>;
    join(dto: JoinParaleloDto, req: any): Promise<{
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
