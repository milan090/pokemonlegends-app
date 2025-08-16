import { BattlePokemonState, TeamPokemonState } from '../../types/battle.types';
import { BattleUtils } from '../../utils/battle/BattleUtils';

/**
 * Manages the battle UI elements
 */
export class BattleUIManager {
  private battleContainer: HTMLElement | null = null;
  private messageDisplay: HTMLElement | null = null;
  
  // Battle UI elements
  private battleBackground: HTMLImageElement | null = null;
  private playerPokemonSprite: HTMLImageElement | null = null;
  private wildPokemonSprite: HTMLImageElement | null = null;
  private playerHpBar: HTMLElement | null = null;
  private wildHpBar: HTMLElement | null = null;
  private moveButtons: HTMLElement[] = [];
  private actionButtons: HTMLElement[] = [];
  private isPvPBattle: boolean = false; // Add flag for PvP battles
  
  constructor(
    private playerPokemonRef: () => BattlePokemonState | null,
    private wildPokemonRef: () => BattlePokemonState | null,
    private opponentPokemonRef?: () => BattlePokemonState | null
  ) {
    this.createBattleContainer();
  }
  
  /**
   * Creates the battle UI container (but doesn't show it yet)
   */
  private createBattleContainer(): void {
    // If the container already exists, remove it
    if (document.getElementById('battle-container')) {
      document.getElementById('battle-container')?.remove();
    }
    
    if (document.getElementById('battle-overlay')) {
      document.getElementById('battle-overlay')?.remove();
    }
    
    // Find the game container to properly position the battle modal
    const gameContainer = document.getElementById('game-container');
    
    // Create a semi-transparent overlay to darken the game area
    const overlay = document.createElement('div');
    overlay.id = 'battle-overlay';
    
    // Create the battle container with proper modal styling
    const battleContainer = document.createElement('div');
    battleContainer.id = 'battle-container';
    
    // If we found the game container, append battle container to it
    // Otherwise, append to body as fallback
    if (gameContainer) {
      gameContainer.appendChild(overlay);
      gameContainer.appendChild(battleContainer);
    } else {
      document.body.appendChild(overlay);
      document.body.appendChild(battleContainer);
    }
    
    this.battleContainer = battleContainer;
  }
  
  /**
   * Shows the battle UI
   */
  public showBattleUI(): void {
    if (!this.battleContainer) return;
    
    // Set PvP flag to false for wild battles ONLY if not already set to true
    if (!this.isPvPBattle) {
      this.isPvPBattle = false;
    }
    
    // Show the overlay
    const overlay = document.getElementById('battle-overlay');
    if (overlay) {
      overlay.style.display = 'block';
    }
    
    // Show the battle container with slight animation
    this.battleContainer.style.display = 'flex';
    this.battleContainer.style.opacity = '0';
    this.battleContainer.style.transform = 'translate(-50%, -48%)';
    this.battleContainer.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
    
    // Trigger animation
    setTimeout(() => {
      if (this.battleContainer) {
        this.battleContainer.style.opacity = '1';
        this.battleContainer.style.transform = 'translate(-50%, -50%)';
      }
    }, 10);
    
    // Clear any existing content
    this.battleContainer.innerHTML = '';
    
    // Create the battle UI layout
    this.createBattleLayout();
    
    // Update the Pokemon information
    this.updatePokemonInfo();
  }
  
  /**
   * Shows the PvP battle UI with opponent information
   */
  public showPvPBattleUI(opponentUsername: string): void {
    if (!this.battleContainer) return;
    
    console.log('[BattleUIManager] Entering showPvPBattleUI with opponent:', opponentUsername);
    console.log('[BattleUIManager] Current opponentPokemonRef:', this.opponentPokemonRef);
    if (this.opponentPokemonRef) {
      const opponentPokemon = this.opponentPokemonRef();
      console.log('[BattleUIManager] Opponent Pokemon data:', opponentPokemon);
    } else {
      console.error('[BattleUIManager] opponentPokemonRef is not defined!');
    }
    
    // Set PvP flag to true BEFORE showing the battle UI
    this.isPvPBattle = true;
    
    // First show the regular battle UI
    this.showBattleUI();
    
    // Change the background to PvP battle background
    if (this.battleBackground) {
      this.battleBackground.src = '/assets/combat-bg.jpg';
    }
    
    // Then add the opponent info
    if (this.battleContainer && opponentUsername) {
      // Add a versus banner at the top
      const versusBanner = document.createElement('div');
      versusBanner.className = 'versus-banner';
      
      // Get the player's username
      const playerUsername = localStorage.getItem('username') || 'Player';
      
      // Create the VS text
      versusBanner.innerHTML = `
        <div class="player-name">${playerUsername}</div>
        <div class="vs-text">VS</div>
        <div class="opponent-name">${opponentUsername}</div>
      `;
      
      // Add custom styling
      versusBanner.style.position = 'absolute';
      versusBanner.style.top = '10px';
      versusBanner.style.left = '0';
      versusBanner.style.width = '100%';
      versusBanner.style.display = 'flex';
      versusBanner.style.justifyContent = 'center';
      versusBanner.style.alignItems = 'center';
      versusBanner.style.color = 'white';
      versusBanner.style.fontFamily = 'Inter, Arial, sans-serif';
      versusBanner.style.fontWeight = 'bold';
      versusBanner.style.fontSize = '18px';
      versusBanner.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.7)';
      versusBanner.style.zIndex = '50';
      
      // Add styles for child elements
      const playerName = versusBanner.querySelector('.player-name');
      if (playerName) {
        (playerName as HTMLElement).style.color = '#99ccff';
        (playerName as HTMLElement).style.padding = '5px 15px';
        (playerName as HTMLElement).style.borderRadius = '15px';
        (playerName as HTMLElement).style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
      }
      
      const opponentNameEl = versusBanner.querySelector('.opponent-name');
      if (opponentNameEl) {
        (opponentNameEl as HTMLElement).style.color = '#ff9999';
        (opponentNameEl as HTMLElement).style.padding = '5px 15px';
        (opponentNameEl as HTMLElement).style.borderRadius = '15px';
        (opponentNameEl as HTMLElement).style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
      }
      
      const vsText = versusBanner.querySelector('.vs-text');
      if (vsText) {
        (vsText as HTMLElement).style.margin = '0 15px';
        (vsText as HTMLElement).style.color = '#ffcc00';
        (vsText as HTMLElement).style.fontSize = '24px';
      }
      
      // Add the banner to the battle container
      this.battleContainer.appendChild(versusBanner);
      
      // Update the wild info box to show it's an opponent's Pokemon
      const wildInfoBox = this.battleContainer.querySelector('.wild-info-box');
      if (wildInfoBox) {
        // Add opponent label
        const opponentLabel = document.createElement('div');
        opponentLabel.className = 'opponent-label';
        opponentLabel.textContent = `${opponentUsername}'s`;
        opponentLabel.style.position = 'absolute';
        opponentLabel.style.top = '-20px';
        opponentLabel.style.left = '10px';
        opponentLabel.style.color = '#ff9999';
        opponentLabel.style.fontSize = '12px';
        opponentLabel.style.fontWeight = 'bold';
        opponentLabel.style.textShadow = '1px 1px 2px rgba(0, 0, 0, 0.8)';
        
        wildInfoBox.appendChild(opponentLabel);
        
        // Update styles to indicate it's a PvP battle
        (wildInfoBox as HTMLElement).style.border = '2px solid #ff9999';
        (wildInfoBox as HTMLElement).style.boxShadow = '0 0 10px rgba(255, 153, 153, 0.5)';
      }
      
      // Update player info box as well
      const playerInfoBox = this.battleContainer.querySelector('.player-info-box');
      if (playerInfoBox) {
        // Add player label
        const playerLabel = document.createElement('div');
        playerLabel.className = 'player-label';
        playerLabel.textContent = `${playerUsername}'s`;
        playerLabel.style.position = 'absolute';
        playerLabel.style.top = '-20px';
        playerLabel.style.right = '10px';
        playerLabel.style.color = '#99ccff';
        playerLabel.style.fontSize = '12px';
        playerLabel.style.fontWeight = 'bold';
        playerLabel.style.textShadow = '1px 1px 2px rgba(0, 0, 0, 0.8)';
        
        playerInfoBox.appendChild(playerLabel);
        
        // Update styles to indicate it's a PvP battle
        (playerInfoBox as HTMLElement).style.border = '2px solid #99ccff';
        (playerInfoBox as HTMLElement).style.boxShadow = '0 0 10px rgba(153, 204, 255, 0.5)';
      }
      
      // Update message to indicate it's a PvP battle
      if (this.messageDisplay) {
        this.messageDisplay.textContent = `${opponentUsername} wants to battle!`;
      }
    }
  }
  
  /**
   * Creates the battle UI layout
   */
  private createBattleLayout(): void {
    if (!this.battleContainer) return;
    
    console.log('[BattleUIManager] Creating battle layout, isPvPBattle:', this.isPvPBattle);
    
    // Battle area (top 2/3)
    const battleArea = document.createElement('div');
    battleArea.className = 'battle-area';
    
    // Battle background with fixed aspect ratio container
    const bgContainer = document.createElement('div');
    bgContainer.className = 'bg-container';
    
    // Battle background
    this.battleBackground = document.createElement('img');
    this.battleBackground.src = '/assets/combat-bg.jpg';
    this.battleBackground.className = 'battle-background';
    bgContainer.appendChild(this.battleBackground);
    battleArea.appendChild(bgContainer);
    
    // Player Pokemon container
    const playerContainer = document.createElement('div');
    playerContainer.className = 'player-pokemon-container';
    
    const playerPokemon = this.playerPokemonRef();
    console.log('[BattleUIManager] Player Pokemon data in createBattleLayout:', playerPokemon);
    
    // Player Pokemon sprite
    this.playerPokemonSprite = document.createElement('img');
    this.playerPokemonSprite.className = 'player-pokemon-sprite';
    if (playerPokemon) {
      this.playerPokemonSprite.src = `/assets/Sprites/FullMonsters/back/${playerPokemon.template_id}.png`;
      // Fallback if back sprite doesn't exist
      this.playerPokemonSprite.onerror = () => {
        if (this.playerPokemonSprite) {
          this.playerPokemonSprite.src = `/assets/Sprites/FullMonsters/front/${playerPokemon.template_id}.png`;
        }
      };
    }
    playerContainer.appendChild(this.playerPokemonSprite);
    
    // Player Pokemon info box
    const playerInfoBox = this.createPokemonInfoBox(true);
    playerInfoBox.className += ' player-info-box';
    battleArea.appendChild(playerInfoBox);
    
    // Select the correct opponent/wild Pokemon based on battle type
    let opponentPokemon = null;
    console.log('[BattleUIManager] isPvPBattle:', this.isPvPBattle);
    console.log('[BattleUIManager] opponentPokemonRef exists:', !!this.opponentPokemonRef);
    
    if (this.isPvPBattle && this.opponentPokemonRef) {
      console.log('[BattleUIManager] Getting opponent Pokemon for PvP battle');
      opponentPokemon = this.opponentPokemonRef();
      console.log('[BattleUIManager] Opponent Pokemon data:', opponentPokemon);
    } else {
      console.log('[BattleUIManager] Getting wild Pokemon for wild battle');
      opponentPokemon = this.wildPokemonRef();
      console.log('[BattleUIManager] Wild Pokemon data:', opponentPokemon);
    }
    
    // Debug opponentPokemon specific properties
    if (opponentPokemon) {
      console.log('[BattleUIManager] Opponent Pokemon properties:', {
        name: opponentPokemon.name,
        template_id: opponentPokemon.template_id,
        level: opponentPokemon.level,
        current_hp: opponentPokemon.current_hp,
        current_hp_percent: opponentPokemon.current_hp_percent
      });
    }
    
    // Wild/Opponent Pokemon container
    const opponentContainer = document.createElement('div');
    // Use different class for styling if needed, but reusing for now
    opponentContainer.className = 'wild-pokemon-container'; 
    
    // Wild/Opponent Pokemon sprite
    this.wildPokemonSprite = document.createElement('img'); 
    this.wildPokemonSprite.className = 'wild-pokemon-sprite';
    if (opponentPokemon) {
      this.wildPokemonSprite.src = `/assets/Sprites/FullMonsters/front/${opponentPokemon.template_id}.png`;
      // Fallback image
      this.wildPokemonSprite.onerror = () => {
        if (this.wildPokemonSprite) {
          console.warn(`Failed to load opponent/wild Pokemon sprite: ${opponentPokemon.template_id}`);
          this.wildPokemonSprite.src = `/assets/Sprites/FullMonsters/front/1.png`;
        }
      };
    } else {
      console.error("No opponent/wild Pokemon data available for sprite", {
        isPvPBattle: this.isPvPBattle,
        hasOpponentRef: !!this.opponentPokemonRef
      });
    }
    opponentContainer.appendChild(this.wildPokemonSprite);
    
    // Wild/Opponent Pokemon info box
    const opponentInfoBox = this.createPokemonInfoBox(false); // false for opponent/wild
    opponentInfoBox.className += ' wild-info-box'; // Keep class for positioning
    battleArea.appendChild(opponentInfoBox);
    
    // Add Pokemon containers to battle area
    battleArea.appendChild(playerContainer); // Player is added after background
    battleArea.appendChild(opponentContainer); // Opponent/Wild is added after background
    
    // Actions area (bottom 1/3)
    const actionsArea = document.createElement('div');
    actionsArea.className = 'actions-area';
    
    // Message display
    const messageDisplay = document.createElement('div');
    messageDisplay.className = 'message-display';
    messageDisplay.textContent = 'What will you do?';
    actionsArea.appendChild(messageDisplay);
    this.messageDisplay = messageDisplay;
    
    // Create actions buttons (Fight, Bag, Pokemon, Run)
    const actionButtonsContainer = document.createElement('div');
    actionButtonsContainer.className = 'action-buttons';
    
    const actions = [
      { name: 'FIGHT', color: '#e74c3c' },
      { name: 'BAG', color: '#3498db' },
      { name: 'POKEMON', color: '#2ecc71' },
      { name: 'RUN', color: '#95a5a6' }
    ];
    
    this.actionButtons = [];
    
    actions.forEach(action => {
      const button = document.createElement('button');
      button.textContent = action.name;
      button.className = 'action-button';
      button.style.backgroundColor = action.color;
      
      actionButtonsContainer.appendChild(button);
      this.actionButtons.push(button);
    });
    
    actionsArea.appendChild(actionButtonsContainer);
    
    // Create moves container (initially hidden)
    const movesContainer = document.createElement('div');
    movesContainer.className = 'moves-container';
    
    this.moveButtons = [];
    
    // Create move buttons
    const playerPokemonState = this.playerPokemonRef();
    if (playerPokemonState && playerPokemonState.moves) {
      playerPokemonState.moves.forEach(move => {
        const moveButton = document.createElement('button');
        moveButton.className = 'move-button';
        const moveTypeColor = BattleUtils.getMoveTypeColor(move.move_type);
        moveButton.style.backgroundColor = moveTypeColor;
        
        // Get a proper move name
        let moveName = move.name;
        if (moveName === `Move ${move.move_id}`) {
          moveName = BattleUtils.formatMoveName(move.move_id);
        }
        
        // Capitalize move name
        moveName = moveName.charAt(0).toUpperCase() + moveName.slice(1);
        
        moveButton.textContent = moveName;
        
        // Add PP text
        const ppText = document.createElement('div');
        ppText.className = 'move-pp';
        ppText.textContent = `PP: ${move.current_pp}/${move.max_pp}`;
        moveButton.appendChild(ppText);
        
        // Add type text
        const typeText = document.createElement('div');
        typeText.className = 'move-type';
        typeText.textContent = move.move_type.toUpperCase();
        moveButton.appendChild(typeText);
        
        movesContainer.appendChild(moveButton);
        this.moveButtons.push(moveButton);
      });
    }
    
    // Back button for moves view
    const backButton = document.createElement('button');
    backButton.textContent = 'BACK';
    backButton.className = 'back-button';
    
    movesContainer.appendChild(backButton);
    actionsArea.appendChild(movesContainer);
    
    // Add areas to battle container
    this.battleContainer.appendChild(battleArea);
    this.battleContainer.appendChild(actionsArea);
  }
  
  /**
   * Creates an info box for a Pokemon (player or wild/opponent)
   */
  private createPokemonInfoBox(isPlayer: boolean): HTMLElement {
    console.log(`[BattleUIManager] Creating info box for ${isPlayer ? 'player' : 'opponent/wild'} Pokemon`);
    console.log(`[BattleUIManager] isPvPBattle:`, this.isPvPBattle);
    console.log(`[BattleUIManager] opponentPokemonRef exists:`, !!this.opponentPokemonRef);
    
    // Determine the correct data source based on isPvPBattle flag and isPlayer
    let pokemon: BattlePokemonState | null = null;
    
    if (isPlayer) {
      // For player, always use playerPokemonRef
      pokemon = this.playerPokemonRef();
      console.log('[BattleUIManager] Player Pokemon data:', pokemon);
    } else {
      // For opponent side, use opponentPokemonRef if it's a PvP battle, otherwise use wildPokemonRef
      if (this.isPvPBattle && this.opponentPokemonRef) {
        console.log('[BattleUIManager] Getting opponent Pokemon data for PvP battle');
        pokemon = this.opponentPokemonRef();
        console.log('[BattleUIManager] Opponent Pokemon data:', pokemon);
      } else {
        console.log('[BattleUIManager] Getting wild Pokemon data for wild battle');
        pokemon = this.wildPokemonRef();
        console.log('[BattleUIManager] Wild Pokemon data:', pokemon);
      }
    }
    
    if (!pokemon) {
      console.error(`Pokemon data not found for info box creation`, {
        isPlayer,
        isPvPBattle: this.isPvPBattle,
        opponentPokemonRefExists: !!this.opponentPokemonRef
      });
      return document.createElement('div'); // Return empty div if no data
    }
    
    // Capitalize Pokemon name
    const pokemonName = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
    
    const infoBox = document.createElement('div');
    infoBox.className = 'pokemon-info-box';
    
    // Pokemon name and level
    const nameContainer = document.createElement('div');
    nameContainer.className = 'name-container';
    
    const nameElement = document.createElement('div');
    nameElement.className = 'pokemon-name';
    nameElement.textContent = pokemonName;
    
    const levelElement = document.createElement('div');
    levelElement.className = 'pokemon-level';
    levelElement.textContent = `Lv.${pokemon.level}`;
    
    nameContainer.appendChild(nameElement);
    nameContainer.appendChild(levelElement);
    infoBox.appendChild(nameContainer);
    
    // HP bar container
    const hpContainer = document.createElement('div');
    hpContainer.className = 'hp-container';
    
    // HP text
    const hpText = document.createElement('div');
    hpText.className = 'hp-text';
    hpText.textContent = 'HP';
    hpContainer.appendChild(hpText);
    
    // HP bar background
    const hpBarBg = document.createElement('div');
    hpBarBg.className = 'hp-bar-bg';
    
    // HP bar fill
    const hpBar = document.createElement('div');
    hpBar.className = 'hp-bar';
    hpBar.style.width = `${pokemon.current_hp_percent * 100}%`;
    hpBar.style.backgroundColor = BattleUtils.getHpColor(pokemon.current_hp_percent);
    hpBarBg.appendChild(hpBar);
    
    hpContainer.appendChild(hpBarBg);
    
    // HP text (current/max) - Show only for the player
    if (isPlayer) {
      const hpValues = document.createElement('div');
      hpValues.className = 'hp-values';
      hpValues.textContent = `${pokemon.current_hp}/${pokemon.max_hp}`;
      hpContainer.appendChild(hpValues);
    }
    
    infoBox.appendChild(hpContainer);
    
    // Store references to the HP bars for updates
    if (isPlayer) {
      this.playerHpBar = hpBar;
    } else {
      this.wildHpBar = hpBar; // Still using wildHpBar element for opponent
    }
    
    // Add status if exists
    if (pokemon.status) {
      const statusElement = document.createElement('div');
      statusElement.className = 'status-element';
      statusElement.textContent = pokemon.status.toUpperCase();
      statusElement.style.backgroundColor = BattleUtils.getStatusColor(pokemon.status);
      infoBox.appendChild(statusElement);
    }
    
    return infoBox;
  }
  
  /**
   * Updates the battle UI with the latest Pokemon information
   */
  public updatePokemonInfo(): void {
    const playerPokemon = this.playerPokemonRef();
    
    // Select correct data source for opponent side based on isPvPBattle flag
    let opponentOrWildPokemon = null;
    if (this.isPvPBattle && this.opponentPokemonRef) {
      opponentOrWildPokemon = this.opponentPokemonRef();
    } else {
      opponentOrWildPokemon = this.wildPokemonRef();
    }
    
    // Update player Pokemon info
    if (playerPokemon && this.playerHpBar) {
      const playerInfoBox = this.battleContainer?.querySelector('.player-info-box');
      const hpValues = playerInfoBox?.querySelector('.hp-values');
      if (hpValues) {
        hpValues.textContent = `${playerPokemon.current_hp}/${playerPokemon.max_hp}`;
      }
      this.playerHpBar.style.width = `${playerPokemon.current_hp_percent * 100}%`;
      this.playerHpBar.style.backgroundColor = BattleUtils.getHpColor(playerPokemon.current_hp_percent);
      // Update status indicator if needed
      this.updateStatusIndicator(playerInfoBox, playerPokemon.status);
    }
    
    // Update opponent/wild Pokemon info
    if (opponentOrWildPokemon && this.wildHpBar) {
      const opponentInfoBox = this.battleContainer?.querySelector('.wild-info-box');
      this.wildHpBar.style.width = `${opponentOrWildPokemon.current_hp_percent * 100}%`;
      this.wildHpBar.style.backgroundColor = BattleUtils.getHpColor(opponentOrWildPokemon.current_hp_percent);
      // Update status indicator if needed
      this.updateStatusIndicator(opponentInfoBox, opponentOrWildPokemon.status);
      
      // Update opponent name if it changed (e.g., due to switch)
      const opponentNameEl = opponentInfoBox?.querySelector('.pokemon-name');
      if (opponentNameEl) {
        opponentNameEl.textContent = opponentOrWildPokemon.name.charAt(0).toUpperCase() + opponentOrWildPokemon.name.slice(1);
      }
      const opponentLevelEl = opponentInfoBox?.querySelector('.pokemon-level');
      if (opponentLevelEl) {
        opponentLevelEl.textContent = `Lv.${opponentOrWildPokemon.level}`;
      }
    }
  }

  /**
   * Helper function to update or add/remove status indicator
   */
  private updateStatusIndicator(infoBox: Element | null | undefined, status: string | null): void {
    if (!infoBox) return;
    
    let statusElement = infoBox.querySelector('.status-element') as HTMLElement;
    
    if (status) {
      if (!statusElement) {
        statusElement = document.createElement('div');
        statusElement.className = 'status-element';
        infoBox.appendChild(statusElement);
      }
      statusElement.textContent = status.toUpperCase();
      statusElement.style.backgroundColor = BattleUtils.getStatusColor(status);
      statusElement.style.display = 'inline-block'; // Make sure it's visible
    } else if (statusElement) {
      statusElement.style.display = 'none'; // Hide if no status
    }
  }
  
  /**
   * Show the battle end screen
   */
  public showBattleEndScreen(outcome: string, reason: string, expGained: number, pokemonCaptured: any): void {
    if (!this.battleContainer) return;
    
    console.log(`Showing battle end screen: ${outcome} - ${reason}, EXP: ${expGained}, Captured: ${pokemonCaptured}`);
    
    // Hide existing battle UI elements
    const actionButtonsContainer = this.battleContainer.querySelector('.action-buttons') as HTMLElement;
    const movesContainer = this.battleContainer.querySelector('.moves-container') as HTMLElement;
    const switchContainer = this.battleContainer.querySelector('.switch-container') as HTMLElement;
    const bagContainer = this.battleContainer.querySelector('.bag-container') as HTMLElement;
    
    if (actionButtonsContainer) actionButtonsContainer.style.display = 'none';
    if (movesContainer) movesContainer.style.display = 'none';
    if (switchContainer) switchContainer.remove();
    if (bagContainer) bagContainer.remove();
    
    // Create results container
    const resultsContainer = document.createElement('div');
    resultsContainer.className = 'battle-results-container';
    
    // Add outcome message
    const outcomeMessage = document.createElement('div');
    outcomeMessage.className = 'outcome-message';
    
    let outcomeText = '';
    switch (outcome) {
      case 'victory':
        outcomeText = 'You won the battle!';
        break;
      case 'defeat':
        outcomeText = 'You were defeated!';
        break;
      case 'capture':
        outcomeText = 'You caught a Pokémon!';
        break;
      case 'escape':
        outcomeText = 'You escaped successfully!';
        break;
      default:
        outcomeText = 'The battle has ended.';
    }
    
    outcomeMessage.textContent = outcomeText;
    resultsContainer.appendChild(outcomeMessage);
    
    // Add EXP gained message if applicable
    if (expGained > 0) {
      const expMessage = document.createElement('div');
      expMessage.className = 'exp-message';
      expMessage.textContent = `Experience gained: ${expGained}`;
      resultsContainer.appendChild(expMessage);
    }
    
    // Add captured Pokemon details if applicable
    if (pokemonCaptured) {
      const captureMessage = document.createElement('div');
      captureMessage.className = 'capture-message';
      
      const pokemonName = pokemonCaptured.name.charAt(0).toUpperCase() + pokemonCaptured.name.slice(1);
      captureMessage.textContent = `You caught a ${pokemonName}!`;
      
      // Add Pokemon image if available
      const pokemonImage = document.createElement('img');
      pokemonImage.className = 'captured-pokemon-image';
      pokemonImage.src = `/assets/Sprites/FullMonsters/front/${pokemonCaptured.template_id}.png`;
      pokemonImage.onerror = () => {
        pokemonImage.src = `/assets/Sprites/FullMonsters/front/1.png`; // Default image
      };
      
      resultsContainer.appendChild(captureMessage);
      resultsContainer.appendChild(pokemonImage);
    }
    
    // Add areas to battle container
    const actionsArea = this.battleContainer.querySelector('.actions-area');
    if (actionsArea) {
      // Update the message
      if (this.messageDisplay) {
        this.messageDisplay.textContent = outcomeText;
      }
      
      // Add results container
      actionsArea.appendChild(resultsContainer);
    }
  }
  
  /**
   * Hide the battle UI with an animation
   */
  public hideBattleUI(): void {
    // Hide battle UI with fade out
    if (this.battleContainer) {
      this.battleContainer.style.transition = 'opacity 0.4s ease-in-out, transform 0.4s ease-in-out';
      this.battleContainer.style.opacity = '0';
      this.battleContainer.style.transform = 'translate(-50%, -48%)';
      
      // Hide overlay
      const overlay = document.getElementById('battle-overlay');
      if (overlay) {
        overlay.style.transition = 'opacity 0.4s ease-in-out';
        overlay.style.opacity = '0';
      }
      
      setTimeout(() => {
        if (this.battleContainer) {
          this.battleContainer.style.display = 'none';
          this.battleContainer.style.opacity = '1';
          this.battleContainer.style.transform = 'translate(-50%, -50%)';
          this.battleContainer.style.transition = '';
        }
        
        // Hide overlay
        if (overlay) {
          overlay.style.display = 'none';
          overlay.style.opacity = '1';
          overlay.style.transition = '';
        }
      }, 400);
    }
  }
  
  /**
   * Clean up resources
   */
  public cleanUp(): void {
    // Remove overlay first
    const overlay = document.getElementById('battle-overlay');
    if (overlay && overlay.parentElement) {
      overlay.parentElement.removeChild(overlay);
    } else if (overlay && document.body.contains(overlay)) {
      document.body.removeChild(overlay);
    }
    
    // Then remove battle container
    if (this.battleContainer) {
      // Remove the battle container from its parent
      if (this.battleContainer.parentElement) {
        this.battleContainer.parentElement.removeChild(this.battleContainer);
      } else if (document.body.contains(this.battleContainer)) {
        document.body.removeChild(this.battleContainer);
      }
    }
    
    this.battleContainer = null;
    this.battleBackground = null;
    this.playerPokemonSprite = null;
    this.wildPokemonSprite = null;
    this.playerHpBar = null;
    this.wildHpBar = null;
    this.moveButtons = [];
    this.actionButtons = [];
  }
  
  /**
   * Get the message display element
   */
  public getMessageDisplay(): HTMLElement | null {
    return this.messageDisplay;
  }
  
  /**
   * Get the player HP bar element
   */
  public getPlayerHpBar(): HTMLElement | null {
    return this.playerHpBar;
  }
  
  /**
   * Get the wild Pokemon HP bar element
   */
  public getWildHpBar(): HTMLElement | null {
    return this.wildHpBar;
  }
  
  /**
   * Get the action buttons
   */
  public getActionButtons(): HTMLElement[] {
    return this.actionButtons;
  }
  
  /**
   * Update the action buttons array with new references after cloning
   */
  public updateActionButtons(newButtons: HTMLElement[]): void {
    this.actionButtons = newButtons;
  }
  
  /**
   * Get the move buttons
   */
  public getMoveButtons(): HTMLElement[] {
    return this.moveButtons;
  }
  
  /**
   * Get the battle container element
   */
  public getBattleContainer(): HTMLElement | null {
    return this.battleContainer;
  }
  
  /**
   * Get the wild Pokemon sprite
   */
  public getWildPokemonSprite(): HTMLImageElement | null {
    return this.wildPokemonSprite;
  }
  
  /**
   * Get the player Pokemon sprite
   */
  public getPlayerPokemonSprite(): HTMLImageElement | null {
    return this.playerPokemonSprite;
  }
  
  /**
   * Get the player Pokemon name element
   */
  public getPlayerPokemonNameElement(): HTMLElement | null {
    const playerInfoBox = this.battleContainer?.querySelector('.player-info-box');
    return playerInfoBox?.querySelector('.pokemon-name') as HTMLElement | null;
  }
  
  /**
   * Get the wild/opponent Pokemon name element
   */
  public getWildPokemonNameElement(): HTMLElement | null {
    const wildInfoBox = this.battleContainer?.querySelector('.wild-info-box');
    return wildInfoBox?.querySelector('.pokemon-name') as HTMLElement | null;
  }
  
  /**
   * Get the player HP text element
   */
  public getPlayerHpText(): HTMLElement | null {
    const playerInfoBox = this.battleContainer?.querySelector('.player-info-box');
    return playerInfoBox?.querySelector('.hp-values') as HTMLElement | null;
  }
  
  /**
   * Get the wild/opponent HP text element
   */
  public getWildHpText(): HTMLElement | null {
    const wildInfoBox = this.battleContainer?.querySelector('.wild-info-box');
    return wildInfoBox?.querySelector('.hp-values') as HTMLElement | null;
  }
  
  /**
   * Get the player status element
   */
  public getPlayerStatusElement(): HTMLElement | null {
    const playerInfoBox = this.battleContainer?.querySelector('.player-info-box');
    return playerInfoBox?.querySelector('.status-element') as HTMLElement | null;
  }
  
  /**
   * Get the wild/opponent status element
   */
  public getWildStatusElement(): HTMLElement | null {
    const wildInfoBox = this.battleContainer?.querySelector('.wild-info-box');
    return wildInfoBox?.querySelector('.status-element') as HTMLElement | null;
  }
  
  /**
   * Get the player level element
   */
  public getPlayerLevelElement(): HTMLElement | null {
    const playerInfoBox = this.battleContainer?.querySelector('.player-info-box');
    return playerInfoBox?.querySelector('.pokemon-level') as HTMLElement | null;
  }
  
  /**
   * Get the wild/opponent level element
   */
  public getWildLevelElement(): HTMLElement | null {
    const wildInfoBox = this.battleContainer?.querySelector('.wild-info-box');
    return wildInfoBox?.querySelector('.pokemon-level') as HTMLElement | null;
  }
} 