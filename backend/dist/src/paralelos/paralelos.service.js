"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParalelosService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ParalelosService = class ParalelosService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    generateCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
    async generateUniqueCode() {
        let code;
        let attempts = 0;
        do {
            code = this.generateCode();
            const existing = await this.prisma.paralelo.findUnique({
                where: { codigo_acceso: code },
            });
            if (!existing)
                return code;
            attempts++;
        } while (attempts < 10);
        throw new Error('No se pudo generar un código único');
    }
    async create(dto, teacherId) {
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
    async join(dto, studentUserId) {
        const paralelo = await this.prisma.paralelo.findUnique({
            where: { codigo_acceso: dto.codigo_acceso.toUpperCase() },
        });
        if (!paralelo) {
            throw new common_1.NotFoundException('Código no encontrado');
        }
        if (!paralelo.activo) {
            throw new common_1.BadRequestException('Este paralelo está archivado');
        }
        const student = await this.prisma.student.findUnique({
            where: { user_id: studentUserId },
        });
        if (!student) {
            throw new common_1.NotFoundException('Estudiante no encontrado');
        }
        if (student.paralelo_id) {
            throw new common_1.ConflictException('Ya perteneces a un paralelo. Debes salir del actual antes de unirte a otro.');
        }
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
    async findOne(id) {
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
            throw new common_1.NotFoundException('Paralelo no encontrado');
        }
        return paralelo;
    }
};
exports.ParalelosService = ParalelosService;
exports.ParalelosService = ParalelosService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ParalelosService);
//# sourceMappingURL=paralelos.service.js.map