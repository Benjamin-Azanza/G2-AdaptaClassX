# Estado Actual del Proyecto - AdaptaClassX

**Actualizado:** 1 de junio de 2026  
**Rama revisada:** `main`  
**Ultimo commit revisado:** `f6fa1f0 corregido bugs + arch limpia`  
**Stack real:** NestJS 11 + Prisma 7 + React 19 + Vite + Tailwind 4 + Phaser 4 + Supabase/Postgres.

---

## Resumen Ejecutivo

AdaptaClassX está en una fase de madurez arquitectónica tras completar el rediseño completo de su modelo de aprendizaje. Se eliminó el acoplamiento rígido de preguntas y tareas a juegos individuales: ahora las preguntas residen en un banco global del docente, y las tareas se configuran como misiones pedagógicas basadas en objetivos (tiempo de juego, variedad, respuestas correctas). Las partidas del estudiante se gestionan bajo un ciclo de vida estructurado de sesiones de juego (con inicio, heartbeat y registro individual de intentos de respuesta) conectado a las escenas Phaser. El frontend implementa el consumo de misiones, un panel para docentes para controlar misiones e historial de PDFs, y una pantalla post-juego unificada (`StudentResultPage`) que detalla las estadísticas y calcula el XP ganado en tiempo real.

Quedan como pendientes principales el chatbot, la regeneración del código de paralelo y la limpieza profunda de escenas Phaser legacy.

---

## Cambios Relevantes del Ultimo Commit

### Backend

- Auth migro de Bearer/localStorage a cookies `access_token` httpOnly + `csrf_token` readable.
- `JwtAuthGuard` lee la sesion desde cookie, no desde `Authorization`.
- `CsrfGuard` global protege requests mutantes; login/register usan `@SkipCsrf()`.
- Se agrego filtro global `AllExceptionsFilter`.
- CORS ya no refleja origenes arbitrarios; en produccion exige `FRONTEND_URL`.
- Seguridad comun:
  - `backend/src/common/security/cookies.ts`
  - `backend/src/common/security/csrf.guard.ts`
  - `backend/src/common/security/safe-path.ts`
  - `backend/src/common/security/skip-csrf.decorator.ts`
- IA:
  - DTO `generate-questions.dto.ts`
  - `AiThrottlerGuard`
  - `RedisDraftService`
  - `RedisThrottlerStorage`
  - soporte opcional para `REDIS_URL`
  - cache/drafts de preguntas por 30 minutos cuando Redis existe
  - throttling de generacion por usuario autenticado
- Se eliminaron `AppController`/`AppService` de ejemplo.
- `progress.service.ts` y `games.service.ts` fueron ajustados para el flujo real de juegos/preguntas/progreso.

### Frontend

- Se elimino `frontend/public/dev-memory-backend.js`.
- Auth frontend usa cookie session + `/auth/me`; ya no guarda JWT en JS.
- Axios inyecta `X-CSRF-Token` desde cookie para requests mutantes.
- Juegos Phaser usan `useGameSession` para:
  - montar/desmontar `Phaser.Game`
  - cargar preguntas backend/fallback
  - emitir heartbeat de progreso
  - manejar salida con rutas por rol
- Rutas de juegos usan `React.lazy` + `Suspense`, bajando el bundle inicial.
- Se agregaron:
  - `AssignTaskForm`
  - `NotificationsBell`
  - `JoinParaleloCard`
  - feature compartida `paralelos`
- Dashboard estudiante usa XP/racha reales desde `AuthUser`.
- Catalogo/tareas/dashboard de estudiante tienen estados loading/error/empty mas claros.
- Material Symbols se protege contra traduccion automatica en `frontend/src/main.tsx` con `notranslate`, `translate="no"` y restauracion del ligature original.
- Se quito CSP meta del HTML porque rompia/arriesgaba la carga de Material Symbols; la CSP del API vive en headers backend.

---

## Estado por Modulo Backend

| Modulo | Estado | Notas |
|---|---|---|
| `auth` | Implementado | Login/register/logout/me con cookies httpOnly + CSRF. |
| `paralelos` | Implementado | Crear, listar, detalle, join, archivar (no destructivo). |
| `games` | Implementado | Catálogo y obtención de preguntas filtradas por el tema desde el banco global. |
| `questions` | Implementado | Banco de preguntas del docente y cargador/historial de fuentes PDF. |
| `missions` | Implementado | Definición de misiones y recálculo automático del progreso. |
| `game-sessions` | Implementado | Sesiones de juego, heartbeats de tiempo e intentos de respuesta. |
| `notifications` | Implementado | Notificación a estudiantes sobre nuevas misiones activas. |
| `ai` | Implementado avanzado | Upload PDF/DOCX/TXT, generación de preguntas por tema, Redis opcional. |
| `chatbot` | Faltante | No existe modulo backend ni UI. |

---

## Estado por Flujo Frontend

### Estudiante

| Pantalla/flujo | Estado | Notas |
|---|---|---|
| Landing | Implementado | Publica. |
| Login/Register | Implementado | Redireccion por rol; sesion por cookie. |
| Dashboard estudiante | Implementado | XP, racha, misiones activas rápidas, unión a paralelo. |
| Unirse a paralelo | Implementado | `JoinParaleloCard` llama `/paralelos/join` y rehidrata usuario. |
| Catálogo de juegos | Implementado | Agrupado por código semántico `categoryCode`. |
| Mis misiones | Implementado | Reemplaza tareas. Muestra progreso con barra visual y XP ganada. |
| Notificaciones | Implementado | Bell con polling cada 60s y marcar como leida. |
| Juegos | Implementado | 12 paginas Phaser con envío de eventos `game:answer`. |
| Post-juego unificado | Implementado | `StudentResultPage` muestra estadísticas de sesión y XP delta. |
| Perfil estudiante | Faltante | No hay pagina dedicada. |

### Docente

| Pantalla/flujo | Estado | Notas |
|---|---|---|
| Dashboard docente | Implementado | Juegos y métricas básicas. |
| Aula / paralelos | Implementado | Detalle del aula con lista de estudiantes, misiones activas y switch para archivados. |
| Asignar misiones | Implementado | Formulario para crear misiones de 3 tipos (tiempo, variedad, respuestas). |
| Generar preguntas IA | Implementado | Upload y generación de preguntas asociadas a un tema y guardadas en el banco global. |
| Preguntas manuales | Implementado | Formulario conectado para añadir preguntas directo al banco. |
| Progreso de misiones | Implementado | Visualización en tiempo real del progreso de cada alumno en las misiones activas. |
| Chatbot | Faltante | Sin backend/frontend. |

---

## Decisiones Arquitectonicas Vigentes

- Frontend es **React + Vite**, no Next.js.
- No hay Jinja en el frontend actual.
- Backend corre como NestJS, con export serverless para Vercel y ejecucion local en dev.
- Sesion:
  - JWT en cookie `access_token` httpOnly.
  - CSRF double-submit con cookie `csrf_token` + header `X-CSRF-Token`.
  - El frontend solo cachea `user` no sensible.
- IA:
  - Usa proveedor compatible con OpenAI via `AI_API_URL`.
  - Modelo por `AI_MODEL`.
  - `AI_API_KEY` preferido; `OPENAI_API_KEY` alias.
  - Redis es opcional pero recomendado para drafts/cache/throttling distribuido.
- Juegos:
  - Phaser 4.
  - Las escenas legacy estan excluidas del lint estricto por ahora.
  - `useGameSession` es el punto comun para lifecycle, preguntas, heartbeat y salida.
- Seguridad:
  - CSP de UI no debe ponerse como meta improvisado en `index.html` sin probar Material Symbols/fonts.
  - CSP minima del API esta en headers backend.

---

## Pendientes Priorizados

### Prioridad Alta

1. Chatbot completo.
   - Backend: módulo `chatbot`, endpoint autenticado.
   - Frontend: modal/componente accesible desde dashboards.

### Prioridad Media

2. Regenerar código de paralelo.
3. Limpiar mojibake restante en comentarios/copy no crítico.

### Prioridad Técnica

4. Tipar/refactorizar escenas Phaser legacy y retirar gradualmente exclusiones de ESLint.
5. Reducir chunk lazy de Phaser/useGameSession si la experiencia en red lenta lo exige.
6. Agregar tests e2e de login, join paralelo, misiones y juego con heartbeat/intentos.

---

## Verificacion Actual

Ultima verificacion conocida despues de los cambios de frontend:

- `npm.cmd run lint` en `frontend`: pasa.
- `npm.cmd run build` en `frontend`: pasa.
- Build mantiene advertencia de chunk grande lazy de Phaser/useGameSession, pero el bundle inicial ya no carga todos los juegos.

Pendiente recomendado:

- Ejecutar `npm.cmd run build` en `backend`.
- Ejecutar pruebas e2e si se dispone de base local/entorno.
- Probar manualmente traduccion automatica del navegador para confirmar que Material Symbols no se rompen.

---

## Notas para Futuras IAs

- Antes de tocar frontend, revisar `git status`; este repo puede tener cambios grandes sin commitear.
- No restaurar archivos legacy borrados (`dev-memory-backend.js`, `AppController`, `AppService`) salvo instruccion explicita.
- No volver a Bearer token/localStorage.
- No agregar CSP meta al HTML sin probar fuentes/iconos.
- No tocar escenas Phaser masivamente sin validar gameplay.
- Cuando se edite copy visible, revisar acentos y mojibake (`Ã`, `Â`, `â`).
