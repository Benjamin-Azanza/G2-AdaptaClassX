import api from '../../../services/api';

export interface GeneratedQuestionPreview {
  id: string;
  prompt: string;
  options: string[];
  correctOptionIndex: number;
}

export const aiService = {
  generateQuestions: async (formData: FormData): Promise<GeneratedQuestionPreview[]> => {
    // Override Content-Type for this specific request
    const response = await api.post('/ai/generate-questions', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  saveQuestions: async (data: { game_id: string; paralelo_id: string; questions: GeneratedQuestionPreview[] }): Promise<any> => {
    const response = await api.post('/ai/save-questions', data);
    return response.data;
  },
};
