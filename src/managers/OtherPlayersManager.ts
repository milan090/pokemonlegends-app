import { Scene } from 'phaser';
import { OtherPlayer, PlayerState } from '../types/player.types';
import { PlayerAnimations } from '../utils/PlayerAnimations';
import { PositionUtils } from '../utils/PositionUtils';

/**
 * Manages other players in the multiplayer game
 */
export class OtherPlayersManager {
  private otherPlayers: Map<string, OtherPlayer> = new Map();
  private scene: Scene;
  private positionUtils: PositionUtils;
  private serverUpdateRate: number;
  private playerTimeout: number = 10000; // Time in ms before considering a player inactive
  
  constructor(scene: Scene, tileSize: number, serverUpdateRate: number) {
    this.scene = scene;
    this.positionUtils = new PositionUtils(tileSize);
    this.serverUpdateRate = serverUpdateRate;
  }
  
  /**
   * Update or add another player based on server state
   */
  public updatePlayer(playerState: PlayerState, playerId: string | null): void {
    // Skip if this is our own player
    if (playerState.id === playerId) return;
    
    const otherPlayer = this.otherPlayers.get(playerState.id);
    
    // If player doesn't exist, add them
    if (!otherPlayer) {
      this.addPlayer(playerState);
      return;
    }
    
    // Update existing player
    this.updateExistingPlayer(otherPlayer, playerState);
  }
  
  /**
   * Add a new player to the game
   */
  private addPlayer(playerState: PlayerState): void {
    // Create player and add to collection
    const player = this.createPlayer(playerState);
    this.otherPlayers.set(playerState.id, player);
  }
  
  private createPlayer(playerState: PlayerState): OtherPlayer {
    // Get tile coordinates from state
    const tileX = playerState.tile_x !== undefined ? playerState.tile_x : 
                 (playerState.x !== undefined ? playerState.x : 0);
    const tileY = playerState.tile_y !== undefined ? playerState.tile_y : 
                 (playerState.y !== undefined ? playerState.y : 0);
    
    // Convert to pixel coordinates
    const pixelX = this.positionUtils.tileToPixelX(tileX);
    const pixelY = this.positionUtils.tileToPixelY(tileY);
    
    // Create sprite
    const sprite = this.scene.physics.add.sprite(pixelX, pixelY, 'player');
    
    // Initialize animations
    PlayerAnimations.setupAnimations(this.scene, sprite);
    
    // Set initial direction
    const direction = playerState.direction || 'down';
    sprite.play(`${direction}Idle`);
    
    const now = Date.now();
    const serverTimestamp = playerState.timestamp || now;
    const initialLatency = playerState.timestamp ? now - playerState.timestamp : 0;
    
    // Create name text above the player sprite
    const nameText = this.scene.add.text(pixelX, pixelY - 25, playerState.username || playerState.id, {
      font: '12px Inter',
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
      }
    });
    nameText.setOrigin(0.5, 1);
    nameText.setDepth(sprite.depth + 1);
    
    return {
      id: playerState.id,
      sprite: sprite,
      nameText: nameText,
      lastUpdated: now,
      tileX: tileX,
      tileY: tileY,
      targetX: pixelX,
      targetY: pixelY,
      direction: direction,
      isMoving: false,
      moveStartTime: 0,
      moveDuration: this.serverUpdateRate,
      lastAnimation: `${direction}Idle`,
      serverTimestamp: serverTimestamp,
      latency: initialLatency,
      in_combat: playerState.in_combat || false,
      username: playerState.username
    };
  }
  
  /**
   * Update an existing player's state
   */
  private updateExistingPlayer(otherPlayer: OtherPlayer, playerState: PlayerState): void {
    const now = Date.now();
    
    // Update timestamp and latency if available
    if (playerState.timestamp) {
      otherPlayer.serverTimestamp = playerState.timestamp;
      otherPlayer.latency = now - playerState.timestamp;
    }
  
    const timeSinceLastUpdate = now - otherPlayer.lastUpdated;
    otherPlayer.lastUpdated = now;
    
    // Calculate movement duration with latency compensation
    const MAX_MOVEMENT_DURATION = 300;
    let adjustedDuration = Math.min(
      MAX_MOVEMENT_DURATION, 
      Math.max(this.serverUpdateRate, Math.min(timeSinceLastUpdate, 1000))
    );
    
    // Apply latency compensation
    if (otherPlayer.latency > 0) {
      const latencyCompensation = Math.min(otherPlayer.latency, adjustedDuration * 0.5);
      adjustedDuration = Math.max(adjustedDuration * 0.5, adjustedDuration - latencyCompensation);
    }
    
    otherPlayer.moveDuration = adjustedDuration;

    // Get new target position
    const newTargetX = playerState.tile_x !== undefined ? playerState.tile_x : 
                          (playerState.x !== undefined ? playerState.x : otherPlayer.targetX);
    const newTargetY = playerState.tile_y !== undefined ? playerState.tile_y : 
                          (playerState.y !== undefined ? playerState.y : otherPlayer.targetY);
    
    // Check if it's only a direction change
    const isOnlyDirectionChange = 
      newTargetX === otherPlayer.tileX && 
      newTargetY === otherPlayer.tileY && 
      playerState.direction && 
      playerState.direction !== otherPlayer.direction;
      
    // Handle direction change without movement
    if (isOnlyDirectionChange) {
      otherPlayer.direction = playerState.direction;
      const animationKey = `${playerState.direction}Idle`;
      
      if (animationKey !== otherPlayer.lastAnimation) {
        otherPlayer.lastAnimation = animationKey;
        otherPlayer.sprite.play(animationKey, true);
      }
      return;
    }
    
    // Check if position has changed
    const positionChanged = newTargetX !== otherPlayer.tileX || 
                           newTargetY !== otherPlayer.tileY;
    if (!positionChanged) return;
    
    // Calculate distance to new position
    const distanceToNewTarget = Math.abs(otherPlayer.tileX - newTargetX) + 
                              Math.abs(otherPlayer.tileY - newTargetY);
    
    // For big jumps (teleports), immediately set position
    if (distanceToNewTarget > 3) {
      this.teleportPlayer(otherPlayer, newTargetX, newTargetY, playerState.direction);
      return;
    }
    
    // Handle movement based on distance and current state
    if (otherPlayer.isMoving) {
      // If new target is same as current, ignore
      if (newTargetX === otherPlayer.targetX && newTargetY === otherPlayer.targetY) {
        return;
      }
      
      // Calculate progress of current movement
      const elapsed = now - otherPlayer.moveStartTime;
      const progress = Math.min(1, elapsed / otherPlayer.moveDuration);
      
      // If less than halfway through movement, adapt target
      if (progress < 0.5) {
        otherPlayer.targetX = newTargetX;
        otherPlayer.targetY = newTargetY;
        otherPlayer.moveStartTime = now - (otherPlayer.moveDuration * 0.2);
      } else {
        // Complete current move and start next one
        otherPlayer.tileX = otherPlayer.targetX;
        otherPlayer.tileY = otherPlayer.targetY;
        otherPlayer.targetX = newTargetX;
        otherPlayer.targetY = newTargetY;
        otherPlayer.moveStartTime = now;
      }
    } else {
      // Start a new movement
      otherPlayer.isMoving = true;
      otherPlayer.moveStartTime = now;
      otherPlayer.targetX = newTargetX;
      otherPlayer.targetY = newTargetY;
    }
    
    // Update direction
    this.updatePlayerDirection(otherPlayer, playerState, newTargetX, newTargetY);
    
    // Update animation to walking
    const walkAnim = `${otherPlayer.direction}Walk`;
    if (otherPlayer.lastAnimation !== walkAnim) {
      otherPlayer.lastAnimation = walkAnim;
      otherPlayer.sprite.play(walkAnim, true);
    }

    // Update combat state if changed
    if (playerState.in_combat !== undefined && playerState.in_combat !== otherPlayer.in_combat) {
      otherPlayer.in_combat = playerState.in_combat;
      this.updateCombatVisual(otherPlayer);
    }
  }
  
  /**
   * Teleport a player to a new position (for large movements)
   */
  private teleportPlayer(
    otherPlayer: OtherPlayer, 
    tileX: number, 
    tileY: number, 
    direction?: string
  ): void {
    otherPlayer.tileX = tileX;
    otherPlayer.tileY = tileY;
    otherPlayer.targetX = tileX;
    otherPlayer.targetY = tileY;
    otherPlayer.isMoving = false;
    
    // Update sprite position
    const pixelX = this.positionUtils.tileToPixelX(tileX);
    const pixelY = this.positionUtils.tileToPixelY(tileY);
    otherPlayer.sprite.setPosition(pixelX, pixelY);
    
    // Update nameText position
    if (otherPlayer.nameText) {
      otherPlayer.nameText.setPosition(pixelX, pixelY - 25);
    }
    
    // Update direction if provided
    if (direction) {
      otherPlayer.direction = direction;
      const idleAnim = `${direction}Idle`;
      otherPlayer.lastAnimation = idleAnim;
      otherPlayer.sprite.play(idleAnim, true);
    }
  }
  
  /**
   * Update player direction based on movement or server state
   */
  private updatePlayerDirection(
    otherPlayer: OtherPlayer, 
    playerState: PlayerState, 
    targetX: number, 
    targetY: number
  ): void {
    if (playerState.direction) {
      otherPlayer.direction = playerState.direction;
    } else {
      // Calculate direction from movement
      const deltaX = targetX - otherPlayer.tileX;
      const deltaY = targetY - otherPlayer.tileY;
      
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        otherPlayer.direction = deltaX > 0 ? 'right' : 'left';
      } else if (deltaY !== 0) {
        otherPlayer.direction = deltaY > 0 ? 'down' : 'up';
      }
    }
  }
  
  /**
   * Remove a player from the game
   */
  public removePlayer(playerId: string): void {
    const otherPlayer = this.otherPlayers.get(playerId);
    if (otherPlayer) {
      otherPlayer.sprite.destroy();
      if (otherPlayer.nameText) {
        otherPlayer.nameText.destroy();
      }
      this.otherPlayers.delete(playerId);
    }
  }
  
  /**
   * Update all other players' positions and animations
   */
  public update(): void {
    const now = Date.now();
    
    this.otherPlayers.forEach(player => {
      if (player.isMoving) {
        const elapsed = now - player.moveStartTime;
        const progress = Math.min(1, elapsed / player.moveDuration);
        
        // Calculate the interpolated position
        const startX = this.positionUtils.tileToPixelX(player.tileX);
        const startY = this.positionUtils.tileToPixelY(player.tileY);
        const targetX = this.positionUtils.tileToPixelX(player.targetX);
        const targetY = this.positionUtils.tileToPixelY(player.targetY);
        
        // Apply easing for smoother movement
        const newX = startX + (targetX - startX) * progress;
        const newY = startY + (targetY - startY) * progress;
        
        // Update sprite position
        player.sprite.setPosition(newX, newY);
        
        // Update name text position
        if (player.nameText) {
          player.nameText.setPosition(newX, newY - 25);
        }
        
        // Check if movement is complete
        if (progress >= 1) {
          player.tileX = player.targetX;
          player.tileY = player.targetY;
          player.isMoving = false;
          
          // Play idle animation
          const idleAnimation = `${player.direction}Idle`;
          if (player.lastAnimation !== idleAnimation) {
            player.lastAnimation = idleAnimation;
            player.sprite.play(idleAnimation, true);
          }
        }
      }
      
      // Check for inactivity
      const timeSinceLastUpdate = now - player.lastUpdated;
      if (timeSinceLastUpdate > this.playerTimeout) {
        // ... existing timeout code ...
      }
    });
  }
  
  /**
   * Clean up resources
   */
  public cleanUp(): void {
    this.otherPlayers.forEach(otherPlayer => {
      if (otherPlayer.sprite) {
        otherPlayer.sprite.destroy();
      }
      if (otherPlayer.nameText) {
        otherPlayer.nameText.destroy();
      }
      if (otherPlayer.combatEffect) {
        otherPlayer.combatEffect.destroy();
      }
    });
    this.otherPlayers.clear();
  }
  
  /**
   * Get all players at a specific tile position
   * @param tileX X tile coordinate
   * @param tileY Y tile coordinate
   * @returns Array of players at the position
   */
  public getPlayersAtTile(tileX: number, tileY: number): OtherPlayer[] {
    const playersAtPosition: OtherPlayer[] = [];
    
    this.otherPlayers.forEach(player => {
      // Check if the player is moving
      if (player.isMoving) {
        // For moving players, use their target position
        if (player.targetX === tileX && player.targetY === tileY) {
          playersAtPosition.push(player);
        }
      } else {
        // For stationary players, use their current position
        if (player.tileX === tileX && player.tileY === tileY) {
          playersAtPosition.push(player);
        }
      }
    });
    
    return playersAtPosition;
  }
  
  /**
   * Update visual indicators for a player in combat
   */
  private updateCombatVisual(player: OtherPlayer): void {
    const sprite = player.sprite;
    
    if (player.in_combat) {
      // Player is in combat - add combat visual indicator (red glow)
      sprite.setTint(0xff9999);
      
      // Add combat effect (can be expanded with more effects)
      const combatEffect = this.scene.add.particles(0, 0, 'particle', {
        lifespan: 1000,
        speed: { min: 10, max: 50 },
        scale: { start: 0.2, end: 0 },
        quantity: 1,
        blendMode: 'ADD',
        tint: 0xff0000
      });
      
      // Attach to player
      combatEffect.setDepth(sprite.depth - 1);
      combatEffect.setPosition(sprite.x, sprite.y);
      combatEffect.setName(`combat_${player.id}`);
      
      // Store the effect with the player for removal later
      player.combatEffect = combatEffect;
      
      // Update name text color if exists
      if (player.nameText) {
        player.nameText.setColor('#ff6666');
      }
    } else {
      // Player is not in combat - remove combat visual
      sprite.clearTint();
      
      // Remove any existing combat effect
      if (player.combatEffect) {
        player.combatEffect.destroy();
        player.combatEffect = undefined;
      }
      
      // Reset name text color if exists
      if (player.nameText) {
        player.nameText.setColor('#ffffff');
      }
    }
  }
  
  /**
   * Get the count of other players in the scene
   * @returns Number of other players
   */
  public getPlayerCount(): number {
    return this.otherPlayers.size;
  }
} 