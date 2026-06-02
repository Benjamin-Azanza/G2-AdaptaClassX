# CLAUDE.md - Adapta Class

Guia operativa para IAs/agentes que trabajen en este repositorio.  
Ultima actualizacion contextual: 1 de junio de 2026, despues del commit
`f6fa1f0 corregido bugs + arch limpia`.

---

## Stack Real

- **Backend:** NestJS 11, Prisma 7, Joi config, class-validator DTOs.
- **Frontend:** React 19, Vite, Tailwind 4, React Router, Zustand.
- **Juegos:** Phaser 4 sobre Canvas.
- **DB:** Postgres/Supabase.
- **Auth:** JWT en cookie httpOnly + CSRF double-submit.
- **IA:** cliente compatible con OpenAI; provider/model configurables por env.
- **Redis:** opcional, usado para drafts/cache/throttling de IA cuando `REDIS_URL` existe.

Importante: el frontend actual **no es Next.js** y no usa Jinja.

---

## Estado Arquitectonico Actual

### Sesion y seguridad

- El JWT vive en cookie `access_token` httpOnly. El frontend nunca debe leerlo.
- La cookie `csrf_token` es readable y el frontend la refleja como `X-CSRF-Token`.
- `frontend/src/services/api.ts` ya inyecta CSRF automaticamente para requests mutantes.
- `backend/src/common/security/csrf.guard.ts` es guard global.
- Login/register saltan CSRF con `@SkipCsrf()` porque aun no existe sesion.
- `JwtAuthGuard` lee desde cookie, no desde `Authorization: Bearer`.
- El store de auth solo cachea `user` no sensible en localStorage.
- `GET /auth/me` rehidrata sesion al refrescar.
- `POST /auth/logout` borra cookies.

No reintroducir:

- `localStorage.getItem('token')`
- headers `Authorization: Bearer` para la sesion principal
- mocks de auth en `frontend/public`

### Backend

- `AppController` y `AppService` de ejemplo fueron eliminados.
- `AllExceptionsFilter` es filtro global.
- `ValidationPipe` global usa whitelist, forbidNonWhitelisted y transform.
- CORS usa allowlist; en produccion `FRONTEND_URL` es obligatorio.
- Headers de seguridad se setean en `backend/src/main.ts`.
- La CSP actual del backend es para respuestas API. No asumir que cubre la UI.

### Frontend

- Las rutas de juegos estan lazy-loaded en `AppRouter`.
- `useGameSession` centraliza lifecycle de juegos, carga de preguntas, heartbeat y salida.
- `Material Symbols` depende de Google Fonts. No agregar CSP meta al `index.html` sin probar iconos.
- `frontend/src/main.tsx` protege Material Symbols contra traduccion automatica:
  - agrega `notranslate`
  - agrega `translate="no"`
  - guarda/restaura el ligature original
- Los textos visibles deben revisarse contra mojibake: buscar `Ã`, `Â`, `â`.

### Phaser

- Las escenas Phaser legacy no estan limpias para ESLint estricto.
- `frontend/eslint.config.js` excluye escenas/juego legacy y `GameConsoleWrapper`.
- No limpiar masivamente `@ts-nocheck` sin probar gameplay juego por juego.
- No tocar assets de `public/assets/games` salvo necesidad concreta.

---

## Variables de Entorno

Backend:

- `DATABASE_URL`
- `DIRECT_URL` para migraciones/Supabase cuando aplique
- `JWT_SECRET` con minimo 32 caracteres
- `JWT_EXPIRES_IN`
- `PORT`
- `NODE_ENV`
- `FRONTEND_URL` obligatorio en produccion
- `AI_API_KEY` preferido
- `OPENAI_API_KEY` alias legacy aceptado
- `AI_API_URL`
- `AI_MODEL`
- `REDIS_URL` opcional

Frontend:

- `VITE_API_URL` opcional. Default recomendado: `/api`.

Toda env nueva debe pasar por `ConfigModule`/Joi si es backend.

---

## Modulos y Archivos Clave

### Seguridad comun

- `backend/src/common/security/cookies.ts`
- `backend/src/common/security/csrf.guard.ts`
- `backend/src/common/security/safe-path.ts`
- `backend/src/common/security/skip-csrf.decorator.ts`
- `backend/src/common/filters/all-exceptions.filter.ts`

### Auth

- `backend/src/auth/auth.controller.ts`
- `backend/src/auth/auth.service.ts`
- `backend/src/auth/guards/jwt-auth.guard.ts`
- `frontend/src/features/auth/store/authStore.ts`
- `frontend/src/services/api.ts`

### IA

- `backend/src/ai/ai.controller.ts`
- `backend/src/ai/ai.service.ts`
- `backend/src/ai/dto/generate-questions.dto.ts`
- `backend/src/ai/ai-throttler.guard.ts`
- `backend/src/ai/redis-draft.service.ts`
- `backend/src/ai/redis-throttler.storage.ts`
- `frontend/src/features/teacher/pages/TeacherQuestionGeneratorPage.tsx`
- `frontend/src/features/teacher/services/ai.service.ts`

### Aulas/misiones/sesiones/preguntas

- `backend/src/paralelos/*` (Creación, gestión y archivado no destructivo de paralelos)
- `backend/src/missions/*` (Definición de misiones y recálculo automático de progreso)
- `backend/src/game-sessions/*` (Registro de sesiones de juego, heartbeats e intentos de respuesta)
- `backend/src/questions/*` (Banco global de preguntas y fuentes de origen del docente)
- `backend/src/notifications/*` (Notificaciones dirigidas al estudiante por nuevas misiones)
- `frontend/src/features/paralelos/*`
- `frontend/src/features/missions/*` (Panel de misiones del docente y visualización para el estudiante)
- `frontend/src/features/student/components/JoinParaleloCard.tsx`
- `frontend/src/features/notifications/components/NotificationsBell.tsx`

### Juegos y Eventos Phaser

- `frontend/src/features/games/hooks/useGameSession.ts` (Centraliza ciclo de vida, llamadas POST /game-sessions e intentos)
- `frontend/src/features/games/components/GameConsoleWrapper.tsx`
- `frontend/src/features/games/*GamePage.tsx`
- Las escenas de juego en `frontend/src/features/games/**/scenes` despachan el evento `game:answer` al contestar preguntas:
  - Estructura del evento: `window.dispatchEvent(new CustomEvent('game:answer', { detail: { question_id, correct } }))`
  - `useGameSession.ts` escucha este evento para registrar el intento (`POST /game-sessions/:sessionId/attempt`) y disparar el recálculo de progreso de misiones en backend.

---

## Reglas Obligatorias al Editar

1. Revisar `git status` antes de tocar archivos. El repo suele estar en worktree activo.
2. No revertir cambios del usuario sin instruccion explicita.
3. No reintroducir mocks publicos ni credenciales.
4. No cambiar auth/CSRF sin probar login, refresh y logout.
5. No agregar CSP en `frontend/index.html` sin validar Material Symbols y Google Fonts.
6. No comparar categorias por texto traducido. Usar codigos semanticos (`LECTURA`, etc.).
7. Formularios con requests deben tener loading/error/empty/success visibles cuando aplique.
8. Si se toca IA, validar DTOs, limites de archivo y throttling.
9. Si se toca gameplay, probar el juego especifico en desktop y mobile si tiene gamepad.
10. Mantener `npm.cmd run lint` y `npm.cmd run build` del frontend verdes.

---

## Comandos Utiles

Frontend:

```bash
cd frontend
npm.cmd run lint
npm.cmd run build
npm.cmd run dev
```

Backend:

```bash
cd backend
npm.cmd run build
npm.cmd run start:dev
```

Busqueda rapida:

```bash
rg -n "localStorage.getItem\\('token'\\)|Authorization:|Bearer" frontend backend
rg -n "dangerouslySetInnerHTML|innerHTML|outerHTML|eval\\(" frontend/src backend/src
rg -n "Ã|Â|â" frontend/src backend/src
rg -n "Content-Security-Policy" frontend backend
```

---

## Pendientes Principales

- Chatbot backend/frontend.
- Regenerar codigo de paralelo.
- Refinar/limpiar escenas Phaser legacy.
- Tests e2e para login, join paralelo, misiones, jugar/heartbeat.

---

## Notas de Contexto del Ultimo Commit

`f6fa1f0 corregido bugs + arch limpia` hizo una limpieza grande:

- elimino mock frontend `dev-memory-backend.js`
- elimino controllers/services Nest de ejemplo
- agrego cookies + CSRF
- agrego Redis opcional para IA
- agrego throttling por usuario para IA
- agrego asignaciones/notificaciones en frontend
- agrego `useGameSession`
- lazy-load de juegos
- proteccion contra traduccion automatica de iconos Material Symbols

Si una IA futura ve documentacion vieja que contradiga esto, priorizar el codigo actual y este archivo.
