import { Controller, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('progress')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Post('heartbeat')
  @Roles(Role.STUDENT)
  async processHeartbeat(@Body() dto: HeartbeatDto, @Request() req: any) {
    return this.progressService.processHeartbeat(dto, req.user.sub);
  }

  @Patch(':assignmentId/complete')
  @Roles(Role.STUDENT)
  async completeAssignment(@Param('assignmentId') assignmentId: string, @Request() req: any) {
    return this.progressService.markAsCompleted(assignmentId, req.user.sub);
  }
}
