import * as Phaser from 'phaser';

import type { ActorDebugFlags } from './types';

export const SKELETON_ATTACK_RANGE = 150 * 0.75; // engage radius, scaled with character

// ── Debug colours ──────────────────────────────────────────────────────────
const CLR_BOUNDS        = 0x6b7280;
const CLR_HITBOX        = 0x3b82f6;
const CLR_ATTACK        = 0xf97316;
const CLR_ATTACK_ACTIVE = 0xef4444;

const FRAME_SIZE = 256;
const ORIGIN = { x: 0.5, y: 0.996 } as const;

// ── Character scale ────────────────────────────────────────────────────────
const CHAR_SCALE    = 0.75;
const DISPLAY_FRAME = FRAME_SIZE * CHAR_SCALE;

// Tight body rect; origin is at feet (sprite.x, sprite.y)
const HITBOX_W = 65  * CHAR_SCALE;
const HITBOX_H = 160 * CHAR_SCALE;

const BASE_SKELETON_SPEED = 120 * CHAR_SCALE;
const PAUSE_DURATION      = 1.5;

// Directional attack box — same scheme as the pirate; ATK_H matched for symmetry
const ATK_W        = 100 * CHAR_SCALE;
const ATK_H        = 50  * CHAR_SCALE;
const ATK_INNER    = 35  * CHAR_SCALE;
const ATK_VERT_CEN = 120 * CHAR_SCALE;

const KNOCKBACK_SPEED = 320 * CHAR_SCALE;
const KNOCKBACK_DECAY = 6;

const ATTACK_HIT_FRAME = 4;

// ── Death sequence timings ──────────────────────────────────────────────────
const DEATH_LINGER_DURATION = 1.0;
const DEATH_BLINK_DURATION  = 1.5;
const DEATH_BLINK_INTERVAL  = 0.12;

// ── Health bar ──────────────────────────────────────────────────────────────
const DEFAULT_MAX_HEALTH  = 3;
const HB_W                = 56;
const HB_H                = 6;
const HB_OFFSET_Y         = 10;
const HB_COLOR_FG         = 0xef4444;
const HB_COLOR_BG         = 0x111827;
const HB_COLOR_BORDER     = 0x000000;

const ANIM_CONFIG = [
  { action: 'idle',   frames: 10, fps:  6, loop: true  },
  { action: 'walk',   frames:  7, fps: 10, loop: true  },
  { action: 'attack', frames:  8, fps: 10, loop: false },
  { action: 'hurt',   frames:  6, fps:  8, loop: false },
  { action: 'death',  frames: 10, fps:  8, loop: false },
] as const;

type SkeletonState = 'chase' | 'attack' | 'pause' | 'hurt' | 'dead';
type DeadPhase     = 'anim' | 'linger' | 'blink' | 'done';

export type AttackFrameCallback = (atkX: number, atkY: number, atkW: number, atkH: number) => void;

export interface SkeletonOptions {
  /** Scale applied to movement speed — use >1 for harder rounds. */
  speedMultiplier?: number;
  /** Override the skeleton's starting (and max) HP. */
  maxHealth?: number;
  /** Called once when this skeleton transitions to the dead state. */
  onDeath?: () => void;
}

export class Skeleton {
  readonly sprite: Phaser.GameObjects.Sprite;
  private readonly debugGraphics: Phaser.GameObjects.Graphics;
  private readonly healthBarGraphics: Phaser.GameObjects.Graphics;
  private state: SkeletonState = 'chase';
  private facingLeft = true;
  private pauseTimer = 0;
  private hasDealtDamage = false;
  private knockbackVx = 0;
  private knockbackVy = 0;
  private health: number;
  private readonly maxHealthValue: number;
  private readonly speedMult: number;
  private readonly onDeath?: () => void;

  private deadPhase: DeadPhase = 'anim';
  private deadTimer = 0;
  private deadBlinkAccum = 0;
  private deadBlinkVisible = true;
  private frozen = false;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly onAttackFrame: AttackFrameCallback,
    options?: SkeletonOptions,
  ) {
    this.maxHealthValue = options?.maxHealth ?? DEFAULT_MAX_HEALTH;
    this.health         = this.maxHealthValue;
    this.speedMult      = options?.speedMultiplier ?? 1.0;
    this.onDeath        = options?.onDeath;

    for (const { action, frames, fps, loop } of ANIM_CONFIG) {
      const key = `lobit-skeleton-${action}`;
      if (!scene.anims.exists(key)) {
        scene.anims.create({
          key,
          frames: scene.anims.generateFrameNumbers(key, { start: 0, end: frames - 1 }),
          frameRate: fps,
          repeat: loop ? -1 : 0,
        });
      }
    }

    this.sprite = scene.add.sprite(x, y, 'lobit-skeleton-walk');
    this.sprite.setOrigin(ORIGIN.x, ORIGIN.y);
    this.sprite.setScale(CHAR_SCALE);
    this.sprite.play('lobit-skeleton-walk');

    this.debugGraphics = scene.add.graphics();
    this.debugGraphics.setDepth(100);

    this.healthBarGraphics = scene.add.graphics();
    this.healthBarGraphics.setDepth(101);
  }

  get isDead(): boolean {
    return this.state === 'dead';
  }

  /** True once the linger+blink sequence is complete and the sprite has been destroyed. */
  get isRemoved(): boolean {
    return this.deadPhase === 'done';
  }

  /** Immediately halts all movement and animation (called on game over). */
  freeze(): void {
    if (this.frozen) return;
    this.frozen = true;
    this.sprite.stop();
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    this.healthBarGraphics.clear();
  }

  /** Skips the linger/blink sequence and destroys the sprite immediately. */
  forceRemove(): void {
    if (this.deadPhase === 'done') return;
    this.deadPhase = 'done';
    this.sprite.destroy();
    this.debugGraphics.destroy();
    this.healthBarGraphics.destroy();
  }

  /** Body AABB in world space — used for push-apart collision. */
  getBodyRect(): { x: number; y: number; w: number; h: number } {
    return {
      x: this.sprite.x - HITBOX_W * 0.5,
      y: this.sprite.y - HITBOX_H,
      w: HITBOX_W,
      h: HITBOX_H,
    };
  }

  update(dt: number, playerX: number, playerY: number): void {
    if (this.frozen) return;

    if (this.state === 'dead') {
      this.tickDead(dt);
      return;
    }

    this.applyKnockback(dt);

    if (this.state !== 'hurt') {
      const rawDx = playerX - this.sprite.x;
      const rawDy = playerY - this.sprite.y;
      const dist  = Math.hypot(rawDx, rawDy);

      switch (this.state) {
        case 'chase':  this.tickChase(dt, rawDx, rawDy, dist); break;
        case 'pause':  this.tickPause(dt);                     break;
        case 'attack': this.tickAttack();                      break;
      }
    }

    this.drawHealthBar();
  }

  private tickDead(dt: number): void {
    if (this.deadPhase === 'done') return;

    this.healthBarGraphics.clear();

    if (this.deadPhase === 'anim') return;

    if (this.deadPhase === 'linger') {
      this.deadTimer -= dt;
      if (this.deadTimer <= 0) {
        this.deadPhase = 'blink';
        this.deadTimer = DEATH_BLINK_DURATION;
        this.deadBlinkAccum = 0;
        this.deadBlinkVisible = true;
      }
      return;
    }

    if (this.deadPhase === 'blink') {
      this.deadTimer -= dt;
      this.deadBlinkAccum += dt;
      if (this.deadBlinkAccum >= DEATH_BLINK_INTERVAL) {
        this.deadBlinkAccum -= DEATH_BLINK_INTERVAL;
        this.deadBlinkVisible = !this.deadBlinkVisible;
        this.sprite.setAlpha(this.deadBlinkVisible ? 1 : 0);
      }
      if (this.deadTimer <= 0) {
        this.deadPhase = 'done';
        this.sprite.destroy();
        this.debugGraphics.destroy();
        this.healthBarGraphics.destroy();
      }
    }
  }

  private applyKnockback(dt: number): void {
    if (this.knockbackVx === 0 && this.knockbackVy === 0) return;

    const cam   = this.scene.cameras.main;
    const halfW = DISPLAY_FRAME * ORIGIN.x;
    this.sprite.x = Phaser.Math.Clamp(
      this.sprite.x + this.knockbackVx * dt,
      halfW, cam.width - halfW
    );
    this.sprite.y = Phaser.Math.Clamp(
      this.sprite.y + this.knockbackVy * dt,
      DISPLAY_FRAME * ORIGIN.y, cam.height
    );

    const decay = Math.exp(-KNOCKBACK_DECAY * dt);
    this.knockbackVx *= decay;
    this.knockbackVy *= decay;
    if (Math.hypot(this.knockbackVx, this.knockbackVy) < 5) {
      this.knockbackVx = 0;
      this.knockbackVy = 0;
    }
  }

  private tickChase(dt: number, rawDx: number, rawDy: number, dist: number): void {
    if (dist <= SKELETON_ATTACK_RANGE) {
      this.transitionTo('attack');
      return;
    }

    if (dist > 0) {
      const cam      = this.scene.cameras.main;
      const halfW    = DISPLAY_FRAME * ORIGIN.x;
      const topBound = DISPLAY_FRAME * ORIGIN.y;
      const speed    = BASE_SKELETON_SPEED * this.speedMult;

      this.sprite.x = Phaser.Math.Clamp(
        this.sprite.x + (rawDx / dist) * speed * dt,
        halfW, cam.width - halfW
      );
      this.sprite.y = Phaser.Math.Clamp(
        this.sprite.y + (rawDy / dist) * speed * dt,
        topBound, cam.height
      );
    }

    // Sprites are west-facing natively, so left = no flip
    this.facingLeft = rawDx < 0;
    this.sprite.setFlipX(!this.facingLeft);
  }

  private tickPause(dt: number): void {
    this.pauseTimer -= dt;
    if (this.pauseTimer <= 0) {
      this.transitionTo('chase');
    }
  }

  private tickAttack(): void {
    const frame = this.sprite.anims.currentFrame;
    if (frame?.index === ATTACK_HIT_FRAME && !this.hasDealtDamage) {
      this.hasDealtDamage = true;
      const x    = this.sprite.x;
      const y    = this.sprite.y;
      const atkX = this.facingLeft ? x - ATK_INNER - ATK_W : x + ATK_INNER;
      const atkY = y - ATK_VERT_CEN - ATK_H * 0.5;
      this.onAttackFrame(atkX, atkY, ATK_W, ATK_H);
    }
  }

  hitTest(atkX: number, atkY: number, atkW: number, atkH: number): boolean {
    if (this.state === 'dead') return false;
    const bx = this.sprite.x - HITBOX_W * 0.5;
    const by = this.sprite.y - HITBOX_H;
    return atkX < bx + HITBOX_W && atkX + atkW > bx &&
           atkY < by + HITBOX_H && atkY + atkH > by;
  }

  receiveHit(dx: number, dy: number): boolean {
    if (this.state === 'hurt' || this.state === 'dead') return false;

    this.health = Math.max(0, this.health - 1);

    if (this.state === 'attack') this.hasDealtDamage = true;

    this.knockbackVx = dx * KNOCKBACK_SPEED;
    this.knockbackVy = dy * KNOCKBACK_SPEED;

    if (this.health <= 0) {
      this.transitionTo('dead');
      return true;
    }
    this.transitionTo('hurt');
    return false;
  }

  private transitionTo(next: SkeletonState): void {
    if (this.state === next) return;

    if (this.state === 'attack' || this.state === 'hurt') {
      this.sprite.removeAllListeners('animationcomplete');
    }

    this.state = next;

    switch (next) {
      case 'chase':
        this.sprite.play('lobit-skeleton-walk');
        break;
      case 'attack':
        this.hasDealtDamage = false;
        this.sprite.play('lobit-skeleton-attack');
        this.sprite.once('animationcomplete', () => this.transitionTo('pause'));
        break;
      case 'pause':
        this.pauseTimer = PAUSE_DURATION;
        this.sprite.play('lobit-skeleton-idle');
        break;
      case 'hurt':
        this.sprite.play('lobit-skeleton-hurt');
        this.sprite.once('animationcomplete', () => this.transitionTo('chase'));
        break;
      case 'dead':
        this.knockbackVx = 0;
        this.knockbackVy = 0;
        this.deadPhase = 'anim';
        this.onDeath?.();
        this.sprite.play('lobit-skeleton-death');
        this.sprite.once('animationcomplete', () => {
          this.deadPhase = 'linger';
          this.deadTimer = DEATH_LINGER_DURATION;
        });
        break;
    }
  }

  private drawHealthBar(): void {
    this.healthBarGraphics.clear();
    if (this.state === 'dead') return;

    const x = this.sprite.x - HB_W * 0.5;
    const y = this.sprite.y - DISPLAY_FRAME * ORIGIN.y - HB_OFFSET_Y - HB_H;
    const fillW = HB_W * (this.health / this.maxHealthValue);

    this.healthBarGraphics.fillStyle(HB_COLOR_BG, 0.85);
    this.healthBarGraphics.fillRect(x, y, HB_W, HB_H);
    if (fillW > 0) {
      this.healthBarGraphics.fillStyle(HB_COLOR_FG, 1);
      this.healthBarGraphics.fillRect(x, y, fillW, HB_H);
    }
    this.healthBarGraphics.lineStyle(1, HB_COLOR_BORDER, 1);
    this.healthBarGraphics.strokeRect(x, y, HB_W, HB_H);
  }

  drawDebug(flags: ActorDebugFlags): void {
    if (this.deadPhase === 'done') return;
    this.debugGraphics.clear();

    const x = this.sprite.x;
    const y = this.sprite.y;

    if (flags.bounds) {
      this.debugGraphics.lineStyle(1, CLR_BOUNDS, 0.8);
      this.debugGraphics.strokeRect(x - DISPLAY_FRAME * 0.5, y - DISPLAY_FRAME * ORIGIN.y, DISPLAY_FRAME, DISPLAY_FRAME);
    }

    if (flags.hitbox) {
      const hx = x - HITBOX_W * 0.5;
      const hy = y - HITBOX_H;
      this.debugGraphics.fillStyle(CLR_HITBOX, 0.18);
      this.debugGraphics.fillRect(hx, hy, HITBOX_W, HITBOX_H);
      this.debugGraphics.lineStyle(2, CLR_HITBOX, 1);
      this.debugGraphics.strokeRect(hx, hy, HITBOX_W, HITBOX_H);
    }

    if (flags.attackBox) {
      const isAttacking = this.state === 'attack';
      this.debugGraphics.lineStyle(1, isAttacking ? CLR_ATTACK_ACTIVE : CLR_ATTACK, isAttacking ? 1 : 0.5);
      const atkX = this.facingLeft ? x - ATK_INNER - ATK_W : x + ATK_INNER;
      const atkY = y - ATK_VERT_CEN - ATK_H * 0.5;
      this.debugGraphics.strokeRect(atkX, atkY, ATK_W, ATK_H);
    }
  }
}
