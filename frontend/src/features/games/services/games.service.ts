import api from '../../../services/api';
import type { TeacherGame, TeacherGameSummary } from '../types/game.types';

interface BackendGame {
  id: string;
  titulo: string;
  descripcion: string | null;
  tema: string;
  tipo: 'BASE' | 'CAMBIANTE';
  thumbnail_url?: string | null;
}

interface TeacherGamesResponse {
  games?: BackendGame[];
  data?: BackendGame[];
  summary?: TeacherGameSummary;
}

const temaLabels: Record<string, string> = {
  LENGUA_CULTURA: 'Lengua y Cultura',
  COMUNICACION_ORAL: 'Comunicacion Oral',
  LECTURA: 'Lectura',
  ESCRITURA: 'Escritura',
  LITERATURA: 'Literatura',
};

function mapBackendGame(game: BackendGame): TeacherGame {
  return {
    id: game.id,
    title: game.titulo,
    description: game.descripcion ?? 'Juego educativo disponible.',
    category: temaLabels[game.tema] ?? game.tema.replaceAll('_', ' '),
    imageUrl: game.thumbnail_url ?? undefined,
    route: `/games/bomb-game?gameId=${game.id}`,
    questionsCount: 0,
    status: game.tipo === 'CAMBIANTE' ? 'published' : 'draft',
  };
}

function normalizeGamesResponse(response: TeacherGamesResponse | BackendGame[]) {
  if (Array.isArray(response)) {
    return response.map(mapBackendGame);
  }

  return (response.games ?? response.data ?? []).map(mapBackendGame);
}

export const gamesService = {
  async getTeacherGames() {
    const response = await api.get<TeacherGamesResponse | BackendGame[]>('/games');
    return normalizeGamesResponse(response.data);
  },
};
