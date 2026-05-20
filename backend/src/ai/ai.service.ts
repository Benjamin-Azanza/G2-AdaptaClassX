import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import OpenAI from 'openai';
import * as pdfParseModule from 'pdf-parse';
const pdfParse = (pdfParseModule as any).default || pdfParseModule;
import * as mammoth from 'mammoth';
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

    try {
      if (file.mimetype === 'application/pdf') {
        const data = await pdfParse(file.buffer);
        return data.text;
      } else if (
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.mimetype === 'application/msword'
      ) {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        return result.value;
      } else if (file.mimetype.startsWith('text/')) {
        return file.buffer.toString('utf-8');
      } else {
        throw new BadRequestException('Unsupported file format. Please upload PDF, DOCX, or TXT.');
      }
    } catch (error) {
      throw new InternalServerErrorException('Error extracting text from file');
    }
  }

  async generateQuestions(
    text: string,
    targetGameId: string,
    amount: number,
    difficulty: string,
    context?: string,
  ): Promise<any> {
    const prompt = `
Actúa como un profesor experto. Tu tarea es generar ${amount} preguntas de opción múltiple basadas en el siguiente texto.
El nivel de dificultad debe ser "${difficulty}".
${context ? `Consideraciones adicionales o contexto: ${context}\n` : ''}

Texto de origen:
"""
${text}
"""

Debes devolver EXACTAMENTE Y ÚNICAMENTE un arreglo JSON con el siguiente formato, sin markdown ni explicaciones adicionales:
[
  {
    "id": "uuid-generado-aleatoriamente",
    "prompt": "Pregunta generada",
    "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
    "correctOptionIndex": 0
  }
]
Asegúrate de que 'correctOptionIndex' sea un número entre 0 y 3 que indique la opción correcta.
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'z-ai/glm-4.5-air:free', // O el modelo que esté disponible en la URL base
        messages: [{ role: 'system', content: prompt }],
        response_format: { type: 'json_object' } 
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No content returned from LLM');
      }
      
      const jsonStr = content.replace(/```json/gi, '').replace(/```/g, '').trim();
      let questions;
      try {
        questions = JSON.parse(jsonStr);
      } catch (err) {
        throw new Error('LLM did not return a valid JSON format');
      }

      if (!Array.isArray(questions) && questions.questions) {
          questions = questions.questions;
      }

      if (!Array.isArray(questions)) {
          if (questions.id && questions.prompt && questions.options) {
              questions = [questions];
          } else {
              throw new Error('LLM did not return an array');
          }
      }

      return questions;
    } catch (error) {
      console.error('Error in LLM generation', error);
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
      if (!paraleloId) {
        // If there's no paraleloId, maybe they are global questions, but our schema requires it or allow null?
        // Let's check schema. paralelo_id is String?.
        // The unique constraint is @@unique([game_id, paralelo_id])
        // Let's use findFirst to see if exists, then update or create since upsert with null is tricky in prisma sometimes.
      }
      
      // Upsert or create
      const existing = await this.prisma.gameQuestion.findFirst({
        where: { game_id: gameId, paralelo_id: paraleloId || null }
      });

      if (existing) {
        return await this.prisma.gameQuestion.update({
          where: { id: existing.id },
          data: {
            preguntas_json: questions,
            tipo_fuente: TipoFuente.IA,
          }
        });
      } else {
        return await this.prisma.gameQuestion.create({
          data: {
            game_id: gameId,
            paralelo_id: paraleloId || null,
            preguntas_json: questions,
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
