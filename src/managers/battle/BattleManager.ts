import { Scene } from 'phaser';
import { 
  BattlePokemonState, 
  TeamPokemonState, 
  FieldState,
  WildBattleStartMessage,
  RequestActionMessage,
  BattleActionResponse,
  TurnUpdateMessage,
  PvPBattleStartMessage
} from '../../types/battle.types';
import { WebSocketService } from '../../services/WebSocketService';
import { BattleUIManager } from './BattleUIManager';
import { BattleEventProcessor } from './BattleEventProcessor';
import { BattleAnimationManager } from './BattleAnimationManager';
import { BattleUtils } from '../../utils/battle/BattleUtils';
import { AudioManager } from '../../utils/AudioManager';
import { Game } from '../../scenes/Game';

/**
 * Manages Pokemon battles, including UI, state, and animations
 */
export class BattleManager {
  private scene: Scene;
  private wsService: WebSocketService;
  private battleUIManager: BattleUIManager;
  private battleEventProcessor: BattleEventProcessor;
  
  private isInBattle: boolean = false;
  private battleId: string | null = null;
  private playerPokemon: BattlePokemonState | null = null;
  private wildPokemon: BattlePokemonState | null = null;
  private _opponentPokemon: BattlePokemonState | null = null;
  private isPvPBattle: boolean = false;
  private opponentUsername: string = "";
  private playerTeam: TeamPokemonState[] = [];
  private opponentTeam: TeamPokemonState[] = [];
  private fieldState: FieldState | null = null;
  private turnNumber: number = 0;
  private canSwitch: boolean = false;
  private mustSwitch: boolean = false;
  private selectedMoveIndex: number = -1;
  private player1Id: string = "";
  private player2Id: string = "";
  private playerId: string = "";
  private audioManager: AudioManager | null = null;
  
  constructor(scene: Scene, wsService: WebSocketService) {
    this.scene = scene;
    this.wsService = wsService;
    
    // Get audio manager reference if available
    if (scene instanceof Game) {
      this.audioManager = scene.getAudioManager();
    }
    
    // Initialize UI manager
    this.battleUIManager = new BattleUIManager(
      // Player Pokemon accessor
      () => this.playerPokemon,
      // Wild Pokemon accessor
      () => this.wildPokemon,
      // Opponent Pokemon accessor - pass this now with added logging
      () => {
        const result = this._opponentPokemon;
        return result;
      }
    );
    
    // Initialize event processor
    this.battleEventProcessor = new BattleEventProcessor(
      this.battleUIManager,
      () => this.playerPokemon,
      () => this.wildPokemon,
      () => this.playerTeam,
      this.onEventProcessingComplete.bind(this),
      // Add opponent Pokemon accessor for PvP battles
      () => this.opponentPokemon,
      // Add isPvPBattle accessor
      () => this.isPvPBattle
    );
    
    // Set the battle manager reference in the event processor
    this.battleEventProcessor.setBattleManager(this);
  }
  
  /**
   * Starts a battle from a wild_battle_start message
   */
  public startBattle(battleData: WildBattleStartMessage): void {
    if (this.isInBattle) {
      console.warn('Already in a battle, ignoring new battle start');
      return;
    }
    
    console.log('Starting battle with data:', battleData);
    
    // Set battle state
    this.isInBattle = true;
    this.isPvPBattle = false;
    this.battleId = battleData.battle_id;
    this.playerPokemon = battleData.initial_pokemon;
    this.wildPokemon = battleData.wild_pokemon;
    this.playerTeam = battleData.player_team;
    this.fieldState = battleData.initial_field_state;
    
    // Change to battle music
    if (this.audioManager) {
      this.audioManager.playWildBattleMusic();
    }
    
    // Create and show the battle UI
    this.battleUIManager.showBattleUI();
    
    // Set up event handlers for UI elements
    this.setupEventHandlers();
    
    // Play battle start animation
    BattleAnimationManager.playBattleStartAnimation(
      this.battleUIManager.getWildPokemonSprite()
    );
  }
  
  /**
   * Starts a PvP battle from a pvp_battle_start message
   */
  public startPvPBattle(battleData: PvPBattleStartMessage): void {
    if (this.isInBattle) {
      console.warn('Already in a battle, ignoring new PvP battle start');
      return;
    }
    
    console.log('Starting PvP battle with data:', battleData);
    
    // Set battle state
    this.isInBattle = true;
    this.isPvPBattle = true;
    this.battleId = battleData.battle_id;
    this.playerPokemon = battleData.initial_pokemon;
    
    // Change to PvP battle music
    if (this.audioManager) {
      this.audioManager.playPvPBattleMusic();
    }
    
    // Store player1 and player2 IDs for PvP battles
    if (battleData.player1_id && battleData.player2_id) {
      this.player1Id = battleData.player1_id;
      this.player2Id = battleData.player2_id;
      
      // Determine local player's ID (this should match with the server mechanism)
      // In a full implementation, you might want to get this from a global game state
      this.playerId = battleData.opponent_id === this.player1Id ? this.player2Id : this.player1Id;
      
      console.log(`PvP battle: player1_id=${this.player1Id}, player2_id=${this.player2Id}, local player=${this.playerId}`);
    } else {
      console.error('[BattleManager] Missing player1_id or player2_id in battle data!', battleData);
    }
    
    // Directly use the opponent_initial_pokemon field from the message
    const opponentPokemon = battleData.opponent_initial_pokemon;
    if (opponentPokemon) {
      console.log('Setting opponent Pokemon to:', opponentPokemon);
      this.opponentPokemon = opponentPokemon;
    } else {
      console.error('No opponent_initial_pokemon found in the battle data!');
    }
    
    this.opponentUsername = battleData.opponent_username;
    this.playerTeam = battleData.player_team;
    this.opponentTeam = battleData.opponent_team || [];
    this.fieldState = battleData.initial_field_state;
    this.turnNumber = battleData.turn_number || 1;
    
    // Create and show the battle UI
    this.battleUIManager.showPvPBattleUI(this.opponentUsername);
    
    // Set up event handlers for UI elements
    this.setupEventHandlers();
    
    // Play battle start animation
    const opponentSprite = this.battleUIManager.getWildPokemonSprite();
    if (opponentSprite) {
      BattleAnimationManager.playBattleStartAnimation(opponentSprite);
    }
  }
  
  /**
   * Setup event handlers for battle UI elements
   */
  private setupEventHandlers(): void {
    // Add event handlers for action buttons
    const actionButtons = this.battleUIManager.getActionButtons();
    
    if (actionButtons.length >= 4) {
      // For each action button, clone to remove existing event listeners and add fresh ones
      // Fight button
      const fightButton = actionButtons[0].cloneNode(true) as HTMLElement;
      actionButtons[0].parentNode?.replaceChild(fightButton, actionButtons[0]);
      fightButton.addEventListener('click', () => {
        this.handleActionButtonClick('fight');
      });
      
      // Bag button
      const bagButton = actionButtons[1].cloneNode(true) as HTMLElement;
      actionButtons[1].parentNode?.replaceChild(bagButton, actionButtons[1]);
      bagButton.addEventListener('click', () => {
        this.handleActionButtonClick('bag');
      });
      
      // Pokemon button
      const pokemonButton = actionButtons[2].cloneNode(true) as HTMLElement;
      actionButtons[2].parentNode?.replaceChild(pokemonButton, actionButtons[2]);
      pokemonButton.addEventListener('click', () => {
        this.handleActionButtonClick('pokemon');
      });
      
      // Run button
      const runButton = actionButtons[3].cloneNode(true) as HTMLElement;
      actionButtons[3].parentNode?.replaceChild(runButton, actionButtons[3]);
      runButton.addEventListener('click', () => {
        this.handleActionButtonClick('run');
      });
      
      // Update the actionButtons array in the BattleUIManager
      this.battleUIManager.updateActionButtons([fightButton, bagButton, pokemonButton, runButton]);
    }
    
    // Setup move button event handlers
    this.recreateMoveButtonEventHandlers();
  }
  
  /**
   * Handle a new battle turn from a request_action message
   */
  public requestAction(message: RequestActionMessage): void {
    if (!this.isInBattle) {
      console.warn('Not in a battle, ignoring action request');
      return;
    }
    
    // Add detailed debugging
    console.log(`BattleManager.requestAction called for turn ${message.turn_number}`, {
      battleId: this.battleId,
      currentTurn: this.turnNumber,
      newTurn: message.turn_number,
      playerPokemon: this.playerPokemon?.name,
      wildPokemon: this.isPvPBattle ? 'N/A (PvP Battle)' : this.wildPokemon?.name,
      opponentPokemon: this.isPvPBattle ? this.opponentPokemon?.name : 'N/A',
      canSwitch: message.can_switch,
      mustSwitch: message.must_switch,
      eventsProcessing: this.battleEventProcessor.isProcessingEvents
    });
    
    // Update battle state
    this.turnNumber = message.turn_number;
    
    if (this.isPvPBattle) {
      // The message structure should include opponent_pokemon_state for PvP battles
      if (message.other_pokemon_state) {
        console.log('[BattleManager] Updating opponent Pokemon from requestAction:', message.other_pokemon_state);
        // We no longer update HP here, just store the reference
        const updatedOpponent = message.other_pokemon_state;
        // Preserve the current HP values instead of overwriting them
        if (this.opponentPokemon) {
          updatedOpponent.current_hp = this.opponentPokemon.current_hp;
          updatedOpponent.current_hp_percent = this.opponentPokemon.current_hp_percent;
        }
        this.opponentPokemon = updatedOpponent;
      } else {
        console.error('[BattleManager] Missing opponent_pokemon_state in PvP battle requestAction!', message);
      }
    } else {
      // For wild battles, update wild Pokemon
      this.wildPokemon = message.other_pokemon_state || null;
      // Preserve HP for wild Pokemon too
      if (this.wildPokemon && message.other_pokemon_state) {
        const currentWildHP = this.wildPokemon.current_hp;
        const currentWildHPPercent = this.wildPokemon.current_hp_percent;
        this.wildPokemon.current_hp = currentWildHP;
        this.wildPokemon.current_hp_percent = currentWildHPPercent;
      }
    }
    
    this.playerTeam = message.team_overview;
    // Preserve player Pokemon HP too
    if (this.playerPokemon && message.active_pokemon_state) {
      const currentPlayerHP = this.playerPokemon.current_hp;
      const currentPlayerHPPercent = this.playerPokemon.current_hp_percent;
      this.playerPokemon = message.active_pokemon_state;
      this.playerPokemon.current_hp = currentPlayerHP;
      this.playerPokemon.current_hp_percent = currentPlayerHPPercent;
    } else {
      this.playerPokemon = message.active_pokemon_state;
    }
    
    this.fieldState = message.field_state;
    this.canSwitch = message.can_switch;
    this.mustSwitch = message.must_switch;
    
    // Update battle UI
    this.battleUIManager.updatePokemonInfo();
    
    // If there are still events being processed, wait for them to finish
    if (this.battleEventProcessor.isProcessingEvents) {
      console.log('Still processing events, will wait to enable input');
      
      // Set a timer to check again after a delay
      setTimeout(() => {
        if (this.battleEventProcessor.isProcessingEvents) {
          console.warn('Events still processing after delay - might be stuck');
        } else {
          console.log('Events completed, now handling request_action');
          this.handleRequestActionAfterEvents(message);
        }
      }, 1000);
      
      return;
    }
    
    // Otherwise handle the request_action immediately
    this.handleRequestActionAfterEvents(message);
  }
  
  /**
   * Handle the request_action message after all events have been processed
   */
  private handleRequestActionAfterEvents(message: RequestActionMessage): void {
    // Handle must_switch case
    if (message.must_switch) {
      // Show Pokemon switch UI
      this.showSwitchUI();
    } else {
      // Re-enable action buttons
      this.enableActionButtons();
      
      // Reset the selected move index
      this.selectedMoveIndex = -1;
    }
    
    // Show appropriate message to the user
    const messageDisplay = this.battleUIManager.getMessageDisplay();
    if (messageDisplay) {
      if (message.must_switch) {
        messageDisplay.textContent = 'Choose a Pokémon to send out!';
      } else {
        messageDisplay.textContent = 'What will you do?';
      }
    }
    
    console.log('Battle UI updated, player can now take action');
  }
  
  /**
   * Handles click on an action button
   */
  private handleActionButtonClick(action: string): void {
    const battleContainer = this.battleUIManager.getBattleContainer();
    const actionButtonsContainer = battleContainer?.querySelector('.action-buttons');
    const movesContainer = battleContainer?.querySelector('.moves-container');
    const messageDisplay = this.battleUIManager.getMessageDisplay();
    
    if (!actionButtonsContainer || !movesContainer || !messageDisplay) return;
    
    switch(action) {
      case 'fight':
        // Show the moves container
        (actionButtonsContainer as HTMLElement).style.display = 'none';
        (movesContainer as HTMLElement).style.display = 'grid';
        messageDisplay.textContent = 'Select a move:';
        break;
        
      case 'bag':
        // Show the bag UI
        this.showBagUI();
        break;
        
      case 'pokemon':
        if (this.canSwitch) {
          this.showSwitchUI();
        } else {
          messageDisplay.textContent = 'You cannot switch Pokemon now!';
        }
        break;
        
      case 'run':
        // Disable all action buttons while running
        const actionButtons = this.battleUIManager.getActionButtons();
        actionButtons.forEach(button => {
          (button as HTMLElement).style.opacity = '0.5';
          (button as HTMLElement).style.cursor = 'not-allowed';
        });
        
        this.sendBattleAction({
          type: 'combat_action',
          battle_id: this.battleId || '',
          action: {
            action_type: 'run'
          }
        });
        messageDisplay.textContent = 'Got away safely!';
      }
  }
  
  /**
   * Handle move selection
   */
  private handleMoveSelection(moveIndex: number): void {
    if (!this.battleId) return;
    
    this.selectedMoveIndex = moveIndex;
    
    // Send move action to server
    this.sendBattleAction({
      type: 'combat_action',
      battle_id: this.battleId,
      action: {
        action_type: 'use_move',
        move_index: moveIndex
      }
    });
    
    // Show action message
    const messageDisplay = this.battleUIManager.getMessageDisplay();
    if (messageDisplay && this.playerPokemon && this.playerPokemon.moves) {
      // Get actual move name
      let moveName = this.playerPokemon.moves[moveIndex].name;
      if (moveName === `Move ${this.playerPokemon.moves[moveIndex].move_id}`) {
        moveName = BattleUtils.formatMoveName(this.playerPokemon.moves[moveIndex].move_id);
      }
      
      // Capitalize Pokemon name and move name
      const pokemonName = this.playerPokemon.name.charAt(0).toUpperCase() + this.playerPokemon.name.slice(1);
      moveName = moveName.charAt(0).toUpperCase() + moveName.slice(1);
      
      messageDisplay.textContent = `${pokemonName} used ${moveName}!`;
    }
    
    // Disable all move buttons
    const moveButtons = this.battleUIManager.getMoveButtons();
    moveButtons.forEach(button => {
      button.style.opacity = '0.5';
      button.style.cursor = 'not-allowed';
      
      // We no longer need to clone the button to remove event listeners
      // as this will be handled when recreating move buttons
    });
    
    // Disable all action buttons as well while waiting for server response
    const actionButtons = this.battleUIManager.getActionButtons();
    actionButtons.forEach(button => {
      (button as HTMLElement).style.opacity = '0.5';
      (button as HTMLElement).style.cursor = 'not-allowed';
    });
    
    // Hide the moves container
    const movesContainer = this.battleUIManager.getBattleContainer()?.querySelector('.moves-container') as HTMLElement;
    if (movesContainer) {
      movesContainer.style.display = 'none';
    }
  }
  
  /**
   * Shows the Pokemon switch UI
   */
  private showSwitchUI(): void {
    const battleContainer = this.battleUIManager.getBattleContainer();
    if (!battleContainer || !this.playerTeam.length || !this.battleId) return;
    
    // Hide action buttons and move buttons
    const actionButtonsContainer = battleContainer.querySelector('.action-buttons') as HTMLElement;
    const movesContainer = battleContainer.querySelector('.moves-container') as HTMLElement;
    const messageDisplay = this.battleUIManager.getMessageDisplay();
    
    if (actionButtonsContainer) actionButtonsContainer.style.display = 'none';
    if (movesContainer) movesContainer.style.display = 'none';
    
    // Create switch UI container
    const switchContainer = document.createElement('div');
    switchContainer.className = 'switch-container';
    
    // Create title
    if (messageDisplay) {
      messageDisplay.textContent = this.mustSwitch ? 
        'Choose a Pokémon to send out!' : 
        'Switch to which Pokémon?';
    }
    
    // Create Pokémon list
    this.playerTeam.forEach(pokemon => {
      // Skip fainted Pokémon unless we must switch
      if (pokemon.is_fainted && !this.mustSwitch) return;
      
      // Skip currently active Pokémon
      if (this.playerPokemon && pokemon.team_index === this.playerPokemon.team_index) return;
      
      const pokemonItem = document.createElement('div');
      pokemonItem.className = 'pokemon-switch-item';
      
      // Add Pokémon icon/image
      const pokemonImage = document.createElement('img');
      pokemonImage.src = `/assets/Sprites/FullMonsters/front/${pokemon.template_id}.png`;
      pokemonImage.onerror = () => {
        pokemonImage.src = '/assets/Sprites/Icons/0.png'; // Default icon
      };
      pokemonImage.className = 'pokemon-switch-icon';
      pokemonItem.appendChild(pokemonImage);
      
      // Add Pokémon info
      const pokemonInfo = document.createElement('div');
      pokemonInfo.className = 'pokemon-switch-info';
      
      // Name and level
      const nameLevel = document.createElement('div');
      nameLevel.className = 'pokemon-name-level';
      const pokemonName = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
      nameLevel.textContent = `${pokemonName} Lv.${pokemon.level}`;
      pokemonInfo.appendChild(nameLevel);
      
      // HP bar
      const hpContainer = document.createElement('div');
      hpContainer.className = 'hp-container-small';
      
      const hpBarBg = document.createElement('div');
      hpBarBg.className = 'hp-bar-bg-small';
      
      const hpBar = document.createElement('div');
      hpBar.className = 'hp-bar-small';
      hpBar.style.width = `${pokemon.current_hp_percent * 100}%`;
      hpBar.style.backgroundColor = BattleUtils.getHpColor(pokemon.current_hp_percent);
      hpBarBg.appendChild(hpBar);
      
      hpContainer.appendChild(hpBarBg);
      
      // HP values
      const hpValues = document.createElement('div');
      hpValues.className = 'hp-values-small';
      hpValues.textContent = `${pokemon.current_hp}/${pokemon.max_hp}`;
      hpContainer.appendChild(hpValues);
      
      pokemonInfo.appendChild(hpContainer);
      
      // Add status if exists
      if (pokemon.status) {
        const statusElement = document.createElement('div');
        statusElement.className = 'status-element-small';
        statusElement.textContent = pokemon.status.toUpperCase();
        statusElement.style.backgroundColor = BattleUtils.getStatusColor(pokemon.status);
        pokemonInfo.appendChild(statusElement);
      }
      
      pokemonItem.appendChild(pokemonInfo);
      
      // Add click event
      pokemonItem.addEventListener('click', () => {
        this.handlePokemonSwitch(pokemon.team_index);
      });
      
      switchContainer.appendChild(pokemonItem);
    });
    
    // Add back button
    if (!this.mustSwitch) {
      const backButton = document.createElement('button');
      backButton.className = 'switch-back-button';
      backButton.textContent = 'BACK';
      backButton.addEventListener('click', () => {
        // Remove switch container
        switchContainer.remove();
        
        // Show action buttons again
        if (actionButtonsContainer) actionButtonsContainer.style.display = 'grid';
        if (messageDisplay) messageDisplay.textContent = 'What will you do?';
      });
      switchContainer.appendChild(backButton);
    }
    
    // Add switch container to battle container
    battleContainer.querySelector('.actions-area')?.appendChild(switchContainer);
  }
  
  /**
   * Handle Pokemon switch selection
   */
  private handlePokemonSwitch(teamIndex: number): void {
    if (!this.battleId) return;
    
    // Send switch action to server
    this.sendBattleAction({
      type: 'combat_action',
      battle_id: this.battleId,
      action: {
        action_type: 'switch_pokemon',
        team_index: teamIndex
      }
    });
    
    // Show action message
    const messageDisplay = this.battleUIManager.getMessageDisplay();
    const switchingTo = this.playerTeam.find(p => p.team_index === teamIndex);
    
    if (messageDisplay && switchingTo) {
      // Capitalize Pokemon name
      const pokemonName = switchingTo.name.charAt(0).toUpperCase() + switchingTo.name.slice(1);
      messageDisplay.textContent = `Go, ${pokemonName}!`;
    }
    
    // Remove switch UI
    const switchContainer = this.battleUIManager.getBattleContainer()?.querySelector('.switch-container');
    if (switchContainer) {
      switchContainer.remove();
    }
    
    // Disable all action buttons while waiting for server response
    const actionButtons = this.battleUIManager.getActionButtons();
    actionButtons.forEach(button => {
      (button as HTMLElement).style.opacity = '0.5';
      (button as HTMLElement).style.cursor = 'not-allowed';
    });
  }
  
  /**
   * Shows the bag UI for using items
   */
  private showBagUI(): void {
    const battleContainer = this.battleUIManager.getBattleContainer();
    if (!battleContainer || !this.battleId) return;
    
    // Hide action buttons and move buttons
    const actionButtonsContainer = battleContainer.querySelector('.action-buttons') as HTMLElement;
    const movesContainer = battleContainer.querySelector('.moves-container') as HTMLElement;
    const messageDisplay = this.battleUIManager.getMessageDisplay();
    
    if (actionButtonsContainer) actionButtonsContainer.style.display = 'none';
    if (movesContainer) movesContainer.style.display = 'none';
    
    // Create bag UI container
    const bagContainer = document.createElement('div');
    bagContainer.className = 'bag-container';
    
    // Set message
    if (messageDisplay) {
      messageDisplay.textContent = 'Choose an item to use:';
    }
    
    // For now, just provide some basic items
    // In a full implementation, this would come from the player's inventory
    const items = [
      { id: 'potion', name: 'Potion', description: 'Restores 20 HP', captureItem: false },
      { id: 'super_potion', name: 'Super Potion', description: 'Restores 50 HP', captureItem: false },
      { id: 'poke_ball', name: 'Poké Ball', description: 'Used to catch Pokémon', captureItem: true },
      { id: 'great_ball', name: 'Great Ball', description: 'A good Ball with a higher catch rate than a standard Poké Ball', captureItem: true }
    ];
    
    // Create item buttons
    items.forEach(item => {
      const itemButton = document.createElement('button');
      itemButton.className = 'item-button';
      itemButton.textContent = item.name;
      
      // Add description as data attribute
      itemButton.setAttribute('data-description', item.description);
      
      // Add event listeners
      itemButton.addEventListener('mouseenter', () => {
        if (messageDisplay) {
          messageDisplay.textContent = item.description;
        }
      });
      
      itemButton.addEventListener('mouseleave', () => {
        if (messageDisplay) {
          messageDisplay.textContent = 'Choose an item to use:';
        }
      });
      
      itemButton.addEventListener('click', () => {
        this.handleItemUse(item.id, item.captureItem);
      });
      
      bagContainer.appendChild(itemButton);
    });
    
    // Add back button
    const backButton = document.createElement('button');
    backButton.className = 'bag-back-button';
    backButton.textContent = 'BACK';
    backButton.addEventListener('click', () => {
      // Remove bag container
      bagContainer.remove();
      
      // Show action buttons again
      if (actionButtonsContainer) actionButtonsContainer.style.display = 'grid';
      if (messageDisplay) messageDisplay.textContent = 'What will you do?';
    });
    bagContainer.appendChild(backButton);
    
    // Add bag container to battle container
    battleContainer.querySelector('.actions-area')?.appendChild(bagContainer);
  }
  
  /**
   * Handle item use
   */
  private handleItemUse(itemId: string, isCaptureItem: boolean): void {
    if (!this.battleId) return;
    
    // Send item action to server
    this.sendBattleAction({
      type: 'combat_action',
      battle_id: this.battleId,
      action: {
        action_type: 'use_item',
        item_id: itemId,
        is_capture_item: isCaptureItem
      }
    });
    
    // Show action message
    const messageDisplay = this.battleUIManager.getMessageDisplay();
    
    if (messageDisplay) {
      messageDisplay.textContent = `You used a ${BattleUtils.formatItemName(itemId)}!`;
    }
    
    // Remove bag UI
    const bagContainer = this.battleUIManager.getBattleContainer()?.querySelector('.bag-container');
    if (bagContainer) {
      bagContainer.remove();
    }
    
    // Disable action buttons
    const actionButtons = this.battleUIManager.getActionButtons();
    actionButtons.forEach(button => {
      (button as HTMLButtonElement).disabled = true;
      (button as HTMLElement).style.opacity = '0.5';
      (button as HTMLElement).style.cursor = 'not-allowed';
    });
  }
  
  /**
   * Send a battle action to the server
   */
  private sendBattleAction(action: BattleActionResponse): void {
    if (this.wsService) {
      this.wsService.sendMessage(action);
      console.log('Sent battle action:', action);
    }
  }
  
  /**
   * End the battle
   */
  public endBattle(result: 'win' | 'loss' | 'run' | 'capture'): void {
    // Hide battle UI
    this.battleUIManager.hideBattleUI();
    
    // Restore normal music
    if (this.audioManager) {
      this.audioManager.playNormalMusic();
    }
    
    // Reset battle state
    this.isInBattle = false;
    this.isPvPBattle = false;
    this.battleId = null;
    this.playerPokemon = null;
    this.wildPokemon = null;
    this.opponentPokemon = null;
    this.opponentUsername = "";
    this.playerTeam = [];
    this.opponentTeam = [];
    this.fieldState = null;
    this.turnNumber = 0;
    this.canSwitch = false;
    this.mustSwitch = false;
    this.selectedMoveIndex = -1;
    this.player1Id = "";
    this.player2Id = "";
    this.playerId = "";
    
    console.log(`Battle ended: ${result}`);
  }
  
  /**
   * Process a turn update message with battle events
   */
  public processTurnUpdate(message: TurnUpdateMessage): void {
    if (!this.isInBattle) {
      console.warn('Not in a battle, ignoring turn update');
      return;
    }

    console.log(`Processing turn update: Turn ${message.turn_number}`, message);

    // Store the previous turn number to track progress
    const previousTurn = this.turnNumber;
    
    // Update turn number
    this.turnNumber = message.turn_number;
    
    // Handle player Pokemon state if included in the message
    // Using type assertion since TurnUpdateMessage doesn't explicitly include player_pokemon_state
    const msgWithPlayerState = message as TurnUpdateMessage & { player_pokemon_state?: BattlePokemonState };
    if (msgWithPlayerState.player_pokemon_state) {
      // Store current HP values before updating
      const currentPlayerHP = this.playerPokemon?.current_hp;
      const currentPlayerHPPercent = this.playerPokemon?.current_hp_percent;
      
      // Update with new state
      this.playerPokemon = msgWithPlayerState.player_pokemon_state;
      
      // Don't overwrite HP values - they should only be updated by battle events
      if (currentPlayerHP !== undefined && currentPlayerHPPercent !== undefined && this.playerPokemon) {
        console.log(`Preserving player HP in turn update: ${currentPlayerHP}/${this.playerPokemon.max_hp}`);
        this.playerPokemon.current_hp = currentPlayerHP;
        this.playerPokemon.current_hp_percent = currentPlayerHPPercent;
      }
    }
    
    // If PvP battle and opponent Pokemon state is included, update it
    if (this.isPvPBattle && message.opponent_pokemon_state) {
      // Store current HP values before updating
      const currentHP = this.opponentPokemon?.current_hp;
      const currentHPPercent = this.opponentPokemon?.current_hp_percent;
      
      // Update with new state
      this.opponentPokemon = message.opponent_pokemon_state;
      
      // Don't overwrite HP values - they should only be updated by battle events
      if (currentHP !== undefined && currentHPPercent !== undefined && this.opponentPokemon) {
        console.log(`Preserving opponent HP in turn update: ${currentHP}/${this.opponentPokemon.max_hp}`);
        this.opponentPokemon.current_hp = currentHP;
        this.opponentPokemon.current_hp_percent = currentHPPercent;
      }
    }
    
    // Update UI after potentially changing Pokemon data
    this.battleUIManager.updatePokemonInfo();
    
    // Log turn progression
    if (previousTurn !== this.turnNumber) {
      console.log(`Battle turn progressed from ${previousTurn} to ${this.turnNumber}`);
    }

    // Queue events for processing
    this.battleEventProcessor.queueEvents(message.events);
    
    // If there are no events to process, the event processor might not trigger onEventProcessingComplete
    // So we check if the event queue is empty and call it manually if needed
    if (message.events.length === 0) {
      console.log('No events to process, calling onEventProcessingComplete directly');
      this.onEventProcessingComplete();
    }
  }
  
  /**
   * Callback for when event processing is complete
   */
  private onEventProcessingComplete(): void {
    // Log that event processing is complete
    console.log('All battle events processed');
    
    // Check if we're waiting for a request_action from the server
    // If we haven't received one after events are processed, we might need to manually enable inputs
    
    // Set a timeout to re-enable buttons if no server response is received
    // This is a fallback mechanism in case the server doesn't send a request_action
    setTimeout(() => {
      // Check if we're still waiting for input to be enabled
      const actionButtonsContainer = this.battleUIManager.getBattleContainer()?.querySelector('.action-buttons');
      const switchContainer = this.battleUIManager.getBattleContainer()?.querySelector('.switch-container');
      const bagContainer = this.battleUIManager.getBattleContainer()?.querySelector('.bag-container');
      
      // If no UI components for input are visible, we should re-enable action buttons
      if (actionButtonsContainer && 
          !switchContainer && 
          !bagContainer && 
          window.getComputedStyle(actionButtonsContainer).display === 'none') {
        
        console.log('No request_action received - forcing UI update');
        
        // Force re-enabling action buttons
        this.enableActionButtons();
        
        // Update message to inform user
        const messageDisplay = this.battleUIManager.getMessageDisplay();
        if (messageDisplay) {
          messageDisplay.textContent = 'What will you do?';
        }
      }
    }, 2000); // Wait 2 seconds before forcing UI update
  }
  
  /**
   * Re-enable action buttons after battle events are processed
   */
  private enableActionButtons(): void {
    // Re-enable action buttons using the same array we used to disable them
    const actionButtons = this.battleUIManager.getActionButtons();
    actionButtons.forEach(button => {
      // Reset all disabled properties
      (button as HTMLButtonElement).disabled = false;
      (button as HTMLElement).style.opacity = '1';
      (button as HTMLElement).style.cursor = 'pointer';
    });
    
    // Also make sure to query for any action buttons that might not be in our array
    const containerActionButtons = this.battleUIManager.getBattleContainer()?.querySelectorAll('.action-button');
    containerActionButtons?.forEach(button => {
      (button as HTMLButtonElement).disabled = false;
      (button as HTMLElement).style.opacity = '1';
      (button as HTMLElement).style.cursor = 'pointer';
    });
    
    // Re-enable move buttons if they exist
    const containerMoveButtons = this.battleUIManager.getBattleContainer()?.querySelectorAll('.move-button');
    containerMoveButtons?.forEach(button => {
      (button as HTMLButtonElement).disabled = false;
      (button as HTMLElement).style.opacity = '1';
      (button as HTMLElement).style.cursor = 'pointer';
    });
    
    // Instead of calling setupEventHandlers which would add duplicate event listeners,
    // we should recreate move buttons and add fresh event listeners to them
    this.recreateMoveButtonEventHandlers();
    
    // Show action buttons again if not in another menu
    const actionButtonsContainer = this.battleUIManager.getBattleContainer()?.querySelector('.action-buttons');
    const movesContainer = this.battleUIManager.getBattleContainer()?.querySelector('.moves-container');
    const switchContainer = this.battleUIManager.getBattleContainer()?.querySelector('.switch-container');
    const bagContainer = this.battleUIManager.getBattleContainer()?.querySelector('.bag-container');
    
    // Only show action buttons if not in another menu
    if (actionButtonsContainer && !switchContainer && !bagContainer) {
      (actionButtonsContainer as HTMLElement).style.display = 'grid';
      if (movesContainer) {
        (movesContainer as HTMLElement).style.display = 'none';
      }
      
      // Reset message
      const messageDisplay = this.battleUIManager.getMessageDisplay();
      if (messageDisplay) {
        messageDisplay.textContent = 'What will you do?';
      }
    }
  }
  
  /**
   * Recreate move button event handlers without adding duplicate action button handlers
   */
  private recreateMoveButtonEventHandlers(): void {
    // Add event handlers for move buttons
    const moveButtons = this.battleUIManager.getMoveButtons();
    const moveContainer = this.battleUIManager.getBattleContainer()?.querySelector('.moves-container') as HTMLElement;
    const backButton = moveContainer?.querySelector('.back-button');
    
    if (backButton) {
      // Clone to remove existing event listeners
      const newBackButton = backButton.cloneNode(true) as HTMLElement;
      backButton.parentNode?.replaceChild(newBackButton, backButton);
      
      newBackButton.addEventListener('click', () => {
        if (moveContainer) moveContainer.style.display = 'none';
        
        const actionButtonsContainer = this.battleUIManager.getBattleContainer()?.querySelector('.action-buttons') as HTMLElement;
        if (actionButtonsContainer) {
          actionButtonsContainer.style.display = 'grid';
        }
        
        const messageDisplay = this.battleUIManager.getMessageDisplay();
        if (messageDisplay) {
          messageDisplay.textContent = 'What will you do?';
        }
      });
    }
    
    // Add event handlers for each move button
    moveButtons.forEach((button, index) => {
      // Create a clone of the button to remove existing event listeners
      const newButton = button.cloneNode(true) as HTMLElement;
      if (button.parentNode) {
        button.parentNode.replaceChild(newButton, button);
      }
      
      newButton.addEventListener('mouseenter', () => {
        const messageDisplay = this.battleUIManager.getMessageDisplay();
        if (messageDisplay && this.playerPokemon && this.playerPokemon.moves) {
          const move = this.playerPokemon.moves[index];
          let moveName = move.name;
          if (moveName === `Move ${move.move_id}`) {
            moveName = BattleUtils.formatMoveName(move.move_id);
          }
          
          // Capitalize move name
          moveName = moveName.charAt(0).toUpperCase() + moveName.slice(1);
          
          messageDisplay.textContent = move.description || `${moveName} - Power: ${move.power || 'N/A'}, Accuracy: ${move.accuracy}`;
        }
      });
      
      newButton.addEventListener('mouseleave', () => {
        const messageDisplay = this.battleUIManager.getMessageDisplay();
        if (messageDisplay) {
          messageDisplay.textContent = 'Select a move:';
        }
      });
      
      newButton.addEventListener('click', () => {
        this.handleMoveSelection(index);
      });
    });
  }
  
  /**
   * Show battle end screen with results
   */
  public showBattleEndScreen(
    outcome: 'win' | 'loss' | 'run' | 'capture', 
    reason: string, 
    expGained: number = 0, 
    pokemonCaptured: any = null
  ): void {
    if (!this.isInBattle) return;
    
    // Show the battle end screen via the UI manager
    this.battleUIManager.showBattleEndScreen(outcome, reason, expGained, pokemonCaptured);
    
    // Add continue button
    const resultsContainer = this.battleUIManager.getBattleContainer()?.querySelector('.battle-results-container');
    if (resultsContainer) {
      const continueButton = document.createElement('button');
      continueButton.className = 'continue-button';
      continueButton.textContent = 'Continue';
      continueButton.addEventListener('click', () => {
        this.endBattle(outcome);
      });
      
      resultsContainer.appendChild(continueButton);
    }
    
    // Restore normal music with a slight delay
    if (this.audioManager) {
      setTimeout(() => {
        this.audioManager?.playNormalMusic();
      }, 500);
    }
  }
  
  /**
   * Check if currently in a battle
   */
  public get inBattle(): boolean {
    return this.isInBattle;
  }
  
  /**
   * Clean up resources
   */
  public cleanUp(): void {
    this.battleUIManager.cleanUp();
    this.battleEventProcessor.clearEventQueue();
    
    // Restore normal music if we're still in battle
    if (this.isInBattle && this.audioManager) {
      this.audioManager.playNormalMusic();
    }
    
    this.isInBattle = false;
    this.battleId = null;
    this.playerPokemon = null;
    this.wildPokemon = null;
    this.playerTeam = [];
    this.fieldState = null;
  }
  
  // Getter that returns the underlying value
  private get opponentPokemon(): BattlePokemonState | null {
    return this._opponentPokemon;
  }
  
  // Setter that logs when the value is updated
  private set opponentPokemon(value: BattlePokemonState | null) {
    console.log('[BattleManager] Setting opponentPokemon:', value);
    this._opponentPokemon = value;
  }
  
  /**
   * Get the player1 ID
   */
  public getPlayer1Id(): string {
    return this.player1Id;
  }
  
  /**
   * Get the player2 ID
   */
  public getPlayer2Id(): string {
    return this.player2Id;
  }
  
  /**
   * Get the local player ID
   */
  public getPlayerId(): string {
    return this.playerId;
  }
  
  /**
   * Check if the local player is player1
   */
  public isPlayer1(): boolean {
    return this.playerId === this.player1Id;
  }
} 