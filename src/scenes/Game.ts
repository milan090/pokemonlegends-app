import { Scene } from "phaser";
import { MultiplayerManager } from "./MultiplayerManager";
import { PlayerAnimations } from "../utils/PlayerAnimations";
import { OtherPlayer } from "../types/player.types";
import { AudioManager } from "../utils/AudioManager";

// Interface for mobile controls
interface MobileControls {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  interact: boolean;
  interactTriggered?: boolean;
}

// Make TypeScript recognize our global window object
declare global {
  interface Window {
    mobileControls?: MobileControls;
    toggleGameAudio?: (muted: boolean) => void;
    gameAudioMuted?: boolean;
  }
}

export class Game extends Scene {
  private map!: Phaser.Tilemaps.Tilemap;
  private groundTileset!: Phaser.Tilemaps.Tileset;
  private wallTileset!: Phaser.Tilemaps.Tileset;
  private plantsTileset!: Phaser.Tilemaps.Tileset;
  private layers: { [key: string]: Phaser.Tilemaps.TilemapLayer } = {};
  private debugText!: Phaser.GameObjects.Text;
  private player!: Phaser.GameObjects.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  
  // Interaction key
  private interactKey!: Phaser.Input.Keyboard.Key;
  
  // Tile-based movement properties
  private tileSize: number = 32;
  private playerTileX: number = 0;
  private playerTileY: number = 0;
  private targetTileX: number = 0;
  private targetTileY: number = 0;
  private isMoving: boolean = false;
  private moveStartTime: number = 0;
  private moveDuration: number = 200; // Adjusted to 200ms to match MultiplayerManager
  private direction: string = 'down';
  private movementQueue: {x: number, y: number}[] = []; // Queue for movement commands
  
  // Direction change without movement
  private keyPressStartTime: number = 0;
  private directionChangeThreshold: number = 250; // Time in ms to detect a direction change without movement
  private keyHeld: boolean = false;
  
  // Player name display
  private playerNameText!: Phaser.GameObjects.Text;
  // Multiplayer manager
  private multiplayerManager!: MultiplayerManager;
  private multiplayerConnected: boolean = false;
  private serverUrl: string = window.location.hostname === 'localhost'
    ? "ws://localhost:8080"
    : "wss://api.pokemonlegends.xyz";
  private lobbyId: string = "default";
  
  // Debug mode 
  private debugMode: boolean = false;

  // Audio manager
  private audioManager!: AudioManager;

  // Mobile device detection
  private isMobile: boolean = false;

  constructor() {
    super("Game");
  }

  create() {
    console.log("Game scene started");

    // Get the lobby ID from localStorage
    this.lobbyId = localStorage.getItem('currentLobbyId') || 'default';
    console.log(`Game scene started in lobby: ${this.lobbyId}`);

    // Detect if device is mobile
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Initialize audio manager
    this.audioManager = AudioManager.getInstance(this);
    console.log("Audio manager initialized");
    
    // Setup global audio toggle function for the mute button
    (window as any).toggleGameAudio = (muted: boolean) => {
      if (this.audioManager) {
        if (muted) {
          this.audioManager.muteAll();
        } else {
          this.audioManager.unmuteAll();
        }
        console.log(`Game audio ${muted ? 'muted' : 'unmuted'}`);
      }
    };
    
    // Check if audio should be muted on start (from global state)
    if ((window as any).gameAudioMuted) {
      this.audioManager.muteAll();
      console.log("Game audio muted from previous state");
    }

    // Create the tilemap
    this.map = this.make.tilemap({ key: "map" });

    // Instead of relying on the original tileset references, we'll create
    // a custom tileset for our simplified setup
    const groundTileset = this.map.addTilesetImage("grass", "grass");
    const wallTileset = this.map.addTilesetImage("wall", "wall");
    const plantsTileset = this.map.addTilesetImage("plants", "plants");
    if (!groundTileset) {
      console.error("Failed to load tileset");
      this.addDebugMessage("Failed to load tileset");
      return;
    }
    if (!wallTileset) {
      console.error("Failed to load tileset");
      this.addDebugMessage("Failed to load tileset");
      return;
    }
    if (!plantsTileset) {
      console.error("Failed to load tileset");
      this.addDebugMessage("Failed to load tileset");
      return;
    }
    this.groundTileset = groundTileset;
    this.wallTileset = wallTileset;
    this.plantsTileset = plantsTileset;
    this.addDebugMessage("Custom tileset created");

    // Try to create all layers with our custom tileset
    try {
      // Force the map to use our custom tileset for all layers
      this.map.layers.forEach((layerData, index) => {
        const layerName = layerData.name;
        console.log(`Attempting to create layer ${index}: ${layerName}`);

        switch (layerName) {
          case "ground":
            try {
              const layer = this.map.createLayer(layerName, this.groundTileset, 0, 0);
              if (layer) {
                this.layers[layerName] = layer;
                this.addDebugMessage(`Layer ${layerName} created`);
              }
            } catch (e) {
              console.error(`Error creating layer ${layerName}:`, e);
              this.addDebugMessage(`Error with layer ${layerName}`);
            }
            break;
          case "obstacles":
            try {
              const layer = this.map.createLayer(layerName, [this.wallTileset, this.plantsTileset], 0, 0);
              if (layer) {
                this.layers[layerName] = layer;
                this.addDebugMessage(`Layer ${layerName} created`);
              }
            } catch (e) {
              console.error(`Error creating layer ${layerName}:`, e);
              this.addDebugMessage(`Error with layer ${layerName}`);
            }
            break;
          default:
            console.error(`Unknown layer name: ${layerName}`);
        }
      });

      this.addDebugMessage(`Created ${Object.keys(this.layers).length} layers`);

      if (Object.keys(this.layers).length === 0) {
        // If no layers were created successfully, try a different approach
        this.addDebugMessage("No layers created, trying alternate method");

        // Create a blank tilemap layer as a fallback
        this.createDebugLayer();
      }

      // Create player character at tile position (9, 5) as example
      this.playerTileX = 9;
      this.playerTileY = 5;
      this.targetTileX = this.playerTileX;
      this.targetTileY = this.playerTileY;
      
      // Convert tile position to pixel coordinates (center of tile)
      const playerX = this.tileToPixelX(this.playerTileX);
      const playerY = this.tileToPixelY(this.playerTileY);
      
      const player = this.physics.add.sprite(playerX, playerY, 'player');
      player.setOrigin(0.5, 0.5);
      
      // Setup player animations using the utility class
      PlayerAnimations.setupAnimations(this, player);
      
      this.player = player;

      // Add player name text above player sprite
      const username = localStorage.getItem('username') || 'Player';
      this.playerNameText = this.add.text(playerX, playerY - 25, username, {
        font: '12px Inter',
        color: '#99ccff', // Light blue color
        stroke: '#000000',
        strokeThickness: 2,
        resolution: window.devicePixelRatio, // Higher resolution text
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
      this.playerNameText.setOrigin(0.5, 1);
      this.playerNameText.setDepth(player.depth + 1);

      // Add physics to the player
      this.physics.add.existing(this.player);
      
      // Initialize multiplayer
      this.initializeMultiplayer();

      // Set up WASD keys for movement - use non-null assertion operator
      this.cursors = this.input!.keyboard!.createCursorKeys();
      this.wasdKeys = this.input!.keyboard!.addKeys({
        W: Phaser.Input.Keyboard.KeyCodes.W,
        A: Phaser.Input.Keyboard.KeyCodes.A,
        S: Phaser.Input.Keyboard.KeyCodes.S,
        D: Phaser.Input.Keyboard.KeyCodes.D
      }) as { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
      
      // Add F key for interactions
      this.interactKey = this.input!.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F);

      // Set the camera to follow the player
      this.cameras.main.startFollow(this.player, true);

      // Add collision with obstacles layer if it exists
      if (this.layers["obstacles"]) {
        this.layers["obstacles"].setCollisionByExclusion([-1]);
        this.physics.add.collider(this.player, this.layers["obstacles"]);
      }
    } catch (error) {
      console.error("Error creating layers:", error);
      this.addDebugMessage("Error creating layers: " + error);

      // Create a debug layer to show something is working
      this.createDebugLayer();
    }

    // Set up camera
    const camera = this.cameras.main;
    camera.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    
    // Set initial zoom based on device type
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    camera.zoom = isMobile ? 1.6 : 1.2;

    // this.input!.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[], deltaX: number, deltaY: number) => {
    //   // Zoom out
    //   if (deltaY > 0) {
    //     camera.zoom = Math.max(isMobile ? 0.4 : 0.8, camera.zoom - 0.1);
    //   }
    //   // Zoom in  
    //   else if (deltaY < 0) {
    //     camera.zoom = Math.min(isMobile ? 1.5 : 2.5, camera.zoom + 0.1);
    //   }
    //   console.log(camera.zoom);
    //   if (this.debugMode) {
    //     this.addDebugMessage(`Camera zoom: ${camera.zoom.toFixed(1)}`);
    //   }
    // });
    
    // Add click handler for player interaction
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button === 0) { // Left mouse button
        this.handleMapClick(pointer.worldX, pointer.worldY);
      }
    });
    
    
    // Add hint about direction change feature
    const hintText = this.add.text(
      this.scale.width / 2, 
      this.scale.height - 150, // Moved up by increasing the subtraction amount
      "Use WASD or arrow keys to move\nPress F to interact with monsters", 
      {
        font: "14px Inter",
        color: "#ffffff",
        backgroundColor: "#000000",
        padding: { x: 10, y: 5 },
        resolution: 2, // Higher resolution text
        align: 'center'
      }
    );
    hintText.setOrigin(0.5);
    hintText.setScrollFactor(0);
    hintText.setDepth(100);
    
    // Make the hint disappear after 5 seconds
    this.time.delayedCall(5000, () => {
      hintText.destroy();
    });

    // Start playing the normal background music
    this.audioManager.playNormalMusic();
    console.log("Started playing normal background music");
  }
  
  // Convert tile X coordinate to pixel X coordinate (center of tile)
  private tileToPixelX(tileX: number): number {
    return tileX * this.tileSize + (this.tileSize / 2);
  }
  
  // Convert tile Y coordinate to pixel Y coordinate (center of tile)
  private tileToPixelY(tileY: number): number {
    return tileY * this.tileSize + (this.tileSize / 2);
  }
  
  // Convert pixel X coordinate to tile X coordinate
  private pixelToTileX(pixelX: number): number {
    return Math.floor(pixelX / this.tileSize);
  }
  
  // Convert pixel Y coordinate to tile Y coordinate
  private pixelToTileY(pixelY: number): number {
    return Math.floor(pixelY / this.tileSize);
  }
  
  // Check if a tile is walkable (not an obstacle)
  private isTileWalkable(tileX: number, tileY: number): boolean {
    // First check tile-based obstacles from the map
    if (this.layers["obstacles"]) {
      const tile = this.layers["obstacles"].getTileAt(tileX, tileY);
      if (tile !== null && tile.index !== -1) {
        return false; // Tile is an obstacle
      }
    }
    
    // Then check for monsters
    if (this.multiplayerManager && this.multiplayerConnected) {
      // Access the MonsterManager through the MultiplayerManager
      const monsterManager = this.multiplayerManager.getMonsterManager();
      if (monsterManager && monsterManager.isTileOccupiedByMonster(tileX, tileY)) {
        // If there's a monster at this tile, it's not walkable
        return false;
      }
    }
    
    // No obstacles found, tile is walkable
    return true;
  }
  
  // Move player to a specific tile position
  private movePlayerToTile(tileX: number, tileY: number): void {
    // Don't queue a move if we're already moving to that tile
    if (this.isMoving && this.targetTileX === tileX && this.targetTileY === tileY) {
      return;
    }
    
    // Check if the target tile is walkable
    if (!this.isTileWalkable(tileX, tileY)) {
      return; // Don't move to an obstacle tile
    }
    
    // Queue the movement if we're already moving
    if (this.isMoving) {
      this.movementQueue.push({x: tileX, y: tileY});
      return;
    }
    
    // Set target tile position
    this.targetTileX = tileX;
    this.targetTileY = tileY;
    
    // Determine movement direction
    if (tileX > this.playerTileX) {
      this.direction = 'right';
      this.player.play('rightWalk', true);
    } else if (tileX < this.playerTileX) {
      this.direction = 'left';
      this.player.play('leftWalk', true);
    } else if (tileY > this.playerTileY) {
      this.direction = 'down';
      this.player.play('downWalk', true);
    } else if (tileY < this.playerTileY) {
      this.direction = 'up';
      this.player.play('upWalk', true);
    }
    
    // Start moving
    this.isMoving = true;
    this.moveStartTime = this.time.now;
    
    // Update multiplayer position with tile coordinates
    if (this.multiplayerManager) {
      this.multiplayerManager.sendPositionUpdate(tileX, tileY, this.direction);
    }
  }
  
  private initializeMultiplayer() {
    try {
      const username = localStorage.getItem('username');
      if (!username) {
        window.location.href = '/';
        return;
      }
      this.multiplayerManager = new MultiplayerManager(this, this.player, this.serverUrl, username);
      this.multiplayerConnected = true;
      this.addDebugMessage(`Multiplayer initialized for lobby: ${this.lobbyId}`);
    } catch (error) {
      console.error("Failed to initialize multiplayer:", error);
      this.addDebugMessage("Multiplayer initialization failed");
    }
  }

  createDebugLayer() {
    // Create a simple debug grid to show the map is working
    const debugLayer = this.add.grid(
      0,
      0,
      this.map.widthInPixels,
      this.map.heightInPixels,
      32,
      32,
      0x00ff00,
      0.2
    );
    debugLayer.setOrigin(0, 0);

    // Add some text to show map dimensions
    this.add.text(20, 150, `Map: ${this.map.width}x${this.map.height} tiles`, {
      font: "14px Inter",
      color: "#ffffff",
      backgroundColor: "#000000",
      padding: { x: 8, y: 4 }
    });
  }

  addDebugMessage(message: string) {
    // Skip if debug mode is disabled
    if (!this.debugMode) return;
    
    // Create debug text if it doesn't exist
    if (!this.debugText) {
      this.debugText = this.add.text(20, 200, "", {
        font: "14px Inter",
        color: "#ffffff",
        backgroundColor: "#000000",
        padding: { x: 10, y: 5 },
        resolution: 2, // Higher resolution text
        letterSpacing: 0.5
      });
      this.debugText.setDepth(100); // Make sure it's on top
    }

    // Add the new message
    this.debugText.text += message + "\n";
    
    // Limit the number of messages
    const maxLines = 10;
    const lines = this.debugText.text.split('\n');
    if (lines.length > maxLines) {
      this.debugText.text = lines.slice(lines.length - maxLines).join('\n');
    }
  }

  update(time: number, delta: number) {
    if (!this.player) return;
    
    // Handle ongoing player movement animation
    if (this.isMoving) {
      // Calculate how far we've moved (0 to 1)
      const elapsed = time - this.moveStartTime;
      const progress = Math.min(1, elapsed / this.moveDuration);
      
      // Calculate the interpolated position
      const startX = this.tileToPixelX(this.playerTileX);
      const startY = this.tileToPixelY(this.playerTileY);
      const targetX = this.tileToPixelX(this.targetTileX);
      const targetY = this.tileToPixelY(this.targetTileY);
      
      const newX = Math.round(startX + (targetX - startX) * progress);
      const newY = Math.round(startY + (targetY - startY) * progress);
      
      // Update player position - use integer values to avoid blurry rendering
      this.player.setPosition(newX, newY);
      
      // Update player name text position
      if (this.playerNameText) {
        this.playerNameText.setPosition(newX, newY - 25);
      }
      
      // If we've reached the target position
      if (progress >= 1) {
        // Update the player's tile position
        this.playerTileX = this.targetTileX;
        this.playerTileY = this.targetTileY;
        
        // Stop moving
        this.isMoving = false;
        
        // Play idle animation
        this.player.play(`${this.direction}Idle`, true);
        
        // Send final position update
        if (this.multiplayerManager) {
          this.multiplayerManager.sendPositionUpdate(this.playerTileX, this.playerTileY, this.direction);
        }
        
        // Check if there are more movements in the queue
        if (this.movementQueue.length > 0) {
          const nextMove = this.movementQueue.shift()!;
          this.movePlayerToTile(nextMove.x, nextMove.y);
        }
      }
    } 
    // Handle new movement input if we're not already moving
    else {
      // Handle WASD movement - only one direction at a time
      let newTileX = this.playerTileX;
      let newTileY = this.playerTileY;
      let hasMoved = false;
      let newDirection = '';
      
      // Check if mobile controls exist from DOM
      const mobileControls = window.mobileControls;
      
      // Check which direction key is being pressed (including mobile controls)
      const isDownPressed = this.wasdKeys.S.isDown || this.cursors.down.isDown || (mobileControls && mobileControls.down);
      const isUpPressed = this.wasdKeys.W.isDown || this.cursors.up.isDown || (mobileControls && mobileControls.up);
      const isRightPressed = this.wasdKeys.D.isDown || this.cursors.right.isDown || (mobileControls && mobileControls.right);
      const isLeftPressed = this.wasdKeys.A.isDown || this.cursors.left.isDown || (mobileControls && mobileControls.left);
      
      if (isDownPressed) {
        newTileY += 1;
        newDirection = 'down';
        hasMoved = true;
      } else if (isUpPressed) {
        newTileY -= 1;
        newDirection = 'up';
        hasMoved = true;
      } else if (isRightPressed) {
        newTileX += 1;
        newDirection = 'right';
        hasMoved = true;
      } else if (isLeftPressed) {
        newTileX -= 1;
        newDirection = 'left';
        hasMoved = true;
      } else {
        // No keys are being pressed
        this.keyHeld = false;
        this.keyPressStartTime = 0;
      }
      
      // Handle direction change without movement detection
      if (hasMoved) {
        const isMobileButtonPressed = mobileControls && (mobileControls.up || mobileControls.down || 
                                                       mobileControls.left || mobileControls.right);
                                                       
        // Mobile controls don't need to wait for the hold threshold
        if (isMobileButtonPressed) {
          // First change direction if needed
          if (newDirection !== this.direction) {
            this.changePlayerDirection(newDirection);
          }
          // Then move immediately
          this.movePlayerToTile(newTileX, newTileY);
        } else {
          // Original keyboard behavior with hold threshold
          if (!this.keyHeld) {
            // Initial key press - start timing
            this.keyPressStartTime = time;
            this.keyHeld = true;
            
            // Immediately change direction regardless of movement
            if (newDirection !== this.direction) {
              this.changePlayerDirection(newDirection);
            }
          } else {
            // Key is being held
            const keyHeldDuration = time - this.keyPressStartTime;
            
            // If key held for longer than threshold, start movement
            if (keyHeldDuration > this.directionChangeThreshold) {
              this.movePlayerToTile(newTileX, newTileY);
            }
          }
        }
      }
    }
    
    // Handle the F key press or mobile interact button press for monster interactions
    const mobileInteractTriggered = window.mobileControls && window.mobileControls.interactTriggered;
    if ((Phaser.Input.Keyboard.JustDown(this.interactKey) || mobileInteractTriggered) && !this.isMoving) {
      this.tryInteractWithMonster();
    }
    
    // Update multiplayer manager
    if (this.multiplayerManager) {
      this.multiplayerManager.update();
    }
  }
  
  shutdown() {
    // Clean up multiplayer resources when scene ends
    if (this.multiplayerManager) {
      this.multiplayerManager.cleanUp();
    }
    
    // Clean up audio manager
    if (this.audioManager) {
      this.audioManager.cleanUp();
    }
  }

  // Add method to set player tile position from server data
  public setPlayerTilePosition(tileX: number, tileY: number): void {
    // Update tile coordinates
    this.playerTileX = tileX;
    this.targetTileX = tileX;
    this.playerTileY = tileY;
    this.targetTileY = tileY;
    
    // Update pixel position
    const pixelX = this.tileToPixelX(tileX);
    const pixelY = this.tileToPixelY(tileY);
    
    // If player exists, update position
    if (this.player) {
      this.player.setPosition(pixelX, pixelY);
    }
    
    // Update player name text position
    if (this.playerNameText) {
      this.playerNameText.setPosition(pixelX, pixelY - 25);
    }
  }

  // Public getters for movement state (used by MultiplayerManager)
  
  /**
   * Returns whether the player is currently moving
   */
  public get isPlayerMoving(): boolean {
    return this.isMoving;
  }
  
  /**
   * Returns the player's target tile position
   */
  public getTargetTilePosition(): { x: number, y: number } {
    return { 
      x: this.targetTileX, 
      y: this.targetTileY 
    };
  }
  
  /**
   * Returns the player's current tile position
   */
  public getCurrentTilePosition(): { x: number, y: number } {
    return { 
      x: this.playerTileX, 
      y: this.playerTileY 
    };
  }

  // Change player direction without moving
  private changePlayerDirection(direction: string): void {
    // Don't change direction while moving
    if (this.isMoving) {
      return;
    }
    
    // Update direction
    this.direction = direction;
    
    // Play idle animation in the new direction
    this.player.play(`${direction}Idle`, true);
    
    // Log the direction change
    console.log(`Changed direction to ${direction} without moving`);
    
    // Update multiplayer direction
    if (this.multiplayerManager) {
      this.multiplayerManager.sendPositionUpdate(this.playerTileX, this.playerTileY, direction);
    }
  }

  /**
   * Try to interact with a monster in front of the player
   */
  private tryInteractWithMonster(): void {
    if (!this.multiplayerManager) return;
    
    // Calculate the tile position in front of the player based on their direction
    let targetTileX = this.playerTileX;
    let targetTileY = this.playerTileY;
    
    switch (this.direction) {
      case 'up':
        targetTileY -= 1;
        break;
      case 'down':
        targetTileY += 1;
        break;
      case 'left':
        targetTileX -= 1;
        break;
      case 'right':
        targetTileX += 1;
        break;
    }
    
    // Get the monster manager from the multiplayer manager
    const monsterManager = this.multiplayerManager.getMonsterManager();
    
    // Check if there's a monster at the target tile
    const monsterId = monsterManager.getMonsterIdAtTile(targetTileX, targetTileY);
    
    if (monsterId) {
      // Found a monster to interact with
      console.log(`Interacting with monster at (${targetTileX}, ${targetTileY}), ID: ${monsterId}`);
      
      // Send interaction message to server
      this.multiplayerManager.sendInteractWithMonster(monsterId);
      
      // Show a visual feedback for interaction
      this.showInteractionFeedback(targetTileX, targetTileY);
    } else {
      console.log(`No monster found at tile (${targetTileX}, ${targetTileY})`);
    }
  }
  
  /**
   * Show visual feedback when interacting
   */
  private showInteractionFeedback(tileX: number, tileY: number): void {
    // Convert tile coordinates to pixel coordinates
    const pixelX = this.tileToPixelX(tileX);
    const pixelY = this.tileToPixelY(tileY);
    
    // Create a circle effect
    const circle = this.add.circle(pixelX, pixelY, 16, 0xffff00, 0.7);
    circle.setDepth(10000);
    
    // Add interaction text feedback
    const interactText = this.add.text(pixelX, pixelY - 25, "Interact!", {
      font: "14px Inter",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 2,
      resolution: 2,
      padding: { x: 4, y: 2 },
      shadow: {
        offsetX: 1,
        offsetY: 1,
        color: "#000000",
        blur: 0,
        stroke: true,
        fill: true
      }
    });
    interactText.setOrigin(0.5, 1);
    interactText.setDepth(10001);
    
    // Animate and remove the circle and text
    this.tweens.add({
      targets: [circle, interactText],
      scale: 1.5,
      alpha: 0,
      y: "-=20",
      duration: 800,
      ease: 'Power2',
      onComplete: () => {
        circle.destroy();
        interactText.destroy();
      }
    });
  }

  /**
   * Handle click on the game map
   * @param worldX The x coordinate in the world
   * @param worldY The y coordinate in the world
   */
  private handleMapClick(worldX: number, worldY: number): void {
    // If we're in battle or moving, ignore the click
    if (this.isMoving || (this.multiplayerManager && this.multiplayerManager.getBattleManager().inBattle)) {
      return;
    }
    
    // Convert world coordinates to tile coordinates
    const tileX = this.pixelToTileX(worldX);
    const tileY = this.pixelToTileY(worldY);
    
    // Check if any other player is at this position
    if (this.multiplayerManager) {
      const playersAtPosition = this.multiplayerManager.getPlayersAtPosition(tileX, tileY);
      
      if (playersAtPosition.length > 0) {
        // Calculate screen position
        const camera = this.cameras.main;
        const screenX = worldX - camera.scrollX;
        const screenY = worldY - camera.scrollY;
        
        // Show player context menu
        this.showPlayerContextMenu(playersAtPosition, screenX, screenY);
        return;
      }
    }
  }
  
  /**
   * Show context menu for players at the clicked position
   * @param players List of players at the clicked position
   * @param screenX X coordinate on screen
   * @param screenY Y coordinate on screen
   */
  private showPlayerContextMenu(players: OtherPlayer[], screenX: number, screenY: number): void {
    // Remove any existing context menu
    this.removePlayerContextMenu();
    
    // Create context menu container
    const menuContainer = document.createElement('div');
    menuContainer.id = 'player-context-menu';
    menuContainer.style.position = 'absolute';
    menuContainer.style.left = `${screenX}px`;
    menuContainer.style.top = `${screenY}px`;
    menuContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
    menuContainer.style.borderRadius = '8px';
    menuContainer.style.padding = '12px';
    menuContainer.style.zIndex = '1000';
    menuContainer.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.5)';
    menuContainer.style.color = 'white';
    menuContainer.style.fontFamily = 'Inter, Arial, sans-serif';
    menuContainer.style.fontSize = '14px';
    menuContainer.style.minWidth = '180px';
    menuContainer.style.backdropFilter = 'blur(5px)';
    
    // If only one player, show their details
    if (players.length === 1) {
      const player = players[0];
      
      // Header with player name
      const header = document.createElement('div');
      header.textContent = player.username || `Player ${player.id.substring(0, 6)}`;
      header.style.fontWeight = 'bold';
      header.style.borderBottom = '1px solid rgba(255, 255, 255, 0.2)';
      header.style.paddingBottom = '8px';
      header.style.marginBottom = '8px';
      menuContainer.appendChild(header);
      
      // Add challenge button (functional now)
      const challengeButton = document.createElement('button');
      challengeButton.textContent = 'Challenge to Battle';
      challengeButton.style.backgroundColor = '#4a5fc1';
      challengeButton.style.color = 'white';
      challengeButton.style.border = 'none';
      challengeButton.style.padding = '8px 12px';
      challengeButton.style.borderRadius = '4px';
      challengeButton.style.cursor = 'pointer';
      challengeButton.style.width = '100%';
      challengeButton.style.marginTop = '8px';
      challengeButton.style.fontFamily = 'Inter, Arial, sans-serif';
      challengeButton.style.transition = 'background-color 0.2s';
      
      challengeButton.addEventListener('mouseover', () => {
        challengeButton.style.backgroundColor = '#3a4fb1';
      });
      
      challengeButton.addEventListener('mouseout', () => {
        challengeButton.style.backgroundColor = '#4a5fc1';
      });
      
      challengeButton.addEventListener('mouseup', () => {
        // Close the menu
        this.removePlayerContextMenu();
        
        // Send challenge request
        if (this.multiplayerManager) {
          this.multiplayerManager.sendChallengeRequest(player.id);
          
          // Show a notification that challenge was sent
          this.showNotification(`Challenge sent to ${player.username || 'player'}!`);
        }
      });
      
      menuContainer.appendChild(challengeButton);
      
      // Info section
      const infoContainer = document.createElement('div');
      infoContainer.style.fontSize = '12px';
      infoContainer.style.opacity = '0.8';
      infoContainer.style.marginTop = '10px';
      
      // Show if player is in combat
      if (player.in_combat) {
        const combatStatus = document.createElement('div');
        combatStatus.textContent = '⚔️ In Combat';
        combatStatus.style.color = '#ff6666';
        combatStatus.style.marginTop = '5px';
        infoContainer.appendChild(combatStatus);
      }
      
      menuContainer.appendChild(infoContainer);
      
    } else {
      // Multiple players at the same position, show a list
      const header = document.createElement('div');
      header.textContent = 'Players';
      header.style.fontWeight = 'bold';
      header.style.borderBottom = '1px solid rgba(255, 255, 255, 0.2)';
      header.style.paddingBottom = '8px';
      header.style.marginBottom = '8px';
      menuContainer.appendChild(header);
      
      // Create a list of players
      const playerList = document.createElement('ul');
      playerList.style.listStyleType = 'none';
      playerList.style.padding = '0';
      playerList.style.margin = '0';
      
      players.forEach(player => {
        const playerItem = document.createElement('li');
        playerItem.textContent = player.username || `Player ${player.id.substring(0, 6)}`;
        playerItem.style.padding = '6px 0';
        playerItem.style.cursor = 'pointer';
        playerItem.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
        playerItem.style.transition = 'background-color 0.2s';
        
        playerItem.addEventListener('mouseover', () => {
          playerItem.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        });
        
        playerItem.addEventListener('mouseout', () => {
          playerItem.style.backgroundColor = 'transparent';
        });
        
        playerItem.addEventListener('mouseup', () => {
          this.showPlayerContextMenu([player], screenX, screenY);
        });
        
        playerList.appendChild(playerItem);
      });
      
      menuContainer.appendChild(playerList);
    }
    
    // Add click outside to close menu
    const closeMenu = (e: MouseEvent) => {
      if (!menuContainer.contains(e.target as Node)) {
        this.removePlayerContextMenu();
        document.removeEventListener('mouseup', closeMenu);
      }
    };
    
    // Delay adding the event listener to prevent immediate triggering
    setTimeout(() => {
      document.addEventListener('mouseup', closeMenu);
    }, 100);
    
    // Add to DOM
    document.body.appendChild(menuContainer);
  }
  
  /**
   * Remove any existing player context menu
   */
  private removePlayerContextMenu(): void {
    const existingMenu = document.getElementById('player-context-menu');
    if (existingMenu) {
      document.body.removeChild(existingMenu);
    }
  }

  /**
   * Show a notification message to the player
   * @param message The message to display
   * @param duration Duration in milliseconds before notification disappears (default: 2000)
   */
  private showNotification(message: string, duration: number = 2000): void {
    // Remove any existing notification
    const existingNotification = document.getElementById('game-notification');
    if (existingNotification) {
      document.body.removeChild(existingNotification);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.id = 'game-notification';
    notification.style.position = 'absolute';
    notification.style.top = '20%';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
    notification.style.padding = '15px 25px';
    notification.style.borderRadius = '5px';
    notification.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.5)';
    notification.style.color = 'white';
    notification.style.zIndex = '1500';
    notification.style.fontFamily = 'Inter, Arial, sans-serif';
    notification.style.fontSize = '16px';
    notification.style.fontWeight = 'bold';
    notification.style.textAlign = 'center';
    
    notification.textContent = message;
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Remove notification after specified duration
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, duration);
  }



  /**
   * Play a sound effect
   * @param soundKey Key of the sound to play
   * @param volume Volume level (0-1)
   */
  public playSound(soundKey: string, volume: number = 0.5): void {
    try {
      this.sound.play(soundKey, { volume });
    } catch (error) {
      console.error(`Error playing sound ${soundKey}:`, error);
    }
  }

  /**
   * Get the AudioManager instance
   */
  public getAudioManager(): AudioManager {
    return this.audioManager;
  }
}