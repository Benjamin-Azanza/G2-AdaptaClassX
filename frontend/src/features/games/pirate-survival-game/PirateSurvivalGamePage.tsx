import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BootScene } from './scenes/BootScene';
import { StoryScene } from './scenes/StoryScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { GameScene } from './scenes/GameScene';
import api from '../../../services/api';
import { useAuthStore } from '../../auth/store/authStore';
import { questions as fallbackQuestions } from '../../questions/questions';

type BackendRow = { preguntas_json: Array<{ texto: string; opciones: string[]; respuestaCorrecta: number }> };

export const PirateSurvivalGamePage: React.FC = () => {
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
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 960, height: 540 },
        backgroundColor: '#1a0a00',
        parent: gameRef.current,
        scene: [BootScene, StoryScene, MainMenuScene, GameScene],
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
      phaserGame.current?.sound?.stopAll();
      phaserGame.current?.destroy(true);
      phaserGame.current = null;
      if (heartbeat) window.clearInterval(heartbeat);
    };
  }, [assignmentId, gameId, navigate, user?.role]);

  const [isPaused, setIsPaused] = React.useState(false);

  const handlePause = () => {
    setIsPaused(true);
    phaserGame.current?.scene.getScenes(true).forEach(s => s.scene.pause());
  };

  const handleResume = () => {
    setIsPaused(false);
    phaserGame.current?.scene.getScenes(false).forEach(s => {
      if (s.scene.isPaused()) s.scene.resume();
    });
  };

  const handleRestart = () => {
    setIsPaused(false);
    phaserGame.current?.sound?.stopAll();
    phaserGame.current?.scene.getScenes(false).forEach(s => s.scene.stop());
    phaserGame.current?.scene.start('StoryScene');
  };

  const handleMenu = () => {
    setIsPaused(false);
    phaserGame.current?.sound?.stopAll();
    phaserGame.current?.scene.getScenes(false).forEach(s => s.scene.stop());
    phaserGame.current?.scene.start('MainMenuScene');
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-surface-container p-sm md:p-lg">
      <div className="absolute left-md top-md z-20 flex gap-sm">
        <button
          onClick={() => navigate(user?.role === 'TEACHER' ? '/teacher/dashboard' : '/student/games')}
          className="flex items-center gap-xs border-4 border-on-background bg-surface px-md py-sm font-headline text-sm font-bold uppercase shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17]"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Salir
        </button>
        <button
          onClick={handlePause}
          disabled={isPaused}
          className="flex items-center gap-xs border-4 border-on-background bg-surface px-md py-sm font-headline text-sm font-bold uppercase shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17] disabled:opacity-50"
        >
          <span className="material-symbols-outlined">pause</span>
          Pausa
        </button>
      </div>

      <div className="z-10 flex w-full max-w-[960px] flex-col border-8 border-on-background bg-surface-container-lowest shadow-[16px_16px_0_0_#1d1c17]">
        <div className="flex items-center justify-center border-b-8 border-on-background bg-secondary px-sm py-md text-on-secondary">
          <h2 className="flex items-center gap-sm font-headline text-2xl font-bold uppercase tracking-widest">
            <span className="material-symbols-outlined text-[32px]">sports_martial_arts</span>
            Pirate Survival
          </h2>
        </div>
        <div className="flex w-full justify-center bg-[#1a0a00] p-sm">
          <div className="relative w-full overflow-hidden border-4 border-on-background" style={{ aspectRatio: '16/9' }}>
            <div ref={gameRef} className="absolute inset-0 z-10 flex h-full w-full items-center justify-center" />
            
            {isPaused && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80">
                <h1 className="mb-8 font-monospace text-5xl font-bold text-white">PAUSA</h1>
                <div className="flex flex-col gap-4 w-64">
                  <button
                    onClick={handleResume}
                    className="w-full border-4 border-white bg-green-500 py-3 font-monospace text-xl font-bold text-black shadow-[4px_4px_0_0_#ffffff] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#ffffff]"
                  >
                    CONTINUAR
                  </button>
                  <button
                    onClick={handleRestart}
                    className="w-full border-4 border-white bg-black py-3 font-monospace text-xl font-bold text-white shadow-[4px_4px_0_0_#ffffff] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#ffffff]"
                  >
                    REINICIAR
                  </button>
                  <button
                    onClick={handleMenu}
                    className="w-full border-4 border-white bg-black py-3 font-monospace text-xl font-bold text-white shadow-[4px_4px_0_0_#ffffff] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#ffffff]"
                  >
                    VOLVER AL MENÚ
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
