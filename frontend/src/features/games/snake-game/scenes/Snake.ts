// @ts-nocheck
import Phaser from 'phaser';

const UP = 0;
const DOWN = 1;
const LEFT = 2;
const RIGHT = 3;

export default class SnakeScene extends Phaser.Scene {
    constructor() {
        super({ key: 'Snake' });
        this.snake = null;
        this.food = null;
        this.cursors = null;
    }

    preload() {
        this.load.image('body', '/assets/games/snake/body.png');
        this.load.image('food', '/assets/games/snake/food.png');
    }

    create() {
        const sceneRef = this;

        const Food = new Phaser.Class({
            Extends: Phaser.GameObjects.Image,
            initialize: function Food(scene, x, y) {
                Phaser.GameObjects.Image.call(this, scene);
                this.setTexture('food');
                this.setPosition(x * 16, y * 16);
                this.setOrigin(0);
                this.total = 0;
                scene.children.add(this);
            },
            eat: function () { this.total++; },
        });

        const Snake = new Phaser.Class({
            initialize: function Snake(scene, x, y) {
                this.headPosition = new Phaser.Math.Vector2(x, y);
                this.body = scene.add.group();
                this.head = this.body.create(x * 16, y * 16, 'body');
                this.head.setOrigin(0);
                this.alive = true;
                this.speed = 100;
                this.moveTime = 0;
                this.tail = new Phaser.Math.Vector2(x, y);
                this.heading = RIGHT;
                this.direction = RIGHT;
            },
            update: function (time) {
                if (time >= this.moveTime) return this.move(time);
            },
            faceLeft: function () { if (this.direction === UP || this.direction === DOWN) this.heading = LEFT; },
            faceRight: function () { if (this.direction === UP || this.direction === DOWN) this.heading = RIGHT; },
            faceUp: function () { if (this.direction === LEFT || this.direction === RIGHT) this.heading = UP; },
            faceDown: function () { if (this.direction === LEFT || this.direction === RIGHT) this.heading = DOWN; },
            move: function (time) {
                switch (this.heading) {
                    case LEFT: this.headPosition.x = Phaser.Math.Wrap(this.headPosition.x - 1, 0, 40); break;
                    case RIGHT: this.headPosition.x = Phaser.Math.Wrap(this.headPosition.x + 1, 0, 40); break;
                    case UP: this.headPosition.y = Phaser.Math.Wrap(this.headPosition.y - 1, 0, 30); break;
                    case DOWN: this.headPosition.y = Phaser.Math.Wrap(this.headPosition.y + 1, 0, 30); break;
                }
                this.direction = this.heading;
                Phaser.Actions.ShiftPosition(this.body.getChildren(), this.headPosition.x * 16, this.headPosition.y * 16, 1, this.tail);
                const hitBody = Phaser.Actions.GetFirst(this.body.getChildren(), { x: this.head.x, y: this.head.y }, 1);
                if (hitBody) {
                    this.alive = false;
                    return false;
                }
                this.moveTime = time + this.speed;
                return true;
            },
            grow: function () {
                const newPart = this.body.create(this.tail.x, this.tail.y, 'body');
                newPart.setOrigin(0);
            },
            collideWithFood: function (food) {
                if (this.head.x === food.x && this.head.y === food.y) {
                    this.grow();
                    food.eat();
                    if (this.speed > 20 && food.total % 5 === 0) this.speed -= 5;
                    return true;
                }
                return false;
            },
            updateGrid: function (grid) {
                this.body.children.each(function (segment) {
                    const bx = segment.x / 16;
                    const by = segment.y / 16;
                    grid[by][bx] = false;
                });
                return grid;
            },
        });

        this.food = new Food(this, 3, 4);
        this.snake = new Snake(this, 8, 8);
        this.cursors = this.input.keyboard.createCursorKeys();

        sceneRef.repositionFood = () => {
            const testGrid = [];
            for (let y = 0; y < 30; y++) {
                testGrid[y] = [];
                for (let x = 0; x < 40; x++) testGrid[y][x] = true;
            }
            sceneRef.snake.updateGrid(testGrid);
            const validLocations = [];
            for (let y = 0; y < 30; y++) {
                for (let x = 0; x < 40; x++) {
                    if (testGrid[y][x] === true) validLocations.push({ x, y });
                }
            }
            if (validLocations.length > 0) {
                const pos = Phaser.Math.RND.pick(validLocations);
                sceneRef.food.setPosition(pos.x * 16, pos.y * 16);
                return true;
            }
            return false;
        };
    }

    update(time) {
        if (!this.snake.alive) return;
        if (this.cursors.left.isDown) this.snake.faceLeft();
        else if (this.cursors.right.isDown) this.snake.faceRight();
        else if (this.cursors.up.isDown) this.snake.faceUp();
        else if (this.cursors.down.isDown) this.snake.faceDown();
        if (this.snake.update(time)) {
            if (this.snake.collideWithFood(this.food)) this.repositionFood();
        }
    }
}
