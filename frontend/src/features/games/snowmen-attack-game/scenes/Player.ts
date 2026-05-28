// @ts-nocheck
import Phaser from 'phaser';

export default class Player extends Phaser.Physics.Arcade.Sprite
{
    constructor (scene, track)
    {
        super(scene, 900, track.y, 'sprites', 'idle000');

        this.setOrigin(0.5, 1);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.isAlive = true;
        this.isThrowing = false;

        this.sound = scene.sound;
        this.currentTrack = track;

        this.spacebar = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.up = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
        this.down = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
        this.keyZ = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);

        this.play('idle');
    }

    start ()
    {
        this.isAlive = true;
        this.isThrowing = false;

        this.currentTrack = this.scene.tracks[0];
        this.y = this.currentTrack.y;
    
        this.on('animationcomplete-throwStart', this.releaseSnowball, this);
        this.on('animationcomplete-throwEnd', this.throwComplete, this);

        this.play('idle', true);
    }

    moveUp ()
    {
        if (this.currentTrack.id === 0)
        {
            this.currentTrack = this.scene.tracks[3];
        }
        else
        {
            this.currentTrack = this.scene.tracks[this.currentTrack.id - 1];
        }

        this.y = this.currentTrack.y;

        this.sound.play('move');
    }

    moveDown ()
    {
        if (this.currentTrack.id === 3)
        {
            this.currentTrack = this.scene.tracks[0];
        }
        else
        {
            this.currentTrack = this.scene.tracks[this.currentTrack.id + 1];
        }

        this.y = this.currentTrack.y;

        this.sound.play('move');
    }

    throw ()
    {
        this.isThrowing = true;

        this.play('throwStart');

        this.sound.play('throw');
    }

    releaseSnowball ()
    {
        this.play('throwEnd');

        this.currentTrack.throwPlayerSnowball(this.x);

        if (this.scene.doubleThrowActive)
        {
            this.scene.time.delayedCall(100, () => {
                this.currentTrack.throwPlayerSnowball(this.x);
            });
        }
    }

    throwComplete ()
    {
        this.isThrowing = false;

        this.play('idle');
    }

    stop ()
    {
        this.isAlive = false;

        this.body.stop();

        this.play('die');
    }

    preUpdate (time, delta)
    {
        super.preUpdate(time, delta);

        if (!this.isAlive || this.scene.isQuestionMode)
        {
            return;
        }

        // Virtual joystick support
        const joystick = (window as any).virtualJoystick;
        if (joystick && joystick.active)
        {
            const joyUp = joystick.dy < -0.4;
            const joyDown = joystick.dy > 0.4;
            const joyAction = false; // action is handled by the A/B buttons via keyboard emulation

            // Emulate JustDown for lane switching
            if (joyUp && !this._prevJoyUp)
            {
                this.moveUp();
            }
            else if (joyDown && !this._prevJoyDown)
            {
                this.moveDown();
            }

            this._prevJoyUp = joyUp;
            this._prevJoyDown = joyDown;
        }
        else
        {
            this._prevJoyUp = false;
            this._prevJoyDown = false;
        }

        // Keyboard controls (also triggered by virtual button emulation)
        if (Phaser.Input.Keyboard.JustDown(this.up))
        {
            this.moveUp();
        }
        else if (Phaser.Input.Keyboard.JustDown(this.down))
        {
            this.moveDown();
        }
        else if ((Phaser.Input.Keyboard.JustDown(this.spacebar) || Phaser.Input.Keyboard.JustDown(this.keyZ)) && !this.isThrowing)
        {
            this.throw();
        }
    }
}
