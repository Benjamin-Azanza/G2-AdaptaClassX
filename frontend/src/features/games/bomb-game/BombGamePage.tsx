import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { useNavigate, useSearchParams } from 'react-router-dom';
import GameScene from './GameScene';
import { questions as fallbackQuestions } from '../../questions/questions';
import api from '../../../services/api';
import { useAuthStore } from '../../auth/store/authStore';

type GameQuestion = {
  q: string;
  options: string[];
  answer: number;
};

type BackendQuestionRow = {
  preguntas_json: Array<{
    texto: string;
    opciones: string[];
    respuestaCorrecta: number;
  }>;
};

export const BombGamePage: React.FC = () => {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGame = useRef<Phaser.Game | null>(null);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const assignmentId = searchParams.get('assignmentId');
  const gameId = searchParams.get('gameId');

  useEffect(() => {
    let isMounted = true;

    const handleGameQuit = () => {
      navigate(user?.role === 'TEACHER' ? '/teacher/dashboard' : '/student/tasks');
    };

    window.addEventListener('game:quit', handleGameQuit);

    async function initGame() {
      if (!gameRef.current || phaserGame.current) return;

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: 800,
          height: 800,
        },
        parent: gameRef.current,
        physics: {
          default: 'arcade',
          arcade: { gravity: { x: 0, y: 300 }, debug: false },
        },
        scene: [],
      };

      let normalizedQuestions: GameQuestion[] = fallbackQuestions;

      if (gameId) {
        try {
          const response = await api.get<BackendQuestionRow[]>(`/games/${gameId}/questions`);
          const apiQuestions = response.data.flatMap((row) =>
            (row.preguntas_json ?? []).map((question) => ({
              q: question.texto,
              options: question.opciones,
              answer: question.respuestaCorrecta,
            })),
          );

          if (apiQuestions.length > 0) {
            normalizedQuestions = apiQuestions;
          }
        } catch (error) {
          console.error('Error loading game questions', error);
        }
      }

      if (!isMounted) return;

      phaserGame.current = new Phaser.Game(config);
      phaserGame.current.scene.add('GameScene', GameScene, true, {
        preguntasDelNivel: normalizedQuestions,
      });
    }

    void initGame();

    let heartbeatInterval: number | null = null;
    if (assignmentId) {
      heartbeatInterval = window.setInterval(async () => {
        try {
          await api.post('/progress/heartbeat', {
            assignment_id: assignmentId,
            played_minutes: 0.5,
          });
        } catch (error) {
          console.error('Error sending heartbeat', error);
        }
      }, 30000);
    }

    return () => {
      isMounted = false;
      window.removeEventListener('game:quit', handleGameQuit);
      if (phaserGame.current) {
        phaserGame.current.destroy(true);
        phaserGame.current = null;
      }
      if (heartbeatInterval) {
        window.clearInterval(heartbeatInterval);
      }
    };
  }, [assignmentId, gameId, navigate, user?.role]);

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-surface-container p-sm md:p-lg">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary-container via-surface to-background opacity-50" />

      <button
        onClick={() => navigate(user?.role === 'TEACHER' ? '/teacher/dashboard' : '/student/tasks')}
        className="absolute left-md top-md z-20 flex items-center gap-xs border-4 border-on-background bg-surface px-md py-sm font-headline text-sm font-bold uppercase shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17]"
      >
        <span className="material-symbols-outlined">arrow_back</span>
        Salir
      </button>

      <div className="z-10 flex w-full max-w-[800px] flex-col border-8 border-on-background bg-surface-container-lowest shadow-[16px_16px_0_0_#1d1c17]">
        <div className="flex items-center justify-center border-b-8 border-on-background bg-primary px-sm py-md text-on-primary">
          <h2 className="flex items-center gap-sm font-headline text-2xl font-bold uppercase tracking-widest text-on-primary md:text-4xl">
            <span className="material-symbols-outlined text-[32px] md:text-[40px]">
              stadia_controller
            </span>
            Arcade
          </h2>
        </div>

        <div className="flex w-full justify-center bg-surface-container-lowest p-sm">
          <div
            className="relative w-full overflow-hidden rounded-md border-4 border-on-background shadow-inner"
            style={{
              aspectRatio: '1 / 1',
              maxWidth: 'min(100%, calc(100vh - 300px))',
            }}
          >
            <div className="absolute inset-0 z-0 bg-[#4EC0CA]" />
            <div
              ref={gameRef}
              className="absolute inset-0 z-10 flex h-full w-full items-center justify-center"
            />
          </div>
        </div>

        <div className="flex flex-col items-center justify-center border-t-8 border-on-background bg-surface-variant p-md">
          <div className="flex gap-lg md:gap-xl">
            <div className="flex flex-col items-center gap-xs">
              <div className="flex h-12 w-12 items-center justify-center border-4 border-on-background bg-error font-bold text-on-error shadow-[4px_4px_0_0_#1d1c17]">
                <span className="material-symbols-outlined">space_bar</span>
              </div>
              <span className="font-mono text-xs font-bold uppercase">Saltar</span>
            </div>
            <div className="flex flex-col items-center gap-xs">
              <div className="flex h-12 w-24 items-center justify-center gap-sm border-4 border-on-background bg-secondary font-bold text-on-secondary shadow-[4px_4px_0_0_#1d1c17]">
                <span className="material-symbols-outlined">arrow_left</span>
                <span className="material-symbols-outlined">arrow_right</span>
              </div>
              <span className="font-mono text-xs font-bold uppercase">Mover</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
