// @ts-nocheck
import Phaser from 'phaser';

/**
 * Create a card game object.
 * Uses a 2D image with a scaleX tween to simulate card flipping,
 * replacing the unavailable scene.add.plane() (Phaser 3.60+ 3D object).
 */
export const createCard = ({
    scene,
    x,
    y,
    frontTexture,
    cardName
}) => {

    let isFlipping = false;
    let isFaceUp = false;

    const backTexture = "card-back";

    const card = scene.add.image(x, y, backTexture)
        .setName(cardName)
        .setInteractive();

    const flipCard = (callbackComplete) => {
        if (isFlipping) return;
        isFlipping = true;
        scene.sound.play("card-flip");

        // First half: scale X to 0
        scene.tweens.add({
            targets: card,
            scaleX: 0,
            duration: 150,
            ease: 'Linear',
            onComplete: () => {
                isFaceUp = !isFaceUp;
                card.setTexture(isFaceUp ? frontTexture : backTexture);
                // Second half: scale X back to 1
                scene.tweens.add({
                    targets: card,
                    scaleX: 1,
                    duration: 150,
                    ease: 'Linear',
                    onComplete: () => {
                        isFlipping = false;
                        if (callbackComplete) callbackComplete();
                    }
                });
            }
        });
    };

    const destroy = () => {
        scene.tweens.add({
            targets: card,
            y: card.y - 1000,
            duration: 500,
            ease: Phaser.Math.Easing.Elastic.In,
            onComplete: () => {
                card.destroy();
            }
        });
    };

    return {
        gameObject: card,
        flip: flipCard,
        destroy,
        cardName
    };
};
