import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export type DraftPayload = {
  questions: unknown[];
  // Hash of the LLM input (text + amount + difficulty + context). Carried
  // through saveQuestions so we can tag the saved row as "came from this
  // exact source", making future cache hits content-aware instead of just
  // (game, paralelo)-aware.
  sourceHash: string;
};

const DRAFT_TTL_SECONDS = 1800;
// Matches the freshness window the AiService enforces on cache reads.
const CACHE_HASH_TTL_SECONDS = 7 * 24 * 60 * 60;

/**
 * Thin ioredis wrapper used to persist a teacher's freshly-generated question
 * set for 30 minutes between `POST /ai/generate-questions` and
 * `POST /ai/save-questions`, and to remember which source content produced
 * a given saved row. Optional — when REDIS_URL is missing every method is a
 * no-op so the rest of the AI flow still works in local dev / preview.
 */
@Injectable()
export class RedisDraftService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisDraftService.name);
  private readonly client: Redis | null;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('REDIS_URL');
    if (!url) {
      this.client = null;
      this.logger.warn(
        'REDIS_URL not set — AI question drafts and content-aware cache will be disabled.',
      );
      return;
    }
    this.client = new Redis(url, {
      lazyConnect: false,
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
    });
    this.client.on('error', (err) => {
      this.logger.error(`Redis connection error: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => undefined);
    }
  }

  private draftKey(userId: string, gameId: string, paraleloId: string | null): string {
    return `draft:${userId}:${gameId}:${paraleloId ?? 'global'}`;
  }

  private cacheHashKey(gameId: string, paraleloId: string | null): string {
    return `aicache:${gameId}:${paraleloId ?? 'global'}`;
  }

  async saveDraft(
    userId: string,
    gameId: string,
    paraleloId: string | null,
    payload: DraftPayload,
  ): Promise<void> {
    if (!this.client) return;
    const key = this.draftKey(userId, gameId, paraleloId);
    try {
      await this.client.set(key, JSON.stringify(payload), 'EX', DRAFT_TTL_SECONDS);
    } catch (err) {
      this.logger.warn(
        `Failed to save draft ${key}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async readDraft(
    userId: string,
    gameId: string,
    paraleloId: string | null,
  ): Promise<DraftPayload | null> {
    if (!this.client) return null;
    const key = this.draftKey(userId, gameId, paraleloId);
    try {
      const raw = await this.client.get(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        Array.isArray(parsed.questions) &&
        typeof parsed.sourceHash === 'string'
      ) {
        return parsed as DraftPayload;
      }
      return null;
    } catch (err) {
      this.logger.warn(
        `Failed to read draft ${key}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  async clearDraft(
    userId: string,
    gameId: string,
    paraleloId: string | null,
  ): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(this.draftKey(userId, gameId, paraleloId));
    } catch {
      // best-effort cleanup; ignore failures.
    }
  }

  /**
   * Pin a (game, paralelo) saved row to the source hash that produced it.
   * Called after a successful `saveQuestions` so subsequent generate calls
   * with the *same* source can return the saved row from the cache.
   */
  async saveSourceHash(
    gameId: string,
    paraleloId: string | null,
    hash: string,
  ): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.set(
        this.cacheHashKey(gameId, paraleloId),
        hash,
        'EX',
        CACHE_HASH_TTL_SECONDS,
      );
    } catch (err) {
      this.logger.warn(
        `Failed to save source hash: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async readSourceHash(
    gameId: string,
    paraleloId: string | null,
  ): Promise<string | null> {
    if (!this.client) return null;
    try {
      return await this.client.get(this.cacheHashKey(gameId, paraleloId));
    } catch {
      return null;
    }
  }
}
