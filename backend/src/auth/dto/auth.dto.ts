import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

// Cap user-controlled strings everywhere so we never hand unbounded input
// to bcrypt, the LLM prompt builder, or the DB layer.
const MAX_PASSWORD_LEN = 72; // bcrypt hard limit
const MAX_EMAIL_LEN = 254; // RFC 5321
const MAX_NAME_LEN = 80;

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_NAME_LEN)
  nombre: string;

  @IsEmail()
  @MaxLength(MAX_EMAIL_LEN)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(MAX_PASSWORD_LEN)
  password: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  isDocente?: boolean;
}

export class LoginDto {
  @IsEmail()
  @MaxLength(MAX_EMAIL_LEN)
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_PASSWORD_LEN)
  password: string;
}
