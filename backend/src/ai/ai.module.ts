import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';
import Redis from 'ioredis';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { RedisDraftService } from './redis-draft.service';
import { RedisThrottlerStorage } from './redis-throttler.storage';
import { AiThrottlerGuard } from './ai-throttler.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    // Async so the storage adapter can pick up REDIS_URL at boot; falls
    // back to in-memory when Redis is not configured.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): ThrottlerModuleOptions => {
        const base: ThrottlerModuleOptions = {
          throttlers: [{ name: 'ai-generate', ttl: 60_000, limit: 5 }],
        };
        const url = config.get<string>('REDIS_URL');
        if (!url) return base;
        // Dedicated client so a slow throttler op cannot starve draft ops
        // (and vice versa). Lazy-connects on first use to keep cold starts
        // snappy.
        const client = new Redis(url, {
          lazyConnect: true,
          maxRetriesPerRequest: 2,
          enableOfflineQueue: false,
        });
        client.on('error', () => {
          // Suppress noisy reconnection logs; the storage adapter already
          // warns when an op fails.
        });
        return { ...base, storage: new RedisThrottlerStorage(client) };
      },
    }),
  ],
  controllers: [AiController],
  providers: [AiService, RedisDraftService, AiThrottlerGuard],
  exports: [AiService],
})
export class AiModule {}
