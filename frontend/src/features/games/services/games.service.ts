import api from '../../../services/api';
import axios from 'axios';
import type { TeacherGame, TeacherGameSummary } from '../types/game.types';

interface TeacherGamesResponse {
  games?: TeacherGame[];
  data?: TeacherGame[];
  summary?: TeacherGameSummary;
}

const localFallbackGames: TeacherGame[] = [
  {
    id: 'bomb-game',
    title: 'Quiz Rapido - Lectura',
    description: 'Juego cambiante para practicar comprension lectora con preguntas del docente.',
    category: 'Lengua y Literatura',
    route: '/teacher/questions',
    status: 'published',
    questionsCount: 0,
    imageUrl: '/games/bomb-game/thumbnail.png',
  },
];

function normalizeGamesResponse(response: TeacherGamesResponse | TeacherGame[]) {
  if (Array.isArray(response)) {
    return response;
  }

  return response.games ?? response.data ?? [];
}

export const gamesService = {
  async getTeacherGames() {
    try {
      const response = await api.get<TeacherGamesResponse | TeacherGame[]>('/games');
      return normalizeGamesResponse(response.data);
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return localFallbackGames;
      }

      throw error;
    }
  },
};
