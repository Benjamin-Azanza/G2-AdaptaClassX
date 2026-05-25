// @ts-nocheck
import Phaser from 'phaser';

export class Boot extends Phaser.Scene {
    constructor() { super('boot'); }
    init() {
        const element = document.createElement('style');
        document.head.appendChild(element);
        element.sheet.insertRule('@font-face { font-family: "bebas"; src: url("/assets/fonts/ttf/bebas.ttf") format("truetype"); }', 0);
    }
    preload() {
        this.load.image('grid', '/assets/skies/grid.png');
        this.load.image('bg', '/assets/skies/gradient26.png');
        this.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js');
        this.load.audio('place', ['/assets/audio/stacker/place.ogg', '/assets/audio/stacker/place.m4a']);
        this.load.audio('miss', ['/assets/audio/stacker/miss.ogg', '/assets/audio/stacker/miss.m4a']);
        this.load.audio('gamelost', ['/assets/audio/stacker/gamelost.ogg', '/assets/audio/stacker/gamelost.m4a']);
        this.load.audio('gamewon', ['/assets/audio/stacker/gamewon.ogg', '/assets/audio/stacker/gamewon.m4a']);
    }
    create() {
        const scene = this.scene;
        if (typeof window.WebFont !== 'undefined') {
            window.WebFont.load({
                custom: { families: ['bebas'] },
                active: () => scene.start('instructions'),
                inactive: () => scene.start('instructions'),
            });
        } else {
            scene.start('instructions');
        }
    }
}

export class Instructions extends Phaser.Scene {
    constructor() { super('instructions'); }
    create() {
        this.add.image(400, 300, 'bg');
        this.add.image(400, 430, 'grid').setDisplaySize(800, 376);
        this.add.text(720, 0, 'S\n t\na\n c\nk\n e\nr', { fontFamily: 'bebas', fontSize: 74, color: '#ffffff', lineSpacing: -10 }).setShadow(2, 2, '#333333', 2, false, true);
        this.add.text(20, 40, 'Instructions', { fontFamily: 'bebas', fontSize: 70, color: '#ffffff' }).setShadow(2, 2, '#333333', 2, false, true);
        const help = [
            'Build a tower all the way to the top of the screen',
            'to win big "prizes"! Place rows of blocks on top',
            'of each other, but be careful: it gets faster each',
            'time, you lose blocks if you don\'t land perfectly,',
            'and you automatically shrink after rows 5 and 10!',
        ];
        this.add.text(20, 180, help, { fontFamily: 'bebas', fontSize: 30, color: '#ffffff', lineSpacing: 6 }).setShadow(2, 2, '#333333', 2, false, true);
        this.add.text(20, 450, 'Space Bar or Click to Place a Row', { fontFamily: 'bebas', fontSize: 40, color: '#ffffff' }).setShadow(2, 2, '#333333', 2, false, true);
        this.input.keyboard.once('keydown-SPACE', this.start, this);
        this.input.once('pointerdown', this.start, this);
    }
    start() { this.scene.start('game'); }
}

export class StackerGame extends Phaser.Scene {
    constructor() {
        super('game');
        this.grid = null;
        this.gridWidth = 7;
        this.gridHeight = 15;
        this.gridSize = 32;
        this.block1 = null;
        this.block2 = null;
        this.block3 = null;
        this.speed = 250;
        this.direction = 0;
        this.currentY = 0;
        this.timer = null;
        this.offset = { x: this.gridSize * 6, y: this.gridSize * 2 };
    }
    init() {
        this.grid = [];
        this.speed = 250;
        this.direction = 0;
        this.currentY = this.gridHeight;
    }
    create() {
        const ox = this.offset.x;
        const oy = this.offset.y;
        const gw = this.gridWidth;
        const gh = this.gridHeight;
        const size = this.gridSize;
        const rows = [15,14,13,12,11,10,9,8,7,6,5,4,3,2,1];
        const prizes = ['Major Prize!', '', '' ,'' ,'', 'Minor Prize', '', '' ,'' ,'', 'Bonus'];
        this.add.image(400, 300, 'bg');
        this.add.image(400, 430, 'grid').setDisplaySize(800, 376);
        this.add.text(720, 0, 'S\n t\na\n c\nk\n e\nr', { fontFamily: 'bebas', fontSize: 74, color: '#ffffff', lineSpacing: -10 }).setShadow(2, 2, '#333333', 2, false, true);
        this.add.text(ox - 32, oy, rows, { fontFamily: 'bebas', fontSize: 26, color: '#ffffff', align: 'right' }).setShadow(2, 2, '#333333', 2, false, true);
        this.add.text(ox + (gw * size) + size/2, oy, prizes, { fontFamily: 'bebas', fontSize: 26, color: '#ffffff' }).setShadow(2, 2, '#333333', 2, false, true);
        this.add.grid(ox, oy, gw * size, gh * size, size, size, 0x999999, 1, 0x666666).setOrigin(0);
        this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.block1 = this.add.rectangle(ox + size * 2, oy + (this.currentY - 1) * size, size - 1, size - 1, 0x99ffff).setOrigin(0);
        this.block2 = this.add.rectangle(ox + size * 3, oy + (this.currentY - 1) * size, size - 1, size - 1, 0x99ffff).setOrigin(0);
        this.block3 = this.add.rectangle(ox + size * 4, oy + (this.currentY - 1) * size, size - 1, size - 1, 0x99ffff).setOrigin(0);
        for (let y = 0; y < gh; y++) this.grid.push([0,0,0,0,0,0,0]);
        this.timer = this.time.addEvent({ delay: this.speed, callback: this.moveBlocks, callbackScope: this, loop: true });
        this.input.keyboard.on('keydown-SPACE', this.drop, this);
        this.input.on('pointerdown', this.drop, this);
    }
    getGridX(block) { return (block.x - this.offset.x) / this.gridSize; }
    hasBlockBelow(block) { return (block && this.grid[this.currentY][this.getGridX(block)]); }
    totalBlocks() {
        let total = 0;
        if (this.block1) total++;
        if (this.block2) total++;
        if (this.block3) total++;
        return total;
    }
    moveBlocks() {
        const size = this.gridSize;
        const gw = this.gridWidth;
        if (this.direction === 0) {
            if (this.block1) { this.block1.x += size; if (this.getGridX(this.block1) === gw - 1) this.direction = 1; }
            if (this.block2) { this.block2.x += size; if (this.getGridX(this.block2) === gw - 1) this.direction = 1; }
            if (this.block3) { this.block3.x += size; if (this.getGridX(this.block3) === gw - 1) this.direction = 1; }
        } else {
            if (this.block1) { this.block1.x -= size; if (this.getGridX(this.block1) === 0) this.direction = 0; }
            if (this.block2) { this.block2.x -= size; if (this.getGridX(this.block2) === 0) this.direction = 0; }
            if (this.block3) { this.block3.x -= size; if (this.getGridX(this.block3) === 0) this.direction = 0; }
        }
    }
    drop() {
        this.timer.remove(false);
        const pos1 = this.block1 ? this.getGridX(this.block1) : -1;
        const pos2 = this.block2 ? this.getGridX(this.block2) : -1;
        const pos3 = this.block3 ? this.getGridX(this.block3) : -1;
        const mapY = this.currentY - 1;
        if (this.currentY === this.gridHeight) {
            this.grid[mapY][pos1] = 1; this.grid[mapY][pos2] = 1; this.grid[mapY][pos3] = 1;
            this.sound.play('place'); this.nextRow();
        } else {
            let droppedOne = false;
            if (!this.hasBlockBelow(this.block1) && !this.hasBlockBelow(this.block2) && !this.hasBlockBelow(this.block3)) {
                this.gameOver();
            } else {
                if (this.block1) { if (this.hasBlockBelow(this.block1)) this.grid[mapY][pos1] = 1; else { this.block1.visible = false; this.block1 = null; droppedOne = true; } }
                if (this.block2) { if (this.hasBlockBelow(this.block2)) this.grid[mapY][pos2] = 1; else { this.block2.visible = false; this.block2 = null; droppedOne = true; } }
                if (this.block3) { if (this.hasBlockBelow(this.block3)) this.grid[mapY][pos3] = 1; else { this.block3.visible = false; this.block3 = null; droppedOne = true; } }
                if (this.block1 || this.block2 || this.block3) {
                    if (this.currentY === 1) { this.currentY--; this.gameOver(); }
                    else { if (droppedOne) this.sound.play('miss'); else this.sound.play('place'); this.nextRow(); }
                } else this.gameOver();
            }
        }
    }
    nextRow() {
        this.currentY--;
        if (this.currentY === 10 || this.currentY === 5) {
            this.speed -= (this.currentY === 10) ? 100 : 50;
            if (this.currentY === 10 && this.totalBlocks() === 3) this.block1 = null;
            else if (this.currentY === 5 && this.totalBlocks() === 2) {
                if ((this.block1 && this.block2) || (this.block1 && this.block3)) this.block1 = null;
                else this.block2 = null;
            }
        }
        let side = 0; const size = this.gridSize; let shift = size;
        const ox = this.offset.x; const oy = this.offset.y;
        if (Math.random() >= 0.5) { this.direction = 1; side = (this.gridWidth - 1) * size; shift = -size; }
        else this.direction = 0;
        if (this.block1) { this.block1 = this.add.rectangle(ox + side, oy + (this.currentY - 1) * size, size - 1, size - 1, 0x99ffff).setOrigin(0); side += shift; }
        if (this.block2) { this.block2 = this.add.rectangle(ox + side, oy + (this.currentY - 1) * size, size - 1, size - 1, 0x99ffff).setOrigin(0); side += shift; }
        if (this.block3) { this.block3 = this.add.rectangle(ox + side, oy + (this.currentY - 1) * size, size - 1, size - 1, 0x99ffff).setOrigin(0); }
        this.timer = this.time.addEvent({ delay: this.speed, callback: this.moveBlocks, callbackScope: this, loop: true });
    }
    gameOver() {
        this.timer.remove(false);
        this.input.keyboard.off('keydown-SPACE', this.drop);
        this.input.off('pointerdown', this.drop);
        this.registry.set('score', this.gridHeight - this.currentY);
        this.scene.pause();
        this.scene.run('gameOver');
    }
}

export class GameOver extends Phaser.Scene {
    constructor() { super('gameOver'); }
    create() {
        this.add.rectangle(400, 300, 640, 500, 0x000000, 0.7);
        const list = ['Tiny Bonus:', '', 'Minor Prize:', '', 'Major Prize:'];
        const prizes1 = ['A Paperclip', 'Half-eaten Sandwich', 'A Boiled Egg', 'Used Gum', 'A Goldfish'];
        const prizes2 = ['Mario Stickers', 'SNES Joypad', 'Superman Cape', 'Bubble Machine', 'Skateboard'];
        const prizes3 = ['Playstation 5', 'A Tardis', 'An X-Wing', 'Arcade Machine', 'Dragon Egg'];
        const score = this.registry.get('score');
        const prizelist = [
            'Nothing (Complete 5 rows)', '',
            'Nothing (Complete 10 rows)', '',
            'Nothing (Complete 15 rows)',
        ];
        let title = 'GAME OVER!';
        if (score >= 5) prizelist[0] = Phaser.Utils.Array.GetRandom(prizes1);
        if (score >= 10) prizelist[2] = Phaser.Utils.Array.GetRandom(prizes2);
        if (score === 15) { prizelist[4] = Phaser.Utils.Array.GetRandom(prizes3); title = 'GAME WON!'; }
        if (score < 5) this.sound.play('gamelost'); else this.sound.play('gamewon');
        this.add.text(400, 120, title, { fontFamily: 'bebas', fontSize: 80, color: '#ffffff' }).setShadow(2, 2, '#333333', 2, false, true).setOrigin(0.5);
        this.add.text(400, 200, 'Let\'s see what you have won:', { fontFamily: 'bebas', fontSize: 26, color: '#ffffff' }).setShadow(2, 2, '#333333', 2, false, true).setOrigin(0.5);
        this.add.text(100, 270, list, { fontFamily: 'bebas', fontSize: 26, color: '#ffffff', align: 'right' }).setShadow(2, 2, '#333333', 2, false, true);
        this.add.text(260, 270, prizelist, { fontFamily: 'bebas', fontSize: 26, color: '#ffff00' }).setShadow(2, 2, '#333333', 2, false, true);
        this.add.text(400, 500, 'Space or Click to try again', { fontFamily: 'bebas', fontSize: 26, color: '#ffffff' }).setShadow(2, 2, '#333333', 2, false, true).setOrigin(0.5);
        this.input.keyboard.once('keydown-SPACE', this.restart, this);
        this.input.once('pointerdown', this.restart, this);
    }
    restart() { this.scene.stop(); this.scene.start('game'); }
}
