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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParalelosController = void 0;
const common_1 = require("@nestjs/common");
const paralelos_service_1 = require("./paralelos.service");
const paralelos_dto_1 = require("./dto/paralelos.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const client_1 = require("@prisma/client");
let ParalelosController = class ParalelosController {
    paralelosService;
    constructor(paralelosService) {
        this.paralelosService = paralelosService;
    }
    async create(dto, req) {
        return this.paralelosService.create(dto, req.user.sub);
    }
    async join(dto, req) {
        return this.paralelosService.join(dto, req.user.sub);
    }
    async findAll() {
        return this.paralelosService.findAll();
    }
    async findOne(id) {
        return this.paralelosService.findOne(id);
    }
};
exports.ParalelosController = ParalelosController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.Role.TEACHER),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [paralelos_dto_1.CreateParaleloDto, Object]),
    __metadata("design:returntype", Promise)
], ParalelosController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('join'),
    (0, roles_decorator_1.Roles)(client_1.Role.STUDENT),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [paralelos_dto_1.JoinParaleloDto, Object]),
    __metadata("design:returntype", Promise)
], ParalelosController.prototype, "join", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ParalelosController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ParalelosController.prototype, "findOne", null);
exports.ParalelosController = ParalelosController = __decorate([
    (0, common_1.Controller)('paralelos'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [paralelos_service_1.ParalelosService])
], ParalelosController);
//# sourceMappingURL=paralelos.controller.js.map