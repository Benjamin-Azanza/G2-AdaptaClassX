# Reporte de Estado del Proyecto — AdaptaClassX
**Generado:** 24 de Mayo 2026  
**Rama activa:** `feature/juegos`  
**Referencia:** `adapta-class-documento-tecnico.md` v1.0

---

## Resumen Ejecutivo

El proyecto se encuentra en un estado de **desarrollo avanzado**, con la arquitectura completa implementada y la mayoría de la funcionalidad core funcionando. El backend (NestJS + Prisma) está prácticamente terminado. El frontend tiene los flujos principales del estudiante y del docente operativos. Los bloqueadores más críticos para la demo son: la **ausencia del chatbot** (Semana 4, día 1), la **ausencia de pantalla Post-Juego**, la **ausencia de página Asignar Actividad** para el profesor, y el hecho de que **solo existe un juego implementado** (BombGame) de los 8 planeados en el catálogo.

---

## Índice
1. [Estado por Módulo del Backend](#1-estado-por-módulo-del-backend)
2. [Estado por Pantalla del Frontend](#2-estado-por-pantalla-del-frontend)
3. [Desvíos de la Especificación Técnica](#3-desvíos-de-la-especificación-técnica)
4. [Funcionalidades Faltantes Críticas](#4-funcionalidades-faltantes-críticas)
5. [Funcionalidades Faltantes Secundarias](#5-funcionalidades-faltantes-secundarias)
6. [Funcionalidades Implementadas Correctamente](#6-funcionalidades-implementadas-correctamente)
7. [Roadmap Restante Priorizado](#7-roadmap-restante-priorizado)

---

## 1. Estado por Módulo del Backend

### `auth` — Auth & JWT
| Endpoint | Estado | Notas |
|---|---|---|
| `POST /auth/register` | ✅ Implementado | Valida cédula → asigna rol TEACHER/STUDENT |
| `POST /auth/login` | ✅ Implementado | JWT 7 días, racha diaria gestionada |
| Guards JWT | ✅ Implementado | `JwtAuthGuard` activo |
| Guards de Rol | ✅ Implementado | `@Roles(TEACHER)` / `@Roles(STUDENT)` |
| Racha diaria | ✅ Implementado | Calculada en cada login |

### `paralelos` — Gestión de Aulas
| Endpoint | Estado | Notas |
|---|---|---|
| `POST /paralelos` | ✅ Implementado | Genera código 6 chars único |
| `POST /paralelos/join` | ✅ Implementado | Estudiante se une con código |
| `GET /paralelos` | ✅ Implementado | Lista todos los paralelos activos |
| `GET /paralelos/:id` | ✅ Implementado | Detalle con lista de estudiantes |
| `PATCH /paralelos/:id/archive` | ✅ Implementado | Archiva y desvincula estudiantes |
| `POST /paralelos/:id/regenerate-code` | ❌ **Faltante** | Doc §Regla 29: profesor puede regenerar código |

### `games` — Catálogo de Juegos
| Endpoint | Estado | Notas |
|---|---|---|
| `GET /games` | ✅ Implementado | Catálogo filtrado por grado |
| `GET /games/:id/questions` | ✅ Implementado | Fallback a preguntas default si no hay del paralelo |
| `POST /games/:id/questions` | ⚠️ Parcial | Implementado como `POST /ai/save-questions` — la ruta difiere del documento |

### `assignments` — Tareas Asignadas
| Endpoint | Estado | Notas |
|---|---|---|
| `POST /assignments` | ✅ Implementado | Crea tarea + progreso por estudiante + notificaciones |
| `GET /assignments/my` | ✅ Implementado | Tareas del estudiante (pendientes y completadas) |
| `GET /assignments/:id/progress` | ❌ **Faltante** | Vista de progreso por asignación para el profesor |

### `progress` — Progreso del Estudiante
| Endpoint | Estado | Notas |
|---|---|---|
| `POST /progress/heartbeat` | ✅ Implementado | Acumula minutos, otorga XP al completar |
| `PATCH /progress/:assignmentId/complete` | ✅ Implementado | Marca completado manualmente |
| XP al completar | ⚠️ Desvío | Código otorga **100 XP**; doc especifica **50 XP** |

### `notifications` — Notificaciones
| Endpoint | Estado | Notas |
|---|---|---|
| `GET /notifications/pending` | ✅ Implementado | Notificaciones no leídas del estudiante |
| `PATCH /notifications/:id/read` | ✅ Implementado | Marca leída con validación de propiedad |

### `ai` — Inteligencia Artificial
| Endpoint | Estado | Notas |
|---|---|---|
| `POST /ai/generate-questions` | ✅ Implementado | PDF/DOCX/TXT → OpenAI → JSON preguntas |
| `POST /ai/save-questions` | ✅ Implementado | Guarda en `game_questions` (upsert) |
| Rate limiting (5/hora/profe) | ❌ **Faltante** | `@nestjs/throttler` no configurado para IA — Doc §Regla 26 |
| Validación JSON de respuesta IA | ⚠️ Parcial | Hay recuperación de respuestas truncadas, pero validación de esquema no confirmada |

### `chatbot` — Chatbot IA
| Endpoint | Estado | Notas |
|---|---|---|
| `POST /chatbot` | ❌ **Faltante** | Módulo completo sin implementar — Semana 4 Día 1 |

### Base de Datos (Prisma)
| Elemento | Estado | Notas |
|---|---|---|
| Schema completo | ✅ Implementado | Todos los modelos del documento presentes |
| Migración inicial | ✅ Implementado | `20260510220527_init` |
| Migración RLS | ✅ Implementado | `20260513153000_enable_rls_public_tables` |
| Seed script | ⚠️ Pendiente confirmar | Archivo `seed.ts` referenciado pero contenido no verificado — crítico para la demo |

---

## 2. Estado por Pantalla del Frontend

### Flujo del Estudiante
| Pantalla | Estado | Notas |
|---|---|---|
| `Landing Page` | ✅ Implementada | Página pública con descripción |
| `Login` | ✅ Implementada | Formulario funcional, redirección por rol |
| `Register` | ✅ Implementada | Campo cédula opcional para docentes |
| `Student Dashboard` | ✅ Implementado | XP, racha, carrusel de juegos, badges |
| `Unirse a Paralelo` | ⚠️ Parcial | Existe en `TeacherClassroomPage` para el lado del docente; la pantalla de onboarding inicial del **estudiante** (cuando `paralelo_id = null`) no tiene flujo confirmado |
| `Mis Tareas` | ✅ Implementada | Pendientes/completadas, barra de progreso, link al juego |
| `Catálogo de Juegos` | ✅ Implementado | Filtra y agrupa por tema |
| `Pantalla de Juego` | ✅ Implementada | BombGame con Phaser 4 — canvas + heartbeat + overlay |
| `Post-Juego` | ❌ **Faltante** | No existe `PostGame.tsx` — crítico para mostrar XP ganado |
| `Mi Perfil` | ❌ **Faltante** | No existe página de perfil del estudiante |
| `Chatbot (modal)` | ❌ **Faltante** | Componente `Chatbot.tsx` sin implementar |
| Polling de notificaciones | ⚠️ Sin confirmar | El endpoint existe en backend; no verificado si el dashboard hace polling cada 30s |

### Flujo del Profesor
| Pantalla | Estado | Notas |
|---|---|---|
| `Teacher Dashboard` | ✅ Implementado | Lista juegos con IA, estadísticas básicas |
| `Gestionar Paralelo` | ✅ Implementada | Código de acceso visible, copiable, lista de estudiantes |
| `Asignar Actividad` | ❌ **Faltante** | No existe página `AssignActivity.tsx` — flujo del professor completo bloqueado |
| `Gestionar Preguntas` | ✅ Implementada | Tab IA (upload + generar + preview + guardar). Tab manual sin confirmar. |
| `Ver Progreso del Paralelo` | ❌ **Faltante** | No existe página `ParaleloProgress.tsx`, tampoco el endpoint backend |
| `Chatbot (modal)` | ❌ **Faltante** | Mismo que estudiante — sin implementar |

---

## 3. Desvíos de la Especificación Técnica

Estos puntos están **implementados pero difieren** del documento técnico. Son funcionales pero requieren decisión consciente de mantener o alinear.

| Ítem | Especificación (Documento) | Implementación Real | Impacto |
|---|---|---|---|
| **Phaser** | v3 | v4.1.0 | Bajo — v4 es más reciente; API compatible en lo esencial |
| **React** | v18 | v19.2.5 | Bajo — compatible |
| **Zustand** | v4 | v5.0.13 | Bajo — API casi idéntica |
| **NestJS** | v10 | v11.0.1 | Bajo — compatible |
| **Tailwind CSS** | v3 | v4.3.0 | Medio — config diferente (`tailwind.config.js` vs CSS-first en v4) |
| **XP por asignación** | 50 puntos | 100 puntos | Medio — afecta balance de gamificación |
| **Modelo de IA** | `gpt-4o-mini` (OpenAI) | `GLM-4.5-air` (configurable por env `AI_MODEL`) | Medio — requiere `AI_MODEL` y endpoint correcto en producción |
| **Ruta guardar preguntas** | `POST /games/:id/questions` | `POST /ai/save-questions` | Medio — el frontend debe apuntar a la ruta correcta |
| **Docker Compose** | En raíz del monorepo para Postgres local | No confirmado en raíz — backend usa Railway/Supabase | Bajo para demo; alto para desarrollo local nuevo |
| **Catálogo de juegos** | 8 juegos (5 BASE + 3 CAMBIANTE) | 1 juego (BombGame, tipo CAMBIANTE) | **Alto** — el catálogo está vacío en la BD sin seed |

---

## 4. Funcionalidades Faltantes Críticas

Estas son las funcionalidades cuya ausencia **bloquea el flujo de la demo** o una semana completa del roadmap.

### 4.1 Chatbot (Semana 4 — Día 1)
**Estado:** ❌ Completamente ausente  
**Afecta:** Ambos flujos (estudiante y profesor)  
**Pendiente:**
- Backend: módulo `chatbot` con `POST /chatbot` — prompt del sistema con rol del JWT y lista de juegos
- Frontend: componente `Chatbot.tsx` (modal flotante accesible desde todos los dashboards)

### 4.2 Pantalla Post-Juego (Semana 2 — Día 5)
**Estado:** ❌ Sin implementar  
**Afecta:** Flujo completo estudiante  
**Pendiente:**
- Frontend: página `PostGame.tsx` — puntuación, progreso de asignación, animación XP, botones "Jugar de nuevo" / "Volver al inicio"
- El evento `game:completed` existe en BombGame pero no hay pantalla que lo consuma para mostrar resultados

### 4.3 Página Asignar Actividad para Profesor (Semana 3 — Día 1-2)
**Estado:** ❌ Sin implementar  
**Afecta:** Flujo completo del profesor — sin esta pantalla el profesor no puede asignar tareas desde la UI  
**Pendiente:**
- Frontend: página `AssignActivity.tsx` con los 5 pasos del documento (paralelo → tema → juego → tiempo → fecha → asignar)
- El endpoint `POST /assignments` ya existe en el backend

### 4.4 Pantalla Ver Progreso del Paralelo (Semana 3 — Día 5)
**Estado:** ❌ Sin implementar (frontend + backend)  
**Afecta:** Capacidad del profesor de ver avance de estudiantes  
**Pendiente:**
- Backend: `GET /assignments/:id/progress` — retorna progreso de todos los estudiantes para una asignación
- Frontend: página `ParaleloProgress.tsx` — tabla por asignación con filtros

### 4.5 Seed Script funcional (Semana 1 — crítico para demo)
**Estado:** ⚠️ Referenciado pero sin verificar contenido  
**Afecta:** Demo — sin seed la BD está vacía (sin juegos, sin profesores de prueba, sin estudiantes)  
**Pendiente:**
- Verificar y completar `backend/prisma/seed.ts` con: 2 profesores, 10 estudiantes, 2 paralelos, 8 juegos del catálogo, `game_content` por grado, `game_questions` por defecto, 3 asignaciones

### 4.6 Contenido de Juegos BASE
**Estado:** ❌ Sin implementar  
**Afecta:** 5 de los 8 juegos planeados (todos los BASE)  
**Pendiente:**
- Implementar 5 juegos tipo BASE (uno por tema: Lectura, Escritura, Lengua y Cultura, Literatura, Comunicación Oral)
- Cargar `game_content` por grado (3, 4, 5) para cada uno
- O como mínimo: definir en el seed los registros de juegos BASE y sus preguntas por defecto como placeholder

---

## 5. Funcionalidades Faltantes Secundarias

Estas funcionalidades están en el documento pero no bloquean la demo mínima.

| Funcionalidad | Documento | Estado | Prioridad |
|---|---|---|---|
| Regenerar código de paralelo | §Regla 29, Pantalla 13 | ❌ Faltante (botón + endpoint) | Media |
| Rate limiting IA (5/hora/profe) | §Regla 26 | ❌ `@nestjs/throttler` no configurado | Media |
| Tab "Manual" en gestor preguntas | Pantalla 15 | ⚠️ Parcial (formulario referenciado, sin confirmar flujo completo) | Media |
| Polling notificaciones en dashboard | Sección 0 | ⚠️ Sin confirmar en frontend | Media |
| Pantalla "Mi Perfil" del estudiante | Pantalla 10 | ❌ Faltante | Media |
| Onboarding "Unirse a paralelo" | Pantalla 5 | ⚠️ Flujo inicial del estudiante sin paralelo no mapeado | Alta |
| Animación XP en Post-Juego | Semana 4 Día 2 | ❌ No aplica hasta tener PostGame | Baja |
| Carrusel diagonal estilo phaser.io | Semana 4 Día 2 | ⚠️ Existe carrusel básico, sin estilo diagonal | Baja |
| Mensajes de error amigables | Semana 4 Día 2 | ⚠️ Parcial — errores básicos implementados | Baja |
| Loading states en todas las APIs | Semana 4 Día 2 | ⚠️ Parcial — algunos views con loading | Baja |
| Confirmación al salir del juego | Semana 4 Día 2 | ⚠️ BombGame tiene menú de pausa pero sin confirm de salida con datos perdidos | Baja |
| Validación JSON estricta de IA | §Regla 27 | ⚠️ Parcial — hay recuperación pero sin validación de esquema completa | Media |

---

## 6. Funcionalidades Implementadas Correctamente

Todo lo siguiente está en el código y alineado con el documento técnico.

### Backend
- ✅ Monorepo con `package.json` raíz y workspaces
- ✅ `@nestjs/config` + Joi para variables de entorno validadas
- ✅ Prisma ORM — schema completo con todos los modelos y enums del documento
- ✅ Migraciones automáticas
- ✅ Registro con validación de cédula → asignación de rol
- ✅ Login con JWT + racha diaria (lógica correcta: ayer +1, >1 día reset a 1, hoy sin cambio)
- ✅ Guards de autenticación y rol en todos los endpoints
- ✅ Código de paralelo: 6 caracteres, único, sin caracteres confusos
- ✅ Archivar paralelo (desvincula estudiantes → `paralelo_id = null`)
- ✅ Fallback de preguntas: busca por `game_id + paralelo_id`, si no existe devuelve las default (`paralelo_id = null`)
- ✅ Heartbeat acumula minutos → auto-completado cuando `minutos_jugados >= minutos_requeridos`
- ✅ `xp_otorgado` como flag anti-duplicación de XP
- ✅ Notificaciones automáticas al crear asignación (una por estudiante del paralelo)
- ✅ Extracción de texto: PDF (`pdf-parse`), DOCX (`mammoth`), TXT
- ✅ Upsert de preguntas IA (no acumula, reemplaza)

### Frontend
- ✅ Axios con interceptor que inyecta Bearer token y gestiona 401 (auto-logout)
- ✅ `authStore` Zustand con persistencia en localStorage
- ✅ `ProtectedRoute` con validación de rol y redirección
- ✅ Redireccionamiento post-login al dashboard correcto por rol
- ✅ BombGame completo con Phaser 4:
  - Plataformas, salto, recolección de estrellas
  - Sistema de vidas (corazones)
  - Preguntas con modal (4 opciones)
  - Feedback correcto/incorrecto
  - Enemigos patrullantes
  - Kit de primeros auxilios (bonus)
  - Menú de pausa (ESC)
  - Controles teclado + táctiles
  - Heartbeat cada 30 segundos
- ✅ Vista de tareas del estudiante (pendientes/completadas, barra de progreso)
- ✅ Panel del profesor: dashboard, classroom, generador de preguntas IA
- ✅ Upload de archivo → extracción → generación → preview → guardado
- ✅ Catálogo de juegos con filtros

---

## 7. Roadmap Restante Priorizado

Ordenado por impacto en la demo. Estima ~1.5 semanas de trabajo restante.

### Prioridad 1 — Bloqueantes de la Demo (hacer primero)

```
[ ] 1. Seed script completo
      → backend/prisma/seed.ts con 8 juegos, 2 profesores, 10 estudiantes, 2 paralelos, asignaciones
      → Tiempo estimado: 3-4h

[ ] 2. Pantalla Asignar Actividad (TeacherAssignActivityPage)
      → 5 pasos: paralelo → tema → juego → minutos → fecha → POST /assignments
      → Tiempo estimado: 4-6h

[ ] 3. Pantalla Post-Juego (PostGamePage)
      → Escucha game:completed, muestra score/progreso/XP, botones navegar
      → Tiempo estimado: 3-4h

[ ] 4. Onboarding "Unirse a Paralelo" para estudiante
      → Modal/página que aparece si student.paralelo_id === null
      → Llama a POST /paralelos/join
      → Tiempo estimado: 2-3h
```

### Prioridad 2 — Flujo del Profesor Completo

```
[ ] 5. GET /assignments/:id/progress (backend)
      → Endpoint que devuelve progreso de todos los estudiantes para una asignación
      → Tiempo estimado: 2h

[ ] 6. Pantalla Ver Progreso del Paralelo (TeacherParaleloProgressPage)
      → Tabla por asignación: nombre, minutos jugados, completado, XP
      → Tiempo estimado: 3-4h

[ ] 7. Polling de notificaciones en Student Dashboard
      → setInterval cada 30s llamando GET /notifications/pending
      → Mostrar badge/toast al recibir nueva
      → Tiempo estimado: 2h
```

### Prioridad 3 — Chatbot (Semana 4)

```
[ ] 8. Backend: módulo chatbot
      → POST /chatbot — extrae rol del JWT, ajusta prompt de sistema, llama a OpenAI
      → Tiempo estimado: 3-4h

[ ] 9. Frontend: componente Chatbot.tsx
      → Modal flotante accesible desde ambos dashboards
      → Historial de mensajes, scroll, estilo chat
      → Tiempo estimado: 4-6h
```

### Prioridad 4 — Completitud y Pulido

```
[ ] 10. Pantalla Mi Perfil del estudiante
       → XP total, racha, historial últimas 3 asignaciones completadas
       → Tiempo estimado: 2-3h

[ ] 11. Regenerar código de paralelo
       → Botón en Gestionar Paralelo + PATCH /paralelos/:id/regenerate-code
       → Tiempo estimado: 2h

[ ] 12. Rate limiting IA
       → @nestjs/throttler en POST /ai/generate-questions (5/hora por usuario)
       → Tiempo estimado: 1h

[ ] 13. Corrección XP: 100 → 50 puntos (alinear con documento)
       → 1 línea en progress.service.ts
       → Tiempo estimado: 15min

[ ] 14. Tab Manual en gestor de preguntas
       → Formulario para agregar/editar preguntas hasta 20 (contador visible)
       → Tiempo estimado: 3-4h
```

### Prioridad 5 — Despliegue y Demo Final

```
[ ] 15. Verificar variables de entorno en Railway (AI_MODEL, OPENAI_API_KEY, DATABASE_URL)
[ ] 16. Ejecutar seed en producción
[ ] 17. Ensayo completo del flujo demo (7 pasos del documento Semana 4 Día 5)
```

---

## Anexo — Verificaciones Rápidas Pendientes

Estos puntos requieren una revisión manual de 5 minutos cada uno para confirmar estado real:

1. **¿Existe `docker-compose.yml` en la raíz del monorepo?** (el documento lo requiere para desarrollo local)
2. **¿El `seed.ts` tiene contenido útil o está vacío?**
3. **¿El Student Dashboard tiene el `setInterval` de polling de notificaciones?**
4. **¿La tab "Manual" de QuestionGenerationForm está conectada a un endpoint de guardado?**
5. **¿El modelo de IA configurado en producción es el correcto?** (el código usa `AI_MODEL` env, el doc dice `gpt-4o-mini`)
6. **¿El `.env.example` del backend lista `AI_MODEL`?**

---

*Documento generado automáticamente comparando `adapta-class-documento-tecnico.md` con el estado del código en `feature/juegos`.*
