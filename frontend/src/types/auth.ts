export type UserRole = 'STUDENT' | 'TEACHER';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  nombre: string;
}
