import api from './api';

export interface Paralelo {
  id: string;
  nombre: string;
  grado: number;
  codigo_acceso: string;
  activo: boolean;
  created_at: string;
  _count?: { students: number };
}

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
