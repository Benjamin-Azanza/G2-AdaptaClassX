import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import OpenAI from 'openai';
import * as mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { TipoFuente } from '@prisma/client';

@Injectable()
export class AiService {
  private openai: OpenAI;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('AI_API_KEY') || this.configService.get<string>('OPENAI_API_KEY') || 'dummy',
      baseURL: this.configService.get<string>('AI_API_URL') || 'https://api.openai.com/v1',
    });
  }

  async extractText(file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    console.log(`[AI] extractText — mimetype: ${file.mimetype}, size: ${file.size} bytes`);

    try {
      let rawText: string;

      if (file.mimetype === 'application/pdf') {
        const parser = new PDFParse({ data: file.buffer });
        const result = await parser.getText();
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
      console.log(`[AI] extractText — raw chars: ${rawText.length}, cleaned words: ${cleaned.split(/\s+/).length}`);
      return cleaned;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      console.error('[AI] extractText error:', error);
      throw new InternalServerErrorException('Error extracting text from file');
    }
  }

  private cleanText(raw: string): string {
    return raw
      // Collapse 3+ consecutive newlines into 2
      .replace(/\n{3,}/g, '\n\n')
      // Remove lines that are only numbers or whitespace (page numbers, etc.)
      .replace(/^\s*\d+\s*$/gm, '')
      // Collapse multiple spaces/tabs into a single space
      .replace(/[ \t]{2,}/g, ' ')
      // Trim each line
      .split('\n').map(l => l.trim()).join('\n')
      .trim()
      // Truncate to ~4000 words to stay within context limits
      .split(/\s+/).slice(0, 4000).join(' ');
  }

  async generateQuestions(
    text: string,
    targetGameId: string,
    amount: number,
    difficulty: string,
    context?: string,
  ): Promise<any> {
    const model = this.configService.get<string>('AI_MODEL') || 'z-ai/glm-4.5-air:free';

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

RESPONDE SOLO con un array JSON válido, sin markdown, sin explicaciones:
[{"texto":"...","opciones":["A","B","C","D"],"respuestaCorrecta":0},...]

respuestaCorrecta es el índice (0-3) de la opción correcta.`;

    console.log(`[AI] generateQuestions — model: ${model}, amount: ${amount}, text words: ${text.split(/\s+/).length}`);

    try {
      const response = await this.openai.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000 + amount * 300, // reasoning models use extra tokens for thinking
      });

      const choice = response.choices[0];
      console.log(`[AI] LLM finish_reason: ${choice?.finish_reason}`);
      console.log(`[AI] LLM full choice:`, JSON.stringify(choice, null, 2).slice(0, 600));

      // Some reasoning models (e.g. GLM-4.5) put output in alternate fields
      const msg = choice?.message as any;
      const content =
        msg?.content ||
        msg?.reasoning_content ||
        msg?.reasoning ||
        msg?.tool_calls?.[0]?.function?.arguments;

      if (!content) throw new Error(`No content from LLM. finish_reason: ${choice?.finish_reason}`);

      // Strip markdown code fences if present
      const jsonStr = content.replace(/```(?:json)?/gi, '').trim();

      let questions: any;
      try {
        questions = JSON.parse(jsonStr);
      } catch (parseErr) {
        console.warn('[AI] Direct JSON.parse failed, attempting recovery. Raw (200):', jsonStr.slice(0, 200));

        // Strategy 1: extract a complete [...] block
        const fullMatch = jsonStr.match(/\[[\s\S]*\]/);
        if (fullMatch) {
          try {
            questions = JSON.parse(fullMatch[0]);
          } catch {
            // Strategy 2: response was truncated (finish_reason=length) — extract complete objects
            const partialObjects = [...jsonStr.matchAll(/\{[^{}]*"respuestaCorrecta"\s*:\s*\d[^{}]*\}/g)];
            if (partialObjects.length > 0) {
              console.warn(`[AI] Recovered ${partialObjects.length} complete question(s) from truncated response`);
              questions = partialObjects.map(m => JSON.parse(m[0]));
            } else {
              throw new Error('Could not recover any valid questions from LLM response');
            }
          }
        } else {
          // Strategy 2 directly: extract complete objects
          const partialObjects = [...jsonStr.matchAll(/\{[^{}]*"respuestaCorrecta"\s*:\s*\d[^{}]*\}/g)];
          if (partialObjects.length > 0) {
            console.warn(`[AI] Recovered ${partialObjects.length} complete question(s) from truncated response`);
            questions = partialObjects.map(m => JSON.parse(m[0]));
          } else {
            throw new Error('LLM did not return a parseable JSON array');
          }
        }
      }

      // Unwrap if the model wrapped the array in an object
      if (!Array.isArray(questions)) {
        const keys = Object.keys(questions);
        const arrayKey = keys.find(k => Array.isArray(questions[k]));
        if (arrayKey) {
          console.warn(`[AI] Unwrapping array from key: ${arrayKey}`);
          questions = questions[arrayKey];
        } else {
          throw new Error(`LLM response is not an array. Keys found: ${keys.join(', ')}`);
        }
      }

      console.log(`[AI] Questions parsed OK — count: ${questions.length}`);
      return questions;
    } catch (error) {
      console.error('[AI] generateQuestions error:', error);
      throw new InternalServerErrorException('Error generating questions from LLM');
    }
  }

  async saveQuestions(
    gameId: string,
    paraleloId: string | null,
    questions: any[],
    userId: string,
  ) {
    try {
      // Normalize to the canonical game format: {texto, opciones, respuestaCorrecta}
      // Supports both the new format (AI now uses these names directly) and legacy field names
      const normalizedQuestions = questions.map((q: any) => ({
        texto: q.texto ?? q.prompt ?? '',
        opciones: q.opciones ?? q.options ?? [],
        respuestaCorrecta: q.respuestaCorrecta ?? q.correctOptionIndex ?? 0,
      }));

      // Upsert or create
      const existing = await this.prisma.gameQuestion.findFirst({
        where: { game_id: gameId, paralelo_id: paraleloId || null }
      });

      if (existing) {
        return await this.prisma.gameQuestion.update({
          where: { id: existing.id },
          data: {
            preguntas_json: normalizedQuestions,
            tipo_fuente: TipoFuente.IA,
          }
        });
      } else {
        return await this.prisma.gameQuestion.create({
          data: {
            game_id: gameId,
            paralelo_id: paraleloId || null,
            preguntas_json: normalizedQuestions,
            tipo_fuente: TipoFuente.IA,
            created_by: userId,
          }
        });
      }
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Error saving questions to DB');
    }
  }
}
