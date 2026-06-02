# CLAUDE.md - Adapta Class

Guia operativa para IAs/agentes que trabajen en este repositorio.
Ultima actualizacion contextual: 2 de junio de 2026, despues de la sesion
que rehizo el modelo de gamificacion (Mission/Achievement/Leaderboard) y
elimino el sistema de Assignment/StudentProgress/GameQuestion.

Si una IA futura ve documentacion vieja que contradiga esto, priorizar el
codigo actual y este archivo.

---

## Stack Real

- **Backend:** NestJS 11, Prisma 7 con `@prisma/adapter-pg`, Joi config, class-validator DTOs.
- **Frontend:** React 19, Vite, Tailwind 4 (estilo Neo-Brutalist), React Router, Zustand.
- **Juegos:** Phaser 4 sobre Canvas.
- **DB:** Postgres/Supabase. `prisma.config.ts` usa `DIRECT_URL` para Migrate (evita PgBouncer).
- **Auth:** JWT en cookie httpOnly + CSRF double-submit.
- **IA:** cliente compatible con OpenAI; provider/model configurables por env.
- **Redis:** opcional, usado para drafts/cache/throttling de IA cuando `REDIS_URL` existe.

Importante: el frontend actual **no es Next.js** y no usa Jinja.

---

## Estado Arquitectonico Actual

### Sesion y seguridad

- El JWT vive en cookie `access_token` httpOnly. El frontend nunca debe leerlo.
- La cookie `csrf_token` es readable y el frontend la refleja como `X-CSRF-Token`.
- `frontend/src/services/api.ts` inyecta CSRF automaticamente para requests mutantes.
- `backend/src/common/security/csrf.guard.ts` es guard global.
- Login/register saltan CSRF con `@SkipCsrf()` porque aun no existe sesion.
- `JwtAuthGuard` lee desde cookie, no desde `Authorization: Bearer`.
- El store de auth solo cachea `user` no sensible en localStorage (key `user`).
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
- La CSP del backend es para respuestas API. No asumir que cubre la UI.
- Modulos activos: `Auth`, `Paralelos`, `Games`, `Missions`, `GameSessions`,
  `Notifications`, `Ai`, `Questions`, `Achievements`.

### Frontend

- Las rutas de juegos estan lazy-loaded en `AppRouter`.
- `useGameSession` centraliza lifecycle de juegos, carga de preguntas, heartbeat y salida.
- `Material Symbols` depende de Google Fonts. No agregar CSP meta al `index.html` sin probar iconos.
- `frontend/src/main.tsx` protege Material Symbols contra traduccion automatica:
  - agrega `notranslate`
  - agrega `translate="no"`
  - guarda/restaura el ligature original
- Los textos visibles deben revisarse contra mojibake: buscar `Ã`, `Â`, `â`.
- Estilo visual: **Neo-Brutalist**. Bordes gruesos (`border-2`/`border-4 border-on-background`),
  sombras duras (`shadow-[Npx_Npx_0_0_#1d1c17]`), tokens de design (`bg-primary`,
  `bg-surface-container-lowest`, `bg-error-container`, etc.), tipografias
  `font-headline` (uppercase) y `font-mono`. **No reintroducir glass morphism,
  rounded-2xl, ni gradientes (`from-emerald-400 to-cyan-400`)** — todo eso vino
  del MissionForm/MissionsPanel original y fue reemplazado.
- `tsconfig.app.json` tiene `strict: true` + `noUnusedLocals: true`.

### Phaser

- Las escenas Phaser legacy no estan limpias para ESLint estricto.
- `frontend/eslint.config.js` excluye escenas/juego legacy y `GameConsoleWrapper`.
- No limpiar masivamente `@ts-nocheck` sin probar gameplay juego por juego.
- No tocar assets de `public/assets/games` salvo necesidad concreta.
- Cada escena que usa preguntas lee `game.registry.get('preguntasDelNivel')` y
  hace `|| []`. Las escenas con quiz (tom, snowmen, emoji-match, bank-panic,
  breakout, stacker, sliding-puzzle) tienen su **propio fallback inline** que
  se usa SOLO si el banco del docente esta vacio. Eliminarlo requeriria UX
  alternativa ("Pide a tu profesor que cargue preguntas") en cada juego.
- El archivo `frontend/src/features/questions/questions.ts` (banco hardcoded
  global) fue **eliminado**. Si alguien lo reintroduce, esta deshaciendo trabajo.
- `tom-game/scenes/Menu.ts` usa `localStorage` para `best_points` con key
  por-usuario: `tom_best_points_${user.id}`. **No volver a la key plana**
  porque mezcla highscores entre docente preview y estudiantes.

---

## Modelo de Gamificacion (Mission / Achievement / Leaderboard)

Esta es la pieza central que se rehizo. **No reintroducir Assignment,
StudentProgress ni GameQuestion** — fueron eliminados a proposito.

### Schema (Prisma)

- `Question` — banco **global por docente** (NO por juego ni por tema). El
  campo `tema` es un tag legacy con default `LECTURA`; la UI no lo pide.
- `QuestionSource` — documento PDF/DOCX/TXT subido al backend de IA. Agrupa
  las preguntas generadas en una corrida.
- `GameSession` — una sesion de juego del estudiante. Acumula `minutos_jugados`
  (Decimal(5,2)), `preguntas_correctas`, `preguntas_intentadas`.
- `QuestionAttempt` — una respuesta a una pregunta dentro de una sesion.
- `Mission` — reto de paralelo. Campos:
  - `tipo: MissionType` — `PLAY_TIME`, `PLAY_DISTINCT`, `ANSWER_CORRECT`.
  - `goal_value: Int` — meta numerica.
  - `descripcion: String?` — texto libre opcional (max 500 chars).
  - `xp_reward: Int @default(100)` — XP que se otorga al completar (10-1000).
  - `fecha_limite: DateTime`.
- `StudentMissionProgress` — progreso por (estudiante, mision). `current_value`
  es **`Decimal(7,2)`**, NO `Int` — para no truncar minutos fraccionarios de
  heartbeats. `completado` y `xp_otorgado` son flags idempotentes.
- `Notification` — referencia a `mission_id` (NO `assignment_id`).
- `Achievement` + `StudentAchievement` — sistema de logros. `AchievementCode`
  enum: `FIRST_PLAY`, `FIRST_MISSION`, `STREAK_7`, `PERFECT_GAME`, `MARATHON`,
  `ANSWER_50`. Cada uno tiene `xp_reward` propio.
- `Paralelo.activo: Boolean @default(true)` — el campo existe pero **la
  funcionalidad de archivado fue eliminada**. Ningun endpoint o UI lo
  consulta; `findAllForTeacher` devuelve todos los paralelos del docente.

### Flujo de cronometro (PLAY_TIME)

1. `useGameSession` arranca → POST `/game-sessions` y guarda `sessionIdRef`.
   `lastHeartbeatAtRef = Date.now()`.
2. Cada 30s o al salir: `sendHeartbeat()` calcula `(now - lastHeartbeatAtRef) / 60000`
   y postea `played_minutes` real. **No usar valor fijo `0.5`** — pierde sesiones
   cortas (<30s) y desincroniza si el tab queda en background.
3. `routeAwayFromGame()` es **async** y hace `await sendHeartbeat()` antes de
   navegar — eso flushea los segundos pendientes al salir.
4. Backend `GameSessionsService.processHeartbeat` incrementa `minutos_jugados`
   y llama `MissionsService.recalculateMissionsFor(studentId)`.
5. `recalculateMissionsFor` suma `gameSession.minutos_jugados` desde
   `mission.created_at`, compara con `goal_value`, marca `completado=true` y
   otorga `mission.xp_reward` XP **una sola vez** (gated por `xp_otorgado`).
6. Despues llama `AchievementsService.evaluateFor(studentId)` que re-evalua
   logros (cualquier completion puede desbloquear `FIRST_MISSION`, etc.).

### Flujo de respuestas (ANSWER_CORRECT)

1. Las escenas Phaser despachan `window.dispatchEvent(new CustomEvent('game:answer', { detail: { question_id, correct } }))`.
2. `useGameSession` escucha, postea `/game-sessions/:id/attempt`, marca
   `hadActivityRef.current = true`, dispara `mission:refresh`.
3. Backend incrementa `preguntas_intentadas` (y `preguntas_correctas` si
   `correcta=true`) en la sesion, crea `QuestionAttempt`, recalcula misiones.
4. `recalculateMissionsFor` cuenta `questionAttempt.correcta=true` desde
   `mission.created_at`.

### Resultado post-juego

- `useGameSession.routeAwayFromGame()` decide:
  - Docente (preview): vuelve a su dashboard.
  - Estudiante CON actividad (`hadActivityRef.current`): va a `/student/result?sessionId=...`.
  - Estudiante SIN actividad: va a `/student/games`. **No mandar al result
    page con stats en cero** — UX rota.
- `StudentResultPage` tambien tiene defensa: si la sesion cargada tiene 0 min
  y 0 intentos, redirige al catalogo via `<Navigate replace>`.

### Login y racha

- `auth.service.login()` compara fechas como **strings `YYYY-MM-DD` en UTC**:
  `now.toISOString().slice(0, 10)`. **No usar `setHours(0, 0, 0, 0)`** — esa
  funcion interpreta el Date en hora LOCAL y en TZ != UTC genera diffs falsos
  (sintoma: la racha sube cada login). Ecuador es UTC-5.
- Bono diario: `streakBonusXp = Math.min(10 + 5 * floor(racha / 7), 50)`.
- El backend devuelve `streak_bonus_xp` en la respuesta de login; el frontend
  lo guarda en `useAuthStore.streakBonusXp` y `StudentDashboardPage` muestra
  un banner naranja con `clearStreakBonus()` para descartarlo.

### Leaderboard / ranking

- `GET /paralelos/:id/ranking` ordena por `puntos_xp DESC, nombre ASC` (NO
  por racha). Devuelve `{ rank, user_id, nombre, puntos_xp, racha_dias }`.
- Estudiante solo puede ver el ranking de su propio paralelo. Docente solo el
  de los suyos.
- Componente `Leaderboard.tsx` consume `paralelosService.ranking(id)`. Pagina
  `StudentLeaderboardPage` lo monta. Ruta `/student/leaderboard`.

### MissionProgressOverlay

- `frontend/src/features/games/components/MissionProgressOverlay.tsx` se
  monta en `GameConsoleWrapper` y se muestra durante el juego.
- Solo para `STUDENT` con paralelo. Hace polling cada 20s + escucha
  `window.addEventListener('mission:refresh')` con debounce 1500ms.
- Muestra la mision mas cercana a completarse y celebra (4.5s) cualquier
  mision recien completada.

---

## Banco de Preguntas (global por docente)

Esto cambio significativamente. Decisiones para no deshacer:

- El banco es **global por docente**, NO por juego ni por tema. Cada estudiante
  ve las preguntas del docente de su paralelo en CUALQUIER juego.
- `GamesService.getQuestionsForUser` **NO filtra por `game.tema`**. Devuelve
  todas las del `teacher_id` resuelto.
- `GamesService.findAllForUser` devuelve `questionsCount` = total del banco
  del docente. Es el MISMO numero para todos los juegos.
- `QuestionGenerationForm` y `ManualQuestionForm` **no tienen combo de tema**.
  El backend acepta `tema` opcional en DTOs y aplica `DEFAULT_TEMA = LECTURA`
  via `ai.controller.ts` si falta — esto evita migrar el schema y mantiene
  backward-compat.
- `TeacherBankPage` no tiene filtro por tema. El header dice _"Las preguntas
  guardadas aqui se usan en todos los juegos"_.
- `StudentGameCatalogPage` muestra una **lista plana** (sin agrupacion por
  categoria) y cada card lleva un badge `N preguntas` arriba a la izquierda.

---

## Variables de Entorno

Backend:

- `DATABASE_URL` — pooled (PgBouncer en Supabase).
- `DIRECT_URL` — directa, requerida para `prisma migrate` en Supabase.
- `JWT_SECRET` con minimo 32 caracteres.
- `JWT_EXPIRES_IN`.
- `PORT`.
- `NODE_ENV`.
- `FRONTEND_URL` obligatorio en produccion.
- `AI_API_KEY` preferido.
- `OPENAI_API_KEY` alias legacy aceptado.
- `AI_API_URL`.
- `AI_MODEL`.
- `REDIS_URL` opcional.

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

- `backend/src/auth/auth.controller.ts` (devuelve `streak_bonus_xp` en login)
- `backend/src/auth/auth.service.ts` (racha comparada por UTC date strings)
- `backend/src/auth/guards/jwt-auth.guard.ts`
- `frontend/src/features/auth/store/authStore.ts` (state `streakBonusXp` + `clearStreakBonus`)
- `frontend/src/features/auth/services/auth.service.ts` (tipo `LoginResponse`)
- `frontend/src/services/api.ts`

### IA / Banco

- `backend/src/ai/ai.controller.ts` (`DEFAULT_TEMA = LECTURA` cuando frontend no envia)
- `backend/src/ai/ai.service.ts`
- `backend/src/ai/dto/generate-questions.dto.ts` (`tema` es `@IsOptional`)
- `backend/src/ai/ai-throttler.guard.ts`
- `backend/src/ai/redis-draft.service.ts`
- `backend/src/ai/redis-throttler.storage.ts`
- `backend/src/questions/*` (CRUD del banco; `listQuestions` no filtra por tema en uso real)
- `frontend/src/features/teacher/pages/TeacherQuestionGeneratorPage.tsx`
- `frontend/src/features/teacher/pages/TeacherBankPage.tsx` (tabs Sources / Questions)
- `frontend/src/features/teacher/components/QuestionGenerationForm.tsx` (sin combo tema)
- `frontend/src/features/teacher/components/ManualQuestionForm.tsx` (sin combo tema)
- `frontend/src/features/teacher/components/QuestionPreview.tsx` (`id?: string` opcional)
- `frontend/src/features/teacher/services/ai.service.ts`

### Paralelos / Misiones / Sesiones / Logros / Notificaciones

- `backend/src/paralelos/*` — CRUD, `join`, `leave`, `ranking`, `rotateCode`.
  **NO existe `archive()`**; `findAllForTeacher` devuelve todos sin filtrar
  por `activo`.
- `backend/src/missions/*` — DTO acepta `descripcion` y `xp_reward`. Service
  otorga `mission.xp_reward` (no 100 hardcoded). `recalculateMissionsFor`
  llama a `AchievementsService.evaluateFor` al final.
- `backend/src/game-sessions/*` — POST sesion, heartbeat (suma minutos
  Decimal), attempt (incrementa contadores y crea `QuestionAttempt`).
- `backend/src/achievements/*` — `evaluateFor(studentId)` idempotente.
  Endpoint `GET /achievements/my` para estudiante.
- `backend/src/notifications/*` — `notification.mission` (NO `assignment`).
- `frontend/src/features/paralelos/services/paralelos.service.ts` —
  **NO existe `archive()`**, `getAll()` sin params.
- `frontend/src/features/missions/components/MissionForm.tsx` — XP picker
  (10-1000), descripcion (textarea), recibe `paraleloNombre` y `paraleloGrado`
  para mostrar el destino en el header.
- `frontend/src/features/missions/components/MissionsPanel.tsx` (docente).
- `frontend/src/features/missions/services/missions.service.ts` (tipos con
  `descripcion`, `xp_reward`).
- `frontend/src/features/student/pages/StudentTasksPage.tsx` — muestra
  descripcion + badge `+N XP` real.
- `frontend/src/features/student/pages/StudentLeaderboardPage.tsx`.
- `frontend/src/features/student/components/Leaderboard.tsx`.
- `frontend/src/features/student/components/MyParaleloCard.tsx`.
- `frontend/src/features/student/components/JoinParaleloCard.tsx`.
- `frontend/src/features/notifications/components/NotificationsBell.tsx` —
  consume `notification.mission.tipo / goal_value` via helper `describeMission`.
- `frontend/src/features/achievements/services/achievements.service.ts`.
- `frontend/src/features/teacher/pages/TeacherClassroomPage.tsx` — sin
  toggle/badge/boton de archivado, pasa `paraleloNombre`+`paraleloGrado` al
  MissionForm.

### Juegos y Eventos Phaser

- `frontend/src/features/games/hooks/useGameSession.ts` — single owner del
  ciclo de vida: crea sesion, heartbeat con delta real, flush al salir,
  routing post-juego, `mission:refresh` events.
- `frontend/src/features/games/components/GameConsoleWrapper.tsx` — chrome
  del juego, gamepad virtual, monta `MissionProgressOverlay`.
- `frontend/src/features/games/components/MissionProgressOverlay.tsx` —
  overlay flotante in-game.
- `frontend/src/features/games/*GamePage.tsx` — solo aportan la config Phaser
  via `buildGame` callback.
- Las escenas en `frontend/src/features/games/**/scenes` despachan eventos:
  - `game:answer` (`{ question_id, correct }`) — answer
  - `game:quit` — usuario sale (salir desde scene)
  - `game:complete` — el juego termino solo

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
10. Mantener `npm.cmd run lint`, `tsc --noEmit` y `npm.cmd run build` del frontend verdes.
11. **No reintroducir** `Assignment`, `StudentProgress`, `GameQuestion`, ni la
    feature de archivado de paralelos. Si parecen faltar, el modelo nuevo
    (`Mission` + `GameSession` + `QuestionAttempt`) los reemplaza.
12. **No filtrar preguntas por `tema` en runtime** (el banco es global por
    docente). El campo en schema es solo legacy.
13. **Comparar fechas de calendario en UTC**: `date.toISOString().slice(0, 10)`.
    No usar `setHours(0,0,0,0)` (interpreta en TZ local; rompe en Ecuador UTC-5).
14. `Mission.xp_reward` es la fuente de verdad para la recompensa. **No
    hardcodear `100`** en notificaciones, calculos de XP o UIs.
15. `StudentMissionProgress.current_value` es `Decimal(7,2)`. En el backend,
    convertirlo a `Number()` antes de devolver al frontend (Prisma serializa
    Decimal como objeto raro). En el schema, no volver a `Int`.
16. `useGameSession.routeAwayFromGame()` es **async** y hace flush de
    heartbeat. No volverla sync ni quitar el `await sendHeartbeat()`.
17. `localStorage` per-juego (highscores, etc.) **siempre** debe usar key
    prefijada por `user.id`. La key plana mezcla docente preview con
    estudiantes en el mismo browser.
18. Estilo visual: si tocas un componente nuevo de paralelos/misiones,
    seguir Neo-Brutalist (bordes gruesos, sombras duras `[Npx_Npx_0_0_#1d1c17]`,
    tokens). Si ves glass morphism / gradientes en un componente, es deuda
    tecnica vieja, **no copiarla**.

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

Prisma (importante: `prisma migrate dev` es interactivo y falla en sandbox.
Para migraciones automaticas, crear el SQL a mano en
`backend/prisma/migrations/<timestamp>_<nombre>/migration.sql` y luego):

```bash
cd backend
npx.cmd prisma migrate deploy   # aplica migraciones pendientes (no interactivo)
npm.cmd install @prisma/client  # workaround: a veces hace falta antes de generate
npx.cmd prisma generate         # regenera el cliente
```

Busqueda rapida:

```bash
rg -n "localStorage.getItem\\('token'\\)|Authorization:|Bearer" frontend backend
rg -n "dangerouslySetInnerHTML|innerHTML|outerHTML|eval\\(" frontend/src backend/src
rg -n "Ã|Â|â" frontend/src backend/src
rg -n "Content-Security-Policy" frontend backend
rg -n "Assignment|StudentProgress|GameQuestion" frontend/src backend/src   # debe estar vacio
rg -n "setHours\\(0" backend/src                                            # debe estar vacio
```

Credenciales del seed (todas con password `Password123!`):

- Docentes: `maria@escuela.edu`, `carlos@escuela.edu`
- Estudiantes: `estudiante1@escuela.edu` a `estudiante10@escuela.edu`

---

## Pendientes Principales

- Chatbot backend/frontend.
- Tests e2e para login, join paralelo, misiones, jugar/heartbeat, completion.
- Refinar/limpiar escenas Phaser legacy (`@ts-nocheck`, fallbacks inline).
- Considerar eliminar fallbacks hardcoded en escenas Phaser una vez que cada
  docente tenga un banco poblado (hoy son red de seguridad).
- UX para misiones vencidas (hoy `recalculateMissionsFor` solo procesa
  `fecha_limite > now`; las vencidas quedan visibles pero no avanzan).

---

## Notas de Contexto Reciente

Sesion del 2 jun 2026 hizo el rework grande de gamificacion:

- Elimino `Assignment`, `StudentProgress`, `GameQuestion` del schema.
- Agrego `Mission`, `StudentMissionProgress`, `GameSession`, `QuestionAttempt`,
  `QuestionSource`, `Question`.
- Agrego sistema de `Achievement` + `StudentAchievement` (6 logros base seed).
- Agrego `Leaderboard` UI con endpoint backend ya existente.
- Agrego `MissionProgressOverlay` flotante in-game.
- Mision con `descripcion` y `xp_reward` configurable (10-1000).
- Banco global por docente (sin filtro por `tema`).
- Heartbeat real (delta) + flush async en salida.
- Racha TZ-safe (UTC date strings).
- Bono de XP por login diario consumido en frontend.
- Eliminado feature de archivado de paralelos (columna queda en schema).
- Eliminado `frontend/src/features/questions/questions.ts` (banco hardcoded global).
- Tom highscore por usuario (no compartido por browser).
- `StudentResultPage` redirige al catalogo si la sesion esta vacia.
- `MissionForm` muestra paralelo destino para evitar misasignaciones.

Migraciones aplicadas en esta sesion:

- `20260602000739_restart_learning_model` — rework completo del schema.
- `20260602182500_gamification_achievements_and_badges` — Achievement+StudentAchievement.
- `20260602190000_mission_progress_decimal` — `current_value` Int → Decimal(7,2).
- `20260602220000_mission_description_and_xp_reward` — `descripcion` + `xp_reward`.
