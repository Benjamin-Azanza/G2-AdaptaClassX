import { AxiosError, AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import type { AuthUser, UserRole } from '../types/auth';
import type { TeacherGame } from '../features/games/types/game.types';
import type { Paralelo } from '../features/teacher/types/paralelo.types';

interface MemoryUser extends AuthUser {
  password: string;
}

interface RegisterPayload {
  nombre: string;
  email: string;
  password: string;
  cedula?: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

interface CreateParaleloPayload {
  nombre: string;
  grado: number;
}

interface JoinParaleloPayload {
  codigo_acceso: string;
}

const users: MemoryUser[] = [
  {
    id: 'dev-teacher-1',
    nombre: 'Prof. Elena Martinez',
    email: 'teacher@adaptaclass.test',
    password: 'teacher123',
    role: 'TEACHER',
  },
  {
    id: 'dev-student-1',
    nombre: 'Mateo Rivera',
    email: 'student@adaptaclass.test',
    password: 'student123',
    role: 'STUDENT',
  },
];

const paralelos: Paralelo[] = [
  {
    id: 'paralelo-3a',
    nombre: '3ro A',
    grado: 3,
    codigo_acceso: 'KX7T2M',
    activo: true,
    created_at: new Date().toISOString(),
    _count: { students: 18 },
  },
  {
    id: 'paralelo-4b',
    nombre: '4to B',
    grado: 4,
    codigo_acceso: 'QZ9R4P',
    activo: true,
    created_at: new Date().toISOString(),
    _count: { students: 24 },
  },
];

const games: TeacherGame[] = [
  {
    id: 'bomb-game',
    title: 'Quiz Rapido - Lectura',
    description: 'Actividad Phaser local con preguntas de comprension lectora.',
    category: 'Lengua y Literatura',
    route: '/teacher/questions',
    status: 'published',
    questionsCount: 0,
  },
];

function parseBody<TPayload>(data: unknown): TPayload {
  if (typeof data === 'string' && data.length > 0) {
    return JSON.parse(data) as TPayload;
  }

  return (data ?? {}) as TPayload;
}

function stripPassword(user: MemoryUser): AuthUser {
  return {
    id: user.id,
    nombre: user.nombre,
    email: user.email,
    role: user.role,
  };
}

function makeToken(user: AuthUser) {
  return `dev-token.${user.role.toLowerCase()}.${user.id}`;
}

function getPath(config: InternalAxiosRequestConfig) {
  const url = config.url ?? '';
  const baseURL = config.baseURL ?? 'http://localhost:3000/api';
  const fullUrl = new URL(url, baseURL);

  return fullUrl.pathname.replace(/^\/api/, '');
}

function makeResponse<TData>(
  config: InternalAxiosRequestConfig,
  data: TData,
  status = 200,
): AxiosResponse<TData> {
  return {
    data,
    status,
    statusText: status >= 400 ? 'Error' : 'OK',
    headers: {},
    config,
  };
}

function makeError(
  config: InternalAxiosRequestConfig,
  status: number,
  message: string,
) {
  const response = makeResponse(config, { message }, status);
  return new AxiosError(message, String(status), config, undefined, response);
}

function requireAuth(config: InternalAxiosRequestConfig) {
  const authorization = AxiosHeaders.from(config.headers).get('Authorization');

  if (!authorization) {
    throw makeError(config, 401, 'Sesion no valida');
  }
}

function generateAccessCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function inferRole(payload: RegisterPayload): UserRole {
  return payload.cedula ? 'TEACHER' : 'STUDENT';
}

export async function handleDevMemoryRequest(
  config: InternalAxiosRequestConfig,
): Promise<AxiosResponse | null> {
  const path = getPath(config);
  const method = config.method?.toUpperCase() ?? 'GET';

  if (method === 'POST' && path === '/auth/login') {
    const payload = parseBody<LoginPayload>(config.data);
    const user = users.find(
      (item) => item.email === payload.email && item.password === payload.password,
    );

    if (!user) {
      throw makeError(config, 401, 'Credenciales invalidas');
    }

    const safeUser = stripPassword(user);
    return makeResponse(config, {
      access_token: makeToken(safeUser),
      user: safeUser,
    });
  }

  if (method === 'POST' && path === '/auth/register') {
    const payload = parseBody<RegisterPayload>(config.data);
    const existing = users.find((item) => item.email === payload.email);

    if (existing) {
      throw makeError(config, 409, 'El correo ya esta registrado');
    }

    const user: MemoryUser = {
      id: `dev-user-${users.length + 1}`,
      nombre: payload.nombre,
      email: payload.email,
      password: payload.password,
      role: inferRole(payload),
    };

    users.push(user);
    const safeUser = stripPassword(user);

    return makeResponse(config, {
      access_token: makeToken(safeUser),
      user: safeUser,
    }, 201);
  }

  if (method === 'GET' && path === '/games') {
    requireAuth(config);
    return makeResponse(config, games);
  }

  if (method === 'GET' && path === '/paralelos') {
    requireAuth(config);
    return makeResponse(config, paralelos);
  }

  if (method === 'POST' && path === '/paralelos') {
    requireAuth(config);
    const payload = parseBody<CreateParaleloPayload>(config.data);
    const paralelo: Paralelo = {
      id: `paralelo-${paralelos.length + 1}`,
      nombre: payload.nombre,
      grado: Number(payload.grado),
      codigo_acceso: generateAccessCode(),
      activo: true,
      created_at: new Date().toISOString(),
      _count: { students: 0 },
    };

    paralelos.push(paralelo);
    return makeResponse(config, paralelo, 201);
  }

  if (method === 'POST' && path === '/paralelos/join') {
    requireAuth(config);
    const payload = parseBody<JoinParaleloPayload>(config.data);
    const paralelo = paralelos.find((item) => item.codigo_acceso === payload.codigo_acceso);

    if (!paralelo) {
      throw makeError(config, 404, 'Codigo de paralelo no encontrado');
    }

    return makeResponse(config, { paralelo });
  }

  return null;
}
