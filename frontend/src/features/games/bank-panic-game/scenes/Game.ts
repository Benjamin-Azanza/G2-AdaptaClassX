// @ts-nocheck
import Phaser from 'phaser';

import Door from './Door';

export default class MainGame extends Phaser.Scene
{
    constructor ()
    {
        super('MainGame');

        this.hats;
        this.goals;
        this.gold;
        this.doors;

        this.isPaused = false;
        this.goalsComplete = 0;
        this.sign;

        this.level = 1;
        this.levelImage;

        this.killDelay = 0.7;
        this.closeDurationLow = 2000;
        this.closeDurationHigh = 4000;

        this.isQuestionMode = false;
        this.questionTimer = 0;
        this.currentQuestion = null;
        this.questionText = null;
        this.instructionText = null;
        this.preguntas = [];
        this.correctDoorIndex = -1;
    }

    create ()
    {
        this.add.image(512, 384, 'background');

        //  Level text
        this.add.image(450, 650, 'assets', 'levelText');

        this.levelImage = this.add.image(600, 650, 'assets', '1');

        this.createGoals();
        this.createDoors();

        this.hats = this.add.group({
            defaultKey: 'assets',
            defaultFrame: 'hat',
            key: 'assets',
            frame: 'hat',
            active: false,
            visible: false,
            repeat: 32,
            maxSize: 32
        });

        this.gold = this.add.group({
            defaultKey: 'assets',
            defaultFrame: 'gold',
            key: 'assets',
            frame: 'gold',
            active: false,
            visible: false,
            repeat: 11,
            maxSize: 12
        });

        this.isPaused = false;

        this.level = 1;
        this.killDelay = 0.8;
        this.closeDurationLow = 2000;
        this.closeDurationHigh = 4000;

        this.preguntas = this.registry.get('preguntasDelNivel') || [];
        this.isQuestionMode = false;
        this.questionTimer = this.time.now + 15000; // First question after 15 seconds

        this.questionPanel = this.add.graphics().setDepth(99).setVisible(false);

        this.questionText = this.add.text(512, 65, '', {
            fontFamily: 'Courier',
            fontSize: '26px',
            color: '#ffffff',
            padding: { x: 20, y: 12 },
            wordWrap: { width: 840, useAdvancedWrap: true },
            align: 'center',
            shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 6, fill: true }
        }).setOrigin(0.5).setVisible(false).setDepth(100);

        this.instructionText = this.add.text(512, 168, '¡DISPARA A LA RESPUESTA CORRECTA!', {
            fontFamily: 'Courier',
            fontSize: '20px',
            color: '#ffd700',
            padding: { x: 12, y: 6 },
            shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 4, fill: true }
        }).setOrigin(0.5).setVisible(false).setDepth(100);

        this.doors.forEach((door) => {
            door.start(this.game.getTime());
        });
    }

    createGoals ()
    {
        this.goals = [];
        this.goalsComplete = 0;

        for (let i = 1; i <= 12; i++)
        {
            this.goals.push(this.add.image(0, 0, 'assets', i));
        }

        Phaser.Actions.GridAlign(this.goals, {
            width: 12,
            height: 1,
            cellWidth: 80,
            cellHeight: 36,
            x: 80,
            y: 86
        });
    }

    createDoors ()
    {
        this.doors = [];

        let doorWidth = 200;
        let doorSpace = Math.floor((1024 - (doorWidth * 4)) / 5);

        let x = 100 + doorSpace;
        let y = 352;

        for (let i = 1; i <= 4; i++)
        {
            this.doors.push(new Door('Door' + i, this, x, y))

            x += doorWidth + doorSpace;
        }
    }

    addGold (x, y)
    {
        let target = this.goals[this.goalsComplete];

        let gold = this.gold.get(x + 50, y + 100);

        gold.setActive(true).setVisible(true);

        this.sound.play('money');

        this.tweens.add({
            targets: gold,
            x: target.x,
            y: target.y,
            duration: 600,
            ease: 'Quad.easeOut',
            onComplete: () => {
                target.setVisible(false);
            }
        });

        this.goalsComplete++;

        if (this.goalsComplete === 12)
        {
            this.levelComplete();
        }
    }

    addHat (x, y, stackPosition)
    {
        y = 180 + (30 * (5 - stackPosition));

        let hat = this.hats.get(x, y);

        hat.setActive(true).setVisible(true);
        hat.setScale(1).setAlpha(1);

        const destX = Phaser.Math.RND.between(x - 400, x + 400);
        const destY = y - 400;

        this.tweens.add({
            targets: hat,
            x: destX,
            y: destY,
            angle: 960,
            duration: 1000,
            ease: 'Quad.easeOut',
            onComplete: () => {
                hat.setActive(false);
                hat.setVisible(false);
            }
        });
    }

    levelFail ()
    {
        this.isPaused = true;

        this.sign = this.add.image(512, -200, 'assets', 'gameOver');

        this.sound.play('gameOver');

        this.tweens.add({
            targets: this.sign,
            y: 384,
            ease: 'Bounce.easeOut',
            duration: 1500,
            onComplete: () => {
                this.input.once('pointerdown', () => this.scene.start('MainMenu'));
            }
        });
    }

    levelComplete ()
    {
        this.isPaused = true;

        this.sign = this.add.image(512, -200, 'assets', 'levelComplete');

        this.sound.play('levelComplete');

        this.tweens.add({
            targets: this.sign,
            y: 384,
            ease: 'Bounce.easeOut',
            duration: 1500,
            onComplete: () => {
                this.input.once('pointerdown', () => this.nextLevel());
            }
        });
    }

    nextLevel ()
    {
        this.goals.forEach((goal, index) => {
            goal.setFrame((index + 1).toString());
            goal.setVisible(true);
        });

        this.gold.getChildren().forEach((gold) => {
            gold.setVisible(false);
            gold.setActive(false);
        });

        //  Reset everything
        this.doors.forEach((door) => {
            door.reset(this.game.getTime());
        });

        this.goalsComplete = 0;

        //  Change difficulty

        if (this.level < 5)
        {
            this.killDelay -= 0.1;
        }

        if (this.level < 10)
        {
            this.closeDurationLow -= 100;
            this.closeDurationHigh -= 200;
        }

        //  Change level counter
        this.level++;

        this.levelImage.setFrame(this.level);

        this.sign.setVisible(false);

        this.isPaused = false;
    }

    killed (x, y)
    {
        //  Bullet holes on the screen

        let offsetX = 100;

        for (let i = 0; i < 3; i++)
        {
            let x = Phaser.Math.RND.between(offsetX, offsetX + 200);
            let y = Phaser.Math.RND.between(200, 600);

            let hole = this.add.image(x, y, 'bulletHole').setAlpha(0);

            this.tweens.add({
                targets: hole,
                alpha: 1,
                duration: 30,
                delay: 200 * i
            });

            offsetX += 340;
        }

        this.levelFail();
    }

    startQuestionEvent(time)
    {
        this.isQuestionMode = true;
        
        // Pick random question
        const questionIndex = Phaser.Math.RND.between(0, this.preguntas.length - 1);
        this.currentQuestion = this.preguntas[questionIndex];
        
        // Force all doors to close if open
        this.doors.forEach((door) => {
            if (door.isOpen) door.closeDoor(time);
        });

        // Setup the question UI
        this.questionText.setText(this.currentQuestion.q);
        this.questionText.setVisible(true);

        // Snap instruction text directly below the question with a small gap
        const qb = this.questionText.getBounds();
        this.instructionText.setY(qb.bottom + this.instructionText.height / 2 + 6);
        this.instructionText.setVisible(true);

        // Draw single semi-transparent panel snugly wrapping both texts
        const ib = this.instructionText.getBounds();
        const px = Math.min(qb.x, ib.x) - 14;
        const py = qb.y - 14;
        const pw = Math.max(qb.right, ib.right) - px + 14;
        const ph = ib.bottom - py + 14;
        this.questionPanel.clear();
        this.questionPanel.fillStyle(0x000000, 0.65);
        this.questionPanel.fillRoundedRect(px, py, pw, ph, 10);
        this.questionPanel.lineStyle(1, 0xffffff, 0.2);
        this.questionPanel.strokeRoundedRect(px, py, pw, ph, 10);
        this.questionPanel.setVisible(true);

        // Assign answers to doors randomly
        const options = [...this.currentQuestion.options];
        const correctOption = options[this.currentQuestion.answer];
        // Shuffle options and assign to the 4 doors
        Phaser.Utils.Array.Shuffle(options);
        
        this.correctDoorIndex = options.indexOf(correctOption);

        // Open doors immediately
        this.doors.forEach((door, index) => {
            door.isOpen = true;
            door.isBandit = true;
            door.isHats = false;
            door.isDead = false;
            door.characterFrame = Phaser.Utils.Array.GetRandom(['bandit1', 'bandit2']);
            door.character.setFrame(door.characterFrame);
            door.character.setScale(1).setAlpha(1);
            door.door.play('doorOpen');
            
            door.showOption(options[index]);
            
            // Set a generous time for them to answer before they are shot by the bandit
            door.timeToKill = time + 15000; 
        });
    }

    answerQuestion(doorObj)
    {
        const index = this.doors.indexOf(doorObj);
        if (index === this.correctDoorIndex)
        {
            // Correct answer!
            this.sound.play('levelComplete');
            doorObj.shootCharacter(true); // Kill that bandit, close door
            
            // Close other doors
            this.doors.forEach((door, i) => {
                if (i !== index) {
                    door.closeDoor(this.time.now);
                }
            });

            this.questionText.setVisible(false);
            this.instructionText.setVisible(false);
            this.questionPanel.setVisible(false);

            this.isQuestionMode = false;
            // Schedule next question
            this.questionTimer = this.time.now + 20000;
        }
        else
        {
            // Wrong answer!
            doorObj.shootYou(); // This will trigger level fail
        }
    }

    update (time)
    {
        if (!this.isPaused)
        {
            if (!this.isQuestionMode && this.preguntas.length > 0 && time >= this.questionTimer)
            {
                this.startQuestionEvent(time);
            }

            this.doors.forEach((door) => {
                door.update(time);
            });
        }
    }
}
