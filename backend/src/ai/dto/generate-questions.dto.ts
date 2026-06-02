import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Tema } from '@prisma/client';

// Allowed characters regex, using * instead of + to support empty string if sent
const SAFE_TEXT = /^[\w\sáéíóúÁÉÍÓÚñÑüÜ.,;:¿?¡!()\-'"\n\r]*$/;

export class GenerateQuestionsDto {
  @IsEnum(Tema, {
    message: 'tema debe ser un valor válido del enum Tema.',
  })
  tema: Tema;

  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(30)
  amount: number;

  @IsString()
  @Matches(/^(Basico|Intermedio|Avanzado)$/, {
    message: 'difficulty must be Basico, Intermedio, or Avanzado.',
  })
  difficulty: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined ? undefined : value,
  )
  @IsString()
  @MaxLength(500)
  @Matches(SAFE_TEXT, {
    message: 'context contains unsupported characters.',
  })
  context?: string;

  @IsOptional()
  @IsUUID()
  source_id?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  force?: boolean;
}

export class SaveQuestionsItemDto {
  @IsString()
  @MaxLength(500)
  texto: string;

  @IsString({ each: true })
  opciones: string[];

  @IsString()
  respuesta_correcta: string;
}

export class SaveQuestionsDto {
  @IsEnum(Tema, {
    message: 'tema debe ser un valor válido del enum Tema.',
  })
  tema: Tema;

  @IsOptional()
  @IsUUID()
  source_id?: string;

  @ValidateNested({ each: true })
  @Type(() => SaveQuestionsItemDto)
  questions: SaveQuestionsItemDto[];
}
