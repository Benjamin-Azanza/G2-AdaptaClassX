export type UserRole = 'STUDENT' | 'TEACHER';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  nombre: string;
  /** null if student has not joined a paralelo yet */
  paralelo_id: string | null;
}
