// Create a new file called MultiplayerManager.ts

import { Scene } from "phaser";
import { PlayerAnimations } from "../utils/PlayerAnimations";
import { Game } from "./Game";
import { ServerMessage, OtherPlayer, PlayerState } from "../types/player.types";
import { WebSocketService } from "../services/WebSocketService";
import { OtherPlayersManager } from "../managers/OtherPlayersManager";
import { PlayerStateManager } from "../managers/PlayerStateManager";
import { PositionUtils } from "../utils/PositionUtils";
import { MonsterManager } from "../managers/MonsterManager";
import { Monster } from "../types/monster.types";
import { PokemonManager } from "../managers/PokemonManager";
import { Pokemon } from "../types/pokemon.types";
import { BattleManager } from "../managers/battle/BattleManager"
import { 
  WildBattleStartMessage, 
  RequestActionMessage,
  TurnUpdateMessage,
  BattleEndMessage,
  PvPBattleStartMessage
} from "../types/battle.types";


// Extend ServerMessage to include battle message types
type ExtendedServerMessage = ServerMessage | WildBattleStartMessage | RequestActionMessage | TurnUpdateMessage | BattleEndMessage | PvPBattleStartMessage |
  { type: 'challenge_received', challenger_id: string, challenger_username: string } |
  { type: 'challenge_response', target_player_id: string, target_username: string, accepted: boolean } |
  { type: 'challenge_failed', reason: string };

/**
 * Manages multiplayer functionality and synchronization with the game server
 */
export class MultiplayerManager {
  private wsService: WebSocketService;
  private otherPlayersManager: OtherPlayersManager;
  private playerStateManager: PlayerStateManager;
  private monsterManager: MonsterManager;
  private pokemonManager: PokemonManager;
  private battleManager: BattleManager;
  private updateInterval: number | null = null;
  private updateRate: number = 50;
  private playerId: string | null = null;
  private tileSize: number = 32;
  private serverUpdateRate: number = 50;
  private scene: Scene;
  private tooltipShownCount: number = 0;
  private tooltipTimeout: number | null = null;

  constructor(
    scene: Scene,
    player: Phaser.GameObjects.Sprite,
    serverUrl: string,
    username: string
  ) {
    // Store the scene
    this.scene = scene;
    
    // Create session token and get lobby ID
    const sessionToken = this.loadOrGenerateSessionToken();
    const lobbyId = this.getLobbyIdFromStorage();

    // Create managers
    this.otherPlayersManager = new OtherPlayersManager(
      scene,
      this.tileSize,
      this.serverUpdateRate
    );
    this.playerStateManager = new PlayerStateManager(
      scene,
      player,
      this.tileSize
    );
    this.monsterManager = new MonsterManager(scene, this.tileSize);
    this.pokemonManager = new PokemonManager(scene);

    // Create WebSocket service with message handler
    this.wsService = new WebSocketService(
      serverUrl,
      lobbyId,
      username,
      sessionToken,
      this.handleServerMessage.bind(this)
    );

    // Create battle manager
    this.battleManager = new BattleManager(scene, this.wsService);

    // Set the WebSocket service in the PokemonManager
    this.pokemonManager.setWebSocketService(this.wsService);

    // Set this MultiplayerManager instance on the PokemonManager
    this.pokemonManager.setMultiplayerManager(this);

    // Start position update interval
    this.startUpdateInterval();
  }

  /**
   * Load or generate a session token for player identification
   */
  private loadOrGenerateSessionToken(): string {
    const storedToken = localStorage.getItem("gameSessionToken");
    if (storedToken) {
      return storedToken;
    }

    // Generate UUID v4 session token
    const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );

    localStorage.setItem("gameSessionToken", uuid);
    return uuid;
  }

  /**
   * Get the current lobby ID from local storage
   */
  private getLobbyIdFromStorage(): string {
    return localStorage.getItem("currentLobbyId") || "default";
  }

  /**
   * Handle messages received from the server
   */
  private handleServerMessage(message: ExtendedServerMessage): void {
    console.log("Received message:", message);
    switch (message.type) {
      case "welcome":
        this.playerId = message.id;

        if (message.x !== undefined && message.y !== undefined) {
          // Update player position using PlayerStateManager
          this.playerStateManager.updateFromServer({
            id: message.id,
            x: message.x,
            y: message.y,
            tile_x: message.x,
            tile_y: message.y,
            direction: "down",
            timestamp: Date.now(),
            username: message.username,
          });
        }
        break;

      case "players":
        // Handle existing players in the game
        this.handleExistingPlayers(message.players);
        break;

      case "player_joined":
        // Process the new player with OtherPlayersManager
        this.otherPlayersManager.updatePlayer(message.player, this.playerId);
        break;

      case "players_moved":
        // Handle multiple player movements
        message.players.forEach((player) => {
          // Skip our own player
          if (player.id === this.playerId) return;

          // Update other player with OtherPlayersManager
          this.otherPlayersManager.updatePlayer(player, this.playerId);
        });
        break;

      case "player_left":
        this.otherPlayersManager.removePlayer(message.id);
        break;

      // Handle monster-related messages
      case "monsters":
        // Process initial monsters list
        this.handleExistingMonsters(message.monsters);
        break;

      case "monster_spawned":
        // Handle new monster spawned
        this.monsterManager.updateMonster(message.monster);
        break;

      case "monster_moved":
        // Handle monster movement
        this.monsterManager.updateMonster(message.monster);
        break;

      case "monster_despawned":
        // Handle monster despawn
        this.handleMonsterDespawn(message.instance_id);
        break;

      // Handle combat-related messages
      case "combat_started":
        // Handle player entering combat
        this.handleCombatStarted(message.monster_id);
        break;

      case "combat_ended":
        // Handle player exiting combat
        this.handleCombatEnded();
        break;

      // Handle pokemon collection messages
      case "pokemon_collection":
        // Update the player's Pokemon collection
        this.handlePokemonCollection(message.pokemons);
        break;

      case "new_pokemon":
        // Handle a new Pokemon added to the collection
        this.handleNewPokemon(message.pokemon, message.active_index);
        break;

      case "wild_battle_start":
        // Handle wild battle start message
        this.handleWildBattleStart(message as WildBattleStartMessage);
        break;

      case "request_action":
        // Handle request action message
        this.handleRequestAction(message as RequestActionMessage);
        break;

      case "battle_result":
        // Handle battle result message
        this.handleBattleResult(message);
        break;

      case "battle_end":
        // Handle battle end message
        this.handleBattleEnd(message);
        break;

      case "turn_update":
        // Handle turn update message with battle events
        this.handleTurnUpdate(message as TurnUpdateMessage);
        break;

      // Handle challenge system messages
      case "challenge_received":
        // Handle received challenge
        this.handleChallengeReceived(message.challenger_id, message.challenger_username);
        break;

      case "challenge_response":
        // Handle response to our challenge
        this.handleChallengeResponse(message.target_player_id, message.target_username, message.accepted);
        break;

      case "challenge_failed":
        // Handle failed challenge
        this.handleChallengeFailed(message.reason);
        break;

      case "pvp_battle_start":
        // Handle PvP battle start message
        this.handlePvPBattleStart(message as PvPBattleStartMessage);
        break;
    }
  }

  /**
   * Handle existing players in the game
   */
  private handleExistingPlayers(players: PlayerState[]): void {
    players.forEach((player) => {
      // If this is our own player
      if (this.playerId && player.id === this.playerId) {
        // Update local player position
        this.playerStateManager.updateFromServer(player);
      } else {
        // Update other player
        this.otherPlayersManager.updatePlayer(player, this.playerId);
      }
    });
  }

  /**
   * Handle existing monsters in the game
   */
  private handleExistingMonsters(monsters: Monster[]): void {
    console.log(`Processing ${monsters.length} existing monsters`);
    monsters.forEach((monster) => {
      // Update each monster
      this.monsterManager.updateMonster(monster);
    });
  }

  /**
   * Handle a monster despawn event
   */
  private handleMonsterDespawn(instanceId: string): void {
    console.log(`Monster despawned: ${instanceId}`);
    this.monsterManager.despawnMonster(instanceId);
  }

  /**
   * Handle the player's Pokemon collection from the server
   */
  private handlePokemonCollection(pokemons: Pokemon[]): void {
    console.log(`Received Pokemon collection with ${pokemons.length} Pokemon`);
    
    // Log the first Pokemon's structure to debug
    if (pokemons.length > 0) {
      console.log('Pokemon data structure sample:', JSON.stringify(pokemons[0], null, 2));
    }
    
    this.pokemonManager.updatePokemonCollection(pokemons);
  }

  /**
   * Handle a new Pokemon added to the player's collection
   */
  private handleNewPokemon(pokemon: Pokemon, activeIndex: number | null): void {
    console.log(`New Pokemon received: ${pokemon.name} (${pokemon.template_id})`);
    
    // Log the Pokemon's structure to debug
    console.log('New Pokemon data structure:', JSON.stringify(pokemon, null, 2));
    
    this.pokemonManager.addNewPokemon(pokemon, activeIndex);
  }

  /**
   * Start the interval for sending position updates
   */
  private startUpdateInterval(): void {
    // Clear existing interval if any
    if (this.updateInterval !== null) {
      clearInterval(this.updateInterval);
    }

    // Set up new interval
    this.updateInterval = window.setInterval(() => {
      if (this.wsService.isConnected()) {
        // Update position using PlayerStateManager
        this.playerStateManager.updateFromScene((message) => {
          this.wsService.sendMessage(message);
        });
      }
    }, this.updateRate);
  }

  /**
   * Send a position update to the server
   */
  public sendPositionUpdate(
    tileX: number,
    tileY: number,
    direction: string
  ): void {
    this.playerStateManager.sendPositionUpdate(
      tileX,
      tileY,
      direction,
      (message) => this.wsService.sendMessage(message)
    );
  }

  /**
   * Send a choose starter message to the server
   * @param starterId The ID of the starter Pokémon to choose
   */
  public sendChooseStarter(starterId: number): void {
    if (this.wsService.isConnected()) {
      this.wsService.sendMessage({
        type: "choose_starter",
        starter_id: starterId,
      });
      console.log(`Sent choose_starter message for starter ID: ${starterId}`);
    }
  }

  /**
   * Update method called by the game loop
   */
  public update(): void {
    // Process any pending position updates
    this.playerStateManager.processPendingUpdates((message) => {
      this.wsService.sendMessage(message);
    });

    // Update other players
    this.otherPlayersManager.update();

    // Update monsters
    this.monsterManager.update();
    
    // Check for multiple players nearby to show tooltip
    this.checkMultiplePlayersForTooltip();
  }

  /**
   * Clean up resources
   */
  public cleanUp(): void {
    // Clean up WebSocket service
    this.wsService.cleanUp();

    // Clean up other players
    this.otherPlayersManager.cleanUp();

    // Clean up monsters
    this.monsterManager.cleanUp();

    // Clean up pokemon manager
    this.pokemonManager.cleanUp();
    
    // Clean up battle manager
    this.battleManager.cleanUp();

    // Clear update interval
    if (this.updateInterval !== null) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    // Clean up tooltip if it exists
    this.hideTooltip();
    
    // Clear tooltip timeout
    if (this.tooltipTimeout !== null) {
      clearTimeout(this.tooltipTimeout);
      this.tooltipTimeout = null;
    }
  }

  /**
   * Get the MonsterManager instance
   * @returns The MonsterManager instance
   */
  public getMonsterManager(): MonsterManager {
    return this.monsterManager;
  }

  /**
   * Get the PokemonManager instance
   * @returns The PokemonManager instance
   */
  public getPokemonManager(): PokemonManager {
    return this.pokemonManager;
  }

  /**
   * Send an interact message to the server for a specific monster
   * @param monsterId The instance ID of the monster to interact with
   */
  public sendInteractWithMonster(monsterId: string): void {
    if (this.wsService.isConnected()) {
      this.wsService.sendMessage({
        type: "interact",
        monster_id: monsterId,
      });
      console.log(`Sent interact message for monster: ${monsterId}`);
    }
  }

  /**
   * Handle a player entering combat
   */
  private handleCombatStarted(monsterId: string): void {
    console.log(`Player entered combat with monster ${monsterId}`);
  }

  /**
   * Handle a player exiting combat
   */
  private handleCombatEnded(): void {
    console.log(`Player exited combat`);
  }

  /**
   * Handle a wild battle start message
   */
  private handleWildBattleStart(message: WildBattleStartMessage): void {
    console.log("Wild battle started:", message);
    this.battleManager.startBattle(message);
  }

  /**
   * Handle a request action message
   */
  private handleRequestAction(message: RequestActionMessage): void {
    console.log(`Request battle action for turn ${message.turn_number}:`, message);
    
    if (!this.battleManager) {
      console.error('BattleManager not initialized when receiving request_action');
      return;
    }
    
    // Check if the battle manager is in a battle
    if (!this.battleManager.inBattle) {
      console.warn('Received request_action but not in a battle, ignoring');
      return;
    }
    
    try {
      this.battleManager.requestAction(message);
    } catch (error) {
      console.error('Error handling request_action:', error);
    }
  }

  /**
   * Handle battle result message
   */
  private handleBattleResult(message: any): void {
    console.log("Battle result:", message);
    this.battleManager.endBattle(message.result);
  }

  /**
   * Get the BattleManager instance
   * @returns The BattleManager instance
   */
  public getBattleManager(): BattleManager {
    return this.battleManager;
  }

  /**
   * Get the WebSocketService instance
   * @returns The WebSocketService instance
   */
  public getWebSocketService(): WebSocketService {
    return this.wsService;
  }
  
  /**
   * Get players at a specific tile position
   * @param tileX X tile coordinate
   * @param tileY Y tile coordinate
   * @returns Array of players at the specified position
   */
  public getPlayersAtPosition(tileX: number, tileY: number): OtherPlayer[] {
    const playersAtPosition: OtherPlayer[] = [];
    
    // Check if there are any other players at this position
    if (this.otherPlayersManager) {
      return this.otherPlayersManager.getPlayersAtTile(tileX, tileY);
    }
    
    return playersAtPosition;
  }

  /**
   * Handle a turn update message with battle events
   */
  private handleTurnUpdate(message: TurnUpdateMessage): void {
    console.log(`Turn update received for turn ${message.turn_number}:`, message);
    
    if (!this.battleManager) {
      console.error('BattleManager not initialized when receiving turn_update');
      return;
    }
    
    // Check if the battle manager is in a battle
    if (!this.battleManager.inBattle) {
      console.warn('Received turn_update but not in a battle, ignoring');
      return;
    }
    
    try {
      // Pass the events to the battle manager
      this.battleManager.processTurnUpdate(message);
      
      // Debug info for events
      if (message.events.length > 0) {
        console.log(`Processing ${message.events.length} battle events for turn ${message.turn_number}`);
      } else {
        console.log(`Turn ${message.turn_number} has no events to process`);
      }
    } catch (error) {
      console.error('Error handling turn_update:', error);
    }
  }

  /**
   * Handle battle end message
   */
  private handleBattleEnd(message: any): void {
    console.log("Battle ended:", message);
    
    // Pass the battle end message to the battle manager
    if (this.battleManager) {
      const outcome = message.outcome;
      const expGained = message.exp_gained || 0;
      const pokemonCaptured = message.pokemon_captured;
      
      this.battleManager.showBattleEndScreen(outcome, message.reason, expGained, pokemonCaptured);
    }
  }

  /**
   * Send a challenge request to another player
   * @param targetPlayerId The ID of the player to challenge
   */
  public sendChallengeRequest(targetPlayerId: string): void {
    if (this.wsService.isConnected()) {
      this.wsService.sendMessage({
        type: "challenge_player",
        target_player_id: targetPlayerId
      });
      console.log(`Sent challenge request to player: ${targetPlayerId}`);
    }
  }

  /**
   * Send a response to a challenge request
   * @param challengerId The ID of the player who sent the challenge
   * @param accepted Whether the challenge was accepted or declined
   */
  public sendChallengeResponse(challengerId: string, accepted: boolean): void {
    if (this.wsService.isConnected()) {
      this.wsService.sendMessage({
        type: "respond_to_challenge",
        challenger_id: challengerId,
        accepted: accepted
      });
      console.log(`Sent challenge response to player ${challengerId}: ${accepted ? 'accepted' : 'declined'}`);
    }
  }

  // Add new methods for handling challenge-related messages
  private handleChallengeReceived(challengerId: string, challengerUsername: string): void {
    console.log(`Received challenge from player ${challengerId} (${challengerUsername})`);
    
    // Show challenge dialog UI
    this.showChallengeReceivedDialog(challengerId, challengerUsername);
  }
  
  private handleChallengeResponse(targetPlayerId: string, targetUsername: string, accepted: boolean): void {
    console.log(`Received challenge response from player ${targetPlayerId} (${targetUsername}) - ${accepted ? 'accepted' : 'declined'}`);
    
    // Show challenge response notification
    if (accepted) {
      this.showNotification(`${targetUsername} accepted your challenge! Battle will begin soon.`);
    } else {
      this.showNotification(`${targetUsername} declined your challenge.`);
    }
  }
  
  private handleChallengeFailed(reason: string): void {
    console.log(`Challenge failed. Reason: ${reason}`);
    
    // Format a user-friendly reason message
    let userMessage = "Challenge failed";
    
    switch (reason) {
      case "player_not_found":
        userMessage = "Challenge failed: Player not found or offline";
        break;
      case "player_in_combat":
        userMessage = "Challenge failed: Player is already in combat";
        break;
      case "player_busy":
        userMessage = "Challenge failed: Player is busy";
        break;
      case "player_declined":
        userMessage = "Challenge declined by player";
        break;
      case "too_far_away":
        userMessage = "Challenge failed: Player is too far away";
        break;
      default:
        userMessage = `Challenge failed: ${reason}`;
    }
    
    // Show error notification
    this.showNotification(userMessage, 3000);
  }
  
  /**
   * Show a notification message
   * @param message Message to display
   * @param duration Duration in milliseconds (default: 2000)
   */
  private showNotification(message: string, duration: number = 2000): void {
    // Remove any existing notification
    const existingNotification = document.getElementById('mp-notification');
    if (existingNotification) {
      document.body.removeChild(existingNotification);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.id = 'mp-notification';
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
   * Show the challenge received dialog
   * @param challengerId ID of the player who sent the challenge
   * @param challengerUsername Username of the player who sent the challenge
   */
  private showChallengeReceivedDialog(challengerId: string, challengerUsername: string): void {
    // Remove any existing dialog
    this.removeChallengeDialog();
    
    // Create dialog container
    const dialogContainer = document.createElement('div');
    dialogContainer.id = 'challenge-dialog';
    dialogContainer.style.position = 'absolute';
    dialogContainer.style.top = '50%';
    dialogContainer.style.left = '50%';
    dialogContainer.style.transform = 'translate(-50%, -50%)';
    dialogContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    dialogContainer.style.borderRadius = '8px';
    dialogContainer.style.padding = '20px';
    dialogContainer.style.width = '300px';
    dialogContainer.style.zIndex = '2000';
    dialogContainer.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.7), 0 0 0 1000px rgba(0, 0, 0, 0.5)';
    dialogContainer.style.color = 'white';
    dialogContainer.style.fontFamily = 'Inter, Arial, sans-serif';
    dialogContainer.style.textAlign = 'center';
    dialogContainer.style.backdropFilter = 'blur(5px)';
    dialogContainer.style.border = '1px solid rgba(255, 255, 255, 0.1)';
    
    // Add header
    const header = document.createElement('h2');
    header.textContent = `Battle Challenge!`;
    header.style.margin = '0 0 15px 0';
    header.style.color = '#ff9900';
    header.style.fontSize = '24px';
    dialogContainer.appendChild(header);
    
    // Add message
    const message = document.createElement('p');
    message.textContent = `${challengerUsername} has challenged you to a battle!`;
    message.style.marginBottom = '20px';
    message.style.fontSize = '16px';
    dialogContainer.appendChild(message);
    
    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'space-between';
    buttonContainer.style.gap = '10px';
    
    // Accept button
    const acceptButton = document.createElement('button');
    acceptButton.textContent = 'Accept';
    acceptButton.style.flex = '1';
    acceptButton.style.padding = '10px';
    acceptButton.style.backgroundColor = '#4a5fc1';
    acceptButton.style.color = 'white';
    acceptButton.style.border = 'none';
    acceptButton.style.borderRadius = '4px';
    acceptButton.style.cursor = 'pointer';
    acceptButton.style.fontWeight = 'bold';
    acceptButton.style.fontSize = '16px';
    acceptButton.style.transition = 'background-color 0.2s';
    
    acceptButton.addEventListener('mouseover', () => {
      acceptButton.style.backgroundColor = '#3a4fb1';
    });
    
    acceptButton.addEventListener('mouseout', () => {
      acceptButton.style.backgroundColor = '#4a5fc1';
    });
    
    acceptButton.addEventListener('click', () => {
      // Send accept challenge response
      this.sendChallengeResponse(challengerId, true);
      this.removeChallengeDialog();
      this.showNotification(`You accepted the challenge from ${challengerUsername}. Preparing battle...`);
    });
    
    // Decline button
    const declineButton = document.createElement('button');
    declineButton.textContent = 'Decline';
    declineButton.style.flex = '1';
    declineButton.style.padding = '10px';
    declineButton.style.backgroundColor = '#888888';
    declineButton.style.color = 'white';
    declineButton.style.border = 'none';
    declineButton.style.borderRadius = '4px';
    declineButton.style.cursor = 'pointer';
    declineButton.style.fontWeight = 'bold';
    declineButton.style.fontSize = '16px';
    declineButton.style.transition = 'background-color 0.2s';
    
    declineButton.addEventListener('mouseover', () => {
      declineButton.style.backgroundColor = '#777777';
    });
    
    declineButton.addEventListener('mouseout', () => {
      declineButton.style.backgroundColor = '#888888';
    });
    
    declineButton.addEventListener('click', () => {
      // Send decline challenge response
      this.sendChallengeResponse(challengerId, false);
      this.removeChallengeDialog();
      this.showNotification(`You declined the challenge from ${challengerUsername}.`);
    });
    
    // Add buttons to container
    buttonContainer.appendChild(acceptButton);
    buttonContainer.appendChild(declineButton);
    
    // Add button container to dialog
    dialogContainer.appendChild(buttonContainer);
    
    // Add dialog to DOM
    document.body.appendChild(dialogContainer);
    
    // Add a timer for auto-decline if no response within 30 seconds
    const timerBar = document.createElement('div');
    timerBar.style.width = '100%';
    timerBar.style.height = '5px';
    timerBar.style.backgroundColor = '#333333';
    timerBar.style.marginTop = '20px';
    timerBar.style.borderRadius = '2px';
    
    const timerProgress = document.createElement('div');
    timerProgress.style.width = '100%';
    timerProgress.style.height = '100%';
    timerProgress.style.backgroundColor = '#ff9900';
    timerProgress.style.borderRadius = '2px';
    timerProgress.style.transition = 'width 30s linear';
    
    timerBar.appendChild(timerProgress);
    dialogContainer.appendChild(timerBar);
    
    // Start the timer animation after a small delay
    setTimeout(() => {
      timerProgress.style.width = '0';
    }, 50);
    
    // Set timeout for auto-decline
    const timeoutId = setTimeout(() => {
      if (document.getElementById('challenge-dialog')) {
        // Auto-decline if dialog still exists
        this.sendChallengeResponse(challengerId, false);
        this.removeChallengeDialog();
        this.showNotification(`Challenge from ${challengerUsername} timed out.`);
      }
    }, 30000);
    
    // Store the timeout ID for cleanup
    dialogContainer.dataset.timeoutId = timeoutId.toString();
  }
  
  /**
   * Remove the challenge dialog if it exists
   */
  private removeChallengeDialog(): void {
    const dialog = document.getElementById('challenge-dialog');
    if (dialog) {
      // Clear the timeout if it exists
      if (dialog.dataset.timeoutId) {
        clearTimeout(parseInt(dialog.dataset.timeoutId));
      }
      document.body.removeChild(dialog);
    }
  }
  
  /**
   * Handle a PvP battle start message
   */
  private handlePvPBattleStart(message: PvPBattleStartMessage): void {
    console.log("PvP battle started:", message);
    
    // Start the battle with the battle manager
    this.battleManager.startPvPBattle(message);
  }

  /**
   * Check if there are multiple players nearby and show a tooltip if needed
   */
  private checkMultiplePlayersForTooltip(): void {
    // Check localStorage to see how many times the tooltip has been shown
    const tooltipCount = localStorage.getItem('duelTooltipShownCount');
    if (tooltipCount) {
      this.tooltipShownCount = parseInt(tooltipCount);
    }
    
    // Don't show tooltip if it has already been shown twice
    if (this.tooltipShownCount >= 2) {
      return;
    }
    
    // Count total players in the scene (excluding self)
    const totalPlayers = this.otherPlayersManager ? this.otherPlayersManager.getPlayerCount() : 0;
    
    // If there are multiple players and tooltip isn't already showing
    if (totalPlayers > 0 && !document.getElementById('duel-tooltip')) {
      this.showDuelTooltip();
    }
  }
  
  /**
   * Show the duel tooltip to guide players
   */
  private showDuelTooltip(): void {
    // Increment tooltip count
    this.tooltipShownCount++;
    
    // Update localStorage
    localStorage.setItem('duelTooltipShownCount', this.tooltipShownCount.toString());
    
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.id = 'duel-tooltip';
    tooltip.style.position = 'absolute';
    tooltip.style.top = '15%';
    tooltip.style.left = '50%';
    tooltip.style.transform = 'translateX(-50%)';
    tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    tooltip.style.color = 'white';
    tooltip.style.padding = '12px 20px';
    tooltip.style.borderRadius = '6px';
    tooltip.style.zIndex = '1500';
    tooltip.style.fontFamily = 'Inter, Arial, sans-serif';
    tooltip.style.fontSize = '16px';
    tooltip.style.maxWidth = '300px';
    tooltip.style.textAlign = 'center';
    tooltip.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
    tooltip.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.opacity = '0';
    tooltip.style.transition = 'opacity 0.5s ease-in-out';
    
    // Add tooltip text
    tooltip.textContent = 'Click on another player to request a duel!';
    
    // Add to DOM
    document.body.appendChild(tooltip);
    
    // Fade in after a short delay
    setTimeout(() => {
      tooltip.style.opacity = '1';
    }, 100);
    
    // Set timeout to remove tooltip after 8 seconds
    if (this.tooltipTimeout !== null) {
      clearTimeout(this.tooltipTimeout);
    }
    
    this.tooltipTimeout = window.setTimeout(() => {
      this.hideTooltip();
    }, 8000);
  }
  
  /**
   * Hide the duel tooltip
   */
  private hideTooltip(): void {
    const tooltip = document.getElementById('duel-tooltip');
    if (tooltip) {
      // Fade out
      tooltip.style.opacity = '0';
      
      // Remove from DOM after fade effect
      setTimeout(() => {
        if (tooltip.parentNode) {
          tooltip.parentNode.removeChild(tooltip);
        }
      }, 500);
    }
    
    // Clear timeout
    if (this.tooltipTimeout !== null) {
      clearTimeout(this.tooltipTimeout);
      this.tooltipTimeout = null;
    }
  }
}
