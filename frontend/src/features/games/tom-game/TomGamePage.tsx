import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Preloader from './scenes/Preloader';
import Menu from './scenes/Menu';
import Play from './scenes/Play';
import UI from './scenes/UI';
import api from '../../../services/api';
import { useAuthStore } from '../../auth/store/authStore';
import { questions as fallbackQuestions } from '../../questions/questions';
import { GameConsoleWrapper } from '../components/GameConsoleWrapper';

type BackendRow = { preguntas_json: Array<{ texto: string; opciones: string[]; respuestaCorrecta: number }> };

export const TomGamePage: React.FC = () => {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGame = useRef<Phaser.Game | null>(null);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const assignmentId = searchParams.get('assignmentId');
  const gameId = searchParams.get('gameId');

  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    if (!gameStarted) return;

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
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 640, height: 360 },
        parent: gameRef.current,
        pixelArt: true,
        physics: { default: 'arcade', arcade: { gravity: { y: 2000 } } },
        scene: [Preloader, UI, Play, Menu],
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
  }, [assignmentId, gameId, navigate, user?.role, gameStarted]);

  const quitHandler = () => {
    navigate(user?.role === 'TEACHER' ? '/teacher/dashboard' : '/student/games');
  };

  return (
    <GameConsoleWrapper
      title="Tom"
      description="Ayuda a Tom a recolectar deliciosos tomates maduros mientras esquivas las bombas con pinchos."
      objective="Recoge la mayor cantidad posible de tomates. Si colisionas con una bomba con pinchos, tendrás una pregunta de salvación para evitar perder vida."
      controlsPc={[
        "Moverse: Flechas Izquierda / Derecha",
        "Saltar: Flecha Arriba o Barra Espaciadora",
        "Pausar: Tecla ESC"
      ]}
      controlsMobile={[
        "Moverse: Flechas Izquierda / Derecha en el D-Pad",
        "Saltar: Botón A",
        "Pausar: Botón Pausa"
      ]}
      hasGamepad={true}
      phaserGameRef={phaserGame}
      gameRef={gameRef}
      gameStarted={gameStarted}
      setGameStarted={setGameStarted}
      onQuit={quitHandler}
    />
  );
};
