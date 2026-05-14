import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post()
  @Roles(Role.TEACHER)
  async create(@Body() dto: CreateAssignmentDto, @Request() req: any) {
    return this.assignmentsService.create(dto, req.user.sub);
  }

  @Get('my')
  @Roles(Role.STUDENT)
  async getMyAssignments(@Request() req: any) {
    return this.assignmentsService.getMyAssignments(req.user.sub);
  }
}
