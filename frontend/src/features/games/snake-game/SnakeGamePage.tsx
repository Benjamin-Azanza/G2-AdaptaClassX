import React from 'react';
import Phaser from 'phaser';
import SnakeScene from './scenes/Snake';
import { GameConsoleWrapper } from '../components/GameConsoleWrapper';
import { useGameSession } from '../hooks/useGameSession';

export const SnakeGamePage: React.FC = () => {
  const { gameRef, phaserGame, gameStarted, setGameStarted, quitHandler } = useGameSession(
    (parent) =>
      new Phaser.Game({
        type: Phaser.AUTO,
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 640, height: 480 },
        backgroundColor: '#bfcc00',
        parent,
        scene: [SnakeScene],
      }),
  );

  return (
    <GameConsoleWrapper
      title="Snake"
      description="Come frutas para crecer y obtener puntos, pero ten cuidado de no chocar contra ti mismo ni con los límites del tablero."
      objective="Guía a la serpiente para alcanzar la mayor longitud posible. Si chocas contra algún obstáculo, tendrás una pregunta de salvación."
      controlsPc={[
        'Moverse: Flechas del Teclado',
        'Pausar: Tecla ESC',
      ]}
      controlsMobile={[
        'Moverse: Desliza tu dedo (swipe) por la pantalla en la dirección deseada',
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
