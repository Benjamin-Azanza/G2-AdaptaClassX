import { IsString, IsNumber, IsDateString, IsUUID } from 'class-validator';

export class CreateAssignmentDto {
  @IsUUID()
  paralelo_id: string;

  @IsUUID()
  game_id: string;

  @IsNumber()
  minutos_requeridos: number;

  @IsDateString()
  fecha_limite: string;
}
