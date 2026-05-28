import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Preloader from './scenes/Preloader';
import MainMenu from './scenes/MainMenu';
import Game from './scenes/Game';
import api from '../../../services/api';
import { useAuthStore } from '../../auth/store/authStore';
import { GameConsoleWrapper } from '../components/GameConsoleWrapper';

type BackendRow = { preguntas_json: Array<{ texto: string; opciones: string[]; respuestaCorrecta: number }> };

export const SlidingPuzzleGamePage: React.FC = () => {
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
      if (!isMounted) return;

      phaserGame.current = new Phaser.Game({
        type: Phaser.AUTO,
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 1024, height: 768 },
        backgroundColor: '#002157',
        parent: gameRef.current,
        scene: [Preloader, MainMenu, Game],
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
  }, [assignmentId, gameId, navigate, user?.role, gameStarted]);

  const quitHandler = () => {
    navigate(user?.role === 'TEACHER' ? '/teacher/dashboard' : '/student/games');
  };

  return (
    <GameConsoleWrapper
      title="Sliding Puzzle"
      description="Desliza las piezas desordenadas hacia el espacio vacío contiguo para revelar la ilustración completa."
      objective="Ordena el rompecabezas en el menor número de movimientos. Responde las preguntas de desafío para ganar."
      controlsPc={[
        "Mover piezas: Clic izquierdo sobre una pieza adyacente al espacio vacío",
        "Pausar: Tecla ESC"
      ]}
      controlsMobile={[
        "Mover piezas: Toca las piezas directamente",
        "Pausar: Botón Pausa"
      ]}
      hasGamepad={false}
      phaserGameRef={phaserGame}
      gameRef={gameRef}
      gameStarted={gameStarted}
      setGameStarted={setGameStarted}
      onQuit={quitHandler}
    />
  );
};
