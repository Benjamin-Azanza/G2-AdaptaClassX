import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Boot from './scenes/Boot';
import Preloader from './scenes/Preloader';
import MainMenu from './scenes/MainMenu';
import Game from './scenes/Game';
import api from '../../../services/api';
import { useAuthStore } from '../../auth/store/authStore';
import { questions as fallbackQuestions } from '../../questions/questions';

type BackendRow = { preguntas_json: Array<{ texto: string; opciones: string[]; respuestaCorrecta: number }> };

export const EmojiMatchGamePage: React.FC = () => {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGame = useRef<Phaser.Game | null>(null);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const assignmentId = searchParams.get('assignmentId');
  const gameId = searchParams.get('gameId');

  useEffect(() => {
    let isMounted = true;
    const handleQuit = () => navigate(user?.role === 'TEACHER' ? '/teacher/dashboard' : '/student/games');
    window.addEventListener('game:quit', handleQuit);

    async function initGame() {
      if (!gameRef.current || phaserGame.current) return;
      let questions: Array<{ q: string; options: string[]; answer: number }> = [];
      if (gameId) {
        try {
          const res = await api.get<BackendRow[]>(`/games/${gameId}/questions`);
          questions = res.data.flatMap((r) =>
            (r.preguntas_json ?? []).map((q) => ({ q: q.texto, options: q.opciones, answer: q.respuestaCorrecta })),
          );
        } catch { /* sin preguntas */ }
      }
      if (questions.length === 0) {
        questions = fallbackQuestions.map((q) => ({
          q: q.q,
          options: q.options,
          answer: q.answer,
        }));
      }
      if (!isMounted) return;

      phaserGame.current = new Phaser.Game({
        type: Phaser.AUTO,
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 800, height: 600 },
        backgroundColor: '#008eb0',
        parent: gameRef.current,
        scene: [Boot, Preloader, MainMenu, Game],
      });
      phaserGame.current.registry.set('preguntasDelNivel', questions);
    }
    void initGame();

    let heartbeat: number | null = null;
    if (assignmentId) {
      heartbeat = window.setInterval(async () => {
        try { await api.post('/progress/heartbeat', { assignment_id: assignmentId, played_minutes: 0.5 }); } catch { /* ignore */ }
      }, 30000);
    }
    return () => {
      isMounted = false;
      window.removeEventListener('game:quit', handleQuit);
      phaserGame.current?.destroy(true);
      phaserGame.current = null;
      if (heartbeat) window.clearInterval(heartbeat);
    };
  }, [assignmentId, gameId, navigate, user?.role]);

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-surface-container p-sm md:p-lg">
      <button
        onClick={() => navigate(user?.role === 'TEACHER' ? '/teacher/dashboard' : '/student/games')}
        className="absolute left-md top-md z-20 flex items-center gap-xs border-4 border-on-background bg-surface px-md py-sm font-headline text-sm font-bold uppercase shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17]"
      >
        <span className="material-symbols-outlined">arrow_back</span>
        Salir
      </button>
      <div className="z-10 flex w-full max-w-[860px] flex-col border-8 border-on-background bg-surface-container-lowest shadow-[16px_16px_0_0_#1d1c17]">
        <div className="flex items-center justify-center border-b-8 border-on-background bg-secondary px-sm py-md text-on-secondary">
          <h2 className="flex items-center gap-sm font-headline text-2xl font-bold uppercase tracking-widest">
            <span className="material-symbols-outlined text-[32px]">mood</span>
            Emoji Match
          </h2>
        </div>
        <div className="flex w-full justify-center bg-[#008eb0] p-sm">
          <div className="relative w-full overflow-hidden border-4 border-on-background" style={{ aspectRatio: '4/3' }}>
            <div ref={gameRef} className="absolute inset-0 z-10 flex h-full w-full items-center justify-center" />
          </div>
        </div>
      </div>
    </div>
  );
};
