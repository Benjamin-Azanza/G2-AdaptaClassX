import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import GameScene from './GameScene';
import { questions } from '../../data/questions'; // Importamos tu JSON

const JuegoLectura: React.FC = () => {
    const gameRef = useRef<HTMLDivElement>(null);
    const phaserGame = useRef<Phaser.Game | null>(null);

    useEffect(() => {
        // Verificamos que el div exista y que no hayamos iniciado el juego ya
        if (gameRef.current && !phaserGame.current) {
            const config: Phaser.Types.Core.GameConfig = {
                type: Phaser.AUTO,
                scale: {
                    mode: Phaser.Scale.FIT,
                    autoCenter: Phaser.Scale.CENTER_BOTH,
                    width: 800,
                    height: 800,
                },
                parent: gameRef.current, // <-- Aquí le decimos que se dibuje dentro de nuestro Div de React
                physics: {
                    default: 'arcade',
                    arcade: { gravity: { x: 0, y: 300 }, debug: false }
                },
                scene: [] // Lo dejamos vacío inicialmente
            };

            // Inicializamos el juego
            phaserGame.current = new Phaser.Game(config);

            // Añadimos y arrancamos la escena pasándole el JSON de preguntas
            phaserGame.current.scene.add('GameScene', GameScene, true, { preguntasDelNivel: questions });
        }

        // Limpieza: Si el estudiante sale de la pantalla de React, destruimos el juego para no gastar memoria
        return () => {
            if (phaserGame.current) {
                phaserGame.current.destroy(true);
                phaserGame.current = null;
            }
        };
    }, []);

    // Devolvemos un simple div negro que ocupará toda la pantalla
    return <div ref={gameRef} className="w-full h-screen bg-black" />;
};

export default JuegoLectura;