import api from '../../../services/api';
import type { Paralelo } from '../types/paralelo.types';

export const paralelosService = {
  create: (data: { nombre: string; grado: number }) =>
    api.post<Paralelo>('/paralelos', data),

  join: (codigo_acceso: string) =>
    api.post('/paralelos/join', { codigo_acceso }),

  getAll: () =>
    api.get<Paralelo[]>('/paralelos'),

  getOne: (id: string) =>
    api.get<Paralelo>(`/paralelos/${id}`),
};
