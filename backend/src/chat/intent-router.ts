// Deterministic intent matcher for the student chatbot.
//
// Why this exists (see CLAUDE.md "Chatbot"): we don't want every "¿qué
// tareas tengo?" question to spend tokens. The router pattern-matches the
// 80-90% of predictable questions and routes them to handlers that hit
// Postgres directly. Only unmatched messages fall back to the optional
// LLM path (and only if the teacher enabled it for the paralelo).
//
// Keep this file pure (no Nest DI, no Prisma). Handlers live next door.

export type IntentName =
  | 'GREETING'
  | 'HELP'
  | 'MISSIONS_PENDING'
  | 'MISSIONS_TIME_LEFT'
  | 'MISSIONS_COMPLETED'
  | 'NEXT_DEADLINE'
  | 'XP_STATUS'
  | 'STREAK'
  | 'LOGIN_BONUS'
  | 'NOTIFICATIONS_PENDING'
  | 'GAMES_AVAILABLE'
  | 'RECOMMEND_GAME'
  | 'RANKING'
  | 'ACHIEVEMENTS'
  | 'TOTAL_PLAY_TIME'
  | 'ANSWERS_STATS'
  | 'MY_TEACHER'
  | 'MY_PARALELO';

interface IntentRule {
  name: IntentName;
  // Patterns are matched against the *normalized* text (lowercase, no
  // diacritics, single spaces). Keep them ASCII to avoid surprises.
  patterns: RegExp[];
}

// Shared fragment: matches cuanto/cuanta/cuantos/cuantas as a single
// quantifier. Used by intents that count things ("cuántos juegos",
// "cuántas misiones", etc.).
const HOWMANY = '(cuant[oa]s?)';

// Order matters — first match wins. Place specific patterns above generic
// ones (e.g. MISSIONS_TIME_LEFT before MISSIONS_PENDING; TOTAL_PLAY_TIME
// before MISSIONS_TIME_LEFT only because TOTAL needs different keywords).
const RULES: IntentRule[] = [
  {
    name: 'GREETING',
    patterns: [
      /^(hola|holi|hey|buenas|buenos dias|buenas tardes|buenas noches)\b/,
    ],
  },
  {
    name: 'HELP',
    patterns: [
      /\bayuda\b/,
      /\bque puedes hacer\b/,
      /\bcomo funciona\b/,
      /^\?+$/,
    ],
  },

  // ─── Missions ─────────────────────────────────────────────────
  // NEXT_DEADLINE is more specific than MISSIONS_PENDING (it asks about
  // "cuándo vence") so it goes first.
  {
    name: 'NEXT_DEADLINE',
    patterns: [
      /\bcuando\s+vence\b/,
      /\bproxim[oa]\s+(vencimiento|fecha)/,
      /\bque\s+mision\s+(vence|termina)\b/,
      /\bdeadline\b/,
    ],
  },
  {
    name: 'MISSIONS_TIME_LEFT',
    patterns: [
      new RegExp(
        `${HOWMANY}\\s+minutos?\\s+(me\\s+faltan|quedan|restan|tengo que jugar)`,
      ),
      /tiempo\s+(restante|que me falta|que falta)/,
      /minutos?\s+(para\s+terminar|para\s+completar|pendientes)/,
    ],
  },
  {
    name: 'MISSIONS_COMPLETED',
    patterns: [
      new RegExp(
        `\\b(que|cuales|${HOWMANY})\\s+(misiones|tareas|retos)\\s+(he|ya)\\s+(complet|termin|hech|cumpl)`,
      ),
      /\bmis(iones)?\s+complet(adas|as)\b/,
      /\btareas\s+complet(adas|as)\b/,
    ],
  },
  {
    name: 'MISSIONS_PENDING',
    patterns: [
      new RegExp(
        `\\b(que|cuales|cual|${HOWMANY})\\s+(tareas|misiones|retos)\\b`,
      ),
      /\bmis(iones)?\b/,
      /\btareas\b/,
      /\bretos?\b/,
      /\bque (tengo que|debo) hacer\b/,
      /\bpendientes?\b/,
    ],
  },

  // ─── Personal stats ───────────────────────────────────────────
  {
    name: 'XP_STATUS',
    patterns: [
      new RegExp(`\\b${HOWMANY}\\s+(xp|puntos|experiencia)\\b`),
      /\bmis (puntos|xp)\b/,
      /\bmi (xp|experiencia)\b/,
    ],
  },
  {
    name: 'STREAK',
    patterns: [
      /\bmi racha\b/,
      /\bracha\b/,
      new RegExp(`\\b${HOWMANY}\\s+dias\\s+(seguidos|llevo)\\b`),
    ],
  },
  {
    name: 'LOGIN_BONUS',
    patterns: [
      /\b(bono|bonus)\s+(diario|hoy|de\s+login)/,
      new RegExp(`\\b${HOWMANY}\\s+(bono|bonus)\\b`),
      /\bmi\s+bono\b/,
    ],
  },
  {
    name: 'ACHIEVEMENTS',
    patterns: [
      new RegExp(
        `\\b(que|cuales|${HOWMANY})\\s+(logros?|medallas?|insignias?|trofeos?)`,
      ),
      /\bmis\s+(logros?|medallas?|insignias?|trofeos?)\b/,
    ],
  },
  {
    name: 'TOTAL_PLAY_TIME',
    patterns: [
      new RegExp(
        `\\b${HOWMANY}\\s+(tiempo|minutos?)\\s+(he|llevo|llevamos)\\s+jugad`,
      ),
      /\btiempo\s+total\s+jugado\b/,
      /\bminutos\s+totales\b/,
    ],
  },
  {
    name: 'ANSWERS_STATS',
    patterns: [
      new RegExp(
        `\\b${HOWMANY}\\s+(preguntas|respuestas)\\s+(correctas|he respondido|he acertado|llevo)`,
      ),
      /\b(que\s+)?porcentaje\s+(acierto|de aciertos|tengo)/,
      /\bmi\s+(precision|acierto)\b/,
      /\bque\s+tan\s+bien\s+respond/,
    ],
  },
  {
    name: 'RANKING',
    patterns: [
      /\branking\b/,
      /\bmi\s+(posicion|puesto|lugar)\b/,
      /\bcomo voy\s+(en|contra)\b/,
      /\btabla\s+(de\s+)?(posiciones|ranking)\b/,
    ],
  },

  // ─── Other ────────────────────────────────────────────────────
  {
    name: 'NOTIFICATIONS_PENDING',
    patterns: [
      new RegExp(`\\b${HOWMANY}\\s+notificaciones?\\b`),
      /\bnotificaciones?\b/,
      /\b(que|algo)\s+(hay\s+)?(de\s+)?nuevo\b/,
      /\bavisos?\b/,
    ],
  },
  {
    name: 'MY_TEACHER',
    patterns: [
      /\bquien\s+es\s+mi\s+(profe|profesor|profesora|maestr[ao])/,
      /\bcomo\s+se\s+llama\s+mi\s+(profe|profesor|profesora|maestr[ao])/,
      /\bmi\s+(profe|profesor|profesora|maestr[ao])\b/,
    ],
  },
  {
    name: 'MY_PARALELO',
    patterns: [
      /\ben\s+que\s+paralelo\s+estoy\b/,
      /\bcual\s+es\s+mi\s+paralelo\b/,
      /\bcomo\s+se\s+llama\s+mi\s+(paralelo|curso|aula|clase)\b/,
      /\bmi\s+(paralelo|curso|aula|clase)\b/,
    ],
  },
  {
    name: 'RECOMMEND_GAME',
    patterns: [
      /\b(que|cual)\s+juego\s+(me\s+)?(recomiendas?|pruebo|juego|deberia)/,
      /\brecomiend[aoe]m?e?\s+(un|algun)?\s*juego/,
      /\ba\s+que\s+(puedo\s+)?juego/,
    ],
  },
  {
    name: 'GAMES_AVAILABLE',
    patterns: [
      new RegExp(`\\b${HOWMANY}\\s+juegos?\\b`),
      /\bque\s+juegos?\b/,
      /\bjuegos?\s+(hay|tengo|puedo jugar|disponibles)\b/,
      /\bcatalogo\s+de\s+juegos\b/,
    ],
  },
];

/**
 * Strip diacritics, lowercase, collapse whitespace, and remove
 * non-alphanumeric noise (keeps ? for the help shortcut).
 */
export function normalizeMessage(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9?¿\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchIntent(message: string): IntentName | null {
  const normalized = normalizeMessage(message);
  if (!normalized) return null;
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(normalized))) {
      return rule.name;
    }
  }
  return null;
}

// Soft prompt-injection sniffer. Heuristic only — its job is to save
// tokens, not to be a security boundary (the LLM has no tool access or
// PII anyway, see ChatService for the threat model). On match, the
// service responds with a friendly canned reply + chips, NOT a 400.
const INJECTION_PATTERNS: RegExp[] = [
  /ignora\s+(todo\s+)?lo\s+anterior/i,
  /olvida\s+(tus\s+)?instrucciones/i,
  /\bahora\s+eres\b/i,
  /\bnuevo\s+rol\b/i,
  /\bsystem\s*[:\]]/i,
  /\[\s*system\s*\]/i,
  /override\s+(previous|system)/i,
];

export function looksLikeInjection(message: string): boolean {
  return INJECTION_PATTERNS.some((p) => p.test(message));
}
