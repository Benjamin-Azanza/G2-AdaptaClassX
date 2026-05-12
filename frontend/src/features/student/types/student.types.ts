export interface StudentProfile {
  xp: number;
  racha: number;
  nivel: number;
  titulo: string;
  paralelo?: {
    id: string;
    nombre: string;
    grado: number;
  } | null;
}

export interface StudentAssignment {
  id: string;
  gameId: string;
  gameTitle: string;
  gameCategory: string;
  gameRoute: string;
  minutosRequeridos: number;
  minutosJugados: number;
  completado: boolean;
  fechaLimite: string;
  xpGanado?: number;
  completadoAt?: string;
}

export interface StudentGame {
  id: string;
  title: string;
  description: string;
  category: string;
  tipo: 'BASE' | 'CAMBIANTE';
  imageUrl?: string;
  route: string;
  locked?: boolean;
}
