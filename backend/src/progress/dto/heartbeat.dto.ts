import { IsUUID, IsNumber, Min } from 'class-validator';

export class HeartbeatDto {
  @IsUUID()
  assignment_id: string;

  @IsNumber()
  @Min(0)
  played_minutes: number;
}
