import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class CreateParaleloDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsInt()
  @Min(3)
  @Max(5)
  grado: number;
}

export class JoinParaleloDto {
  @IsString()
  @IsNotEmpty()
  codigo_acceso: string;
}
