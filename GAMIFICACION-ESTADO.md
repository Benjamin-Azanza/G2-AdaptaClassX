# Estado de Gamificación — Adapta Class
**Generado:** 1 de junio de 2026  
**Última actualización:** 1 de junio de 2026 (implementados los pasos 1, 2 y 3 del roadmap)  
**Commits analizados:** `4463d05` (primera etapa gamificacion) y `f6fa1f0` (corregido bugs + arch limpia)

---

## Resumen Ejecutivo

El commit `4463d05` fue la primera gran implementación de gamificación. Antes de él, el sistema solo tenía un módulo `progress` básico (tiempo + heartbeat). Ese módulo fue eliminado y reemplazado por una arquitectura más completa basada en **misiones**, **sesiones de juego**, **XP** y **notificaciones**. El sistema está parcialmente implementado: el backend tiene más features completadas que el frontend las consume.

> **Actualización (1 jun 2026):** se cerraron tres gaps de alta prioridad:
> 1. **Leaderboard visible para alumnos** — ya implementado (página + componente que consume el ranking del backend).
> 2. **Feedback in-game de misiones** — overlay flotante en todos los juegos.
> 3. **Notificación de misión completada** — el backend crea una notificación al completar.
>
> El detalle de cada uno está en las secciones 3.5, 3.6 y 4, y en "Próximos Pasos".

---

## 1. Arquitectura Actual de Gamificación

### Cómo fluye el progreso hoy

```
Estudiante juega
    │
    ├─► POST /game-sessions           (crea sesión)
    │
    ├─► POST /game-sessions/:id/heartbeat  (cada 30 seg → suma 0.5 min)
    │       └─► recalculateMissionsFor()   ← recalcula misiones en tiempo real
    │
    ├─► POST /game-sessions/:id/attempt   (cada respuesta correcta/incorrecta)
    │       └─► recalculateMissionsFor()   ← ídem
    │
    └─► al salir → navega a /student/result
              └─► re-hidrata auth (XP actualizado)
```

```
Profesor crea misión
    │
    ├─► POST /missions                    (define tipo, meta, fecha límite)
    │       ├─► crea StudentMissionProgress por cada estudiante del paralelo
    │       └─► crea Notification por cada estudiante
    │
    └─► GET /missions/:id/progress        (tabla con progreso por alumno)
```

---

## 2. Modelos de Base de Datos Relevantes

| Modelo | Campos clave | Propósito |
|---|---|---|
| `Student` | `puntos_xp`, `racha_dias`, `last_login_date`, `paralelo_id` | Perfil gamificado del alumno |
| `Mission` | `tipo`, `goal_value`, `fecha_limite`, `paralelo_id`, `created_by` | Tarea asignada por el docente |
| `StudentMissionProgress` | `current_value`, `completado`, `xp_otorgado`, `completed_at` | Progreso individual por misión |
| `GameSession` | `minutos_jugados`, `preguntas_correctas`, `preguntas_intentadas` | Registro de cada partida |
| `QuestionAttempt` | `question_id`, `correcta`, `game_session_id` | Registro de cada respuesta |
| `Notification` | `student_id`, `mission_id`, `mensaje`, `leida` | Avisos en el bell del header |

### Tipos de misión soportados (enum `MissionType`)
- `PLAY_TIME` → meta en minutos jugados totales (suma de `minutos_jugados` en GameSessions)
- `PLAY_DISTINCT` → meta en cantidad de juegos distintos jugados (count de `game_id` únicos)
- `ANSWER_CORRECT` → meta en respuestas correctas totales (count de `QuestionAttempts` donde `correcta = true`)

---

## 3. Estado por Feature

### 3.1 Misiones — IMPLEMENTADO ✅

**Backend:**
- `POST /missions` — Docente crea misión para un paralelo. Se autogeneran registros de progreso y notificaciones para cada alumno.
- `GET /missions` — Lista misiones del docente (filtrable por `paralelo_id`).
- `GET /missions/my` — Alumno ve sus misiones pendientes y completadas.
- `GET /missions/:id/progress` — Docente ve tabla detallada: nombre alumno, progreso actual, estado, fecha de completado.
- `DELETE /missions/:id` — Eliminar misión.
- `recalculateMissionsFor(studentId)` — Se ejecuta en cada heartbeat y cada intento de respuesta; recalcula `current_value` consultando GameSessions/QuestionAttempts y otorga XP (100 pts) si se supera la meta. El flag `xp_otorgado` previene doble otorgamiento.

**Frontend:**
- Panel de misiones en `TeacherClassroomPage` con barra de completado (X/Y alumnos).
- Modal de progreso por alumno con tabla detallada.
- Formulario de creación (`MissionForm`) con tipo, meta y fecha límite.
- Vista de alumno en `StudentTasksPage`: tarjetas de misiones pendientes con barra de progreso y misiones completadas con XP obtenido.

**Limitaciones:**
- No existe editar misión (solo borrar y recrear).
- No hay misiones en masa ni duplicación.
- No hay recordatorios automáticos cuando se acerca el vencimiento.

---

### 3.2 Sesiones de Juego — IMPLEMENTADO ✅

**Backend:**
- `POST /game-sessions` — Inicia sesión (solo alumnos).
- `POST /game-sessions/:id/heartbeat` — Suma 0.5 minutos cada llamada (30 seg entre llamadas).
- `POST /game-sessions/:id/attempt` — Registra intento de respuesta con `correcta: boolean`.
- Ambas rutas disparan `recalculateMissionsFor()`.

**Frontend (`useGameSession.ts`):**
- Se integra en todos los GamePage vía hook.
- Crea sesión al montar, inicia heartbeat, escucha evento `game:answer` de Phaser.
- Al terminar navega a `/student/result?sessionId=X`.

**Limitaciones:**
- No hay endpoint de cierre explícito; la sesión queda "abierta" hasta el próximo heartbeat.
- No hay lógica de pausa/resume.
- No hay feedback visual en juego de cuántas misiones se avanzaron.

---

### 3.3 XP y Niveles — IMPLEMENTADO PARCIALMENTE ⚠️

**Qué hace:**
- `Student.puntos_xp` se incrementa en 100 por cada misión completada (lógica en `recalculateMissionsFor()`).
- El XP se retorna en la respuesta de auth (`GET /auth/me`) y queda en el store de Zustand.
- El frontend calcula el nivel: 1000 XP = 1 nivel. Títulos: "Aprendiz" → "Explorador" → "Lector avanzado" → "Maestro de Lengua".
- `StudentResultPage` muestra el XP ganado en esa partida (delta antes/después de re-hidratar auth).

**Qué NO hace:**
- No hay XP por login diario ni por racha.
- No hay XP variable por dificultad, velocidad o precisión.
- No hay historial de XP (cuándo se ganó, por qué misión).
- No hay animación de celebración in-game al subir XP.
- No hay leaderboard de XP visible para los alumnos (el endpoint existe, la UI no).

---

### 3.4 Sistema de Racha — IMPLEMENTADO PARCIALMENTE ⚠️

**Qué hace:**
- Al hacer login, `auth.service.ts` calcula la racha:
  - `last_login_date` fue ayer → `racha_dias += 1`
  - `last_login_date` fue hace más de 1 día → `racha_dias = 1` (reset)
  - Primer login → `racha_dias = 1`
- El valor se guarda en `Student.racha_dias` y se retorna en auth.
- El dashboard del alumno muestra un ícono de fuego 🔥 con el número de días.

**Qué NO hace:**
- No otorga XP por mantener la racha (ni hitos como 7 días, 30 días).
- No existe ningún aviso de "tu racha se rompe mañana si no entras".
- No hay "streak freeze" ni ítems de protección.
- No existe leaderboard de rachas.
- La racha no tiene recompensas tangibles dentro del juego.
- No hay celebración visual por hitos (7 días, 30 días, etc.).

---

### 3.5 Notificaciones — IMPLEMENTADO BÁSICO ⚠️

**Qué hace:**
- Al crear una misión, se genera una `Notification` por cada alumno del paralelo con el mensaje de la meta.
- **(NUEVO 1 jun 2026)** Al **completar** una misión, `recalculateMissionsFor()` crea una `Notification` confirmándolo: *"¡Misión completada! Ganaste 100 XP por lograr [meta]."* Se dispara exactamente una vez por misión (gateada por el flag `xp_otorgado`, igual que el otorgamiento de XP).
- `NotificationsBell` en el header del alumno hace polling cada 60 segundos a `GET /notifications/pending`.
- El badge muestra el count (capeado en "9+").
- El dropdown muestra el mensaje, el juego asociado y botones para navegar a tareas o marcar leída.
- También refresca al cambiar de tab (`visibilitychange`).

**Qué NO hace:**
- Quedan tipos de notificación sin implementar:
  - XP ganado fuera de misiones (login, racha)
  - Racha en riesgo
  - Fecha límite próxima
  - Logros desbloqueados
- No hay notificaciones push del navegador.
- No hay notificaciones al docente (p. ej. "3 alumnos completaron la misión").
- Si el docente asigna 5 misiones a la vez, el alumno ve 5 notificaciones separadas sin agrupar.

---

### 3.6 Leaderboard / Ranking — IMPLEMENTADO ✅ (1 jun 2026)

**Backend (`GET /paralelos/:id/ranking`):**
- Retorna lista de alumnos del paralelo ordenados por XP descendente.
- Incluye: `rank`, `nombre`, `puntos_xp`, `racha_dias`.
- Permisos: docente solo puede ver su paralelo; alumno solo puede ver su propio paralelo.

**Frontend (NUEVO):**
- Componente `Leaderboard` (`features/student/components/Leaderboard.tsx`) que consume `paralelosService.ranking()` y renderiza rank, nombre, XP y racha. Incluye:
  - Medallas de color para el top 3 (oro/plata/bronce).
  - Resaltado de la fila del alumno autenticado (etiqueta "Tú").
  - Estados de carga, error (con reintentar) y vacío.
- Página `StudentLeaderboardPage` (ruta `/student/leaderboard`), con CTA para unirse a un paralelo si el alumno aún no tiene uno.
- Acceso desde el ítem "Ranking" en la navegación (sidebar + bottom-nav móvil) y un botón "Clasificación" en el dashboard.

---

### 3.7 Panel de Métricas del Docente — IMPLEMENTADO BÁSICO ⚠️

**Qué puede ver hoy un docente:**

| Dato | Disponible | Dónde |
|---|---|---|
| Lista de alumnos del paralelo | ✅ | `ParaleloDetailPanel` |
| XP individual de cada alumno | ✅ | `ParaleloDetailPanel` |
| Racha de cada alumno | ✅ | `ParaleloDetailPanel` |
| Misiones activas del paralelo | ✅ | `MissionsPanel` |
| % de alumnos que completaron cada misión | ✅ | `MissionsPanel` (barra de progreso) |
| Tabla alumno-por-alumno por misión | ✅ | Modal en `MissionsPanel` |
| Progreso actual de cada alumno (X / meta) | ✅ | Modal en `MissionsPanel` |
| Fecha en que completó cada alumno | ✅ | Modal en `MissionsPanel` |
| Ranking de alumnos por XP | ❌ | No existe pantalla |
| Estadísticas de juego (tiempo promedio, etc.) | ❌ | No existe |
| Evolución del XP a lo largo del tiempo | ❌ | No existe |
| Qué juegos juegan más los alumnos | ❌ | No existe |
| Alumnos sin actividad reciente | ❌ | No existe |

**Respuesta directa:** Sí, el docente **puede ver si los alumnos completaron su tarea** (misión), con detalle por alumno, progreso actual y fecha de completado. Lo que le falta es una vista agregada/analítica más rica.

---

### 3.8 Logros / Badges — STUB EN FRONTEND, NADA EN BACKEND ❌

**Frontend (`StudentDashboardPage`):**
```tsx
const BADGES = [
  { icon: 'lock', bg: 'bg-surface-variant', label: '???' },
  // ... 6 badges más bloqueados
];
```
Se renderiza una sección "Sala de Trofeos" con candados y "Próximamente". Solo es visual, sin funcionalidad.

**Backend:** No existe ningún modelo `Badge` o `Achievement` en el schema de Prisma.

---

### 3.9 Pantalla de Resultado Post-Juego — IMPLEMENTADO ✅

- `StudentResultPage` muestra: minutos jugados, preguntas correctas/intentadas, XP ganado (delta).
- Muestra "¡Misión Completada!" si se ganó XP en esa sesión.
- Re-hidrata auth al montar para obtener XP actualizado del servidor.
- **Limitación:** No indica qué misión se completó ni qué misiones avanzan con esa sesión.

---

### 3.10 Feedback In-Game de Misiones — IMPLEMENTADO ✅ (1 jun 2026)

**Qué hace:**
- Componente `MissionProgressOverlay` (`features/games/components/MissionProgressOverlay.tsx`) renderizado dentro de `GameConsoleWrapper`, por lo que aplica a **todos los juegos** sin tocar cada página.
- Muestra un widget flotante (no interactivo, `pointer-events-none`) con la misión más cercana a completarse: ícono por tipo, etiqueta, barra de progreso y `actual/meta`. Indica "+N misiones más" si hay varias pendientes.
- **Celebración** cuando una misión se completa durante el juego ("¡Misión completada! +100 XP").
- Se refresca vía el evento `mission:refresh` (disparado por `useGameSession` tras cada intento y heartbeat exitoso) con debounce, más un polling de respaldo cada 20 s. La fuente es `GET /missions/my`, que recalcula el progreso en el backend.
- Solo se muestra para estudiantes con paralelo; no-op silencioso para docentes (preview).

**Qué NO hace:**
- No permite elegir qué misión avanzar (sigue avanzando todas en paralelo).

---

## 4. Gamificación del Estudiante — Resumen Completo

Lo que un alumno experimenta hoy:

| Feature | Estado | Descripción |
|---|---|---|
| Ver misiones asignadas | ✅ | Lista con barra de progreso y fecha límite |
| Ver XP y nivel | ✅ | Dashboard + página de resultado |
| Ver racha de días | ✅ | Dashboard con ícono de fuego |
| Recibir notificación de nueva misión | ✅ | Bell en header |
| Ver XP ganado al terminar una partida | ✅ | Página de resultado |
| Unirse a un paralelo con código | ✅ | `JoinParaleloCard` en dashboard |
| Ganar XP por completar misión | ✅ | 100 XP fijos por misión |
| Racha aumenta al entrar cada día | ✅ | Se calcula en login |
| Ver leaderboard del paralelo | ✅ | Página `/student/leaderboard` + componente `Leaderboard` |
| Ver progreso de misión mientras juega | ✅ | Overlay flotante en todos los juegos |
| Recibir notificación de misión completada | ✅ | Notificación creada al completar; aparece en el bell |
| Celebración in-game al completar misión | ✅ | Flash en el overlay durante el juego |
| Ganar XP por racha | ❌ | No implementado |
| Desbloquear logros/badges | ❌ | Solo stub visual |
| Recibir alerta de racha en riesgo | ❌ | No implementado |
| Ver historial de XP | ❌ | No implementado |
| Elegir qué misión avanzar en una partida | ❌ | Avanza todas en paralelo |

---

## 5. Gaps Críticos por Prioridad

### ✅ Resueltos (1 jun 2026)

- ~~**Leaderboard visible para alumnos**~~ — Implementado: página `/student/leaderboard` + componente `Leaderboard` que consume `paralelosService.ranking()`.
- ~~**Feedback in-game de misiones**~~ — Implementado: `MissionProgressOverlay` en todos los juegos.
- ~~**Notificación de misión completada**~~ — Implementado: `recalculateMissionsFor()` crea la notificación al completar.

### Prioridad ALTA (afectan la experiencia núcleo)

1. **XP por racha** — La racha existe pero no tiene incentivo tangible. Un bono de +10 XP por login, escalado por días consecutivos, cierra el loop de recompensa.

### Prioridad MEDIA (mejoran la retención)

2. **Logros/Badges** — Requiere modelo en backend y condiciones de desbloqueo. Sugerencia de condiciones mínimas:
   - "Primera misión" (primera misión completada)
   - "Racha 7 días" (7 días consecutivos)
   - "Perfecto" (primera sesión con 100% de respuestas correctas)
   - "Maratonista" (primera sesión de 20+ minutos)

3. **Warning de racha en riesgo** — Si el alumno no ha entrado hoy y su racha es > 3 días, mostrar un banner en el dashboard: "⚠️ ¡Tu racha de X días está en riesgo!"

4. **Selector de misión activa en juego** — Antes de entrar a un juego, permitir al alumno seleccionar qué misión quiere avanzar con esa sesión (o hacerlo automático). Actualmente se avanza en todas al mismo tiempo, pero no es visible.

5. **Panel de analytics para docentes** — Agregar a `ParaleloDetailPanel` una sección con:
   - Promedio de XP del paralelo
   - Número de alumnos activos últimos 7 días
   - Juego más jugado
   - Misión con menor tasa de completado

### Prioridad BAJA (pulido final)

6. **Historial de XP** — Tabla o gráfica mostrando cuándo y por qué se ganó XP.
7. **Agrupación de notificaciones** — Si hay 5 misiones nuevas, mostrar una sola notificación agrupada.
8. **Hitos de racha con celebración** — Al llegar a 7, 14, 30 días: animación o badge especial.
9. **XP variable** — En lugar de 100 XP fijos, ajustar por dificultad: ANSWER_CORRECT con meta alta → más XP.

---

## 6. Próximos Pasos Recomendados

### ✅ Completados (1 jun 2026)

- **Leaderboard del Paralelo** — Componente `Leaderboard` + página `StudentLeaderboardPage` (`/student/leaderboard`), consumiendo `paralelosService.ranking()`. Resalta al alumno autenticado y marca el top 3 con medallas. Accesible desde la navegación y un botón en el dashboard.
- **Notificación de Misión Completada** — `recalculateMissionsFor()` crea una `Notification` al completar (gateada por `xp_otorgado`, una sola vez). El bell la muestra en el siguiente polling.
- **Feedback In-Game de Progreso de Misión** — `MissionProgressOverlay` dentro de `GameConsoleWrapper`; refresco vía evento `mission:refresh` (disparado por `useGameSession` tras intentos/heartbeats) + polling de respaldo.

---

### Paso siguiente recomendado — Bono de XP por Racha (MEDIO impacto, BAJO esfuerzo)
En `auth.service.ts`, en el bloque donde se incrementa `racha_dias`:
- Sumar XP al alumno en función de la racha: +10 XP base, +5 XP adicional por cada 7 días (capeado en +50 XP).
- Guardar este dato para mostrarlo en la respuesta de login.

**Estimado:** 1 hora de backend + 30 min de frontend (mostrar bono en login).

---

### Después — Sistema de Logros/Badges (MEDIO impacto, ALTO esfuerzo)
Requiere:
1. **Backend:** Agregar modelo `Achievement` y `StudentAchievement` al schema de Prisma. Crear migración. Agregar lógica de evaluación en `recalculateMissionsFor()` y en `auth.service.ts` (para los de login/racha).
2. **Backend:** `GET /achievements/my` para que el alumno vea sus logros.
3. **Frontend:** Reemplazar el stub de "Sala de Trofeos" con datos reales.

**Estimado:** 1-2 días completos.

> **Nota:** El leaderboard también podría reutilizarse en el panel del docente (`ParaleloDetailPanel`) mostrando la misma tabla ordenada por XP — pendiente, bajo esfuerzo ya que el componente y el endpoint existen.

---

### Paso 6 — Warning de Racha en Riesgo (MEDIO impacto, BAJO esfuerzo)
En `StudentDashboardPage`, si `racha_dias > 2` y el alumno no ha logueado hoy (comparar `last_login_date` con fecha actual):
- Mostrar banner de alerta amarillo.
- **Problema:** El front no recibe `last_login_date` actualmente. Habría que agregarlo al response de `GET /auth/me`.

**Estimado:** 2 horas (1h backend, 1h frontend).

---

### Paso 7 — Analytics del Docente (BAJO impacto inmediato, ALTO valor pedagógico)
Agregar endpoint `GET /paralelos/:id/stats` que retorne:
- `xp_promedio`, `alumnos_activos_7d`, `juego_mas_jugado`, `mision_mas_dificil`.
- Mostrar en un panel colapsable en `TeacherClassroomPage`.

**Estimado:** 3-4 horas (backend + frontend).

---

## 7. Deuda Técnica Relacionada

- **Recálculo O(n) en cada heartbeat:** `recalculateMissionsFor()` re-consulta todas las GameSessions y QuestionAttempts del alumno cada 30 segundos. Con muchos alumnos jugando simultáneamente esto puede escalar mal. Solución a futuro: mantener `current_value` como contador incremental en lugar de recalcularlo desde cero.
- **Notificaciones por polling:** El sistema usa polling de 60 segundos. Para el prototipo es aceptable. A largo plazo, WebSockets con el Gateway de NestJS daría experiencia en tiempo real.
- **XP hardcodeado:** El valor de 100 XP por misión está hardcodeado en `missions.service.ts`. Debería ser configurable por misión o por tipo.
- **Nivel calculado solo en frontend:** La lógica de nivel (1000 XP = 1 nivel) vive solo en `student.service.ts` del frontend. El backend no conoce el nivel del alumno, lo que dificulta futuras validaciones server-side.
