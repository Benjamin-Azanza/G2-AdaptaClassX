import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisDraftService } from './redis-draft.service';
import OpenAI from 'openai';
import type {
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming,
} from 'openai/resources/chat/completions';
import * as mammoth from 'mammoth';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');
import { TipoFuente } from '@prisma/client';

type NormalizedQuestion = {
  texto: string;
  opciones: string[];
  respuestaCorrecta: number;
};

// Reuse an IA-generated question set if it was saved less than this many
// days ago AND the source hash matches the current request.
const CACHE_FRESHNESS_DAYS = 7;
const MAX_TEXTO_LEN = 500;
const MAX_OPCION_LEN = 200;
const OPTIONS_PER_QUESTION = 4;

@Injectable()
export class AiService {
  // Use Nest's Logger so prod logs land in whatever transport the platform
  // captures (Vercel, Railway, etc.) instead of raw console writes. Debug
  // lines are gated so we don't leak prompt diagnostics in production.
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private draftStore: RedisDraftService,
  ) {
    const apiKey =
      this.configService.get<string>('AI_API_KEY') ||
      this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      throw new Error(
        'AI provider API key is missing. Set AI_API_KEY (or OPENAI_API_KEY) in the environment.',
      );
    }

    this.openai = new OpenAI({
      apiKey,
      baseURL:
        this.configService.get<string>('AI_API_URL') ||
        'https://api.openai.com/v1',
      // 25s is below Vercel's 30s serverless limit; retries cover 429/5xx.
      timeout: 25_000,
      maxRetries: 2,
    });
  }

  async extractText(file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    this.logger.debug(`extractText — mimetype=${file.mimetype} size=${file.size}B`);

    try {
      let rawText: string;

      if (file.mimetype === 'application/pdf') {
        const result = await pdfParse(file.buffer);
        rawText = result.text;
      } else if (
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.mimetype === 'application/msword'
      ) {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        rawText = result.value;
      } else if (file.mimetype.startsWith('text/')) {
        rawText = file.buffer.toString('utf-8');
      } else {
        throw new BadRequestException('Unsupported file format. Please upload PDF, DOCX, or TXT.');
      }

      const cleaned = this.cleanText(rawText);
      this.logger.debug(
        `extractText — rawChars=${rawText.length} cleanedWords=${cleaned.split(/\s+/).length}`,
      );
      return cleaned;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('extractText failed', error instanceof Error ? error.stack : String(error));
      throw new InternalServerErrorException('Error extracting text from file');
    }
  }

  private cleanText(raw: string): string {
    // Phase 1 — structural cleanup (whitespace, page numbers, etc.).
    const baseCleaned = raw
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\s*\d+\s*$/gm, '')
      .replace(/[ \t]{2,}/g, ' ')
      .split('\n')
      .map((l) => l.trim())
      .join('\n')
      .trim();

    // Phase 2 — promote obvious structure to Markdown so the LLM can lean on
    // headings/lists instead of free-flowing prose. Cheap, no deps, ~15%
    // token reduction in practice.
    const markdown = this.normalizeToMarkdown(baseCleaned);

    // Phase 3 — truncate to ~4000 words to stay within context limits.
    return markdown.split(/\s+/).slice(0, 4000).join(' ');
  }

  private normalizeToMarkdown(text: string): string {
    const lines = text.split('\n');
    const out: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        out.push('');
        continue;
      }

      // Bullet-style lines → canonical "- item".
      const bulletMatch = trimmed.match(/^[-*•·]\s*(.+)$/);
      if (bulletMatch) {
        out.push(`- ${bulletMatch[1]}`);
        continue;
      }

      // "Heading-ish" line followed by a list → promote to "## heading".
      if (/[A-Za-zÁÉÍÓÚÑáéíóúñ0-9].*:$/.test(trimmed) && trimmed.length <= 80) {
        const next = (lines[i + 1] ?? '').trim();
        if (/^[-*•·]/.test(next) || /^\d+[.)]\s/.test(next)) {
          out.push(`## ${trimmed.replace(/:$/, '')}`);
          continue;
        }
      }

      // Fully uppercase short lines look like titles → "## TITULO".
      const letters = trimmed.replace(/[^A-Za-zÁÉÍÓÚÑ]/g, '');
      if (
        letters.length >= 3 &&
        letters.length <= 60 &&
        letters === letters.toUpperCase() &&
        /^[A-ZÁÉÍÓÚÑ0-9\s.,;:¿?¡!()'"-]+$/.test(trimmed)
      ) {
        out.push(`## ${trimmed}`);
        continue;
      }

      out.push(trimmed);
    }

    return out.join('\n').replace(/\n{3,}/g, '\n\n');
  }

  private computeSourceHash(
    text: string,
    amount: number,
    difficulty: string,
    context: string | undefined,
  ): string {
    return createHash('sha256')
      .update(`${text}|${amount}|${difficulty}|${context ?? ''}`)
      .digest('hex');
  }

  /**
   * Returns the saved IA questions for this (game, paralelo) only when:
   *  - a Redis sourceHash exists for the pair and matches the current request,
   *  - and a DB row exists with tipo_fuente=IA created within the freshness
   *    window.
   *
   * The hash gate is what makes the cache *correct*: without it we'd serve
   * stale questions whenever the teacher uploads different material for the
   * same game/paralelo.
   */
  async findRecentCachedQuestions(
    gameId: string,
    paraleloId: string | null,
    sourceHash: string,
  ): Promise<NormalizedQuestion[] | null> {
    const storedHash = await this.draftStore.readSourceHash(gameId, paraleloId);
    if (!storedHash) {
      this.logger.debug(`cache miss — no sourceHash recorded for ${gameId}/${paraleloId ?? 'global'}`);
      return null;
    }
    if (storedHash !== sourceHash) {
      this.logger.debug(
        `cache miss — sourceHash mismatch for ${gameId}/${paraleloId ?? 'global'}`,
      );
      return null;
    }

    const since = new Date(Date.now() - CACHE_FRESHNESS_DAYS * 86_400_000);
    const row = await this.prisma.gameQuestion.findFirst({
      where: {
        game_id: gameId,
        paralelo_id: paraleloId ?? null,
        tipo_fuente: TipoFuente.IA,
        created_at: { gte: since },
      },
      orderBy: { created_at: 'desc' },
    });

    if (!row) return null;
    const json = row.preguntas_json;
    if (!Array.isArray(json)) return null;
    return json as unknown as NormalizedQuestion[];
  }

  async generateQuestions(
    text: string,
    targetGameId: string,
    amount: number,
    difficulty: string,
    context: string | undefined,
    userId: string,
    paraleloId: string | null,
    force: boolean,
  ): Promise<{ cached: boolean; questions: NormalizedQuestion[] }> {
    const sourceHash = this.computeSourceHash(text, amount, difficulty, context);

    // Step 1 — cheap DB+hash lookup before burning any LLM tokens. Only
    // returns when the source matches the previously saved set.
    if (targetGameId && !force) {
      const cached = await this.findRecentCachedQuestions(
        targetGameId,
        paraleloId,
        sourceHash,
      );
      if (cached) {
        this.logger.log(
          `cache hit game=${targetGameId} paralelo=${paraleloId ?? 'global'} count=${cached.length}`,
        );
        return { cached: true, questions: cached };
      }
    }

    const model = this.configService.get<string>('AI_MODEL') || 'z-ai/glm-4.5-air:free';

    // Prompt asks for an object with a `preguntas` array so it's compatible
    // with OpenAI-style JSON mode (response_format = json_object, which
    // requires an object root). The existing parser unwraps either shape.
    const prompt = `Eres un generador de preguntas de opción múltiple para niños de 8 a 10 años (3ro-5to EGB).

TEXTO BASE:
"""
${text}
"""

TAREA: Genera exactamente ${amount} preguntas de opción múltiple basadas ÚNICAMENTE en el texto anterior. Nivel de dificultad: ${difficulty}.${context ? `\nConsideraciones: ${context}` : ''}

REGLAS:
- Cada pregunta debe poder responderse leyendo el texto base.
- 4 opciones por pregunta, solo una correcta.
- Lenguaje claro y simple para niños.
- No inventes información que no esté en el texto.
- IMPORTANTE: Limita tu pensamiento o razonamiento interno (thinking/reasoning process) a un máximo de 1 o 2 oraciones muy breves. No expliques el proceso, genera el JSON inmediatamente en el primer token posible para no exceder los límites de tokens de salida.

RESPONDE SOLO con un objeto JSON válido con esta forma exacta, sin markdown, sin explicaciones:
{"preguntas":[{"texto":"...","opciones":["A","B","C","D"],"respuestaCorrecta":0}]}

respuestaCorrecta es el índice (0-3) de la opción correcta dentro de "opciones".`;

    this.logger.debug(
      `generateQuestions — model=${model} amount=${amount} textWords=${text.split(/\s+/).length}`,
    );

    const startedAt = Date.now();
    try {
      const response = await this.callLlmWithJsonModeFallback(model, prompt, amount);
      const latencyMs = Date.now() - startedAt;
      const choice = response.choices[0];
      const usage = response.usage;
      this.logger.log(
        `LLM usage — game=${targetGameId} latency=${latencyMs}ms finish=${choice?.finish_reason} ` +
          `prompt_tokens=${usage?.prompt_tokens ?? 'n/a'} completion_tokens=${usage?.completion_tokens ?? 'n/a'} ` +
          `total_tokens=${usage?.total_tokens ?? 'n/a'} cached=false`,
      );

      const rawQuestions = this.parseLlmResponse(choice);
      const validQuestions = this.validateLlmQuestions(rawQuestions);

      if (validQuestions.length === 0) {
        throw new Error(
          `LLM returned ${rawQuestions.length} item(s) but none passed validation`,
        );
      }
      if (validQuestions.length < rawQuestions.length) {
        this.logger.warn(
          `Filtered ${rawQuestions.length - validQuestions.length} invalid question(s) of ${rawQuestions.length} returned by LLM`,
        );
      }

      // Stash the result + sourceHash in Redis so `save-questions` can pick
      // it up after a refresh, and so we can pin the saved row to its source.
      if (userId && targetGameId) {
        await this.draftStore.saveDraft(userId, targetGameId, paraleloId, {
          questions: validQuestions,
          sourceHash,
        });
      }

      return { cached: false, questions: validQuestions };
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      this.logger.error(
        `generateQuestions failed after ${latencyMs}ms`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Error generating questions from LLM');
    }
  }

  /**
   * Tries JSON mode first (cheap reliability win for OpenAI-compatible
   * providers that support it). If the provider rejects `response_format`
   * with a 4xx complaining about that param, retry once without it instead
   * of failing the whole request.
   */
  private async callLlmWithJsonModeFallback(
    model: string,
    prompt: string,
    amount: number,
  ): Promise<ChatCompletion> {
    const baseParams: ChatCompletionCreateParamsNonStreaming = {
      model,
      messages: [{ role: 'user', content: prompt }],
      // ~150 output tokens per question; floor covers the JSON wrapper.
      max_tokens: 500 + amount * 200,
    };

    try {
      return await this.openai.chat.completions.create({
        ...baseParams,
        response_format: { type: 'json_object' },
      });
    } catch (err) {
      if (this.isJsonModeUnsupportedError(err)) {
        this.logger.warn(
          'Provider rejected response_format=json_object — retrying without JSON mode.',
        );
        return this.openai.chat.completions.create(baseParams);
      }
      throw err;
    }
  }

  private isJsonModeUnsupportedError(err: unknown): boolean {
    if (!err || typeof err !== 'object') return false;
    const e = err as { status?: number; message?: string };
    if (e.status !== 400) return false;
    const msg = (e.message ?? '').toLowerCase();
    return msg.includes('response_format') || msg.includes('json_object') || msg.includes('json mode');
  }

  private parseLlmResponse(choice: ChatCompletion['choices'][number] | undefined): unknown[] {
    // Some reasoning models (e.g. GLM-4.5) put output in alternate fields.
    const msg = choice?.message as Record<string, unknown> | undefined;
    const content =
      (msg?.content as string | undefined) ||
      (msg?.reasoning_content as string | undefined) ||
      (msg?.reasoning as string | undefined) ||
      ((msg?.tool_calls as { function?: { arguments?: string } }[] | undefined)?.[0]?.function?.arguments);

    if (!content) {
      throw new Error(`No content from LLM. finish_reason: ${choice?.finish_reason}`);
    }

    // Strip markdown code fences in case the model ignored the instruction.
    const jsonStr = content.replace(/```(?:json)?/gi, '').trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      this.logger.warn(
        `JSON.parse failed, attempting recovery (raw head: ${jsonStr.slice(0, 200)})`,
      );

      const fullMatch = jsonStr.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
      if (fullMatch) {
        try {
          parsed = JSON.parse(fullMatch[0]);
        } catch {
          parsed = this.recoverPartialObjects(jsonStr);
        }
      } else {
        parsed = this.recoverPartialObjects(jsonStr);
      }
    }

    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>;
      const arrayKey = Object.keys(obj).find((k) => Array.isArray(obj[k]));
      if (arrayKey) {
        this.logger.debug(`Unwrapping array from key=${arrayKey}`);
        return obj[arrayKey] as unknown[];
      }
    }
    throw new Error('LLM did not return an array of questions');
  }

  private recoverPartialObjects(jsonStr: string): unknown[] {
    // Last-resort recovery when the response was truncated (finish_reason=length)
    // — extract complete question-like objects via regex.
    const matches = [
      ...jsonStr.matchAll(/\{[^{}]*"respuestaCorrecta"\s*:\s*\d[^{}]*\}/g),
    ];
    if (matches.length === 0) {
      throw new Error('Could not recover any valid questions from LLM response');
    }
    this.logger.warn(
      `Recovered ${matches.length} question(s) from truncated response`,
    );
    return matches.map((m) => JSON.parse(m[0]));
  }

  private validateLlmQuestions(raw: unknown[]): NormalizedQuestion[] {
    const valid: NormalizedQuestion[] = [];
    for (const item of raw) {
      const normalized = this.normalizeOne(item);
      if (normalized) valid.push(normalized);
    }
    return valid;
  }

  /**
   * Validates and normalizes a single question, supporting legacy field
   * aliases (prompt → texto, options → opciones, correctOptionIndex →
   * respuestaCorrecta). Returns null when the question is malformed —
   * callers decide whether to filter (LLM output) or 400 (user save).
   */
  private normalizeOne(item: unknown): NormalizedQuestion | null {
    if (!item || typeof item !== 'object') return null;
    const q = item as Record<string, unknown>;

    const textoRaw = (q.texto ?? q.prompt) as unknown;
    const opcionesRaw = (q.opciones ?? q.options) as unknown;
    const respuestaRaw = (q.respuestaCorrecta ?? q.correctOptionIndex) as unknown;

    if (typeof textoRaw !== 'string') return null;
    const texto = textoRaw.trim();
    if (!texto || texto.length > MAX_TEXTO_LEN) return null;

    if (!Array.isArray(opcionesRaw) || opcionesRaw.length !== OPTIONS_PER_QUESTION) return null;
    const opciones: string[] = [];
    for (const o of opcionesRaw) {
      if (typeof o !== 'string') return null;
      const trimmed = o.trim();
      if (!trimmed || trimmed.length > MAX_OPCION_LEN) return null;
      opciones.push(trimmed);
    }

    if (typeof respuestaRaw !== 'number' || !Number.isInteger(respuestaRaw)) return null;
    if (respuestaRaw < 0 || respuestaRaw >= OPTIONS_PER_QUESTION) return null;

    return { texto, opciones, respuestaCorrecta: respuestaRaw };
  }

  async saveQuestions(
    gameId: string,
    paraleloId: string | null,
    questions: unknown[],
    userId: string,
  ) {
    try {
      const draft = await this.draftStore.readDraft(userId, gameId, paraleloId);

      // Body wins when populated — the teacher may have edited the IA output
      // before saving, and those edits must not be silently overwritten by
      // the stashed draft. Fall back to the draft only when the client sent
      // an empty/missing array (e.g. they refreshed and lost the editor
      // state).
      const sourceQuestions =
        Array.isArray(questions) && questions.length > 0
          ? questions
          : (draft?.questions ?? []);

      if (sourceQuestions.length === 0) {
        throw new BadRequestException('No hay preguntas para guardar.');
      }

      // Validate every question and report the first offender by index so
      // the frontend can surface a precise error.
      const normalizedQuestions: NormalizedQuestion[] = [];
      sourceQuestions.forEach((q, i) => {
        const n = this.normalizeOne(q);
        if (!n) {
          throw new BadRequestException(
            `Pregunta ${i + 1} no es válida: requiere texto (1-${MAX_TEXTO_LEN} chars), exactamente ${OPTIONS_PER_QUESTION} opciones no vacías y respuestaCorrecta entre 0 y ${OPTIONS_PER_QUESTION - 1}.`,
          );
        }
        normalizedQuestions.push(n);
      });

      const existing = await this.prisma.gameQuestion.findFirst({
        where: { game_id: gameId, paralelo_id: paraleloId || null },
      });

      let saved;
      if (existing) {
        saved = await this.prisma.gameQuestion.update({
          where: { id: existing.id },
          data: {
            preguntas_json: normalizedQuestions,
            tipo_fuente: TipoFuente.IA,
            created_by: userId,
          },
        });
      } else {
        saved = await this.prisma.gameQuestion.create({
          data: {
            game_id: gameId,
            paralelo_id: paraleloId || null,
            preguntas_json: normalizedQuestions,
            tipo_fuente: TipoFuente.IA,
            created_by: userId,
          },
        });
      }

      // Pin the saved row to its source hash so future generate calls with
      // the same material short-circuit the LLM. Only when we know what the
      // source was — i.e. the request went through the generate flow.
      if (draft?.sourceHash) {
        await this.draftStore.saveSourceHash(gameId, paraleloId, draft.sourceHash);
      }

      // Draft is no longer needed — the canonical copy is in Postgres now.
      await this.draftStore.clearDraft(userId, gameId, paraleloId);

      return saved;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(
        'saveQuestions failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Error saving questions to DB');
    }
  }
}
