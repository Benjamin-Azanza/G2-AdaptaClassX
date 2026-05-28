import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Boot from './scenes/Boot';
import Preloader from './scenes/Preloader';
import MainMenu from './scenes/MainMenu';
import Game from './scenes/Game';
import api from '../../../services/api';
import { useAuthStore } from '../../auth/store/authStore';
import { questions as fallbackQuestions } from '../../questions/questions';
import { GameConsoleWrapper } from '../components/GameConsoleWrapper';

type BackendRow = { preguntas_json: Array<{ texto: string; opciones: string[]; respuestaCorrecta: number }> };

export const BankPanicGamePage: React.FC = () => {
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
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 1024, height: 768 },
        backgroundColor: '#2e91f3',
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
  }, [assignmentId, gameId, navigate, user?.role, gameStarted]);

  const quitHandler = () => {
    navigate(user?.role === 'TEACHER' ? '/teacher/dashboard' : '/student/games');
  };

  return (
    <GameConsoleWrapper
      title="Bank Panic"
      description="Eres el sheriff a cargo de proteger la sucursal del banco. Las puertas se abrirán revelando bandidos armados o inocentes rehenes."
      objective="Acaba con los ladrones antes de que disparen y recoge las bolsas de dinero de los clientes. Responde las preguntas de desafío para continuar."
      controlsPc={[
        "Moverse a los lados: Flechas Izquierda / Derecha",
        "Disparar a puertas: Teclas S / F / J (izquierda, centro, derecha)",
        "Pausar: Tecla ESC"
      ]}
      controlsMobile={[
        "Interacciones: Toca directamente las puertas en pantalla para cambiar de vista, recibir clientes o disparar",
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
