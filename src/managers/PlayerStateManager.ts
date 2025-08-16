import { Scene } from 'phaser';
import { Game } from '../scenes/Game';
import { PlayerState } from '../types/player.types';
import { PositionUtils } from '../utils/PositionUtils';

/**
 * Manages the local player's state and position updates
 */
export class PlayerStateManager {
  private player: Phaser.GameObjects.Sprite;
  private scene: Scene;
  private positionUtils: PositionUtils;
  private lastSentPosition = { x: 0, y: 0, direction: '' };
  private pendingPositionUpdate: { x: number, y: number, direction: string } | null = null;
  private lastMessageTime: number = 0;
  private minMessageInterval: number = 75;
  
  constructor(scene: Scene, player: Phaser.GameObjects.Sprite, tileSize: number) {
    this.scene = scene;
    this.player = player;
    this.positionUtils = new PositionUtils(tileSize);
  }
  
  /**
   * Send position update to server
   */
  public sendPositionUpdate(
    tileX: number, 
    tileY: number, 
    direction: string, 
    sendMessageCallback: (message: any) => void
  ): void {
    const now = Date.now();
    
    // Check if position has changed
    if (
      this.lastSentPosition.x !== tileX ||
      this.lastSentPosition.y !== tileY ||
      this.lastSentPosition.direction !== direction
    ) {
      // Check if we're trying to send too many messages
      if (now - this.lastMessageTime < this.minMessageInterval) {
        // Store only the newest update to send later
        this.pendingPositionUpdate = { x: tileX, y: tileY, direction };
        return;
      }
      
      // Update position and send to server
      this.lastSentPosition = { x: tileX, y: tileY, direction };
      this.lastMessageTime = now;
      
      sendMessageCallback({
        type: "move",
        x: tileX,
        y: tileY,
        direction: direction
      });
    }
  }
  
  /**
   * Apply any pending position updates
   */
  public processPendingUpdates(sendMessageCallback: (message: any) => void): void {
    if (this.pendingPositionUpdate) {
      const { x, y, direction } = this.pendingPositionUpdate;
      this.pendingPositionUpdate = null;
      
      // Only send if it's still different from last sent position
      if (
        this.lastSentPosition.x !== x ||
        this.lastSentPosition.y !== y ||
        this.lastSentPosition.direction !== direction
      ) {
        this.sendPositionUpdate(x, y, direction, sendMessageCallback);
      }
    }
  }
  
  /**
   * Update the player's position from the Game scene
   */
  public updateFromScene(sendMessageCallback: (message: any) => void): void {
    if (!this.player) return;
    
    if (this.scene instanceof Game) {
      const gameScene = this.scene as Game;
      
      // Get position data from Game scene
      let tileX, tileY;
      
      if (gameScene.isPlayerMoving && gameScene.getTargetTilePosition) {
        // Use target position from Game scene
        const targetPosition = gameScene.getTargetTilePosition();
        tileX = targetPosition.x;
        tileY = targetPosition.y;
      } else {
        // Calculate from sprite position
        tileX = this.positionUtils.pixelToTileX(this.player.x);
        tileY = this.positionUtils.pixelToTileY(this.player.y);
      }
      
      // Get direction from animation
      let currentAnimation = '';
      if (this.player.anims && this.player.anims.currentAnim) {
        currentAnimation = this.player.anims.currentAnim.key;
      }
      
      const direction = this.getDirectionFromAnimation(currentAnimation);
      
      // Send update
      this.sendPositionUpdate(tileX, tileY, direction, sendMessageCallback);
    } else {
      // Fallback to calculating from sprite position
      const tileX = this.positionUtils.pixelToTileX(this.player.x);
      const tileY = this.positionUtils.pixelToTileY(this.player.y);
      
      let currentAnimation = '';
      if (this.player.anims && this.player.anims.currentAnim) {
        currentAnimation = this.player.anims.currentAnim.key;
      }
      
      const direction = this.getDirectionFromAnimation(currentAnimation);
      this.sendPositionUpdate(tileX, tileY, direction, sendMessageCallback);
    }
  }
  
  /**
   * Update player position from server welcome/update
   */
  public updateFromServer(playerState: PlayerState): void {
    if (!this.player) return;
    
    // Get tile coordinates from server data
    const tileX = playerState.tile_x !== undefined ? playerState.tile_x : 
                 (playerState.x !== undefined ? playerState.x : 0);
    const tileY = playerState.tile_y !== undefined ? playerState.tile_y : 
                 (playerState.y !== undefined ? playerState.y : 0);
    
    // Convert to pixel coordinates
    const pixelX = this.positionUtils.tileToPixelX(tileX);
    const pixelY = this.positionUtils.tileToPixelY(tileY);
    
    // Update player position
    this.player.setPosition(pixelX, pixelY);
    
    // Update Game scene if possible
    try {
      if (this.scene instanceof Game) {
        (this.scene as any).setPlayerTilePosition?.(tileX, tileY);
      }
    } catch (e) {
      console.warn("Could not update Game scene position:", e);
    }
    
    // Update animation based on direction
    if (playerState.direction) {
      const animationKey = `${playerState.direction}Idle`;
      if (this.player.anims && 
          (!this.player.anims.currentAnim || this.player.anims.currentAnim.key !== animationKey)) {
        this.player.play(animationKey, true);
      }
    }
  }
  
  /**
   * Extract direction from animation name
   */
  private getDirectionFromAnimation(animation: string): string {
    if (animation.includes('down')) return 'down';
    if (animation.includes('up')) return 'up';
    if (animation.includes('left')) return 'left';
    if (animation.includes('right')) return 'right';
    return 'down'; // Default
  }
} 