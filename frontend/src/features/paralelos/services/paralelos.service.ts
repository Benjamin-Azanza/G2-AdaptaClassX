import api from '../../../services/api';
import type { Paralelo } from '../types/paralelo.types';

export const paralelosService = {
  create: (data: { nombre: string; grado: number }) =>
    api.post<Paralelo>('/paralelos', data),

  // Used by students from their dashboard to join a paralelo via access code.
  join: (codigo_acceso: string) =>
    api.post<{ paralelo: Paralelo }>('/paralelos/join', { codigo_acceso }),

  getAll: () => api.get<Paralelo[]>('/paralelos'),

  getOne: (id: string) => api.get<Paralelo>(`/paralelos/${id}`),

  archive: (id: string) => api.patch<Paralelo>(`/paralelos/${id}/archive`),
};
