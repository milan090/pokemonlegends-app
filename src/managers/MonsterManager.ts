import { Scene } from "phaser";
import { Monster } from "../types/monster.types";
import { PositionUtils } from "../utils/PositionUtils";
import { MonsterAnimations } from "../utils/MonsterAnimations";
import { getMonsterSpriteType } from "../utils/common";

interface ManagedMonster {
  instance_id: string;
  template_id: number;
  sprite: Phaser.GameObjects.Sprite;
  lastUpdate: number;
  targetX: number;
  targetY: number;
  isMoving: boolean;
  moveStartTime: number;
  moveDuration: number;
  direction: string;
  animation: string;
  level: number;
  name: string;
  nameText?: Phaser.GameObjects.Text;
}

/**
 * Manages monster instances, rendering, and animations
 */
export class MonsterManager {
  private scene: Scene;
  private monsters: Map<string, ManagedMonster> = new Map();
  private tileSize: number;
  private positionUtils: PositionUtils;
  private moveDuration: number = 400; // Slightly slower than player movement
  private showNames: boolean = true;
  // Known monster types that have been initialized
  private initializedMonsterTypes: Set<string> = new Set();
  
  constructor(scene: Scene, tileSize: number) {
    this.scene = scene;
    this.tileSize = tileSize;
    this.positionUtils = new PositionUtils(tileSize);
  }
  
  /**
   * Initialize monster animations if they don't exist yet
   * @param monsterType The template ID of the monster (e.g., 'bubblix')
   */
  private initializeMonsterAnimations(monsterType: string): void {
    MonsterAnimations.setupAnimations(this.scene, monsterType);
  }
  
  /**
   * Add or update a monster in the game
   */
  public updateMonster(monster: Monster): void {
    const instanceId = monster.instance_id;
    const templateId = monster.template_id;
    
    // Initialize animations for this monster type
    this.initializeMonsterAnimations(getMonsterSpriteType(templateId));
    
    if (this.monsters.has(instanceId)) {
      // Update existing monster
      this.updateExistingMonster(monster);
    } else {
      // Create new monster
      this.createNewMonster(monster);
    }
  }
  
  /**
   * Create a new monster sprite
   */
  private createNewMonster(monster: Monster): void {
    const { instance_id, template_id, position, direction, name, level } = monster;
    
    // Convert tile position to pixel position
    const pixelX = this.positionUtils.tileToPixelX(position.x);
    const pixelY = this.positionUtils.tileToPixelY(position.y);
    
    // Create sprite using template_id as the texture key
    const sprite = this.scene.add.sprite(pixelX, pixelY, getMonsterSpriteType(template_id));
    sprite.setOrigin(0.5, 0.5);
    
    // Set depth based on y position for correct layering
    sprite.setDepth(pixelY);
    
    // Add name text above monster if showNames is enabled
    let nameText: Phaser.GameObjects.Text | undefined;
    if (this.showNames) {
      nameText = this.scene.add.text(pixelX, pixelY - 20, `Lv.${level}`, {
        font: '9px Inter',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2,
        resolution: window.devicePixelRatio,
        padding: { x: 4, y: 2 },
        shadow: {
          offsetX: 1,
          offsetY: 1,
          color: '#000000',
          blur: 0,
          stroke: true,
          fill: true
        },
        letterSpacing: 1
      });
      nameText.setOrigin(0.5, 0.5);
      nameText.setDepth(pixelY - 1);
    }
    
    // Determine initial animation based on direction
    const animation = monster.direction ? `${direction}Idle` : 'idle';
    
    // Store the monster in our map
    this.monsters.set(instance_id, {
      instance_id,
      template_id,
      sprite,
      lastUpdate: Date.now(),
      targetX: pixelX,
      targetY: pixelY,
      isMoving: false,
      moveStartTime: 0,
      moveDuration: this.moveDuration,
      direction,
      animation,
      level,
      name,
      nameText
    });
    
    // Play initial animation
    this.playMonsterAnimation(instance_id, animation, direction);
  }
  
  /**
   * Update an existing monster
   */
  private updateExistingMonster(monster: Monster): void {
    const { instance_id, position, direction } = monster;
    const managedMonster = this.monsters.get(instance_id);
    
    if (!managedMonster) return;
    
    // Convert tile position to pixel position
    const pixelX = this.positionUtils.tileToPixelX(position.x);
    const pixelY = this.positionUtils.tileToPixelY(position.y);
    
    // Update position if it changed
    if (pixelX !== managedMonster.targetX || pixelY !== managedMonster.targetY) {
      // Set new target position
      managedMonster.targetX = pixelX;
      managedMonster.targetY = pixelY;
      
      // Start moving to new position
      managedMonster.isMoving = true;
      managedMonster.moveStartTime = Date.now();
      
      // Determine appropriate animation based on movement
      const animation = `${direction}Walk`;
      
      // Update animation if it changed
      if (animation !== managedMonster.animation || direction !== managedMonster.direction) {
        this.playMonsterAnimation(instance_id, animation, direction);
        managedMonster.animation = animation;
        managedMonster.direction = direction;
      }
    } else if (direction !== managedMonster.direction) {
      // Only direction changed, update idle animation
      const animation = `${direction}Idle`;
      this.playMonsterAnimation(instance_id, animation, direction);
      managedMonster.animation = animation;
      managedMonster.direction = direction;
    }
    
    // Update last update time
    managedMonster.lastUpdate = Date.now();
  }
  
  /**
   * Play appropriate animation for monster based on template, animation type and direction
   */
  private playMonsterAnimation(instanceId: string, animation: string, direction: string): void {
    const monster = this.monsters.get(instanceId);
    if (!monster) return;
    
    const { sprite, template_id } = monster;
    
    // Get animation key
    const animKey = MonsterAnimations.getAnimationKey(getMonsterSpriteType(template_id), animation, direction);
    
    // Play the animation if it exists
    if (this.scene.anims.exists(animKey)) {
      sprite.play(animKey, true);
    } else {
      // Fallback to generic idle animation
      const fallbackKey = `${template_id}_idle`;
      if (this.scene.anims.exists(fallbackKey)) {
        sprite.play(fallbackKey, true);
      } else {
        console.warn(`Animation ${animKey} not found for monster ${instanceId}, no fallback available`);
      }
    }
  }
  
  /**
   * Update all monsters (called every frame)
   */
  public update(): void {
    const now = Date.now();
    
    // Update each monster
    this.monsters.forEach((monster) => {
      if (monster.isMoving) {
        // Calculate progress (0 to 1)
        const elapsed = now - monster.moveStartTime;
        const progress = Math.min(1, elapsed / monster.moveDuration);
        
        // Get current position
        const sprite = monster.sprite;
        const startX = sprite.x;
        const startY = sprite.y;
        
        // Calculate new position with easing
        const newX = startX + (monster.targetX - startX) * PositionUtils.easeInOutCubic(progress);
        const newY = startY + (monster.targetY - startY) * PositionUtils.easeInOutCubic(progress);
        
        // Update sprite position
        sprite.setPosition(newX, newY);
        
        // Update depth based on y position for correct layering
        sprite.setDepth(newY);
        
        // Update name text position if it exists
        if (monster.nameText) {
          monster.nameText.setPosition(newX, newY - 20);
          monster.nameText.setDepth(newY - 1);
        }
        
        // Check if movement is complete
        if (progress >= 1) {
          monster.isMoving = false;
          
          // Switch to idle animation when done moving
          const idleAnim = `${monster.direction}Idle`;
          if (monster.animation !== idleAnim) {
            monster.animation = idleAnim;
            this.playMonsterAnimation(monster.instance_id, idleAnim, monster.direction);
          }
        }
      }
    });
  }
  
  /**
   * Remove a monster from the game
   */
  public removeMonster(instanceId: string): void {
    const monster = this.monsters.get(instanceId);
    if (!monster) return;
    
    // Destroy sprite and text
    monster.sprite.destroy();
    if (monster.nameText) {
      monster.nameText.destroy();
    }
    
    // Remove from our map
    this.monsters.delete(instanceId);
    
    console.log(`Removed monster: ${instanceId}`);
  }
  
  /**
   * Handle monster despawn - either fade out or animate death
   */
  public despawnMonster(instanceId: string): void {
    const monster = this.monsters.get(instanceId);
    if (!monster) return;
    
    // Add a simple fade out tween for the monster
    this.scene.tweens.add({
      targets: [monster.sprite, monster.nameText],
      alpha: 0,
      duration: 1000,
      onComplete: () => {
        this.removeMonster(instanceId);
      }
    });
  }
  
  /**
   * Remove all monsters (e.g., when leaving a scene)
   */
  public clearAllMonsters(): void {
    this.monsters.forEach((monster, id) => {
      this.removeMonster(id);
    });
  }
  
  /**
   * Check if a tile is occupied by a monster
   * @param tileX The x coordinate of the tile to check
   * @param tileY The y coordinate of the tile to check
   * @returns True if a monster is on the tile, false otherwise
   */
  public isTileOccupiedByMonster(tileX: number, tileY: number): boolean {
    // Check each monster in the map
    for (const monster of this.monsters.values()) {
      // Get the monster's current tile position
      const monsterTileX = this.positionUtils.pixelToTileX(monster.sprite.x);
      const monsterTileY = this.positionUtils.pixelToTileY(monster.sprite.y);
      
      // If the monster is at the specified tile position, return true
      if (monsterTileX === tileX && monsterTileY === tileY) {
        return true;
      }
    }
    
    // No monster found at this tile
    return false;
  }
  
  /**
   * Get the monster instance ID at a specific tile if one exists
   * @param tileX The x coordinate of the tile to check
   * @param tileY The y coordinate of the tile to check
   * @returns The monster's instance ID if found, otherwise undefined
   */
  public getMonsterIdAtTile(tileX: number, tileY: number): string | undefined {
    // Check each monster in the map
    for (const monster of this.monsters.values()) {
      // Get the monster's current tile position
      const monsterTileX = this.positionUtils.pixelToTileX(monster.sprite.x);
      const monsterTileY = this.positionUtils.pixelToTileY(monster.sprite.y);
      
      // If the monster is at the specified tile position, return its ID
      if (monsterTileX === tileX && monsterTileY === tileY) {
        return monster.instance_id;
      }
    }
    
    // No monster found at this tile
    return undefined;
  }
  
  /**
   * Clean up resources
   */
  public cleanUp(): void {
    this.clearAllMonsters();
  }
  
  /**
   * Toggle monster name display
   */
  public toggleNameDisplay(show: boolean): void {
    this.showNames = show;
    
    this.monsters.forEach(monster => {
      if (monster.nameText) {
        monster.nameText.setVisible(show);
      }
    });
  }
} 