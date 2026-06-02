import { Module } from '@nestjs/common';
import { GameSessionsService } from './game-sessions.service';
import { GameSessionsController } from './game-sessions.controller';
import { MissionsModule } from '../missions/missions.module';

@Module({
  imports: [MissionsModule],
  controllers: [GameSessionsController],
  providers: [GameSessionsService],
  exports: [GameSessionsService],
})
export class GameSessionsModule {}
