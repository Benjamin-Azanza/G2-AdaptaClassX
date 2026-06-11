import { useCallback, useEffect, useRef, useState } from 'react';
import type Phaser from 'phaser';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../../services/api';
import { useAuthStore } from '../../auth/store/authStore';
import { getHomeRoute, routePaths } from '../../../app/router/routePaths';

// Single source of truth for the shape every Phaser scene reads from
// game.registry.get('preguntasDelNivel'). Backend rows come in with the
// Spanish field names; we normalize to this once at the boundary.
//
// When no questions come back (no paralelo, teacher hasn't seeded the bank,
// etc.) we hand the scenes an empty array — every scene reads with `|| []`
// and the ones that need questions to function have their own inline
// fallback. There is no global hardcoded bank anymore.
export interface GameQuestion {
  id?: string;
  q: string;
  options: string[];
  answer: number;
}

interface BackendQuestionRow {
  preguntas_json: Array<{
    id?: string;
    texto?: string;
    opciones?: string[];
    respuestaCorrecta?: number;
    // Legacy fields some older AI rows still carry. Accept both so a single
    // row with old field names doesn't blank out the whole quiz.
    prompt?: string;
    options?: string[];
    correctOptionIndex?: number;
  }>;
}

const HEARTBEAT_INTERVAL_MS = 30_000;
// Heartbeats below this threshold (≈1 second) are dropped — protects the
// backend from a flood of zero-minute pings when nothing real happened.
const MIN_HEARTBEAT_MINUTES = 1 / 60;
const REGISTRY_KEY = 'preguntasDelNivel';

type BuildGame = (parent: HTMLElement, questions: GameQuestion[]) => Phaser.Game;

/**
 * Owns the lifecycle every game page used to copy-paste:
 *  - mounts a Phaser.Game inside a container ref
 *  - fetches questions (custom for paralelo + default fallback) and pushes
 *    them into game.registry so scenes pick them up
 *  - calls POST /game-sessions to start a session on mount (if student)
 *  - emits a POST /game-sessions/:id/heartbeat every 30s while playing
 *  - listens to `game:answer` to post attempts to POST /game-sessions/:id/attempt
 *  - listens for the global `game:quit` event and routes the user home or result page
 *  - tears everything down on unmount or when `gameStarted` flips off
 *
 * Each game page only contributes the Phaser configuration via `buildGame`.
 */
export function useGameSession(buildGame: BuildGame) {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGame = useRef<Phaser.Game | null>(null);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const gameId = searchParams.get('gameId');
  // Present only when this game runs embedded inside an Adapta-G room. Hoisted
  // to a primitive (like gameId) so the lifecycle effect can depend on it.
  const adaptaPin = searchParams.get('adaptag_pin');
  const [gameStarted, setGameStarted] = useState(false);

  const buildGameRef = useRef(buildGame);
  const sessionIdRef = useRef<string | null>(null);
  // Tracks whether the player did anything meaningful in this session.
  // Flipped on by the first heartbeat tick or the first answered question.
  // If still false when they quit, we skip the results page (showing it
  // with all-zero stats reads as broken — the screen the user complained
  // about) and send them back to the catalog instead.
  const hadActivityRef = useRef(false);
  // Timestamp of the last heartbeat we successfully posted (or the
  // session start). Used so each heartbeat sends the *real* elapsed
  // minutes since the previous one — including the final flush when the
  // student quits mid-interval, so 15-second sessions still count.
  const lastHeartbeatAtRef = useRef<number>(0);

  // POSTs a heartbeat carrying the time elapsed since the previous one.
  // Returns nothing — callers fire-and-forget except for `routeAway`,
  // which awaits this so the final flush lands before navigation.
  const sendHeartbeat = useCallback(async () => {
    if (user?.role !== 'STUDENT' || !sessionIdRef.current) return;
    const now = Date.now();
    const minutesSinceLast = (now - lastHeartbeatAtRef.current) / 60_000;
    if (minutesSinceLast < MIN_HEARTBEAT_MINUTES) return;
    lastHeartbeatAtRef.current = now;
    hadActivityRef.current = true;
    try {
      await api.post(
        `/game-sessions/${sessionIdRef.current}/heartbeat`,
        { played_minutes: minutesSinceLast },
      );
      // Time-based missions advanced; nudge the in-game overlay.
      window.dispatchEvent(new CustomEvent('mission:refresh'));
    } catch (err) {
      console.error('Heartbeat failed', err);
    }
  }, [user?.role]);

  // buildGame is a closure that almost certainly changes identity every
  // render. Stash it in a ref so it doesn't keep retriggering the game
  // lifecycle effect.
  useEffect(() => {
    buildGameRef.current = buildGame;
  }, [buildGame]);

  // Centralised routing so the in-Phaser `game:quit` event and the React
  // "Salir" button can't drift. Three cases:
  //   - student WITH activity → results page with the session id
  //   - student WITHOUT activity (or no session at all) → games catalog
  //   - teacher previewing → teacher dashboard (their home)
  //
  // Async because we flush a final heartbeat first — that's what lets a
  // 20-second session still count toward a PLAY_TIME mission (otherwise
  // anything under the 30s interval was lost to the void).
  const routeAwayFromGame = useCallback(async () => {
    if (user?.role === 'STUDENT' && sessionIdRef.current) {
      await sendHeartbeat();
    }
    if (user?.role !== 'STUDENT') {
      navigate(getHomeRoute(user?.role));
      return;
    }
    if (sessionIdRef.current && hadActivityRef.current) {
      navigate(`${routePaths.studentResult}?sessionId=${sessionIdRef.current}`);
      return;
    }
    navigate(routePaths.studentGames);
  }, [navigate, sendHeartbeat, user?.role]);

  useEffect(() => {
    if (!gameStarted) return;

    let cancelled = false;
    let heartbeat: number | null = null;

    // Phaser events can't await — fire-and-forget the async navigation.
    const handleQuit = () => {
      void routeAwayFromGame();
    };
    const handleComplete = () => {
      void routeAwayFromGame();
    };

    const handleAnswer = (e: Event) => {
      const customEvent = e as CustomEvent<{ question_id: string; correct: boolean }>;
      const { question_id, correct } = customEvent.detail;

      // MINIGAME INTEGRATION: If playing inside Adapta-G, report score
      if (adaptaPin && correct) {
        // We use dynamic import to avoid circular dependencies if any, or just import it at top
        import('../services/adapta-g.service').then(({ adaptaGService }) => {
          adaptaGService.miniGameTick(adaptaPin, 100).catch(err => console.error('MiniGameTick Error', err));
        });
      }

      // Defensive: never post attempts for teachers in preview mode, even
      // if a stale sessionId somehow leaked in.
      if (user?.role !== 'STUDENT') return;
      if (!sessionIdRef.current || !question_id) return;
      hadActivityRef.current = true;
      api.post(`/game-sessions/${sessionIdRef.current}/attempt`, {
        question_id,
        correcta: correct,
      })
        .then(() => {
          // Backend recalculated mission progress; nudge the in-game overlay.
          window.dispatchEvent(new CustomEvent('mission:refresh'));
        })
        .catch((err) => {
          console.error('Failed to post question attempt', err);
        });
    };

    window.addEventListener('game:quit', handleQuit);
    window.addEventListener('game:complete', handleComplete);
    window.addEventListener('game:answer', handleAnswer as EventListener);

    async function init() {
      if (!gameRef.current || phaserGame.current) return;
      // Inside Adapta-G the minigame shows the room's dedicated question slice
      // (the count the teacher assigned to the game), not the student's full
      // paralelo bank. Outside Adapta-G, load the bank as usual.
      const questions = adaptaPin
        ? await loadAdaptaGameQuestions(adaptaPin)
        : await loadQuestions(gameId);
      if (cancelled || !gameRef.current) return;

      if (user?.role === 'STUDENT' && gameId) {
        try {
          const sessionRes = await api.post<{ id: string }>('/game-sessions', { game_id: gameId });
          if (!cancelled) {
            sessionIdRef.current = sessionRes.data.id;
            // Reset per-session tracking so a brand-new run doesn't
            // inherit refs from a previous one. Anchor the heartbeat
            // clock at session start.
            hadActivityRef.current = false;
            lastHeartbeatAtRef.current = Date.now();
            heartbeat = window.setInterval(() => {
              void sendHeartbeat();
            }, HEARTBEAT_INTERVAL_MS);
          }
        } catch (err) {
          console.error('Failed to start game session', err);
        }
      }

      const instance = buildGameRef.current(gameRef.current, questions);
      instance.registry.set(REGISTRY_KEY, questions);
      phaserGame.current = instance;
    }
    void init();

    return () => {
      cancelled = true;
      window.removeEventListener('game:quit', handleQuit);
      window.removeEventListener('game:complete', handleComplete);
      window.removeEventListener('game:answer', handleAnswer as EventListener);
      // Wipe the question registry before destroying so the next mount can't
      // inherit a stale list from a previous role's preview.
      phaserGame.current?.registry?.reset();
      phaserGame.current?.sound?.stopAll();
      phaserGame.current?.destroy(true);
      phaserGame.current = null;
      sessionIdRef.current = null;
      hadActivityRef.current = false;
      if (heartbeat) window.clearInterval(heartbeat);
    };
  }, [gameStarted, gameId, adaptaPin, navigate, user?.role, routeAwayFromGame, sendHeartbeat]);

  // The wrapper's "Salir" button calls this directly.
  const quitHandler = useCallback(() => {
    void routeAwayFromGame();
  }, [routeAwayFromGame]);

  return { gameRef, phaserGame, gameStarted, setGameStarted, quitHandler };
}

// Loads the question slice the teacher assigned to the Adapta-G minigame.
// Returns [] when the teacher left "preguntas para el juego" off — the scenes
// then behave exactly as a minigame with no bank questions.
async function loadAdaptaGameQuestions(pin: string): Promise<GameQuestion[]> {
  try {
    const { adaptaGService } = await import('../services/adapta-g.service');
    const res = await adaptaGService.getRoomState(pin);
    const gameQuestions = (res.data?.gameQuestions ?? []) as Array<{
      id?: string;
      texto?: string;
      opciones?: string[];
      respuestaCorrecta?: number;
    }>;
    return gameQuestions.map<GameQuestion>((q) => ({
      id: q.id,
      q: q.texto ?? '',
      options: q.opciones ?? [],
      answer: q.respuestaCorrecta ?? 0,
    }));
  } catch (error) {
    console.error('Failed to load Adapta-G minigame questions', error);
    return [];
  }
}

async function loadQuestions(gameId: string | null): Promise<GameQuestion[]> {
  if (!gameId) return [];
  try {
    const res = await api.get<BackendQuestionRow[]>(`/games/${gameId}/questions`);
    return res.data.flatMap((row) =>
      (row.preguntas_json ?? []).map<GameQuestion>((q) => ({
        id: q.id,
        q: q.texto ?? q.prompt ?? '',
        options: q.opciones ?? q.options ?? [],
        answer: q.respuestaCorrecta ?? q.correctOptionIndex ?? 0,
      })),
    );
  } catch (error) {
    console.error('Failed to load questions for game', error);
    return [];
  }
}
