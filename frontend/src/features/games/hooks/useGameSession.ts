import { useCallback, useEffect, useRef, useState } from 'react';
import type Phaser from 'phaser';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../../services/api';
import { useAuthStore } from '../../auth/store/authStore';
import { getHomeRoute, routePaths } from '../../../app/router/routePaths';
import { questions as fallbackQuestions } from '../../questions/questions';

// Single source of truth for the shape every Phaser scene reads from
// game.registry.get('preguntasDelNivel'). Backend rows come in with the
// Spanish field names; we normalize to this once at the boundary.
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
const HEARTBEAT_MINUTES = 0.5;
const REGISTRY_KEY = 'preguntasDelNivel';

type BuildGame = (parent: HTMLElement, questions: GameQuestion[]) => Phaser.Game;

interface UseGameSessionOptions {
  /** If true (default) fall back to a built-in question bank when /games has none. */
  useFallback?: boolean;
}

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
export function useGameSession(buildGame: BuildGame, options: UseGameSessionOptions = {}) {
  const { useFallback = true } = options;
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGame = useRef<Phaser.Game | null>(null);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const gameId = searchParams.get('gameId');
  const [gameStarted, setGameStarted] = useState(false);

  const buildGameRef = useRef(buildGame);
  const sessionIdRef = useRef<string | null>(null);

  // buildGame is a closure that almost certainly changes identity every
  // render. Stash it in a ref so it doesn't keep retriggering the game
  // lifecycle effect.
  useEffect(() => {
    buildGameRef.current = buildGame;
  }, [buildGame]);

  // Centralised routing so the in-Phaser `game:quit` event and the React
  // "Salir" button can't drift.
  const routeAwayFromGame = useCallback(() => {
    if (sessionIdRef.current) {
      navigate(`${routePaths.studentResult}?sessionId=${sessionIdRef.current}`);
    } else {
      navigate(getHomeRoute(user?.role));
    }
  }, [navigate, user?.role]);

  useEffect(() => {
    if (!gameStarted) return;

    let cancelled = false;
    let heartbeat: number | null = null;

    const handleQuit = () => routeAwayFromGame();
    const handleComplete = () => routeAwayFromGame();

    const handleAnswer = (e: Event) => {
      const customEvent = e as CustomEvent<{ question_id: string; correct: boolean }>;
      const { question_id, correct } = customEvent.detail;
      if (!sessionIdRef.current || !question_id) return;
      api.post(`/game-sessions/${sessionIdRef.current}/attempt`, {
        question_id,
        correcta: correct,
      }).catch((err) => {
        console.error('Failed to post question attempt', err);
      });
    };

    window.addEventListener('game:quit', handleQuit);
    window.addEventListener('game:complete', handleComplete);
    window.addEventListener('game:answer', handleAnswer as EventListener);

    async function init() {
      if (!gameRef.current || phaserGame.current) return;
      const questions = await loadQuestions(gameId, useFallback);
      if (cancelled || !gameRef.current) return;

      if (user?.role === 'STUDENT' && gameId) {
        try {
          const sessionRes = await api.post<{ id: string }>('/game-sessions', { game_id: gameId });
          if (!cancelled) {
            sessionIdRef.current = sessionRes.data.id;
            heartbeat = window.setInterval(() => {
              if (sessionIdRef.current) {
                api
                  .post(`/game-sessions/${sessionIdRef.current}/heartbeat`, {
                    played_minutes: HEARTBEAT_MINUTES,
                  })
                  .catch((err) => {
                    console.error('Heartbeat failed', err);
                  });
              }
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
      phaserGame.current?.sound?.stopAll();
      phaserGame.current?.destroy(true);
      phaserGame.current = null;
      if (heartbeat) window.clearInterval(heartbeat);
    };
  }, [gameStarted, gameId, navigate, user?.role, useFallback, routeAwayFromGame]);

  // The wrapper's "Salir" button calls this directly.
  const quitHandler = useCallback(() => routeAwayFromGame(), [routeAwayFromGame]);

  return { gameRef, phaserGame, gameStarted, setGameStarted, quitHandler };
}

async function loadQuestions(
  gameId: string | null,
  useFallback: boolean,
): Promise<GameQuestion[]> {
  if (gameId) {
    try {
      const res = await api.get<BackendQuestionRow[]>(`/games/${gameId}/questions`);
      const apiQuestions = res.data.flatMap((row) =>
        (row.preguntas_json ?? []).map<GameQuestion>((q) => ({
          id: q.id,
          q: q.texto ?? q.prompt ?? '',
          options: q.opciones ?? q.options ?? [],
          answer: q.respuestaCorrecta ?? q.correctOptionIndex ?? 0,
        })),
      );
      if (apiQuestions.length > 0) return apiQuestions;
    } catch (error) {
      console.error('Failed to load questions, using fallback', error);
    }
  }
  if (!useFallback) return [];
  return fallbackQuestions.map((q) => ({
    q: q.q,
    options: q.options,
    answer: q.answer,
  }));
}
