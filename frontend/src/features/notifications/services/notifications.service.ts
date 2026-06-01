import api from '../../../services/api';

export interface NotificationRow {
  id: string;
  student_id: string;
  assignment_id: string;
  mensaje: string;
  leida: boolean;
  created_at: string;
  assignment?: {
    id: string;
    game?: { id: string; titulo: string } | null;
  } | null;
}

export const notificationsService = {
  getPending: () => api.get<NotificationRow[]>('/notifications/pending'),
  markAsRead: (id: string) => api.patch<NotificationRow>(`/notifications/${id}/read`),
};
