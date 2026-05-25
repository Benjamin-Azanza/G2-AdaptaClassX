import { registerGeneratedAssets } from '../game/generatedAssets';
import { SCENE_KEYS } from '../game/types';
import { BaseScene } from './BaseScene';

const CHAR_FRAME_SIZE = 256;
const PIRATE_ANIMS  = ['idle', 'walk', 'attack', 'hurt', 'jump', 'death'] as const;
const SKELETON_ANIMS = ['idle', 'walk', 'attack', 'hurt', 'death'] as const;

export class BootScene extends BaseScene {
  constructor() {
    super(SCENE_KEYS.Boot);
  }

  preload(): void {
    this.load.image('background-1', 'assets/backgrounds/fondo numero 1.png');

    for (const anim of PIRATE_ANIMS) {
      this.load.spritesheet(
        `lobit-pirate-${anim}`,
        `assets/lobit/pirate/animations/w/${anim}/spritesheet.png`,
        { frameWidth: CHAR_FRAME_SIZE, frameHeight: CHAR_FRAME_SIZE }
      );
    }

    for (const anim of SKELETON_ANIMS) {
      this.load.spritesheet(
        `lobit-skeleton-${anim}`,
        `assets/lobit/skeleton/animations/w/${anim}/spritesheet.png`,
        { frameWidth: CHAR_FRAME_SIZE, frameHeight: CHAR_FRAME_SIZE }
      );
    }
  }

  create(): void {
    this.markActiveScene(SCENE_KEYS.Boot);
    registerGeneratedAssets(this);
    this.scene.start(SCENE_KEYS.Splash);
  }
}
