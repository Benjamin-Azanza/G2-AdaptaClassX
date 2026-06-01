import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

const SAFE_TEXT = /^[\w\sáéíóúÁÉÍÓÚñÑüÜ.,;:¿?¡!()\-'"\n\r]+$/;

export class GenerateQuestionsDto {
  // Game IDs are short slugs in this codebase (e.g. "bomb-game"), not UUIDs.
  @IsString()
  @Length(2, 64)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'targetGameId must be a kebab-case slug.',
  })
  targetGameId: string;

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
  @IsString()
  @MaxLength(500)
  @Matches(SAFE_TEXT, {
    message: 'context contains unsupported characters.',
  })
  context?: string;

  // Optional in the multipart form. If present we can short-circuit the LLM
  // when a recent IA-generated question set already exists for this
  // (game, paralelo) pair, and we use it as the Redis draft key.
  @IsOptional()
  @IsUUID()
  paralelo_id?: string;

  // Set to true from the frontend to bypass the recent-cache check and force
  // a fresh LLM call (e.g. the teacher uploaded different material for the
  // same game/paralelo and wants new questions).
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  force?: boolean;
}

export class SaveQuestionsItemDto {
  @IsString()
  @MaxLength(500)
  texto: string;

  // Free-form options validated as strings with length caps.
  @IsString({ each: true })
  opciones: string[];

  @IsInt()
  @Min(0)
  @Max(10)
  respuestaCorrecta: number;
}

export class SaveQuestionsDto {
  @IsString()
  @Length(2, 64)
  @Matches(/^[a-z0-9-]+$/)
  game_id: string;

  @IsOptional()
  @IsUUID()
  paralelo_id?: string | null;

  // Use any[] at runtime — array contents are validated when persisted.
  @IsOptional()
  questions: any[];
}
