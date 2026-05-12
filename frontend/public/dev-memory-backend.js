(function () {
  const users = [
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

  const paralelos = [
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

  const games = [
    {
      id: 'bomb-game',
      title: 'Quiz Rapido - Lectura',
      description: 'Actividad Phaser local con preguntas de comprension lectora.',
      category: 'Lectura',
      tipo: 'CAMBIANTE',
      route: '/games/bomb-game',
      status: 'published',
      questionsCount: 0,
      imageUrl: '/games/bomb-game/thumbnail.png',
    },
    {
      id: 'lectura-base',
      title: 'Aventura de Lectura',
      description: 'Explora textos y mejora tu comprension lectora.',
      category: 'Lectura',
      tipo: 'BASE',
      route: '#',
      status: 'published',
      questionsCount: 0,
    },
    {
      id: 'escritura-base',
      title: 'Taller de Escritores',
      description: 'Practica ortografia y redaccion en misiones creativas.',
      category: 'Escritura',
      tipo: 'BASE',
      route: '#',
      status: 'published',
      questionsCount: 0,
    },
    {
      id: 'literatura-base',
      title: 'Cuentos Magicos',
      description: 'Descubre el mundo de la literatura con cuentos y poesias.',
      category: 'Literatura',
      tipo: 'BASE',
      route: '#',
      status: 'published',
      questionsCount: 0,
    },
  ];

  function parseBody(data) {
    if (typeof data === 'string' && data.length > 0) {
      return JSON.parse(data);
    }

    return data || {};
  }

  function stripPassword(user) {
    return {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      role: user.role,
    };
  }

  function makeToken(user) {
    return `dev-token.${user.role.toLowerCase()}.${user.id}`;
  }

  function getPath(config) {
    const fullUrl = new URL(config.url || '', config.baseURL || 'http://localhost:3000/api');
    return fullUrl.pathname.replace(/^\/api/, '');
  }

  function makeResponse(config, data, status) {
    return {
      data,
      status: status || 200,
      statusText: status >= 400 ? 'Error' : 'OK',
      headers: {},
      config,
    };
  }

  function makeError(config, status, message) {
    const error = new Error(message);
    error.isAxiosError = true;
    error.response = makeResponse(config, { message }, status);
    error.config = config;
    throw error;
  }

  function requireAuth(config) {
    const headers = config.headers || {};
    const authorization = headers.Authorization || headers.authorization;

    if (!authorization) {
      makeError(config, 401, 'Sesion no valida');
    }
  }

  function generateAccessCode() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  window.__ADAPTACLASS_DEV_MEMORY_BACKEND__ = {
    async handleDevMemoryRequest(config) {
      const path = getPath(config);
      const method = (config.method || 'GET').toUpperCase();

      if (method === 'POST' && path === '/auth/login') {
        const payload = parseBody(config.data);
        const user = users.find(
          (item) => item.email === payload.email && item.password === payload.password,
        );

        if (!user) {
          makeError(config, 401, 'Credenciales invalidas');
        }

        const safeUser = stripPassword(user);
        return makeResponse(config, {
          access_token: makeToken(safeUser),
          user: safeUser,
        });
      }

      if (method === 'POST' && path === '/auth/register') {
        const payload = parseBody(config.data);
        const existing = users.find((item) => item.email === payload.email);

        if (existing) {
          makeError(config, 409, 'El correo ya esta registrado');
        }

        const user = {
          id: `dev-user-${users.length + 1}`,
          nombre: payload.nombre,
          email: payload.email,
          password: payload.password,
          role: payload.cedula ? 'TEACHER' : 'STUDENT',
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
        const payload = parseBody(config.data);
        const paralelo = {
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
        const payload = parseBody(config.data);
        const paralelo = paralelos.find((item) => item.codigo_acceso === payload.codigo_acceso);

        if (!paralelo) {
          makeError(config, 404, 'Codigo de paralelo no encontrado');
        }

        return makeResponse(config, { paralelo });
      }

      return null;
    },
  };
})();
