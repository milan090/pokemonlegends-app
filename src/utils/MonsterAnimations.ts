import { Scene } from "phaser";

/**
 * Utility class for setting up monster animations
 */
export class MonsterAnimations {
  // Track monster types that have been initialized
  private static initializedMonsterTypes: Set<string> = new Set();
  
  /**
   * Setup all animations for a monster type
   * @param scene The Phaser scene
   * @param monsterType The template ID of the monster (e.g., 'bubblix')
   * @param frameRate Animation frame rate
   * @returns Boolean indicating if animations were successfully created
   */
  public static setupAnimations(scene: Scene, monsterType: string, frameRate: number = 8): boolean {
    // Skip if this monster type has already been initialized
    if (this.initializedMonsterTypes.has(monsterType)) {
      return true;
    }
    
    // Check if the texture for this monster type exists
    if (!scene.textures.exists(monsterType)) {
      console.warn(`Monster texture "${monsterType}" not loaded yet. Animations will be created when texture is available.`);
      return false;
    }
    
    
    // Animation configs based on the sprite layout provided
    // 0-3: down direction
    // 4-7: left direction
    // 8-11: right direction
    // 12-15: up direction
    
    // Down direction - frames 0-3
    scene.anims.create({
      key: `${monsterType}_downWalk`,
      frames: scene.anims.generateFrameNumbers(monsterType, { start: 0, end: 3 }),
      frameRate,
      repeat: -1
    });
    
    // Left direction - frames 4-7
    scene.anims.create({
      key: `${monsterType}_leftWalk`,
      frames: scene.anims.generateFrameNumbers(monsterType, { start: 4, end: 7 }),
      frameRate,
      repeat: -1
    });
    
    // Right direction - frames 8-11
    scene.anims.create({
      key: `${monsterType}_rightWalk`,
      frames: scene.anims.generateFrameNumbers(monsterType, { start: 8, end: 11 }),
      frameRate,
      repeat: -1
    });
    
    // Up direction - frames 12-15
    scene.anims.create({
      key: `${monsterType}_upWalk`,
      frames: scene.anims.generateFrameNumbers(monsterType, { start: 12, end: 15 }),
      frameRate,
      repeat: -1
    });
    
    // Idle animations - use first frame of each direction
    scene.anims.create({
      key: `${monsterType}_downIdle`,
      frames: [{ key: monsterType, frame: 0 }],
      frameRate
    });
    
    scene.anims.create({
      key: `${monsterType}_leftIdle`,
      frames: [{ key: monsterType, frame: 4 }],
      frameRate
    });
    
    scene.anims.create({
      key: `${monsterType}_rightIdle`,
      frames: [{ key: monsterType, frame: 9 }],
      frameRate
    });
    
    scene.anims.create({
      key: `${monsterType}_upIdle`,
      frames: [{ key: monsterType, frame: 13 }],
      frameRate
    });
    
    // Default idle animation - use first frame of down direction
    scene.anims.create({
      key: `${monsterType}_idle`,
      frames: [{ key: monsterType, frame: 0 }],
      frameRate
    });
    
    // Mark this monster type as initialized
    this.initializedMonsterTypes.add(monsterType);
    return true;
  }
  
  /**
   * Get the appropriate animation key for a monster
   * @param templateId The monster's template ID
   * @param animation The animation type (walk/idle)
   * @param direction The direction the monster is facing
   * @returns The complete animation key
   */
  public static getAnimationKey(templateId: string, animation: string, direction: string): string {
    // Map animation to our animation keys
    if (animation.includes('Walk') || animation.includes('walk')) {
      // For walking animations, include direction
      return `${templateId}_${direction}Walk`;
    } else if (animation === 'idle') {
      // For idle animation, include direction if available
      if (direction) {
        return `${templateId}_${direction}Idle`;
      } else {
        return `${templateId}_idle`;
      }
    } else {
      // For other animations, use as is with template prefix
      return `${templateId}_${animation}`;
    }
  }
} 