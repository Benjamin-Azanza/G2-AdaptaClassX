import * as Phaser from 'phaser';

import { SCENE_KEYS } from '../game/types';
import type { ActorDebugFlags } from '../game/types';
import { BaseScene } from './BaseScene';
import { Skeleton } from '../game/Skeleton';

const FRAME_SIZE    = 256;
const PIRATE_ORIGIN = { x: 0.5, y: 0.996 } as const;

// ── Character scale ────────────────────────────────────────────────────────
const CHAR_SCALE    = 0.75;
const DISPLAY_FRAME = FRAME_SIZE * CHAR_SCALE;

const PLAYER_SPEED    = 240 * CHAR_SCALE;
const KNOCKBACK_SPEED = 480 * CHAR_SCALE;
const KNOCKBACK_DECAY = 5;

// Player speed scales with round (+2% per round, capped)
const PLAYER_SPEED_SCALE_PER_ROUND = 0.02;
const MAX_PLAYER_SPEED_MULT        = 2.2;

// ── Debug colours ──────────────────────────────────────────────────────────
const CLR_BOUNDS        = 0x6b7280;
const CLR_HITBOX        = 0x3b82f6;
const CLR_ATTACK        = 0xf97316;
const CLR_ATTACK_ACTIVE = 0xef4444;

// Pirate body hitbox — intentionally slightly smaller than skeleton's (65×160)
// so the player has a small evasion advantage.
const P_HITBOX_W = 60  * CHAR_SCALE;
const P_HITBOX_H = 155 * CHAR_SCALE;

// Pirate attack box — slightly wider/taller than before for a touch more reach.
const P_ATK_W        = 130 * CHAR_SCALE;
const P_ATK_H        = 58  * CHAR_SCALE;
const P_ATK_INNER    = 40  * CHAR_SCALE;
const P_ATK_VERT_CEN = 135 * CHAR_SCALE;

// ── Player health & i-frames ───────────────────────────────────────────────
const PLAYER_MAX_HEALTH    = 5;
const PLAYER_IFRAME_DURATION = 1.0;  // seconds of post-hurt invulnerability
const PLAYER_IFRAME_BLINK    = 0.08; // blink toggle interval during i-frames

// ── Juice timings ──────────────────────────────────────────────────────────
const HITSTOP_ENEMY_HURT  = 0.06;
const HITSTOP_ENEMY_DEATH = 0.14;
const HITSTOP_PLAYER_HURT = 0.07;

const SHAKE_ENEMY_HURT  = { duration: 70,  intensity: 0.003 };
const SHAKE_ENEMY_DEATH = { duration: 180, intensity: 0.006 };
const SHAKE_PLAYER_HURT = { duration: 110, intensity: 0.004 };

const FLASH_DURATION = 0.16;
const FLASH_ALPHA    = 0.55;

// ── HUD layout (top-left row, screen-space) ────────────────────────────────
const HUD_Y         = 24;
const HUD_X         = 24;
const HUD_BAR_X     = 64;
const HUD_BAR_W     = 200;
const HUD_BAR_H     = 22;
const HUD_COUNTER_X = HUD_BAR_X + HUD_BAR_W + 8;
const HUD_ROUND_X   = HUD_COUNTER_X + 68;

// ── Wave / round configuration ─────────────────────────────────────────────
const WAVE_CONFIG = {
  FIRST_ROUND_ENEMIES:         1,
  MAX_ENEMIES_PER_ROUND:       30,
  BASE_SPAWN_STAGGER:          0.75,
  MIN_SPAWN_STAGGER:           0.30,
  STAGGER_REDUCE_PER_ROUND:    0.04,
  ROUND_INTRO_DURATION:        2.4,
  ROUND_COMPLETE_DURATION:     3.0,
  SPEED_SCALE_PER_ROUND:       0.03,  // enemy speed +3% per round
  MAX_SPEED_MULTIPLIER:        2.2,
  HEALTH_BONUS_EVERY_N_ROUNDS: 4,
  MAX_ENEMY_HEALTH:            9,
} as const;

// ── Pirate animations ──────────────────────────────────────────────────────
const ANIM_CONFIG = [
  { action: 'idle',   frames: 10, fps:  6, loop: true  },
  { action: 'walk',   frames:  9, fps: 10, loop: true  },
  { action: 'attack', frames:  8, fps: 10, loop: false },
  { action: 'hurt',   frames:  6, fps:  8, loop: false },
  { action: 'jump',   frames:  6, fps:  8, loop: false },
  { action: 'death',  frames: 10, fps:  8, loop: false },
] as const;

type PlayerState = 'idle' | 'walk' | 'attack' | 'hurt' | 'dead';
type RoundPhase  = 'intro' | 'playing' | 'complete';

interface HitParticle {
  gfx: Phaser.GameObjects.Graphics;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: number;
}

// ── Wave progression helpers ───────────────────────────────────────────────

/** Fibonacci-based enemy count: 1, 2, 3, 5, 8, 13, 21 … capped at MAX. */
function fibEnemyCount(round: number): number {
  if (round <= 1) return WAVE_CONFIG.FIRST_ROUND_ENEMIES;
  let a = 1, b = 2;
  for (let i = 2; i < round; i++) [a, b] = [b, a + b];
  return Math.min(b, WAVE_CONFIG.MAX_ENEMIES_PER_ROUND);
}

function getRoundDifficulty(round: number): { speedMultiplier: number; maxHealth: number } {
  const speedMultiplier = Math.min(
    1.0 + (round - 1) * WAVE_CONFIG.SPEED_SCALE_PER_ROUND,
    WAVE_CONFIG.MAX_SPEED_MULTIPLIER
  );
  const maxHealth = Math.min(
    3 + Math.floor((round - 1) / WAVE_CONFIG.HEALTH_BONUS_EVERY_N_ROUNDS),
    WAVE_CONFIG.MAX_ENEMY_HEALTH
  );
  return { speedMultiplier, maxHealth };
}

function getPlayerSpeed(round: number): number {
  const mult = Math.min(
    1.0 + (round - 1) * PLAYER_SPEED_SCALE_PER_ROUND,
    MAX_PLAYER_SPEED_MULT
  );
  return PLAYER_SPEED * mult;
}

function getSpawnStagger(round: number): number {
  return Math.max(
    WAVE_CONFIG.MIN_SPAWN_STAGGER,
    WAVE_CONFIG.BASE_SPAWN_STAGGER - (round - 1) * WAVE_CONFIG.STAGGER_REDUCE_PER_ROUND
  );
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ──────────────────────────────────────────────────────────────────────────

export class SandboxScene extends BaseScene {
  // ── Player ─────────────────────────────────────────────────────────────
  private player!: Phaser.GameObjects.Sprite;
  private playerState: PlayerState = 'idle';
  private facingLeft = true;
  private knockbackVx = 0;
  private knockbackVy = 0;
  private pirateHasDealtDamage = false;
  private playerHealth = PLAYER_MAX_HEALTH;
  private iFrameTimer      = 0;
  private iFrameBlinkAccum = 0;

  // ── Enemies ─────────────────────────────────────────────────────────────
  private skeletons: Skeleton[] = [];

  // ── Round state ──────────────────────────────────────────────────────────
  private roundNumber   = 1;
  private roundPhase: RoundPhase = 'intro';
  private roundPhaseTimer = 0;
  private enemiesToSpawn  = 0;
  private spawnTimer      = 0;
  private totalKills      = 0;
  private elapsedPlayTime = 0;
  private gameOverActive  = false;

  // ── Juice / effects ──────────────────────────────────────────────────────
  private hitStopTimer     = 0;
  private screenFlashTimer = 0;
  private hitParticles: HitParticle[] = [];

  // ── Overlay objects (cleared on phase transition) ────────────────────────
  private overlayObjects: Phaser.GameObjects.GameObject[] = [];

  // ── Graphics layers ──────────────────────────────────────────────────────
  private screenFlashGraphics!: Phaser.GameObjects.Graphics;
  private playerDebugGraphics!: Phaser.GameObjects.Graphics;
  private hudGraphics!: Phaser.GameObjects.Graphics;
  private hudCounter!: Phaser.GameObjects.Text;
  private hudRound!: Phaser.GameObjects.Text;
  private hudKills!: Phaser.GameObjects.Text;
  private hudTimer!: Phaser.GameObjects.Text;

  // ── Input ─────────────────────────────────────────────────────────────────
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private attackKey!: Phaser.Input.Keyboard.Key;

  private worldBoundsRect?: Phaser.GameObjects.Rectangle;

  constructor() {
    super(SCENE_KEYS.Sandbox);
  }

  create(): void {
    this.markActiveScene(SCENE_KEYS.Sandbox);

    // Reset all mutable state for clean restarts
    this.playerState          = 'idle';
    this.facingLeft           = true;
    this.knockbackVx          = 0;
    this.knockbackVy          = 0;
    this.pirateHasDealtDamage = false;
    this.playerHealth         = PLAYER_MAX_HEALTH;
    this.iFrameTimer          = 0;
    this.iFrameBlinkAccum     = 0;
    this.skeletons            = [];
    this.roundNumber          = 1;
    this.roundPhase           = 'intro';
    this.roundPhaseTimer      = 0;
    this.enemiesToSpawn       = 0;
    this.spawnTimer           = 0;
    this.totalKills           = 0;
    this.elapsedPlayTime      = 0;
    this.gameOverActive       = false;
    this.overlayObjects       = [];
    this.hitStopTimer         = 0;
    this.screenFlashTimer     = 0;
    this.hitParticles         = [];

    const cam = this.cameras.main;

    this.add
      .image(cam.centerX, cam.centerY, 'background-1')
      .setDisplaySize(cam.width, cam.height);

    // Register pirate animations
    for (const { action, frames, fps, loop } of ANIM_CONFIG) {
      const key = `lobit-pirate-${action}`;
      if (!this.anims.exists(key)) {
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(key, { start: 0, end: frames - 1 }),
          frameRate: fps,
          repeat: loop ? -1 : 0,
        });
      }
    }

    // Player — starts near centre
    this.player = this.add.sprite(cam.centerX, cam.centerY + 80, 'lobit-pirate-idle');
    this.player.setOrigin(PIRATE_ORIGIN.x, PIRATE_ORIGIN.y);
    this.player.setScale(CHAR_SCALE);
    this.player.play('lobit-pirate-idle');

    // Debug overlay
    this.playerDebugGraphics = this.add.graphics();
    this.playerDebugGraphics.setDepth(100);

    // ── HUD ──────────────────────────────────────────────────────────────
    this.hudGraphics = this.add.graphics().setDepth(199).setScrollFactor(0);

    this.add.text(HUD_X, HUD_Y, 'HP', {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffffff',
    }).setDepth(200).setScrollFactor(0);

    this.hudCounter = this.add.text(HUD_COUNTER_X, HUD_Y, `${PLAYER_MAX_HEALTH}/${PLAYER_MAX_HEALTH}`, {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffffff',
    }).setDepth(200).setScrollFactor(0);

    this.hudRound = this.add.text(HUD_ROUND_X, HUD_Y, '• RND 1', {
      fontFamily: 'monospace', fontSize: '18px', color: '#facc15',
    }).setDepth(200).setScrollFactor(0);

    this.hudKills = this.add.text(cam.width - 200, HUD_Y, '⚔ 0', {
      fontFamily: 'monospace', fontSize: '18px', color: '#d1d5db',
    }).setDepth(200).setScrollFactor(0);

    this.hudTimer = this.add.text(cam.width - 24, HUD_Y, '00:00', {
      fontFamily: 'monospace', fontSize: '18px', color: '#d1d5db',
    }).setOrigin(1, 0).setDepth(200).setScrollFactor(0);

    // Screen-flash overlay (sits between HUD and round overlays)
    this.screenFlashGraphics = this.add.graphics().setDepth(250).setScrollFactor(0);
    this.screenFlashGraphics.fillStyle(0xffffff, 1);
    this.screenFlashGraphics.fillRect(0, 0, cam.width, cam.height);
    this.screenFlashGraphics.setAlpha(0);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      up:    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down:  this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left:  this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.attackKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z);

    this.input.keyboard
      ?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
      .on('down', () => this.scene.start(SCENE_KEYS.MainMenu));

    this.createFooterHint('WASD / arrows to move  •  Z to attack  •  ESC for menu');

    // Kick off round 1
    this.startRound(1);
  }

  update(time: number, delta: number): void {
    const state = this.app.debugStore.getState();
    const dt    = delta / 1000;

    const inputSnapshot = {
      up:          !!(this.cursors.up?.isDown    || this.wasd.up.isDown),
      down:        !!(this.cursors.down?.isDown  || this.wasd.down.isDown),
      left:        !!(this.cursors.left?.isDown  || this.wasd.left.isDown),
      right:       !!(this.cursors.right?.isDown || this.wasd.right.isDown),
      pointerDown: this.input.activePointer.isDown,
    };

    this.app.debugStore.patchState({
      pointer: { x: this.input.activePointer.x, y: this.input.activePointer.y },
      input: inputSnapshot,
    });

    // ── Effects that run regardless of pause/game-over ──────────────────
    this.updateScreenFlash(dt);
    this.updateHitParticles(dt);

    if (!state.paused && !this.gameOverActive) {
      // Hit stop freezes gameplay for a fraction of a second on impacts
      const inHitStop = this.hitStopTimer > 0;
      if (this.hitStopTimer > 0) this.hitStopTimer = Math.max(0, this.hitStopTimer - dt);

      if (!inHitStop && this.roundPhaseTimer > 0) {
        this.roundPhaseTimer -= dt;
        if (this.roundPhaseTimer <= 0) this.onPhaseTimerExpired();
      }

      if (!inHitStop && this.roundPhase === 'playing') {
        this.elapsedPlayTime += dt;
        this.updatePlayer(dt, inputSnapshot);
        this.tickSpawner(dt);
        for (const sk of this.skeletons) {
          if (!sk.isRemoved) sk.update(dt, this.player.x, this.player.y);
        }
        this.resolveCharacterCollision();
        this.checkRoundComplete();
      } else if (!inHitStop) {
        // Intro / complete phases still tick skeleton blink sequences
        for (const sk of this.skeletons) {
          if (!sk.isRemoved) sk.update(dt, this.player.x, this.player.y);
        }
      }

      this.updateIFrameBlink(dt);
    }

    // ── Draw ──────────────────────────────────────────────────────────────
    this.drawPirateDebug(state.pirate);
    for (const sk of this.skeletons) {
      if (!sk.isRemoved) sk.drawDebug(state.skeleton);
    }
    this.drawHUD(time);

    if (state.showWorldBounds && !this.worldBoundsRect) {
      this.worldBoundsRect = this.add
        .rectangle(0, 0, this.cameras.main.width, this.cameras.main.height)
        .setOrigin(0, 0)
        .setStrokeStyle(2, 0xf43f5e);
    } else if (!state.showWorldBounds && this.worldBoundsRect) {
      this.worldBoundsRect.destroy();
      this.worldBoundsRect = undefined;
    }
  }

  // ── Round system ──────────────────────────────────────────────────────────

  private startRound(n: number): void {
    this.roundNumber     = n;
    this.enemiesToSpawn  = fibEnemyCount(n);
    this.spawnTimer      = 0;
    this.roundPhase      = 'intro';
    this.roundPhaseTimer = WAVE_CONFIG.ROUND_INTRO_DURATION;
    this.showRoundIntro(n);
  }

  private onPhaseTimerExpired(): void {
    if (this.roundPhase === 'intro') {
      this.clearOverlay();
      this.roundPhase = 'playing';
    } else if (this.roundPhase === 'complete') {
      this.clearOverlay();
      for (const sk of this.skeletons) {
        if (!sk.isRemoved) sk.forceRemove();
      }
      this.skeletons = [];
      this.startRound(this.roundNumber + 1);
    }
  }

  private tickSpawner(dt: number): void {
    if (this.enemiesToSpawn <= 0) return;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnEnemy();
      this.spawnTimer = getSpawnStagger(this.roundNumber);
    }
  }

  private spawnEnemy(): void {
    const cam        = this.cameras.main;
    const topBound   = DISPLAY_FRAME * PIRATE_ORIGIN.y;
    const side       = Math.random() < 0.5 ? 'left' : 'right';
    const spawnX     = side === 'left' ? 80 : cam.width - 80;
    const spawnY     = Phaser.Math.Clamp(
      this.player.y + Phaser.Math.Between(-80, 80),
      topBound + 20, cam.height - 20
    );
    const difficulty = getRoundDifficulty(this.roundNumber);

    let sk!: Skeleton;
    sk = new Skeleton(
      this,
      spawnX,
      spawnY,
      (atkX, atkY, atkW, atkH) => this.checkSkeletonAttackHit(atkX, atkY, atkW, atkH, sk),
      { ...difficulty, onDeath: () => { this.totalKills++; } },
    );
    this.skeletons.push(sk);
    this.enemiesToSpawn--;
  }

  private checkRoundComplete(): void {
    if (this.enemiesToSpawn > 0) return;
    if (this.skeletons.length === 0) return;
    if (!this.skeletons.every(sk => sk.isDead)) return;

    this.roundPhase      = 'complete';
    this.roundPhaseTimer = WAVE_CONFIG.ROUND_COMPLETE_DURATION;
    this.showRoundComplete();
  }

  // ── Overlay helpers ───────────────────────────────────────────────────────

  private clearOverlay(): void {
    for (const obj of this.overlayObjects) obj.destroy();
    this.overlayObjects = [];
  }

  private showRoundIntro(round: number): void {
    const cam = this.cameras.main;
    const cx  = cam.width * 0.5;
    const cy  = cam.height * 0.5;

    const bg = this.add.graphics().setDepth(300).setScrollFactor(0);
    bg.fillStyle(0x000000, 0.60);
    bg.fillRect(0, 0, cam.width, cam.height);
    this.overlayObjects.push(bg);

    const title = this.add.text(cx, cy - 30, `ROUND ${round}`, {
      fontFamily: 'monospace',
      fontSize: '60px',
      color: '#facc15',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(301).setScrollFactor(0);
    this.overlayObjects.push(title);

    const count   = fibEnemyCount(round);
    const subtext = round === 1
      ? 'Defend yourself!'
      : `${count} ${count === 1 ? 'enemy' : 'enemies'} incoming!`;
    const sub = this.add.text(cx, cy + 46, subtext, {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#d1d5db',
    }).setOrigin(0.5).setDepth(301).setScrollFactor(0);
    this.overlayObjects.push(sub);
  }

  private showRoundComplete(): void {
    const cam = this.cameras.main;
    const cx  = cam.width * 0.5;
    const cy  = cam.height * 0.5;

    const bg = this.add.graphics().setDepth(300).setScrollFactor(0);
    bg.fillStyle(0x000000, 0.50);
    bg.fillRect(0, 0, cam.width, cam.height);
    this.overlayObjects.push(bg);

    const title = this.add.text(cx, cy - 30, 'ROUND COMPLETE!', {
      fontFamily: 'monospace',
      fontSize: '48px',
      color: '#22c55e',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(301).setScrollFactor(0);
    this.overlayObjects.push(title);

    const next      = this.roundNumber + 1;
    const nextCount = fibEnemyCount(next);
    const sub = this.add.text(cx, cy + 42, `Next: Round ${next} — ${nextCount} ${nextCount === 1 ? 'enemy' : 'enemies'}`, {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#9ca3af',
    }).setOrigin(0.5).setDepth(301).setScrollFactor(0);
    this.overlayObjects.push(sub);
  }

  private showGameOver(): void {
    this.gameOverActive = true;

    const cam = this.cameras.main;
    const cx  = cam.width  * 0.5;
    const cy  = cam.height * 0.5;

    const overlay = this.add.graphics().setDepth(300).setScrollFactor(0);
    overlay.fillStyle(0x000000, 0.70);
    overlay.fillRect(0, 0, cam.width, cam.height);

    this.add.text(cx, cy - 90, 'GAME OVER', {
      fontFamily: 'monospace', fontSize: '54px', color: '#ef4444', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(301).setScrollFactor(0);

    const stats = `Round ${this.roundNumber}  •  ${this.totalKills} killed  •  ${formatTime(this.elapsedPlayTime)}`;
    this.add.text(cx, cy - 28, stats, {
      fontFamily: 'monospace', fontSize: '20px', color: '#9ca3af',
    }).setOrigin(0.5).setDepth(301).setScrollFactor(0);

    const restartBtn = this.add.text(cx, cy + 34, '[ RESTART ]', {
      fontFamily: 'monospace', fontSize: '28px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(301).setScrollFactor(0).setInteractive({ useHandCursor: true });
    restartBtn.on('pointerover',  () => restartBtn.setColor('#22c55e'));
    restartBtn.on('pointerout',   () => restartBtn.setColor('#ffffff'));
    restartBtn.on('pointerdown',  () => this.scene.restart());

    const menuBtn = this.add.text(cx, cy + 88, '[ MAIN MENU ]', {
      fontFamily: 'monospace', fontSize: '28px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(301).setScrollFactor(0).setInteractive({ useHandCursor: true });
    menuBtn.on('pointerover',  () => menuBtn.setColor('#f59e0b'));
    menuBtn.on('pointerout',   () => menuBtn.setColor('#ffffff'));
    menuBtn.on('pointerdown',  () => this.scene.start(SCENE_KEYS.MainMenu));
  }

  // ── Player update ─────────────────────────────────────────────────────────

  private updatePlayer(
    dt: number,
    input: { up: boolean; down: boolean; left: boolean; right: boolean }
  ): void {
    if (this.playerState === 'dead') {
      this.applyKnockbackMovement(dt);
      this.decayKnockback(dt);
      return;
    }

    if (this.playerState === 'hurt') {
      this.applyKnockbackMovement(dt);
      this.decayKnockback(dt);
      if (!this.player.anims.isPlaying) {
        this.playerState = 'idle';
        this.player.play('lobit-pirate-idle');
      }
      return;
    }

    const attackJustPressed = Phaser.Input.Keyboard.JustDown(this.attackKey);
    const isAttacking = this.playerState === 'attack' && this.player.anims.isPlaying;

    if (!isAttacking) {
      if (attackJustPressed) {
        this.setPlayerState('attack');
      } else if (input.left || input.right || input.up || input.down) {
        this.setPlayerState('walk');
      } else {
        this.setPlayerState('idle');
      }

      const rawDx = (input.left ? -1 : 0) + (input.right ? 1 : 0);
      const rawDy = (input.up   ? -1 : 0) + (input.down  ? 1 : 0);
      const len   = Math.hypot(rawDx, rawDy);
      const speed = getPlayerSpeed(this.roundNumber);
      const dx    = len > 0 ? (rawDx / len) * speed * dt : 0;
      const dy    = len > 0 ? (rawDy / len) * speed * dt : 0;

      if (input.right) this.facingLeft = false;
      if (input.left)  this.facingLeft = true;

      const cam      = this.cameras.main;
      const halfW    = DISPLAY_FRAME * PIRATE_ORIGIN.x;
      const topBound = DISPLAY_FRAME * PIRATE_ORIGIN.y;

      this.player.x = Phaser.Math.Clamp(this.player.x + dx, halfW, cam.width - halfW);
      this.player.y = Phaser.Math.Clamp(this.player.y + dy, topBound, cam.height);
    }

    if (this.playerState === 'attack' && !this.pirateHasDealtDamage) {
      const currentFrame = this.player.anims.currentFrame;
      if (currentFrame?.index === 4) {
        this.pirateHasDealtDamage = true;
        this.checkPirateAttackHit();
      }
    }

    this.player.setFlipX(!this.facingLeft);
  }

  /** Blinks the player sprite during the post-hurt invulnerability window. */
  private updateIFrameBlink(dt: number): void {
    if (this.iFrameTimer <= 0) return;
    // While the hurt anim is playing we keep the sprite solid; blinking starts
    // once we transition back to idle.
    if (this.playerState === 'hurt' || this.playerState === 'dead') return;

    this.iFrameTimer      -= dt;
    this.iFrameBlinkAccum += dt;
    if (this.iFrameBlinkAccum >= PLAYER_IFRAME_BLINK) {
      this.iFrameBlinkAccum -= PLAYER_IFRAME_BLINK;
      this.player.setAlpha(this.player.alpha > 0.5 ? 0.25 : 1.0);
    }
    if (this.iFrameTimer <= 0) {
      this.iFrameTimer = 0;
      this.player.setAlpha(1.0);
    }
  }

  private applyKnockbackMovement(dt: number): void {
    const cam      = this.cameras.main;
    const halfW    = DISPLAY_FRAME * PIRATE_ORIGIN.x;
    const topBound = DISPLAY_FRAME * PIRATE_ORIGIN.y;

    this.player.x = Phaser.Math.Clamp(
      this.player.x + this.knockbackVx * dt,
      halfW, cam.width - halfW
    );
    this.player.y = Phaser.Math.Clamp(
      this.player.y + this.knockbackVy * dt,
      topBound, cam.height
    );
  }

  private decayKnockback(dt: number): void {
    const decay = Math.exp(-KNOCKBACK_DECAY * dt);
    this.knockbackVx *= decay;
    this.knockbackVy *= decay;
  }

  private setPlayerState(next: Exclude<PlayerState, 'hurt' | 'dead'>): void {
    if (this.playerState === next) return;
    this.playerState = next;
    if (next === 'attack') this.pirateHasDealtDamage = false;
    this.player.play(`lobit-pirate-${next}`);
  }

  private receiveHit(dx: number, dy: number): void {
    if (this.playerState === 'hurt' || this.playerState === 'dead') return;
    if (this.iFrameTimer > 0) return;

    this.playerHealth = Math.max(0, this.playerHealth - 1);
    this.iFrameTimer      = PLAYER_IFRAME_DURATION;
    this.iFrameBlinkAccum = 0;
    this.knockbackVx  = dx * KNOCKBACK_SPEED;
    this.knockbackVy  = dy * KNOCKBACK_SPEED;

    this.triggerScreenFlash();
    this.triggerHitStop(HITSTOP_PLAYER_HURT);
    this.triggerScreenShake(SHAKE_PLAYER_HURT.duration, SHAKE_PLAYER_HURT.intensity);

    if (this.playerHealth <= 0) {
      this.playerState = 'dead';
      this.player.setAlpha(1);
      this.player.play('lobit-pirate-death');
      for (const sk of this.skeletons) sk.freeze();
      this.time.delayedCall(900, () => this.showGameOver());
    } else {
      this.playerState = 'hurt';
      this.player.play('lobit-pirate-hurt');
    }
  }

  // ── Combat checks ─────────────────────────────────────────────────────────

  private checkSkeletonAttackHit(
    atkX: number, atkY: number, atkW: number, atkH: number,
    attacker: Skeleton
  ): void {
    if (this.playerState === 'dead') return;
    if (this.iFrameTimer > 0) return;

    const bx = this.player.x - P_HITBOX_W * 0.5;
    const by = this.player.y - P_HITBOX_H;
    const overlaps =
      atkX < bx + P_HITBOX_W && atkX + atkW > bx &&
      atkY < by + P_HITBOX_H && atkY + atkH > by;
    if (!overlaps) return;

    // Spawn impact sparks between attacker and player at chest height
    const hitX = (this.player.x + attacker.sprite.x) * 0.5;
    const hitY = this.player.y - P_HITBOX_H * 0.55;
    this.spawnHitParticles(hitX, hitY, false);

    const dx  = this.player.x - attacker.sprite.x;
    const dy  = this.player.y - attacker.sprite.y;
    const len = Math.max(Math.hypot(dx, dy), 1);
    this.receiveHit(dx / len, dy / len);
  }

  private checkPirateAttackHit(): void {
    const x    = this.player.x;
    const y    = this.player.y;
    const atkX = this.facingLeft ? x - P_ATK_INNER - P_ATK_W : x + P_ATK_INNER;
    const atkY = y - P_ATK_VERT_CEN - P_ATK_H * 0.5;

    let anyHit  = false;
    let anyDied = false;

    for (const sk of this.skeletons) {
      if (!sk.hitTest(atkX, atkY, P_ATK_W, P_ATK_H)) continue;

      const dx   = sk.sprite.x - x;
      const dy   = sk.sprite.y - y;
      const len  = Math.max(Math.hypot(dx, dy), 1);
      const died = sk.receiveHit(dx / len, dy / len);

      // Spawn particles roughly on the skeleton's torso
      const hitX = sk.sprite.x;
      const hitY = sk.sprite.y - P_ATK_VERT_CEN * 0.7;
      this.spawnHitParticles(hitX, hitY, died);

      anyHit = true;
      if (died) anyDied = true;
    }

    if (anyDied) {
      this.triggerHitStop(HITSTOP_ENEMY_DEATH);
      this.triggerScreenShake(SHAKE_ENEMY_DEATH.duration, SHAKE_ENEMY_DEATH.intensity);
    } else if (anyHit) {
      this.triggerHitStop(HITSTOP_ENEMY_HURT);
      this.triggerScreenShake(SHAKE_ENEMY_HURT.duration, SHAKE_ENEMY_HURT.intensity);
    }
  }

  private resolveCharacterCollision(): void {
    const px = this.player.x - P_HITBOX_W * 0.5;
    const py = this.player.y - P_HITBOX_H;

    for (const sk of this.skeletons) {
      if (sk.isRemoved || sk.isDead) continue;

      const s         = sk.getBodyRect();
      const overlapX  = Math.min(px + P_HITBOX_W, s.x + s.w) - Math.max(px, s.x);
      const overlapY  = Math.min(py + P_HITBOX_H, s.y + s.h) - Math.max(py, s.y);

      if (overlapX <= 0 || overlapY <= 0) continue;

      if (overlapX < overlapY) {
        const half = overlapX * 0.5;
        if (this.player.x < sk.sprite.x) {
          this.player.x   -= half;
          sk.sprite.x     += half;
        } else {
          this.player.x   += half;
          sk.sprite.x     -= half;
        }
      } else {
        const half = overlapY * 0.5;
        if (this.player.y < sk.sprite.y) {
          this.player.y   -= half;
          sk.sprite.y     += half;
        } else {
          this.player.y   += half;
          sk.sprite.y     -= half;
        }
      }
    }
  }

  // ── Juice / effects ───────────────────────────────────────────────────────

  private triggerHitStop(duration: number): void {
    this.hitStopTimer = Math.max(this.hitStopTimer, duration);
  }

  private triggerScreenShake(durationMs: number, intensity: number): void {
    this.cameras.main.shake(durationMs, intensity);
  }

  private triggerScreenFlash(): void {
    this.screenFlashTimer = FLASH_DURATION;
    this.screenFlashGraphics.setAlpha(FLASH_ALPHA);
  }

  private updateScreenFlash(dt: number): void {
    if (this.screenFlashTimer <= 0) return;
    this.screenFlashTimer -= dt;
    if (this.screenFlashTimer <= 0) {
      this.screenFlashTimer = 0;
      this.screenFlashGraphics.setAlpha(0);
    } else {
      this.screenFlashGraphics.setAlpha((this.screenFlashTimer / FLASH_DURATION) * FLASH_ALPHA);
    }
  }

  private spawnHitParticles(x: number, y: number, isDeath: boolean): void {
    const count = isDeath ? 12 : 6;
    const speed = isDeath ? 210 : 140;
    const life  = isDeath ? 0.55 : 0.32;
    const size  = isDeath ? 5    : 3;
    const color = isDeath ? 0xfbbf24 : 0xfde68a;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.9;
      const spd   = speed * (0.4 + Math.random() * 0.6);
      const gfx   = this.add.graphics();
      gfx.x = x;
      gfx.y = y;
      gfx.setDepth(120);
      this.hitParticles.push({
        gfx,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life,
        maxLife: life,
        size,
        color,
      });
    }
  }

  private updateHitParticles(dt: number): void {
    for (let i = this.hitParticles.length - 1; i >= 0; i--) {
      const p = this.hitParticles[i]!;
      p.life -= dt;
      if (p.life <= 0) {
        p.gfx.destroy();
        this.hitParticles.splice(i, 1);
        continue;
      }
      p.gfx.x += p.vx * dt;
      p.gfx.y += p.vy * dt;
      p.vy    += 280 * dt; // gravity

      const t     = 1 - p.life / p.maxLife;
      const alpha = 1 - t;
      const sz    = p.size * (1 - t * 0.4);

      p.gfx.clear();
      p.gfx.fillStyle(p.color, alpha);
      p.gfx.fillRect(-sz * 0.5, -sz * 0.5, sz, sz);
    }
  }

  // ── HUD ───────────────────────────────────────────────────────────────────

  private drawHUD(time: number): void {
    this.hudGraphics.clear();

    const ratio = this.playerHealth / PLAYER_MAX_HEALTH;

    const color = ratio > 0.6 ? 0x22c55e
                : ratio > 0.3 ? 0xf59e0b
                :                0xef4444;

    const critical  = this.playerHealth > 0 && this.playerHealth <= 1;
    const fillAlpha = critical ? (Math.floor(time / 220) % 2 === 0 ? 1 : 0.25) : 1;

    this.hudGraphics.fillStyle(0x111827, 0.85);
    this.hudGraphics.fillRect(HUD_BAR_X, HUD_Y, HUD_BAR_W, HUD_BAR_H);

    const fillW = HUD_BAR_W * ratio;
    if (fillW > 0) {
      this.hudGraphics.fillStyle(color, fillAlpha);
      this.hudGraphics.fillRect(HUD_BAR_X, HUD_Y, fillW, HUD_BAR_H);
    }

    this.hudGraphics.lineStyle(2, 0xffffff, 0.85);
    this.hudGraphics.strokeRect(HUD_BAR_X, HUD_Y, HUD_BAR_W, HUD_BAR_H);

    this.hudCounter.setText(`${this.playerHealth}/${PLAYER_MAX_HEALTH}`);
    this.hudRound.setText(`• RND ${this.roundNumber}`);
    this.hudKills.setText(`⚔ ${this.totalKills}`);
    this.hudTimer.setText(formatTime(this.elapsedPlayTime));
  }

  // ── Debug draw ────────────────────────────────────────────────────────────

  private drawPirateDebug(flags: ActorDebugFlags): void {
    this.playerDebugGraphics.clear();

    const x = this.player.x;
    const y = this.player.y;

    if (flags.bounds) {
      this.playerDebugGraphics.lineStyle(1, CLR_BOUNDS, 0.8);
      this.playerDebugGraphics.strokeRect(
        x - DISPLAY_FRAME * 0.5,
        y - DISPLAY_FRAME * PIRATE_ORIGIN.y,
        DISPLAY_FRAME, DISPLAY_FRAME
      );
    }

    if (flags.hitbox) {
      const hx = x - P_HITBOX_W * 0.5;
      const hy = y - P_HITBOX_H;
      this.playerDebugGraphics.fillStyle(CLR_HITBOX, 0.18);
      this.playerDebugGraphics.fillRect(hx, hy, P_HITBOX_W, P_HITBOX_H);
      this.playerDebugGraphics.lineStyle(2, CLR_HITBOX, 1);
      this.playerDebugGraphics.strokeRect(hx, hy, P_HITBOX_W, P_HITBOX_H);
    }

    if (flags.attackBox) {
      const isAttacking = this.playerState === 'attack' && this.player.anims.isPlaying;
      this.playerDebugGraphics.lineStyle(
        1,
        isAttacking ? CLR_ATTACK_ACTIVE : CLR_ATTACK,
        isAttacking ? 1 : 0.5
      );
      const atkX = this.facingLeft ? x - P_ATK_INNER - P_ATK_W : x + P_ATK_INNER;
      this.playerDebugGraphics.strokeRect(
        atkX,
        y - P_ATK_VERT_CEN - P_ATK_H * 0.5,
        P_ATK_W, P_ATK_H
      );
    }
  }
}
