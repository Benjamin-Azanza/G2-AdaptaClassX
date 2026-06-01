import api from '../../../services/api';

export interface GeneratedQuestionPreview {
  id: string;
  texto: string;
  opciones: string[];
  respuestaCorrecta: number;
}

// The save endpoint normalizes its input — it accepts both AI-generated
// previews (which carry a synthetic `id`) and manually-typed rows. We model
// that with a structural type so callers don't need to fabricate ids.
export interface SavableQuestion {
  texto: string;
  opciones: string[];
  respuestaCorrecta: number;
}

export const aiService = {
  generateQuestions: async (formData: FormData): Promise<GeneratedQuestionPreview[]> => {
    // Override Content-Type for this specific request
    const response = await api.post<{ cached: boolean; questions: GeneratedQuestionPreview[] }>('/ai/generate-questions', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.questions;
  },

  saveQuestions: async (data: {
    game_id: string;
    paralelo_id: string;
    questions: SavableQuestion[];
  }): Promise<unknown> => {
    const response = await api.post('/ai/save-questions', data);
    return response.data;
  },
};
