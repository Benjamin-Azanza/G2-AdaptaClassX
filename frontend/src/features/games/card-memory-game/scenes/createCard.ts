// @ts-nocheck
import Phaser from 'phaser';

export const createCard = ({
    scene,
    x,
    y,
    textString,
    cardName,
    pairId,
    scale = 1.0
}) => {

    let isFlipping = false;
    let isFaceUp = false;

    const backTexture = "card-back";
    const frontTexture = "card-0";

    const container = scene.add.container(x, y).setName(cardName).setSize(98, 128);
    container.setScale(scale);
    
    // Background sprite
    const bg = scene.add.sprite(0, 0, backTexture).setInteractive();
    container.add(bg);

    // Dynamically adjust font size based on text length to fit nicely on the card
    let fontSizeVal = '11px';
    if (textString.length > 25) {
        fontSizeVal = '9px';
    } else if (textString.length > 18) {
        fontSizeVal = '10px';
    }

    // Text label (hidden by default)
    const label = scene.add.text(0, 0, textString, {
        fontFamily: 'Arial',
        fontSize: fontSizeVal,
        color: '#2d3748',
        fontStyle: 'bold',
        wordWrap: { width: 82 },
        align: 'center'
    }).setOrigin(0.5).setVisible(false);
    container.add(label);

    // Make container interactive by forwarding events from background sprite
    bg.on('pointerdown', (pointer) => {
        container.emit('pointerdown', pointer);
    });

    const flipCard = (callbackComplete) => {
        if (isFlipping) return;
        isFlipping = true;
        scene.sound.play("card-flip");

        scene.tweens.add({
            targets: container,
            scaleX: 0,
            duration: 150,
            ease: 'Linear',
            onComplete: () => {
                isFaceUp = !isFaceUp;
                bg.setTexture(isFaceUp ? frontTexture : backTexture);
                label.setVisible(isFaceUp);
                scene.tweens.add({
                    targets: container,
                    scaleX: scale,
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
            targets: container,
            y: container.y - 1000,
            duration: 500,
            ease: Phaser.Math.Easing.Elastic.In,
            onComplete: () => {
                container.destroy();
            }
        });
    };

    return {
        gameObject: container,
        flip: flipCard,
        destroy,
        cardName,
        pairId,
        textString
    };
};
