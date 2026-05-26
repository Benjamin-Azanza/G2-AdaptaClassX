// @ts-nocheck
import Phaser from 'phaser';
import { createCard } from "./createCard";

export class Play extends Phaser.Scene
{
    // Cards Game Objects
    cards = [];

    // History of card opened
    cardOpened = undefined;

    // Can play the game
    canMove = false;

    // Game variables
    lives = 10;
    maxLives = 10;
    level = 1;
    score = 0;
    hearts = [];
    searchingText = null;
    scoreText = null;

    // Word Concept pairs database
    pairsDatabase = {
        sinonimos: [
            { word: "rápido", match: "veloz" },
            { word: "alegre", match: "contento" },
            { word: "grande", match: "enorme" },
            { word: "triste", match: "penoso" },
            { word: "cálido", match: "caliente" },
            { word: "fácil", match: "sencillo" },
            { word: "bonito", match: "hermoso" },
            { word: "frío", match: "gélido" },
            { word: "sabio", match: "inteligente" },
            { word: "limpio", match: "aseado" }
        ],
        antonimos: [
            { word: "alto", match: "bajo" },
            { word: "día", match: "noche" },
            { word: "luz", match: "oscuridad" },
            { word: "fuerte", match: "débil" },
            { word: "reír", match: "llorar" },
            { word: "frío", match: "caliente" },
            { word: "joven", match: "viejo" },
            { word: "abierto", match: "cerrado" },
            { word: "dulce", match: "amargo" },
            { word: "limpio", match: "sucio" }
        ],
        definiciones: [
            { word: "Sustantivo", match: "Nombra personas, cosas..." },
            { word: "Verbo", match: "Expresa acciones" },
            { word: "Adjetivo", match: "Describe cualidades" },
            { word: "Fábula", match: "Relato con moraleja" },
            { word: "Sinónimo", match: "Significado similar" },
            { word: "Antónimo", match: "Significado opuesto" },
            { word: "Sílaba", match: "Sonidos juntos" },
            { word: "Pronombre", match: "Reemplaza sustantivo" },
            { word: "Metáfora", match: "Comparación implícita" },
            { word: "Paréntesis", match: "Aclara texto interno" }
        ]
    };

    constructor ()
    {
        super({ key: 'Play' });
    }

    init (data)
    {
        this.cameras.main.fadeIn(500);
        
        if (data && data.level) {
            this.level = data.level;
            this.lives = data.lives !== undefined ? data.lives : 10;
            this.score = data.score !== undefined ? data.score : 0;
            this.maxLives = data.maxLives !== undefined ? data.maxLives : 10;
        } else {
            this.level = 1;
            this.lives = 10;
            this.score = 0;
            this.maxLives = 10;
        }
        
        this.volumeButton();
    }

    create ()
    {
        // Background
        this.add.image(0, 0, "background").setOrigin(0).setDisplaySize(800, 600);

        const currentTheme = this.getCurrentTheme();
        const displayThemeName = currentTheme === 'sinonimos' ? 'SINÓNIMOS' 
                               : currentTheme === 'antonimos' ? 'ANTÓNIMOS' 
                               : 'DEFINICIONES';

        // Title/Start screen (only on level 1)
        if (this.level === 1) {
            const titleText = this.add.text(400, 300,
                "Memory Card de Lenguaje\n\nClick para Jugar",
                { align: "center", strokeThickness: 4, fontSize: '36px', fontStyle: "bold", color: "#8c7ae6", fontFamily: 'monospace' }
            )
            .setOrigin(.5)
            .setDepth(3)
            .setInteractive();

            this.add.tween({
                targets: titleText,
                duration: 800,
                ease: (value) => (value > .8),
                alpha: 0,
                repeat: -1,
                yoyo: true,
            });

            titleText.on('pointerdown', () => {
                this.sound.play("whoosh", { volume: 1.3 });
                this.add.tween({
                    targets: titleText,
                    y: -1000,
                    duration: 500,
                    onComplete: () => {
                        titleText.destroy();
                        if (!this.sound.get("theme-song")) {
                            this.sound.play("theme-song", { loop: true, volume: .3 });
                        }
                        this.startGame();
                    }
                });
            });
        } else {
            this.startGame();
        }
    }

    getCurrentTheme() {
        if (this.level === 1) return 'sinonimos';
        if (this.level === 2) return 'antonimos';
        if (this.level === 3) return 'definiciones';
        // Alternar
        const themes = ['sinonimos', 'antonimos', 'definiciones'];
        return themes[(this.level - 1) % 3];
    }

    getCardCount() {
        if (this.level === 1) return 12; // 6 parejas
        if (this.level === 2) return 16; // 8 parejas
        return 20; // 10 parejas
    }

    startGame ()
    {
        const cardCount = this.getCardCount();
        const currentTheme = this.getCurrentTheme();
        
        const displayThemeName = currentTheme === 'sinonimos' ? 'SINÓNIMOS' 
                               : currentTheme === 'antonimos' ? 'ANTÓNIMOS' 
                               : 'DEFINICIONES';

        // Interface texts
        this.add.text(16, 16, `Nivel: ${this.level}`, {
            fontFamily: 'monospace', fontSize: '22px', color: '#ffffff', fontStyle: 'bold'
        });

        // "Buscando: [Tema]" text below the hearts (hearts start at x=140, y=20)
        this.searchingText = this.add.text(140, 52, `Buscando: ${displayThemeName}`, {
            fontFamily: 'monospace', fontSize: '18px', color: '#facc15', fontStyle: 'bold'
        });

        // WinnerText and GameOverText
        const winnerText = this.add.text(400, -1000, "¡NIVEL COMPLETADO!",
            { align: "center", strokeThickness: 4, fontSize: '42px', fontStyle: "bold", color: "#22c55e", fontFamily: 'monospace' }
        ).setOrigin(.5).setDepth(15).setInteractive();
 
        const gameOverText = this.add.text(400, -1000,
            "¡HAS PERDIDO!\nClick para REINICIAR",
            { align: "center", strokeThickness: 4, fontSize: '42px', fontStyle: "bold", color: "#ff0000", fontFamily: 'monospace' }
        ).setName("gameOverText").setDepth(15).setOrigin(.5).setInteractive();

        // Score display
        this.scoreText = this.add.text(620, 16, `Puntos: ${this.score}`, {
            fontFamily: 'monospace', fontSize: '22px', color: '#22c55e', fontStyle: 'bold'
        });

        // Render hearts
        this.hearts = this.createHearts();

        // Generate card pairs
        this.cards = this.generateConceptCards(cardCount, currentTheme);

        // Enable moves after animation completes
        this.time.addEvent({
            delay: 150 * this.cards.length,
            callback: () => {
                this.canMove = true;
            }
        });

        // Interaction logic
        this.input.on('pointerdown', (pointer) => {
            if (!this.canMove || this.cards.length === 0) return;

            const card = this.cards.find(c => c.gameObject.getBounds().contains(pointer.x, pointer.y));
            if (card) {
                this.canMove = false;

                if (this.cardOpened !== undefined) {
                    // Prevent clicking same card
                    if (this.cardOpened.gameObject.x === card.gameObject.x && this.cardOpened.gameObject.y === card.gameObject.y) {
                        this.canMove = true;
                        return;
                    }

                    card.flip(() => {
                        if (this.cardOpened.pairId === card.pairId) {
                            // MATCH!
                            this.sound.play("card-match");
                            this.score += 100;
                            this.scoreText.setText(`Puntos: ${this.score}`);
                            
                            const o1 = this.cardOpened;
                            const o2 = card;
                            
                            this.cards = this.cards.filter(cLocal => cLocal.pairId !== card.pairId);
                            this.cardOpened = undefined;
                            
                            this.time.delayedCall(400, () => {
                                o1.destroy();
                                o2.destroy();
                                this.canMove = true;
                                
                                // Check win
                                if (this.cards.length === 0) {
                                    this.sound.play("victory");
                                    this.canMove = false;
                                    
                                    this.add.tween({
                                        targets: winnerText,
                                        ease: Phaser.Math.Easing.Bounce.Out,
                                        y: 300,
                                    });
                                }
                            });
                        } else {
                            // MISMATCH!
                            this.sound.play("card-mismatch");
                            this.cameras.main.shake(400, 0.005);
                            
                            // Remove life & heart
                            const lastHeart = this.hearts[this.hearts.length - 1];
                            if (lastHeart) {
                                this.add.tween({
                                    targets: lastHeart,
                                    ease: Phaser.Math.Easing.Expo.InOut,
                                    duration: 500,
                                    y: -1000,
                                    onComplete: () => {
                                        lastHeart.destroy();
                                    }
                                });
                                this.hearts.pop();
                            }
                            this.lives -= 1;

                            this.time.delayedCall(1000, () => {
                                card.flip();
                                this.cardOpened.flip(() => {
                                    this.cardOpened = undefined;
                                    this.canMove = true;
                                });
                            });
                        }

                        // Check lose
                        if (this.lives <= 0) {
                            this.sound.play("whoosh", { volume: 1.3 });
                            this.add.tween({
                                targets: gameOverText,
                                ease: Phaser.Math.Easing.Bounce.Out,
                                y: 300,
                            });
                            this.canMove = false;
                        }
                    });
                } else {
                    card.flip(() => {
                        this.canMove = true;
                    });
                    this.cardOpened = card;
                }
            }
        });

        // Win click: goes to next level
        winnerText.on('pointerdown', () => {
            this.sound.play("whoosh", { volume: 1.3 });
            this.add.tween({
                targets: winnerText,
                y: -1000,
                duration: 500,
                onComplete: () => {
                    this.cards.forEach(c => c.gameObject.destroy());
                    this.cards = [];
                    const nextMaxLives = this.maxLives + 2;
                    this.scene.start('Play', { 
                        level: this.level + 1, 
                        lives: Math.min(nextMaxLives, this.lives + 2),
                        score: this.score,
                        maxLives: nextMaxLives
                    });
                }
            });
        });
 
        // Game Over click: restarts game
        gameOverText.on('pointerdown', () => {
            this.add.tween({
                targets: gameOverText,
                y: -1000,
                duration: 500,
                onComplete: () => {
                    this.cards.forEach(c => c.gameObject.destroy());
                    this.cards = [];
                    this.scene.start('Play', { level: 1, lives: 10, score: 0, maxLives: 10 });
                }
            });
        });
    }

    generateConceptCards(cardCount, currentTheme) {
        const fullList = this.pairsDatabase[currentTheme];
        const numPairs = cardCount / 2;
        
        // Select random subset of pairs
        const selectedPairs = Phaser.Utils.Array.Shuffle([...fullList]).slice(0, numPairs);

        // Construct 2N card definitions
        const cardDefs = [];
        selectedPairs.forEach((pair, index) => {
            cardDefs.push({ text: pair.word, pairId: index });
            cardDefs.push({ text: pair.match, pairId: index });
        });

        // Shuffle card definitions
        const shuffledDefs = Phaser.Utils.Array.Shuffle(cardDefs);

        // Calculate layout columns and rows dynamically
        let cols = 4;
        if (cardCount > 16) {
            cols = 5;
        } else if (cardCount > 12) {
            cols = 4;
        }
        const rows = Math.ceil(cardCount / cols);

        const paddingX = 16;
        const paddingY = 14;
        const wAvail = 760; // 20px padding left and right
        const hAvail = 420; // leaves space at top for headers (lives, theme name, etc.)

        // Compute maximum scale that fits within both available width and height
        const scaleW = (wAvail - (cols - 1) * paddingX) / (cols * 98);
        const scaleH = (hAvail - (rows - 1) * paddingY) / (rows * 128);
        const scale = Math.min(1.0, scaleW, scaleH);

        const cardW = 98 * scale;
        const cardH = 128 * scale;

        const gridW = cols * (cardW + paddingX) - paddingX;
        const gridH = rows * (cardH + paddingY) - paddingY;

        // Center the grid dynamically in the canvas (800x600)
        const xStart = (800 - gridW) / 2 + cardW / 2;
        const yStart = 140 + (420 - gridH) / 2 + cardH / 2;

        return shuffledDefs.map((def, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);

            const tx = xStart + col * (cardW + paddingX);
            const ty = yStart + row * (cardH + paddingY);

            const card = createCard({
                scene: this,
                x: tx,
                y: -500, // Starts offscreen
                textString: def.text,
                cardName: `card_${index}`,
                pairId: def.pairId,
                scale: scale
            });

            // Slide card in
            this.add.tween({
                targets: card.gameObject,
                y: ty,
                duration: 800,
                delay: index * 100,
                ease: 'Back.easeOut',
                onStart: () => this.sound.play("card-slide", { volume: 0.6 })
            });

            return card;
        });
    }

    createHearts ()
    {
        return Array.from(new Array(this.lives)).map((el, index) => {
            const heart = this.add.image(1000, 28, "heart").setScale(1.6);
            this.add.tween({
                targets: heart,
                ease: Phaser.Math.Easing.Expo.InOut,
                duration: 800,
                delay: 100 + index * 100,
                x: 140 + 26 * index
            });
            return heart;
        });
    }

    volumeButton ()
    {
        const volumeIcon = this.add.image(25, 25, "volume-icon").setName("volume-icon");
        volumeIcon.setInteractive();
        volumeIcon.on('pointerover', () => this.input.setDefaultCursor("pointer"));
        volumeIcon.on('pointerout', () => this.input.setDefaultCursor("default"));

        volumeIcon.on('pointerdown', () => {
            if (this.sound.volume === 0) {
                this.sound.setVolume(1);
                volumeIcon.setTexture("volume-icon");
                volumeIcon.setAlpha(1);
            } else {
                this.sound.setVolume(0);
                volumeIcon.setTexture("volume-icon_off");
                volumeIcon.setAlpha(.5);
            }
        });
    }
}
