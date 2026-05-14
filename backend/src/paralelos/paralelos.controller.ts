import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ParalelosService } from './paralelos.service';
import { CreateParaleloDto, JoinParaleloDto } from './dto/paralelos.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('paralelos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ParalelosController {
  constructor(private readonly paralelosService: ParalelosService) {}

  @Post()
  @Roles(Role.TEACHER)
  async create(@Body() dto: CreateParaleloDto, @Request() req: any) {
    return this.paralelosService.create(dto, req.user.sub);
  }

  @Post('join')
  @Roles(Role.STUDENT)
  async join(@Body() dto: JoinParaleloDto, @Request() req: any) {
    return this.paralelosService.join(dto, req.user.sub);
  }

  @Get()
  @Roles(Role.TEACHER)
  async findAll() {
    return this.paralelosService.findAll();
  }

  @Get(':id')
  @Roles(Role.TEACHER)
  async findOne(@Param('id') id: string) {
    return this.paralelosService.findOne(id);
  }

  @Patch(':id/archive')
  @Roles(Role.TEACHER)
  async archive(@Param('id') id: string) {
    return this.paralelosService.archive(id);
  }
}
