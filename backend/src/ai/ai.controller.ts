import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-questions')
  @Roles(Role.TEACHER)
  @UseInterceptors(FileInterceptor('file'))
  async generateQuestions(
    @UploadedFile() file: Express.Multer.File,
    @Body('targetGameId') targetGameId: string,
    @Body('amount') amount: string,
    @Body('difficulty') difficulty: string,
    @Body('context') context: string,
  ) {
    const text = await this.aiService.extractText(file);
    const parsedAmount = parseInt(amount, 10) || 5;
    return this.aiService.generateQuestions(text, targetGameId, parsedAmount, difficulty, context);
  }

  @Post('save-questions')
  @Roles(Role.TEACHER)
  async saveQuestions(
    @Body('game_id') gameId: string,
    @Body('paralelo_id') paraleloId: string,
    @Body('questions') questions: any[],
    @Request() req: any,
  ) {
    const userId = req.user.sub;
    return this.aiService.saveQuestions(gameId, paraleloId, questions, userId);
  }
}
