import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { useNavigate, useSearchParams } from 'react-router-dom';
import GameScene from './GameScene';
import { questions as fallbackQuestions } from '../../questions/questions';
import api from '../../../services/api';
import { useAuthStore } from '../../auth/store/authStore';
import { GameConsoleWrapper } from '../components/GameConsoleWrapper';

type GameQuestion = {
  q: string;
  options: string[];
  answer: number;
};

type BackendQuestionRow = {
  preguntas_json: Array<{
    texto?: string;
    opciones?: string[];
    respuestaCorrecta?: number;
    prompt?: string;
    options?: string[];
    correctOptionIndex?: number;
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

  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    if (!gameStarted) return;

    let isMounted = true;

    const handleGameQuit = () => {
      navigate(user?.role === 'TEACHER' ? '/teacher/dashboard' : '/student/games');
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
              q: question.texto ?? question.prompt ?? '',
              options: question.opciones ?? question.options ?? [],
              answer: question.respuestaCorrecta ?? question.correctOptionIndex ?? 0,
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
  }, [assignmentId, gameId, navigate, user?.role, gameStarted]);

  const quitHandler = () => {
    navigate(user?.role === 'TEACHER' ? '/teacher/dashboard' : '/student/games');
  };

  return (
    <GameConsoleWrapper
      title="Quiz Rápido - Lectura"
      description="Controla al personaje para esquivar bombas, recoger estrellas y responder preguntas sobre textos y lecturas."
      objective="Recoge todas las estrellas posibles. Si tocas un enemigo o una bomba, se te presentará una pregunta para salvar tu vida. Toca los botiquines para responder preguntas y curarte."
      controlsPc={[
        "Moverse: Flechas Izquierda/Derecha o A/D",
        "Saltar: Barra Espaciadora o Flecha Arriba o W",
        "Pausar: Tecla ESC"
      ]}
      controlsMobile={[
        "Moverse: Flechas Izquierda/Derecha en el D-Pad",
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
