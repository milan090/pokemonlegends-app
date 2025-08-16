import { Scene } from "phaser";

/**
 * Utility class for setting up player animations
 */
export class PlayerAnimations {
  /**
   * Setup all animations for a player sprite
   * @param scene The Phaser scene
   * @param sprite The player sprite to set up animations for
   * @param frameRate Animation frame rate
   */
  public static setupAnimations(scene: Scene, sprite: Phaser.GameObjects.Sprite, frameRate: number = 10): void {
    // Skip if animations are already created
    if (sprite.anims.exists('downWalk')) {
      return;
    }
    
    // Walking animations
    sprite.anims.create({
      key: "downWalk",
      frames: scene.anims.generateFrameNames('player', { start: 0, end: 2 }),
      frameRate,
      repeat: -1
    });
    
    sprite.anims.create({
      key: "leftWalk",
      frames: scene.anims.generateFrameNames('player', { start: 3, end: 5 }),
      frameRate,
      repeat: -1
    });
    
    sprite.anims.create({
      key: "rightWalk",
      frames: scene.anims.generateFrameNames('player', { start: 6, end: 8 }),
      frameRate,
      repeat: -1
    });
    
    sprite.anims.create({
      key: "upWalk",
      frames: scene.anims.generateFrameNames('player', { start: 9, end: 11 }),
      frameRate,
      repeat: -1
    });
    
    // Idle animations
    sprite.anims.create({
      key: "downIdle",
      frames: [{ key: "player", frame: 1 }],
      frameRate
    });
    
    sprite.anims.create({
      key: "leftIdle",
      frames: [{ key: "player", frame: 4 }],
      frameRate
    });
    
    sprite.anims.create({
      key: "rightIdle",
      frames: [{ key: "player", frame: 7 }],
      frameRate
    });
    
    sprite.anims.create({
      key: "upIdle",
      frames: [{ key: "player", frame: 10 }],
      frameRate
    });
  }
}