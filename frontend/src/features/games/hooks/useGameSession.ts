import { useCallback, useEffect, useRef, useState } from 'react';
import type Phaser from 'phaser';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../../services/api';
import { useAuthStore } from '../../auth/store/authStore';
import { getHomeRoute } from '../../../app/router/routePaths';
import { questions as fallbackQuestions } from '../../questions/questions';

// Single source of truth for the shape every Phaser scene reads from
// game.registry.get('preguntasDelNivel'). Backend rows come in with the
// Spanish field names; we normalize to this once at the boundary.
export interface GameQuestion {
  q: string;
  options: string[];
  answer: number;
}

interface BackendQuestionRow {
  preguntas_json: Array<{
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
 *  - emits a /progress/heartbeat every 30s while playing if launched from
 *    an assignment link
 *  - listens for the global `game:quit` event and routes the user home
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
  const assignmentId = searchParams.get('assignmentId');
  const gameId = searchParams.get('gameId');
  const [gameStarted, setGameStarted] = useState(false);

  const buildGameRef = useRef(buildGame);

  // buildGame is a closure that almost certainly changes identity every
  // render. Stash it in a ref so it doesn't keep retriggering the game
  // lifecycle effect.
  useEffect(() => {
    buildGameRef.current = buildGame;
  }, [buildGame]);

  useEffect(() => {
    if (!gameStarted) return;

    let cancelled = false;
    const handleQuit = () => navigate(getHomeRoute(user?.role));
    // Scenes dispatch `game:complete` when the assignment goal is met
    // (game-specific — e.g. answering N questions or reaching a level).
    // We forward it to the backend exactly once per session so the
    // assignment flips to "completado" + XP gets granted even if the
    // heartbeat-minutes threshold hasn't been crossed.
    let completionPosted = false;
    const handleComplete = () => {
      if (!assignmentId || completionPosted) return;
      completionPosted = true;
      api.patch(`/progress/${assignmentId}/complete`).catch(() => {
        // Best-effort — heartbeat will eventually mark it complete if this fails.
      });
    };
    window.addEventListener('game:quit', handleQuit);
    window.addEventListener('game:complete', handleComplete);

    async function init() {
      if (!gameRef.current || phaserGame.current) return;
      const questions = await loadQuestions(gameId, useFallback);
      if (cancelled || !gameRef.current) return;
      const instance = buildGameRef.current(gameRef.current, questions);
      instance.registry.set(REGISTRY_KEY, questions);
      phaserGame.current = instance;
    }
    void init();

    let heartbeat: number | null = null;
    if (assignmentId) {
      heartbeat = window.setInterval(() => {
        api
          .post('/progress/heartbeat', {
            assignment_id: assignmentId,
            played_minutes: HEARTBEAT_MINUTES,
          })
          .catch(() => {
            // Swallow — heartbeat failures are non-critical and we don't want
            // to spam the console with noise during gameplay.
          });
      }, HEARTBEAT_INTERVAL_MS);
    }

    return () => {
      cancelled = true;
      window.removeEventListener('game:quit', handleQuit);
      window.removeEventListener('game:complete', handleComplete);
      phaserGame.current?.sound?.stopAll();
      phaserGame.current?.destroy(true);
      phaserGame.current = null;
      if (heartbeat) window.clearInterval(heartbeat);
    };
  }, [gameStarted, assignmentId, gameId, navigate, user?.role, useFallback]);

  const quitHandler = useCallback(() => {
    navigate(getHomeRoute(user?.role));
  }, [navigate, user?.role]);

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
