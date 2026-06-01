import api from '../../../services/api';

export interface CreateAssignmentInput {
  paralelo_id: string;
  game_id: string;
  minutos_requeridos: number;
  /** ISO-8601 timestamp (e.g. "2026-06-15T00:00:00Z") */
  fecha_limite: string;
}

export interface AssignmentRow {
  id: string;
  paralelo_id: string;
  game_id: string;
  minutos_requeridos: number;
  fecha_limite: string;
  created_at: string;
}

export const assignmentsService = {
  create: (data: CreateAssignmentInput) =>
    api.post<AssignmentRow>('/assignments', data),

  markComplete: (assignmentId: string) =>
    api.patch<unknown>(`/progress/${assignmentId}/complete`),
};
