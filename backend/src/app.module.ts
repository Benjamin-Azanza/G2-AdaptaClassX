import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ParalelosModule } from './paralelos/paralelos.module';
import { GamesModule } from './games/games.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { ProgressModule } from './progress/progress.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        DIRECT_URL: Joi.string().optional(), // Required for Supabase migrations, optional for local dev
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_EXPIRES_IN: Joi.string().default('7d'),
        PORT: Joi.number().default(3000),
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        FRONTEND_URL: Joi.string().uri().optional(),
        OPENAI_API_KEY: Joi.string().optional(), // Optional until AI module is implemented
        OPENAI_MODEL: Joi.string().default('gpt-4o-mini'),
      }),
    }),
    PrismaModule,
    AuthModule,
    ParalelosModule,
    GamesModule,
    AssignmentsModule,
    ProgressModule,
    NotificationsModule,
  ],
})
export class AppModule {}
