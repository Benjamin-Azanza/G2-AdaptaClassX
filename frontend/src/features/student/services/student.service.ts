import type { StudentAssignment, StudentGame, StudentProfile } from '../types/student.types';

// ─── MOCK DATA (reemplazar retornos con llamadas axios cuando el backend esté listo) ──
// Para conectar al backend: cambiar cada función por `api.get('/endpoint')` con Axios.

export const MOCK_STUDENT_PROFILE: StudentProfile = {
  xp: 1250,
  racha: 5,
  nivel: 8,
  titulo: 'Lector Explorador',
  paralelo: {
    id: 'paralelo-3a',
    nombre: '3ro A',
    grado: 3,
  },
};

// Solo 1 juego activo + 1 bloqueado como placeholder.
// Cuando haya backend: GET /games?paralelo_id=xxx
export const MOCK_STUDENT_GAMES: StudentGame[] = [
  {
    id: 'bomb-game',
    title: 'Quiz Rápido — Lectura',
    description: 'Responde preguntas y recolecta estrellas en este juego de plataformas.',
    category: 'Lectura',
    tipo: 'CAMBIANTE',
    imageUrl: '/games/bomb-game/thumbnail.png',
    route: '/games/bomb-game',
    locked: false,
  },
  {
    id: 'coming-soon',
    title: 'Próximamente',
    description: 'Nuevo juego en camino. Tu profesor lo habilitará pronto.',
    category: 'Escritura',
    tipo: 'BASE',
    route: '#',
    locked: true,
  },
];

// Solo 1 tarea activa apuntando al juego real.
// Cuando haya backend: GET /assignments?student_id=xxx
export const MOCK_STUDENT_ASSIGNMENTS: StudentAssignment[] = [
  {
    id: 'assignment-1',
    gameId: 'bomb-game',
    gameTitle: 'Quiz Rápido — Lectura',
    gameCategory: 'Lectura',
    gameRoute: '/games/bomb-game',
    minutosRequeridos: 15,
    minutosJugados: 7,
    completado: false,
    fechaLimite: '2026-05-20T23:59:00',
  },
];

export const MOCK_COMPLETED_ASSIGNMENTS: StudentAssignment[] = [
  {
    id: 'assignment-0',
    gameId: 'bomb-game',
    gameTitle: 'Quiz Rápido — Lectura',
    gameCategory: 'Lectura',
    gameRoute: '/games/bomb-game',
    minutosRequeridos: 10,
    minutosJugados: 12,
    completado: true,
    fechaLimite: '2026-05-10T23:59:00',
    xpGanado: 50,
    completadoAt: '2026-05-10T15:30:00',
  },
];

// ─── Service stubs (listos para reemplazar por llamadas reales) ────────────────
export const studentGamesService = {
  // TODO: reemplazar por → return api.get<StudentGame[]>('/games')
  getAvailableGames(): StudentGame[] {
    return MOCK_STUDENT_GAMES;
  },
};

export const studentAssignmentsService = {
  // TODO: reemplazar por → return api.get<StudentAssignment[]>('/assignments/pending')
  getPending(): StudentAssignment[] {
    return MOCK_STUDENT_ASSIGNMENTS;
  },
  // TODO: reemplazar por → return api.get<StudentAssignment[]>('/assignments/completed')
  getCompleted(): StudentAssignment[] {
    return MOCK_COMPLETED_ASSIGNMENTS;
  },
};
