import api from '../../../services/api';
import type { AuthUser } from '../../../types/auth';

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
  user: AuthUser;
}

export const authService = {
  register: (data: RegisterPayload) =>
    api.post<AuthResponse>('/auth/register', data),

  login: (data: LoginPayload) =>
    api.post<AuthResponse>('/auth/login', data),
};
