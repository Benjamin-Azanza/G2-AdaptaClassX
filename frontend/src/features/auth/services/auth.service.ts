import api from '../../../services/api';
import type { AuthUser } from '../../../types/auth';

export interface RegisterPayload {
  nombre: string;
  email: string;
  password: string;
  isDocente?: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

// The JWT now lives in an httpOnly cookie, so the response body only
// carries the user profile the SPA needs to render.
export interface AuthResponse {
  user: AuthUser;
}

export const authService = {
  register: (data: RegisterPayload) =>
    api.post<AuthResponse>('/auth/register', data),

  login: (data: LoginPayload) =>
    api.post<AuthResponse>('/auth/login', data),

  logout: () => api.post<void>('/auth/logout'),

  // Used on app startup to verify the cookie session is still valid
  // and to rehydrate the user without trusting any client-side store.
  me: () => api.get<AuthResponse>('/auth/me'),
};
