import React from 'react';
import Phaser from 'phaser';
import Boot from './scenes/Boot';
import Preloader from './scenes/Preloader';
import MainMenu from './scenes/MainMenu';
import Game from './scenes/Game';
import { GameConsoleWrapper } from '../components/GameConsoleWrapper';
import { useGameSession } from '../hooks/useGameSession';

export const BankPanicGamePage: React.FC = () => {
  const { gameRef, phaserGame, gameStarted, setGameStarted, quitHandler } = useGameSession(
    (parent) =>
      new Phaser.Game({
        type: Phaser.AUTO,
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 1024, height: 768 },
        backgroundColor: '#2e91f3',
        parent,
        scene: [Boot, Preloader, MainMenu, Game],
      }),
  );

  return (
    <GameConsoleWrapper
      title="Bank Panic"
      description="Eres el sheriff a cargo de proteger la sucursal del banco. Las puertas se abrirán revelando bandidos armados o inocentes rehenes."
      objective="Acaba con los ladrones antes de que disparen y recoge las bolsas de dinero de los clientes. Responde las preguntas de desafío para continuar."
      controlsPc={[
        'Moverse a los lados: Flechas Izquierda / Derecha',
        'Disparar a puertas: Teclas S / F / J (izquierda, centro, derecha)',
        'Pausar: Tecla ESC',
      ]}
      controlsMobile={[
        'Interacciones: Toca directamente las puertas en pantalla para cambiar de vista, recibir clientes o disparar',
        'Pausar: Botón Pausa',
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
