# Adapta Class — Documento de Diseño Técnico
**Versión:** 1.0 | **Fecha:** Mayo 2026 | **Estado:** Referencia definitiva para desarrollo

---

## SECCIÓN 0 — Respuestas a preguntas abiertas

Antes de los documentos formales, aquí están las respuestas a cada pregunta del documento de revisión.

---

### ¿Dónde se almacenan las preguntas generadas por IA? ¿Hay que guardar el PDF?

**No se guarda el PDF.** El flujo es completamente en memoria:
1. El profesor sube el PDF → NestJS lo recibe con Multer (en RAM, no en disco)
2. `pdf-parse` extrae el texto del PDF → el texto es un string
3. Ese string se manda a la API de IA junto con el prompt
4. La IA devuelve un JSON de preguntas
5. Ese JSON se guarda en la tabla `game_questions` de PostgreSQL

El PDF nunca toca el disco ni ningún bucket. No necesitas S3 ni Cloudflare R2 para este proyecto.

---

### ¿Qué tecnología usar para las notificaciones?

Para el prototipo: **polling simple**. El dashboard del estudiante llama a `GET /notifications/pending` cada 30 segundos. Si hay notificación nueva, la muestra. Cero complejidad extra.

Para escalar después: Socket.io con el Gateway de NestJS. No lo implementes en el prototipo.

**Flujo completo de asignación:**
1. Profesor llena el form de "Asignar actividad" → hace POST /assignments
2. El backend crea un registro en `assignments` y uno en `notifications` por cada estudiante del paralelo
3. El student dashboard hace polling → detecta la notificación → la muestra → la marca como leída

Todo vive en la base de datos. No se necesita nada extra para el prototipo.

---

### ¿Cómo funcionan las variables de entorno con @nestjs/config?

Creas un archivo `.env` en la raíz del backend con esto:

```
DATABASE_URL="postgresql://user:pass@localhost:5432/adapta_class"
JWT_SECRET="una-clave-secreta-larga"
OPENAI_API_KEY="sk-..."
PORT=3000
```

En el código, `@nestjs/config` lee ese archivo al arrancar. Con Joi agregas validación: si `OPENAI_API_KEY` no existe, el servidor no arranca y lanza un error claro. Nunca hay claves hardcodeadas en el código. El archivo `.env` va en `.gitignore` para no subirlo a GitHub.

---

### ¿Cómo funciona Docker y dónde va?

El archivo `docker-compose.yml` va en la raíz del monorepo (al mismo nivel que `/frontend` y `/backend`). Para el desarrollo solo necesitas Postgres en Docker. El archivo es este:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: adapta
      POSTGRES_PASSWORD: adapta123
      POSTGRES_DB: adapta_class
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
volumes:
  postgres_data:
```

Con un solo comando `docker-compose up -d` cualquier persona que abra el proyecto tiene Postgres corriendo. Luego en el `.env` del backend pones `DATABASE_URL="postgresql://adapta:adapta123@localhost:5432/adapta_class"` y listo.

---

### ¿Prisma maneja todo dentro del mismo código?

Sí, exactamente. El flujo es:

1. Defines los modelos en `backend/prisma/schema.prisma`
2. Ejecutas `npx prisma migrate dev --name init` → Prisma crea las tablas en Postgres automáticamente
3. Cada vez que cambias el schema, corres otra migración
4. Para consultar datos usas el Prisma Client que se genera automáticamente

Nunca abres pgAdmin ni escribes SQL manual. Todo se maneja desde el código.

---

### ¿El backend de NestJS vive dentro del mismo proyecto de React?

**No.** Son dos proyectos separados dentro de un monorepo. La estructura correcta es:

```
adapta-class/          ← carpeta raíz (monorepo)
├── frontend/          ← tu proyecto React actual (muévelo aquí)
├── backend/           ← proyecto NestJS nuevo
└── docker-compose.yml
```

Tu proyecto de React actual simplemente lo mueves a una carpeta `/frontend`. El backend es un proyecto NestJS independiente en `/backend`. Cada uno tiene su propio `package.json`.

---

### ¿Qué es el "contrato" Phaser ↔ React? ¿Cuál es la mejor opción?

Un **contrato** en este contexto es simplemente un documento que define qué mensajes se mandan entre Phaser y React, con qué nombres y qué datos. Como un API, pero entre dos partes del mismo frontend.

**Custom DOM Events** es la mejor opción para este proyecto. Funciona así:

- Phaser dispara un evento nativo del navegador: `window.dispatchEvent(new CustomEvent('game:completed', { detail: { minutosJugados: 15, score: 800 } }))`
- React escucha ese evento: `window.addEventListener('game:completed', (e) => { /* suma XP, muestra resultados */ })`

Es simple, sin dependencias extra, y no acopla Phaser con Zustand. La alternativa de Zustand sería pasarle al juego de Phaser una referencia al store, lo cual crea una dependencia innecesaria.

El contrato completo está en la Sección 3 de este documento.

---

### ¿La arquitectura actual del proyecto de React es correcta?

Sí, la estructura que tienes para el frontend es correcta. Solo hay que agregar dos carpetas:

```
src/
├── store/      ← stores de Zustand (auth, notifications, game)
└── services/   ← funciones de llamada a la API (axios)
```

Y el proyecto completo debe vivir dentro de `/frontend` en el monorepo.

---

### ¿Para qué sirve `email_verified`?

Sirve para confirmar que el email que puso el usuario es real (enviando un correo de verificación). Para el prototipo **puedes omitirlo** y dejarlo siempre en `true`. No es necesario implementar el flujo de verificación por email en un mes.

---

### ¿Para qué sirve `config_default` en la tabla games?

Es un JSON guardado en la base de datos que contiene la configuración por defecto de ese juego. Por ejemplo, para un juego de tipo quiz sería:

```json
{
  "tiempoLimitePregunta": 30,
  "cantidadPreguntas": 10,
  "puntajePorRespuesta": 100,
  "mostrarPistas": true
}
```

Cuando React carga el juego, le manda ese JSON a Phaser junto con las preguntas. Phaser lo usa para saber cómo comportarse. Esto permite ajustar el comportamiento del juego sin tocar el código.

---

### ¿Se necesita min_edad/max_edad o mejor usar grado?

Mejor usar **grado directamente**. En lugar de `min_edad` / `max_edad` los juegos tendrán `grado_min` y `grado_max` con valores enteros 3, 4 o 5 (correspondientes a 3ro, 4to y 5to de EGB). Un estudiante de 3ro solo ve juegos donde `grado_min <= 3 <= grado_max`.

---

### ¿Cómo funciona el sistema de paralelos y códigos?

**Flujo definido:**
1. El profesor crea un paralelo desde su dashboard (nombre: "3ro A", grado: 3)
2. El sistema genera automáticamente un código de 6 caracteres alfanumérico (ej: `KX7T2M`)
3. El profesor comparte ese código verbalmente o por escrito con sus estudiantes
4. El estudiante se registra → inicia sesión → en su dashboard ve "Unirse a un paralelo" → ingresa el código → queda asociado

**El código:** es único por paralelo, no expira, el profesor puede regenerarlo si se filtra.

**Cambio de grado al año siguiente:** El profesor "archiva" el paralelo. Los estudiantes quedan con `paralelo_id = null`. El año siguiente se crea un nuevo paralelo y los estudiantes entran con el nuevo código.

La tabla `paralelos` unificada está bien tal como está. Desde el frontend el estudiante ve un selector de grado (3, 4, 5) solo para orientarse, pero se une al paralelo específico con el código.

---

### ¿El grado en la tabla paralelos sigue siendo necesario?

Sí. El campo `grado` en la tabla `paralelos` sirve para dos cosas: filtrar qué contenido de juego se le muestra al estudiante (nivel 3, 4 o 5) y que el dashboard del profesor agrupe sus paralelos por grado. Sin ese campo, no sabemos con qué nivel de contenido cargar los juegos.

---

### ¿Los profesores tienen acceso a todos los paralelos?

**Para el prototipo: sí.** Todos los profesores ven todos los paralelos. En el código esto es simplemente no filtrar por `teacher_id` en la consulta. Para escalar en el futuro solo agregas ese filtro. Cambio de una línea.

---

### ¿La asignación por tiempo es posible?

Es posible y es una buena idea. El flujo es:
- El profesor asigna "15 minutos en el bloque de Lectura" al Paralelo X
- El estudiante ve la tarea: "15 min en Lectura — vence el [fecha]"
- El estudiante puede jugar cualquier juego de ese bloque (o el asignado específicamente)
- Phaser envía un heartbeat al backend cada 30 segundos con los minutos acumulados
- Cuando `minutos_jugados >= minutos_requeridos`, el backend marca la tarea como completada y otorga XP
- Si la fecha límite pasa sin completarse, el backend la marca como "no cumplida" (un job nocturno o el propio endpoint de heartbeat lo verifica)

Es complejo pero manejable. La simplificación para el prototipo: asignar un juego específico con un tiempo mínimo, no "cualquier juego del bloque".

---

### ¿Qué cuenta como "juego completado"?

Dado que la asignación es por tiempo: **completado = minutos jugados >= minutos requeridos** dentro de la fecha límite.

Para los juegos base (sin asignación, juego libre): el juego termina cuando Phaser decide (todas las preguntas respondidas, se acabó el tiempo del juego, etc.). En ese caso Phaser dispara `game:completed` y React muestra la pantalla de resultados. No hay XP en modo libre.

---

### ¿Cuántas preguntas máximo puede ingresar un profesor manualmente?

Recomendación: **máximo 20 preguntas por juego**. Es un número suficiente para una sesión de juego sin ser abrumador para el profesor. En la UI poner un contador visible "12/20 preguntas".

---

### ¿Cuántas preguntas debe generar la IA del PDF?

Recomendación: **10 preguntas por defecto**, con opción de elegir entre 5, 10 o 15. Más de 15 preguntas desde un solo PDF tiende a generar repetición o preguntas de baja calidad.

---

### ¿Qué pasa con las preguntas viejas cuando el profesor sube nuevas?

Las preguntas anteriores se reemplazan. En la tabla `game_questions` hay un registro por juego + paralelo. Al subir nuevas preguntas se hace un UPDATE (o DELETE + INSERT). Las preguntas viejas no se acumulan. Esto es lo más simple de implementar y lo que el usuario espera.

---

### ¿Los estudiantes pueden jugar sin límite? ¿Cuándo se gana XP?

- Juego libre (sin asignación): pueden jugar infinito, **no ganan XP**
- Juego asignado: pueden intentarlo cuantas veces quieran **dentro de la fecha límite**
- **XP se gana una sola vez** cuando se cumple el tiempo requerido de la asignación
- Si la fecha límite pasa sin completar: tarea marcada como "no cumplida", sin XP

---

### El chatbot ¿conoce el rol?

Sí. El backend recibe el JWT del usuario, extrae el rol, y ajusta el prompt del sistema:
- Para STUDENT (niño 8-10 años): tono amigable, vocabulario simple, respuestas cortas
- Para TEACHER: tono profesional, puede preguntar por estadísticas, recomendaciones pedagógicas

---

### ¿Cómo se hace la simulación para la demo?

Con el **seed script** de Prisma (`backend/prisma/seed.ts`). Crea automáticamente en la base de datos: 2 profesores, 10 estudiantes, 2 paralelos (3ro A y 4to B), los 5 juegos base con su contenido, y 3 asignaciones de ejemplo. Así la demo arranca con datos reales sin tener que crear todo a mano.

---

---

## SECCIÓN 1 — Stack Técnico Completo

### Frontend
| Tecnología | Versión | Propósito |
|---|---|---|
| React | 18 | Framework de UI |
| Vite | 5 | Bundler y servidor de desarrollo |
| TypeScript | 5 | Tipado estático |
| Tailwind CSS | 3 | Estilos utilitarios |
| Phaser | 3 | Motor de juegos (canvas) |
| Zustand | 4 | Estado global (auth, notificaciones, juego) |
| React Router | 6 | Enrutamiento entre pantallas |
| Axios | 1.6 | Llamadas HTTP al backend |

### Backend
| Tecnología | Versión | Propósito |
|---|---|---|
| NestJS | 10 | Framework Node.js estructurado |
| TypeScript | 5 | Tipado estático compartido con frontend |
| Prisma ORM | 5 | Acceso a base de datos y migraciones |
| PostgreSQL | 15 | Base de datos principal |
| JWT + Passport | — | Autenticación y guards de rol |
| @nestjs/config + Joi | — | Variables de entorno validadas |
| @nestjs/throttler | — | Rate limiting (protección API de IA) |
| Multer | — | Recepción del PDF en memoria (sin guardar en disco) |
| pdf-parse | — | Extracción de texto del PDF |
| OpenAI SDK | 4 | Generación de preguntas y chatbot |

### Infraestructura
| Tecnología | Propósito |
|---|---|
| Docker + docker-compose | Postgres local para desarrollo |
| Render o Railway | Despliegue gratuito para la demo |
| GitHub | Control de versiones |

---

## SECCIÓN 2 — Estructura del Proyecto (Monorepo)

```
adapta-class/                    ← raíz del monorepo
│
├── docker-compose.yml           ← Postgres para desarrollo local
├── README.md
│
├── frontend/                    ← Proyecto React + Phaser
│   ├── public/
│   │   ├── games/
│   │   │   ├── lectura/         ← assets de Phaser (imágenes, sonidos)
│   │   │   └── escritura/
│   │   └── favicon.ico
│   │
│   ├── src/
│   │   ├── components/          ← Componentes React reutilizables
│   │   │   ├── Header.tsx
│   │   │   ├── GameCarousel.tsx
│   │   │   ├── NotificationBadge.tsx
│   │   │   └── Chatbot.tsx
│   │   │
│   │   ├── games/               ← Un juego = una carpeta
│   │   │   ├── lectura-base/
│   │   │   │   ├── LecturaScene.ts      ← Lógica Phaser
│   │   │   │   └── index.tsx            ← Componente React (dibuja el canvas)
│   │   │   └── quiz-cambiante/
│   │   │       ├── QuizScene.ts
│   │   │       └── index.tsx
│   │   │
│   │   ├── pages/               ← Pantallas completas
│   │   │   ├── Landing.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── StudentDashboard.tsx
│   │   │   ├── StudentTasks.tsx
│   │   │   ├── GameScreen.tsx
│   │   │   ├── PostGame.tsx
│   │   │   ├── GameCatalog.tsx
│   │   │   ├── TeacherDashboard.tsx
│   │   │   ├── ManageParalelo.tsx
│   │   │   ├── AssignActivity.tsx
│   │   │   └── ParaleloProgress.tsx
│   │   │
│   │   ├── store/               ← Zustand stores
│   │   │   ├── authStore.ts     ← usuario, rol, token
│   │   │   ├── notifStore.ts    ← notificaciones pendientes
│   │   │   └── gameStore.ts     ← estado del juego activo
│   │   │
│   │   ├── services/            ← Llamadas a la API
│   │   │   ├── auth.service.ts
│   │   │   ├── games.service.ts
│   │   │   ├── assignments.service.ts
│   │   │   └── ai.service.ts
│   │   │
│   │   ├── types/               ← Interfaces TypeScript compartidas
│   │   │   └── index.ts
│   │   │
│   │   ├── App.tsx              ← Enrutador principal
│   │   └── main.tsx
│   │
│   ├── package.json
│   └── vite.config.ts
│
└── backend/                     ← Proyecto NestJS
    ├── prisma/
    │   ├── schema.prisma        ← Definición de todas las tablas
    │   ├── migrations/          ← Historial de migraciones (generado automático)
    │   └── seed.ts              ← Datos de prueba para la demo
    │
    ├── src/
    │   ├── auth/                ← Login, registro, JWT, guards
    │   ├── users/               ← Perfil, racha, XP
    │   ├── paralelos/           ← CRUD paralelos, códigos de acceso
    │   ├── games/               ← Catálogo, preguntas, config
    │   ├── assignments/         ← Crear, listar, completar asignaciones
    │   ├── progress/            ← Heartbeat de tiempo, marcar completado
    │   ├── ai/                  ← Endpoint PDF → preguntas, chatbot
    │   ├── notifications/       ← Crear y consultar notificaciones
    │   ├── prisma/              ← PrismaService (singleton)
    │   ├── app.module.ts
    │   └── main.ts
    │
    ├── .env                     ← Variables de entorno (en .gitignore)
    ├── .env.example             ← Plantilla pública sin valores reales
    └── package.json
```

---

## SECCIÓN 3 — Contrato Phaser ↔ React

El contrato define exactamente qué eventos se mandan entre Phaser y React, con qué nombres y qué datos. Es el API interno entre el motor de juegos y la UI.

**Mecanismo elegido: Custom DOM Events**

Phaser dispara eventos en `window`. React los escucha en `window`. No hay dependencias entre los dos sistemas.

### Eventos de Phaser → React (Phaser dispara, React escucha)

```typescript
// Cuando el juego arranca
window.dispatchEvent(new CustomEvent('game:started', {
  detail: { gameId: 'quiz-cambiante', sessionId: 'uuid-generado' }
}))

// Heartbeat cada 30 segundos (para tracking de tiempo de asignación)
window.dispatchEvent(new CustomEvent('game:heartbeat', {
  detail: { sessionId: 'uuid', minutosJugados: 2.5 }
}))

// Cuando el estudiante completa o cierra el juego
window.dispatchEvent(new CustomEvent('game:completed', {
  detail: { sessionId: 'uuid', minutosJugados: 15, score: 840 }
}))

// Cuando el estudiante sale sin completar
window.dispatchEvent(new CustomEvent('game:quit', {
  detail: { sessionId: 'uuid', minutosJugados: 7 }
}))
```

### Eventos de React → Phaser (React manda datos al iniciar el juego)

```typescript
// React le pasa las preguntas y config ANTES de que Phaser arranque
// Esto se hace via props al componente del juego, no como evento
// El componente index.tsx del juego recibe:
interface GameProps {
  questions: Question[]      // JSON de preguntas (del backend)
  config: GameConfig         // config_default del juego
  assignmentId?: string      // si es una asignación activa
  minutosRequeridos?: number // tiempo objetivo de la asignación
}
```

### Implementación en el componente React del juego (index.tsx)

```typescript
// games/quiz-cambiante/index.tsx
export default function QuizGame({ questions, config, assignmentId }: GameProps) {
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    // Pasar datos a Phaser via el registro global del juego
    // antes de crear la instancia
    window.__gameData__ = { questions, config, assignmentId }
    
    const phaserConfig: Phaser.Types.Core.GameConfig = {
      scene: [QuizScene],
      // ... resto de config
    }
    gameRef.current = new Phaser.Game(phaserConfig)

    // Escuchar cuando Phaser termina
    const handleComplete = (e: CustomEvent) => {
      // Llamar al backend para registrar el progreso
      // Navegar a la pantalla PostGame
    }
    window.addEventListener('game:completed', handleComplete)

    return () => {
      gameRef.current?.destroy(true)
      window.removeEventListener('game:completed', handleComplete)
    }
  }, [])
}
```

---

## SECCIÓN 4 — Modelo de Datos Completo

### Tabla: `users`
Base de autenticación. Todos los usuarios (estudiantes y profesores) están aquí.

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID PK | auto-generado |
| email | VARCHAR UNIQUE | identificador de login |
| password_hash | VARCHAR | bcrypt, nunca texto plano |
| role | ENUM(STUDENT, TEACHER) | determina qué ve en el dashboard |
| created_at | TIMESTAMP | fecha de registro |

> `email_verified` se omite para el prototipo. `avatar_url` se omite; el frontend genera un avatar con las iniciales del nombre.

---

### Tabla: `students`
Extiende `users` para los campos exclusivos del estudiante.

| Campo | Tipo | Notas |
|---|---|---|
| user_id | UUID FK → users | relación 1:1 con users |
| nombre | VARCHAR | nombre completo del estudiante |
| puntos_xp | INTEGER DEFAULT 0 | XP acumulado total |
| racha_dias | INTEGER DEFAULT 0 | días consecutivos con login |
| last_login_date | DATE | para calcular la racha en cada login |
| paralelo_id | UUID FK → paralelos, NULLABLE | null si no pertenece a ningún paralelo |

---

### Tabla: `teachers`
Extiende `users` para los campos exclusivos del profesor.

| Campo | Tipo | Notas |
|---|---|---|
| user_id | UUID FK → users | relación 1:1 con users |
| nombre | VARCHAR | nombre completo del profesor |
| cedula | VARCHAR UNIQUE | guardada al momento del registro |

---

### Tabla: `cedulas_autorizadas`
Lista blanca de cédulas de docentes cargada manualmente por el administrador.

| Campo | Tipo | Notas |
|---|---|---|
| cedula | VARCHAR PK | cédula del docente autorizado |
| nombre_referencia | VARCHAR | solo para identificar el registro |

---

### Tabla: `paralelos`
Un paralelo = un grupo de estudiantes de un grado específico.

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID PK | auto-generado |
| nombre | VARCHAR | ej: "3ro A", "4to B" |
| grado | INTEGER | 3, 4 o 5 (EGB) |
| teacher_id | UUID FK → users | profesor que lo administra |
| codigo_acceso | VARCHAR(6) UNIQUE | generado automáticamente al crear el paralelo |
| activo | BOOLEAN DEFAULT TRUE | false = archivado (fin de año) |
| created_at | TIMESTAMP | — |

**Generación del código:** 6 caracteres alfanuméricos en mayúscula, sin caracteres confusos (sin O, 0, I, 1). Ejemplo: `KX7T2M`. El backend verifica que no exista otro paralelo con el mismo código activo antes de guardarlo.

**Cambio de año:** el profesor marca el paralelo como `activo = false`. Los estudiantes mantienen su historial de XP pero `paralelo_id` pasa a `null`. El próximo año se crea un paralelo nuevo y los estudiantes ingresan el nuevo código.

---

### Tabla: `games`
Catálogo de todos los juegos disponibles en la plataforma.

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID PK | auto-generado |
| titulo | VARCHAR | nombre del juego |
| tema | ENUM | LENGUA_CULTURA, COMUNICACION_ORAL, LECTURA, ESCRITURA, LITERATURA |
| tipo | ENUM(BASE, CAMBIANTE) | BASE: contenido fijo; CAMBIANTE: acepta preguntas del profesor |
| acepta_preguntas_ia | BOOLEAN | true solo para juegos tipo CAMBIANTE |
| config_default | JSONB | configuración inicial del juego (tiempo, puntaje, etc.) |
| grado_min | INTEGER | grado mínimo para el que aplica (3, 4 o 5) |
| grado_max | INTEGER | grado máximo (ej: un juego base puede aplicar a 3, 4 y 5) |
| descripcion | VARCHAR | descripción breve para mostrar en el catálogo |
| thumbnail_url | VARCHAR | imagen del juego en el carrusel (va en /public/) |

**Ejemplo de config_default:**
```json
{
  "tiempoLimitePreguntaSegundos": 30,
  "cantidadPreguntasPorSesion": 10,
  "xpPorSesionLibre": 0,
  "permitirPistas": true
}
```

**Ejemplo de catálogo de juegos (datos del seed):**

| titulo | tema | tipo | grado_min | grado_max |
|---|---|---|---|---|
| Aventura de Lectura | LECTURA | BASE | 3 | 5 |
| Comprensión Oral | COMUNICACION_ORAL | BASE | 3 | 5 |
| El Mundo de las Letras | LENGUA_CULTURA | BASE | 3 | 5 |
| Taller de Escritores | ESCRITURA | BASE | 3 | 5 |
| Cuentos Mágicos | LITERATURA | BASE | 3 | 5 |
| Quiz Rápido — Lectura | LECTURA | CAMBIANTE | 3 | 5 |
| Sopa de Letras | ESCRITURA | CAMBIANTE | 3 | 5 |
| Palabras Cruzadas | LENGUA_CULTURA | CAMBIANTE | 3 | 5 |

---

### Tabla: `game_content`
Contenido por grado para los juegos BASE. Los juegos BASE cambian su contenido según el grado del estudiante.

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID PK | — |
| game_id | UUID FK → games | — |
| grado | INTEGER | 3, 4 o 5 |
| contenido_json | JSONB | preguntas, textos, niveles para ese grado |

Esto permite que el mismo juego "Aventura de Lectura" tenga textos diferentes para 3ro, 4to y 5to. Solo hay que cargar el `contenido_json` correcto según el grado del estudiante.

---

### Tabla: `game_questions`
Preguntas para los juegos CAMBIANTE, organizadas por juego y paralelo.

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID PK | — |
| game_id | UUID FK → games | solo juegos tipo CAMBIANTE |
| paralelo_id | UUID FK → paralelos, NULLABLE | null = preguntas por defecto (antes de que un profesor las cambie) |
| preguntas_json | JSONB | array de preguntas en formato estándar |
| tipo_fuente | ENUM(DEFAULT, MANUAL, IA) | cómo fueron creadas |
| created_by | UUID FK → users, NULLABLE | id del profesor que las subió |
| created_at | TIMESTAMP | — |

**Formato estándar del JSON de preguntas:**
```json
[
  {
    "id": "q1",
    "texto": "¿Cuál es el sinónimo de 'alegre'?",
    "opciones": ["triste", "feliz", "enojado", "cansado"],
    "respuestaCorrecta": 1,
    "pista": "Es lo que sientes en tu cumpleaños"
  }
]
```

**Regla de carga de preguntas:** cuando el backend busca las preguntas de un juego para un paralelo específico, primero busca si existe un registro con ese `game_id` + `paralelo_id`. Si no existe, carga el registro con `paralelo_id = null` (las preguntas por defecto).

---

### Tabla: `assignments`
Tareas que un profesor asigna a un paralelo.

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID PK | — |
| paralelo_id | UUID FK → paralelos | — |
| game_id | UUID FK → games | juego específico a jugar |
| minutos_requeridos | INTEGER | tiempo mínimo en minutos (ej: 15) |
| fecha_limite | TIMESTAMP | hasta cuándo tiene que completarse |
| created_by | UUID FK → users | id del profesor |
| created_at | TIMESTAMP | — |

---

### Tabla: `student_progress`
Registro del progreso de cada estudiante en cada asignación.

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID PK | — |
| student_id | UUID FK → users | — |
| assignment_id | UUID FK → assignments | — |
| minutos_jugados | DECIMAL(5,2) DEFAULT 0 | acumulado via heartbeats |
| completado | BOOLEAN DEFAULT FALSE | true cuando minutos_jugados >= minutos_requeridos |
| xp_otorgado | BOOLEAN DEFAULT FALSE | para evitar doble otorgamiento de XP |
| completed_at | TIMESTAMP, NULLABLE | momento exacto en que se completó |

---

### Tabla: `notifications`
Sistema de notificaciones vía polling.

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID PK | — |
| student_id | UUID FK → users | destinatario |
| assignment_id | UUID FK → assignments | tarea asociada |
| mensaje | VARCHAR | "Tu profe asignó nueva actividad: 15 min de Lectura" |
| leida | BOOLEAN DEFAULT FALSE | el estudiante la descartó |
| created_at | TIMESTAMP | — |

---

## SECCIÓN 5 — Flujo de Juegos (Base vs Cambiante)

### Juegos BASE (5 juegos, uno por tema)

- Contenido fijo definido en la tabla `game_content`
- El contenido cambia según el grado del estudiante (3, 4 o 5)
- El profesor no puede modificarlos
- Disponibles siempre en el catálogo libre
- No generan XP en modo libre, sí contribuyen tiempo en asignaciones

**Flujo de carga:**
```
Estudiante (grado 4) → abre "Aventura de Lectura"
→ Backend: SELECT contenido_json FROM game_content WHERE game_id = X AND grado = 4
→ Frontend recibe JSON → pasa a Phaser → juego carga con contenido de 4to
```

### Juegos CAMBIANTE (3 por tema, total 15 juegos)

- Preguntas variables definidas en `game_questions`
- Por defecto traen preguntas estándar (`paralelo_id = null`)
- El profesor puede reemplazarlas para su paralelo (manual o por IA)
- Al reemplazar: se hace UPDATE del registro existente (no se acumulan versiones)

**Flujo de carga:**
```
Estudiante (paralelo "3ro A", id: abc-123) → abre "Quiz Rápido Lectura"
→ Backend: busca en game_questions WHERE game_id = X AND paralelo_id = 'abc-123'
→ Si existe: devuelve esas preguntas
→ Si no existe: devuelve las preguntas por defecto (paralelo_id = null)
→ Frontend pasa JSON a Phaser → juego carga con esas preguntas
```

### Flujo de generación de preguntas por IA

```
Profesor sube PDF (max 5MB) → Multer lo recibe en memoria (RAM)
→ pdf-parse extrae el texto (string)
→ Profesor elige: 5, 10 o 15 preguntas
→ Backend manda a OpenAI:
   System: "Eres un generador de preguntas de opción múltiple para niños de 8-10 años.
            Responde SOLO con un JSON array con este formato: [...]"
   User: "Genera 10 preguntas basadas en este texto: [texto del PDF]"
→ OpenAI devuelve JSON
→ Backend valida que sea JSON válido con el esquema correcto
→ Se guarda en game_questions (o se actualiza si ya existía para ese game + paralelo)
→ Las preguntas anteriores se reemplazan
```

**Rate limit:** máximo 5 llamadas a la IA por profesor por hora (protección de costos).

---

## SECCIÓN 6 — Reglas de Negocio

### Roles y accesos
1. Un usuario es STUDENT o TEACHER. No puede tener ambos roles.
2. Un estudiante puede estar en 0 o 1 paralelo a la vez.
3. Un profesor administra todos los paralelos del sistema (para el prototipo; escalable a paralelos asignados).
4. Solo TEACHER puede: crear paralelos, asignar actividades, subir PDFs, escribir preguntas manualmente.
5. Solo STUDENT puede: unirse a un paralelo con código, acumular XP y racha.

### Autenticación y roles
6. Al registrarse con una cédula que existe en `cedulas_autorizadas`, el rol asignado es TEACHER.
7. Si la cédula no existe o el campo está vacío, el rol es STUDENT.
8. Un STUDENT intenta usar endpoints de TEACHER → respuesta 403 Forbidden.
9. Cada request al backend incluye el JWT en el header `Authorization: Bearer <token>`.

### Sistema de juegos
10. Un juego BASE nunca puede recibir preguntas manuales ni de IA.
11. Un juego CAMBIANTE siempre tiene preguntas (por defecto o del profesor).
12. El contenido de los juegos BASE cambia según el grado del estudiante (campo `grado` del paralelo).
13. Si un estudiante no tiene paralelo asignado, puede jugar en modo libre pero no recibe asignaciones ni notificaciones.

### Sistema de asignaciones
14. Una asignación es para todo un paralelo a la vez, no para estudiantes individuales.
15. Al crear una asignación, el backend crea automáticamente un registro en `student_progress` por cada estudiante del paralelo y una `notification` por cada uno.
16. Un estudiante puede jugar el juego asignado infinitas veces dentro de la fecha límite.
17. El tiempo jugado se acumula via heartbeat (enviado por Phaser cada 30 segundos).
18. Cuando `minutos_jugados >= minutos_requeridos`, el backend marca `completado = true` y otorga XP. Esto ocurre solo una vez (campo `xp_otorgado` previene duplicados).
19. Si la `fecha_limite` pasa y `completado = false`, la asignación aparece como "No cumplida" para ese estudiante. No se otorga XP.
20. En el perfil del estudiante se muestran las últimas 3 asignaciones completadas. Las anteriores no se borran, solo dejan de mostrarse en el resumen (el historial completo existe en la tabla).

### Gamificación
21. XP solo se otorga al completar una asignación dentro de la fecha límite. Nunca en modo de juego libre.
22. XP por asignación completada: 50 puntos (valor fijo para el prototipo).
23. La racha se calcula al hacer login: si `last_login_date` fue ayer → `racha_dias + 1`. Si fue hace más de un día → `racha_dias = 1`. Si fue hoy → sin cambio.

### Sistema de preguntas
24. El profesor puede reemplazar las preguntas de un juego CAMBIANTE para su paralelo. Las preguntas anteriores se eliminan.
25. Máximo 20 preguntas por entrada manual.
26. La IA genera entre 5 y 15 preguntas (elegido por el profesor), con un máximo de 5 generaciones por hora por profesor.
27. El formato JSON de preguntas es validado por el backend antes de guardarse. Si la IA devuelve un JSON malformado, el backend lo rechaza y devuelve error al frontend.

### Códigos de paralelo
28. El código de acceso es único entre todos los paralelos activos.
29. El código no expira (el profesor puede regenerarlo si es necesario).
30. Si un estudiante ingresa un código inválido, recibe el error "Código no encontrado".
31. Un estudiante solo puede pertenecer a un paralelo. Si intenta unirse a otro, primero debe salir del actual.



---

## SECCIÓN 7 — Pantallas Completas

### Flujo del Estudiante

#### 1. Landing Page (pública)
- Qué es Adapta Class, a quién va dirigido
- Botones: "Iniciar sesión" y "Registrarse"
- Carrusel de juegos de demostración (sin poder jugar)

#### 2. Registro
- Campos: Nombre completo, Email, Contraseña, Confirmar contraseña
- Campo opcional: Cédula de docente (con texto aclaratorio)
- Botón: Registrarse

#### 3. Login
- Campos: Email, Contraseña
- Botón: Iniciar sesión
- Link: ¿No tienes cuenta? Regístrate

#### 4. Dashboard del Estudiante
- Header: avatar con iniciales + nombre + ícono de fueguito (racha) + número de XP
- Banner de tarea activa (si hay una asignación pendiente con tiempo corriendo)
- Carrusel diagonal de juegos estilo phaser.io
- Botón flotante: Chatbot
- Barra de navegación: Inicio | Mis Tareas | Juegos | Mi Perfil

#### 5. Unirse a un Paralelo (primera vez o después de cambio de año)
- Se muestra automáticamente si el estudiante no tiene paralelo asignado
- Selector: Grado (3ro, 4to, 5to) — solo orientativo
- Campo: Código de paralelo (6 caracteres)
- Botón: Unirme
- Mensaje de error si el código no existe

#### 6. Mis Tareas
- Lista de asignaciones pendientes (con countdown de tiempo restante)
- Lista de asignaciones completadas (últimas 3 visibles)
- Al hacer click en una tarea pendiente: va a la pantalla de juego
- Si una tarea venció sin completar: etiqueta roja "No cumplida"

#### 7. Catálogo de Juegos
- Organizado por tema: Lectura, Escritura, etc.
- Cada tema muestra el juego BASE primero y luego los juegos CAMBIANTE
- Al hacer click: va directamente a la pantalla de juego (modo libre)

#### 8. Pantalla de Juego
- Canvas de Phaser a pantalla completa
- Overlay con: botón "Pausar" + botón "Salir" (con confirmación)
- Si es una asignación activa: barra de progreso de tiempo en la parte superior

#### 9. Pantalla Post-Juego (solo en asignaciones)
- Puntuación obtenida en esa sesión
- Progreso total de la asignación (minutos jugados vs minutos requeridos)
- Si se completó: animación de XP ganado + mensaje de felicitación
- Botones: "Jugar de nuevo" y "Volver al inicio"

#### 10. Mi Perfil
- Avatar con iniciales + nombre
- Total de XP acumulado + barra visual
- Racha actual (fueguito + número de días)
- Historial de últimas 3 asignaciones completadas

#### 11. Chatbot (modal flotante)
- Burbuja de chat estilo WhatsApp
- El bot se presenta con nombre ("Soy Addy, tu asistente de Adapta Class")
- Tono amigable para niños
- Solo responde sobre los juegos disponibles en la plataforma

---

### Flujo del Profesor

#### 12. Dashboard del Profesor
- Lista de paralelos activos con número de estudiantes
- Botón: "Crear nuevo paralelo"
- Accesos directos: Asignar actividad | Gestionar preguntas
- Resumen de asignaciones activas

#### 13. Gestionar Paralelo
- Nombre del paralelo + grado + código de acceso (visible y con botón "Copiar código")
- Botón: "Regenerar código"
- Lista de estudiantes del paralelo (nombre, XP, racha)
- Botón: "Archivar paralelo" (con confirmación)

#### 14. Asignar Actividad
- Paso 1: Seleccionar paralelo
- Paso 2: Seleccionar tema (Lectura, Escritura, etc.)
- Paso 3: Seleccionar juego (se muestran los disponibles para ese tema)
- Paso 4: Definir tiempo requerido (5, 10, 15, 20, 30 minutos)
- Paso 5: Definir fecha límite (date picker)
- Botón: "Asignar" (crea la asignación y envía notificaciones)

#### 15. Gestionar Preguntas de un Juego
- Se accede desde el catálogo o desde la pantalla de asignar
- Muestra las preguntas actuales (por defecto o las que puso el profesor)
- Dos opciones:
  - **Entrada manual**: formulario para agregar/editar preguntas (hasta 20)
  - **Generar con IA**: subir PDF + elegir cantidad (5/10/15) + botón "Generar"
- Vista previa de las preguntas generadas antes de guardar
- Botón: "Guardar y reemplazar preguntas"
- Advertencia: "Esto reemplazará las preguntas actuales para tu paralelo"

#### 16. Ver Progreso del Paralelo
- Tabla por asignación: qué estudiantes completaron, qué tiempo acumularon
- Filtros: todas las asignaciones | solo activas | solo vencidas

#### 17. Chatbot (modal flotante, misma UI que el del estudiante)
- Tono profesional
- Responde sobre qué juegos recomendar para un tema, cómo funciona la plataforma

---

## SECCIÓN 8 — Roadmap 

### Semana 1 — Fundación y Autenticación

**Objetivo:** tener un monorepo funcional con auth completa y base de datos lista.

**Día 1-2: Infraestructura**
- [ ] Crear monorepo: carpetas `/frontend` y `/backend`
- [ ] Mover proyecto React actual a `/frontend`
- [ ] Crear proyecto NestJS en `/backend` con `nest new backend`
- [ ] Crear `docker-compose.yml` con Postgres
- [ ] Configurar `@nestjs/config` + Joi para variables de entorno
- [ ] Configurar Prisma: instalar, crear `schema.prisma` con TODAS las tablas de este documento
- [ ] Ejecutar primera migración: `npx prisma migrate dev --name init`
- [ ] Crear seed script con datos de prueba

**Día 3-5: Autenticación**
- [ ] Backend: módulo `auth` — endpoints POST /auth/register y POST /auth/login
- [ ] Backend: validación de cédula → asignación de rol TEACHER/STUDENT
- [ ] Backend: JWT guard y decorador `@Roles()`
- [ ] Backend: módulo `paralelos` — crear paralelo, generar código, unirse con código
- [ ] Frontend: páginas Login y Register funcionales (llaman al backend real)
- [ ] Frontend: Zustand `authStore` (guarda usuario, rol, token)
- [ ] Frontend: rutas protegidas por rol (React Router + guard de rol)
- [ ] Frontend: redirección post-login al dashboard correcto según rol

**Entregable Semana 1:** login/registro funcionando con roles diferenciados. Un profesor puede crear un paralelo y obtener un código. Un estudiante puede registrarse y unirse con el código.



---

## APÉNDICE — Variables de Entorno

### `backend/.env.example`
```env
# Base de datos
DATABASE_URL="postgresql://adapta:adapta123@localhost:5432/adapta_class"

# Auth
JWT_SECRET="cambiar-por-una-clave-muy-larga-y-aleatoria"
JWT_EXPIRES_IN="7d"

# IA
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4o-mini"

# App
PORT=3000
NODE_ENV=development
```

---

## APÉNDICE — Comandos Útiles

```bash
# Iniciar Postgres local
docker-compose up -d

# Backend: primera vez
cd backend
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run start:dev

# Frontend: primera vez
cd frontend
npm install
npm run dev

# Backend: nueva migración (cuando cambias el schema)
npx prisma migrate dev --name nombre_del_cambio

# Backend: ver la base de datos visualmente
npx prisma studio
```
