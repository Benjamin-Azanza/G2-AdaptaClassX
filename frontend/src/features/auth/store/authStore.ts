import { create } from 'zustand';
import { authService, type LoginPayload, type RegisterPayload } from '../services/auth.service';
import type { AuthUser } from '../../../types/auth';
import { getApiErrorMessage } from '../../../lib/httpErrors';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (data: LoginPayload) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,

  hydrate: () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as AuthUser;
        set({ token, user });
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  },

  login: async (data) => {
    set({ isLoading: true, error: null });

    try {
      const response = await authService.login(data);
      const { access_token, user } = response.data;

      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, token: access_token, isLoading: false });
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, 'Error al iniciar sesion');
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });

    try {
      const response = await authService.register(data);
      const { access_token, user } = response.data;

      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, token: access_token, isLoading: false });
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, 'Error al registrarse');
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null });
  },

  clearError: () => set({ error: null }),
}));
