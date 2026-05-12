import api from './api';
import { MOCK_USERS, MOCK_DELAY } from '../data/mockData';

// ============================================================
// MODO MOCK — Para volver al backend real:
//   Cambiar USE_MOCK a false (y borrar el import de mockData)
// ============================================================
const USE_MOCK = true;

export interface RegisterPayload {
  nombre: string;
  email: string;
  password: string;
  cedula?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    role: 'STUDENT' | 'TEACHER';
    nombre: string;
  };
}

export const authService = {
  login: (data: LoginPayload): Promise<{ data: AuthResponse }> => {
    if (USE_MOCK) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const mockUser = MOCK_USERS[data.email];
          if (mockUser) {
            resolve({ data: mockUser });
          } else {
            reject({
              response: {
                data: {
                  message: `Usuario no encontrado. Usa: estudiante@test.com o profesor@test.com`,
                },
              },
            });
          }
        }, MOCK_DELAY);
      });
    }
    // ── BACKEND REAL ──────────────────────────────────────────
    return api.post<AuthResponse>('/auth/login', data);
  },

  register: (data: RegisterPayload): Promise<{ data: AuthResponse }> => {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          // En modo mock, el registro siempre crea un estudiante
          const newUser: AuthResponse = {
            access_token: 'mock-token-new-user-' + Date.now(),
            user: {
              id: 'mock-user-' + Date.now(),
              email: data.email,
              role: data.cedula ? 'TEACHER' : 'STUDENT',
              nombre: data.nombre,
            },
          };
          resolve({ data: newUser });
        }, MOCK_DELAY);
      });
    }
    // ── BACKEND REAL ──────────────────────────────────────────
    return api.post<AuthResponse>('/auth/register', data);
  },
};
