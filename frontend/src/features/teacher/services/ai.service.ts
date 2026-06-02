import api from '../../../services/api';

export interface GeneratedQuestionPreview {
  texto: string;
  opciones: string[];
  respuestaCorrecta: number;
}

export interface GenerateQuestionsResponse {
  cached: boolean;
  questions: GeneratedQuestionPreview[];
  source_id: string;
}

export const aiService = {
  generateQuestions: async (formData: FormData): Promise<GenerateQuestionsResponse> => {
    const response = await api.post<GenerateQuestionsResponse>('/ai/generate-questions', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  saveQuestions: async (data: {
    tema: string;
    source_id: string | null;
    questions: Array<{ texto: string; opciones: string[]; respuestaCorrecta: number }>;
  }): Promise<unknown> => {
    // Mapea la respuesta correcta de índice numérico al texto de la opción antes de enviar al backend
    const mappedQuestions = data.questions.map((q) => ({
      texto: q.texto,
      opciones: q.opciones,
      respuesta_correcta: q.opciones[q.respuestaCorrecta] || '',
    }));

    const response = await api.post('/ai/save-questions', {
      tema: data.tema,
      source_id: data.source_id,
      questions: mappedQuestions,
    });
    return response.data;
  },
};
