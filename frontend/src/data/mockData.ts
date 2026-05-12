// ============================================================
// ARCHIVO TEMPORAL - DATOS QUEMADOS PARA DESARROLLO FRONTEND
// Cuando el backend esté listo:
//   1. Cambiar USE_MOCK a false en auth.service.ts
//   2. Borrar este archivo
// ============================================================

import type { AuthResponse } from '../services/auth.service';

// ── Usuarios disponibles para probar ────────────────────────
//
//  ESTUDIANTE:
//    email: estudiante@test.com
//    password: cualquiera
//
//  PROFESOR:
//    email: profesor@test.com
//    password: cualquiera
//
// ────────────────────────────────────────────────────────────

export const MOCK_USERS: Record<string, AuthResponse> = {
  'estudiante@test.com': {
    access_token: 'mock-token-student-abc123',
    user: {
      id: 'mock-student-001',
      email: 'estudiante@test.com',
      role: 'STUDENT',
      nombre: 'Mateo García',
    },
  },
  'profesor@test.com': {
    access_token: 'mock-token-teacher-xyz789',
    user: {
      id: 'mock-teacher-001',
      email: 'profesor@test.com',
      role: 'TEACHER',
      nombre: 'Prof. Carlos Mendoza',
    },
  },
};

// Simula el delay de red para que se vea realista (ms)
export const MOCK_DELAY = 800;
