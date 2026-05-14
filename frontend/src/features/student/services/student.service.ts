import api from '../../../services/api';
import type { AuthUser } from '../../../types/auth';
import type { StudentAssignment, StudentGame, StudentProfile } from '../types/student.types';

interface BackendGame {
  id: string;
  titulo: string;
  descripcion: string | null;
  tema: string;
  tipo: 'BASE' | 'CAMBIANTE';
  thumbnail_url?: string | null;
}

const temaLabels: Record<string, string> = {
  LENGUA_CULTURA: 'Lengua y Cultura',
  COMUNICACION_ORAL: 'Comunicacion Oral',
  LECTURA: 'Lectura',
  ESCRITURA: 'Escritura',
  LITERATURA: 'Literatura',
};

function getBombGameRoute(params?: Record<string, string>) {
  const search = new URLSearchParams(params);
  const query = search.toString();
  return query ? `/games/bomb-game?${query}` : '/games/bomb-game';
}

function mapTemaToLabel(tema: string) {
  return temaLabels[tema] ?? tema.replaceAll('_', ' ');
}

function mapBackendGame(game: BackendGame): StudentGame {
  return {
    id: game.id,
    title: game.titulo,
    description: game.descripcion ?? 'Juego educativo disponible.',
    category: mapTemaToLabel(game.tema),
    tipo: game.tipo,
    imageUrl: game.thumbnail_url ?? undefined,
    route: getBombGameRoute({ gameId: game.id }),
    locked: false,
  };
}

export function buildStudentProfile(user: AuthUser | null | undefined): StudentProfile {
  return {
    xp: 0,
    racha: 0,
    nivel: 1,
    titulo: 'Explorador en progreso',
    paralelo: user?.paralelo_id
      ? {
          id: user.paralelo_id,
          nombre: 'Paralelo asignado',
          grado: 0,
        }
      : null,
  };
}

export const studentGamesService = {
  async getAvailableGames(): Promise<StudentGame[]> {
    const response = await api.get<BackendGame[]>('/games');
    return response.data.map(mapBackendGame);
  },
};

export const studentAssignmentsService = {
  async getMyAssignments(): Promise<{
    pending: StudentAssignment[];
    completed: StudentAssignment[];
  }> {
    const response = await api.get<{
      pending: StudentAssignment[];
      completed: StudentAssignment[];
    }>('/assignments/my');

    const normalizeTask = (task: StudentAssignment): StudentAssignment => ({
      ...task,
      gameCategory: mapTemaToLabel(task.gameCategory),
      gameRoute: task.gameRoute.startsWith('/games/bomb-game')
        ? task.gameRoute
        : getBombGameRoute({
            assignmentId: task.id,
            gameId: task.gameId,
          }),
    });

    return {
      pending: response.data.pending.map(normalizeTask),
      completed: response.data.completed.map(normalizeTask),
    };
  },
};
