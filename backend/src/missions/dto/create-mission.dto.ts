import { IsEnum, IsInt, IsString, IsUUID, Min } from 'class-validator';
import { MissionType } from '@prisma/client';

export class CreateMissionDto {
  @IsUUID()
  paralelo_id: string;

  @IsEnum(MissionType)
  tipo: MissionType;

  @IsInt()
  @Min(1)
  goal_value: number;

  @IsString()
  fecha_limite: string;
}
