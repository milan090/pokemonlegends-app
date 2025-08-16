import { BattleEvent, BattlePokemonState, TeamPokemonState, BattleEntityRef } from '../../types/battle.types';
import { BattleAnimationManager } from './BattleAnimationManager';
import { BattleUIManager } from './BattleUIManager'
import { BattleManager } from './BattleManager';

/**
 * Processes battle events and updates UI accordingly
 */
export class BattleEventProcessor {
  private eventQueue: BattleEvent[] = [];
  private processingEvents: boolean = false;
  private eventProcessingDelay: number = 1500; // Default delay between events in ms
  private battleManager: BattleManager | null = null;
  
  constructor(
    private battleUIManager: BattleUIManager,
    private playerPokemonRef: () => BattlePokemonState | null,
    private wildPokemonRef: () => BattlePokemonState | null,
    private playerTeamRef: () => TeamPokemonState[],
    private onEventProcessingComplete: () => void,
    private opponentPokemonRef?: () => BattlePokemonState | null, // Optional for PvP battles
    private isPvPBattle?: () => boolean
  ) {}
  
  /**
   * Set the battle manager reference for accessing player IDs in PvP battles
   */
  public setBattleManager(battleManager: BattleManager): void {
    this.battleManager = battleManager;
  }
  
  /**
   * Queue battle events for processing
   */
  public queueEvents(events: BattleEvent[]): void {
    // Log event queue details
    console.log(`Queuing ${events.length} battle events. Current queue: ${this.eventQueue.length}`);
    
    // Add events to the queue
    this.eventQueue = [...this.eventQueue, ...events];
    
    // Start processing events if not already processing
    if (!this.processingEvents) {
      this.processNextEvent();
    } else {
      console.log('Already processing events, new events added to queue');
    }
    
    // If there are no events at all, manually trigger completion
    if (this.eventQueue.length === 0 && !this.processingEvents) {
      console.log('No events to process, triggering completion callback');
      this.onEventProcessingComplete();
    }
  }
  
  /**
   * Clear all queued events
   */
  public clearEventQueue(): void {
    console.log(`Clearing event queue with ${this.eventQueue.length} events`);
    this.eventQueue = [];
    this.processingEvents = false;
  }
  
  /**
   * Process the next event in the queue
   */
  private processNextEvent(): void {
    if (this.eventQueue.length === 0) {
      this.processingEvents = false;
      console.log('All events processed, calling completion callback');
      this.onEventProcessingComplete();
      return;
    }

    this.processingEvents = true;
    const event = this.eventQueue.shift();
    if (!event) return;

    // Log event processing
    console.log(`Processing battle event: ${event.event_type}`);
    
    // Process the event based on its type
    this.processBattleEvent(event);

    // Schedule processing of next event
    setTimeout(() => this.processNextEvent(), this.eventProcessingDelay);
  }
  
  /**
   * Process a single battle event
   */
  private processBattleEvent(event: BattleEvent): void {
    const messageDisplay = this.battleUIManager.getMessageDisplay();
    if (!messageDisplay) return;

    switch (event.event_type) {
      case 'turn_start':
        // Handle turn start event
        const turnNumber = event.details.turn_number;
        console.log(`Processing turn_start event for turn ${turnNumber}`);
        
        // You might want to display a turn start message or update UI elements
        // that depend on the turn number
        messageDisplay.textContent = `Turn ${turnNumber} begins!`;
        break;

      case 'generic_message':
        // Handle generic message event - remove "Turn X:" prefix if present
        let message = event.details.message;
        message = message.replace(/^Turn \d+: /, '');
        messageDisplay.textContent = message;
        break;

      case 'move_used':
        // Handle move used event
        const moveDetails = event.details;
        const source = moveDetails.source;
        const moveId = moveDetails.move_id;
        const moveName = moveDetails.move_name || `Move ${moveId}`;
        
        // Determine source name based on entity type
        let sourceName = 'Unknown';
        if (source.entity_type === 'player') {
          const playerPokemon = this.playerPokemonRef();
          if (playerPokemon) {
            sourceName = playerPokemon.name.charAt(0).toUpperCase() + playerPokemon.name.slice(1);
          }
        } else if (source.entity_type === 'wild') {
          const wildPokemon = this.wildPokemonRef();
          if (wildPokemon) {
            sourceName = wildPokemon.name.charAt(0).toUpperCase() + wildPokemon.name.slice(1);
          }
        } else if ((source.entity_type === 'player1' || source.entity_type === 'player2') && this.opponentPokemonRef) {
          const opponentPokemon = this.opponentPokemonRef();
          if (opponentPokemon) {
            sourceName = opponentPokemon.name.charAt(0).toUpperCase() + opponentPokemon.name.slice(1);
          }
        }
        
        // Format move name (capitalize first letter)
        const formattedMoveName = moveName.charAt(0).toUpperCase() + moveName.slice(1);
        
        // Display move message
        // Note: We might already have shown this message via a generic_message event,
        // but we'll handle it here anyway as a fallback
        messageDisplay.textContent = `${sourceName} used ${formattedMoveName}!`;
        
        // In a full implementation, we could also play the move animation here
        break;

      case 'damage_dealt':
        // Handle damage dealt event - display effectiveness message first, then animate HP
        const target = event.details.target;
        const effectiveness = event.details.effectiveness;
        const isCritical = event.details.is_critical;
        
        // Display effectiveness message based on value
        let effectivenessText = '';
        if (effectiveness > 1) {
          effectivenessText = 'It\'s super effective!';
        } else if (effectiveness < 1 && effectiveness > 0) {
          effectivenessText = 'It\'s not very effective...';
        } else if (effectiveness === 0) {
          effectivenessText = 'It has no effect...';
        }
        
        if (effectivenessText) {
          messageDisplay.textContent = effectivenessText;
        } else if (isCritical) {
          messageDisplay.textContent = 'A critical hit!';
        }
        
        // Store damage details for delayed HP update
        const damageDetails = {
          targetType: target.entity_type,
          // Only include team_index if the target has it
          ...(target.entity_type !== 'wild' && { teamIndex: target.team_index }),
          newHp: event.details.new_hp,
          maxHp: event.details.max_hp
        };
        
        console.log(`Processing damage_dealt event for ${target.entity_type}`, damageDetails);
        
        // Delay the HP bar animation to allow message to be seen first
        setTimeout(() => {
          // For PvP battles, determine which player's Pokémon to update based on entity_type and player IDs
          if (this.isInPvPBattle()) {
            const isPlayer1 = this.battleManager?.isPlayer1() || false;
            
            // Player1 damage handling
            if (target.entity_type === 'player1') {
              if (isPlayer1) {
                // Player1 is the local player - update player HP
                this.updateLocalPlayerHp(damageDetails);
              } else {
                // Player1 is the opponent - update opponent HP
                this.updateOpponentHp(damageDetails);
              }
            }
            // Player2 damage handling
            else if (target.entity_type === 'player2') {
              if (!isPlayer1) {
                // Player2 is the local player - update player HP
                this.updateLocalPlayerHp(damageDetails);
              } else {
                // Player2 is the opponent - update opponent HP
                this.updateOpponentHp(damageDetails);
              }
            }
          } 
          // For wild battles or non-PvP scenarios, use the original logic
          else {
            if (damageDetails.targetType === 'player') {
              // Update player Pokemon HP
              this.updateLocalPlayerHp(damageDetails);
            } else if (damageDetails.targetType === 'wild') {
              // Update wild Pokemon HP
              this.updateWildPokemonHp(damageDetails);
            } else if ((damageDetails.targetType === 'player1' || damageDetails.targetType === 'player2') && this.opponentPokemonRef) {
              // Update opponent Pokemon HP (PvP battle)
              this.updateOpponentHp(damageDetails);
            }
          }
          
          // Update Pokemon info after animation
          this.battleUIManager.updatePokemonInfo();
        }, 300); // 300ms delay before HP reduction
        break;

      case 'heal':
        // Handle heal event
        const targetForHeal = event.details.target;
        const healAmount = event.details.amount;
        
        let targetNameForHeal;
        
        // Determine the name of the healing target based on entity type and PvP status
        if (this.isInPvPBattle()) {
          const isPlayer1 = this.battleManager?.isPlayer1() || false;
          
          if (targetForHeal.entity_type === 'player1') {
            if (isPlayer1) {
              // Player1 is local player
              targetNameForHeal = this.playerPokemonRef()?.name;
            } else {
              // Player1 is opponent
              targetNameForHeal = this.opponentPokemonRef?.()?.name;
            }
          } else if (targetForHeal.entity_type === 'player2') {
            if (!isPlayer1) {
              // Player2 is local player
              targetNameForHeal = this.playerPokemonRef()?.name;
            } else {
              // Player2 is opponent
              targetNameForHeal = this.opponentPokemonRef?.()?.name;
            }
          }
        } else {
          // Original non-PvP handling
          if (targetForHeal.entity_type === 'player') {
            targetNameForHeal = this.playerTeamRef().find(p => p.team_index === targetForHeal.team_index)?.name;
          } else if (targetForHeal.entity_type === 'wild') {
            targetNameForHeal = this.wildPokemonRef()?.name;
          } else if ((targetForHeal.entity_type === 'player1' || targetForHeal.entity_type === 'player2') && this.opponentPokemonRef) {
            targetNameForHeal = this.opponentPokemonRef()?.name;
          }
        }

        if (targetNameForHeal) {
          targetNameForHeal = targetNameForHeal.charAt(0).toUpperCase() + targetNameForHeal.slice(1);
          messageDisplay.textContent = `${targetNameForHeal} recovered ${healAmount} HP!`;
        }
        
        // Update HP bars
        if (this.isInPvPBattle()) {
          const isPlayer1 = this.battleManager?.isPlayer1() || false;
          
          // Handle heal for player1
          if (targetForHeal.entity_type === 'player1') {
            if (isPlayer1) {
              // Local player is player1
              this.updatePlayerHeal(event.details);
            } else {
              // Opponent is player1
              this.updateOpponentHeal(event.details);
            }
          } 
          // Handle heal for player2
          else if (targetForHeal.entity_type === 'player2') {
            if (!isPlayer1) {
              // Local player is player2
              this.updatePlayerHeal(event.details);
            } else {
              // Opponent is player2
              this.updateOpponentHeal(event.details);
            }
          }
        } else {
          // Original non-PvP handling
          if (targetForHeal.entity_type === 'player') {
            this.updatePlayerHeal(event.details);
          } else if (targetForHeal.entity_type === 'wild') {
            this.updateWildPokemonHeal(event.details);
          } else if ((targetForHeal.entity_type === 'player1' || targetForHeal.entity_type === 'player2') && this.opponentPokemonRef) {
            this.updateOpponentHeal(event.details);
          }
        }
        break;

      case 'status_applied':
        // Handle status applied event
        const targetForStatus = event.details.target;
        const status = event.details.status;
        
        let targetNameForStatus;
        
        // Determine the name of the status target based on entity type and PvP status
        if (this.isInPvPBattle()) {
          const isPlayer1 = this.battleManager?.isPlayer1() || false;
          
          if (targetForStatus.entity_type === 'player1') {
            if (isPlayer1) {
              // Player1 is local player
              targetNameForStatus = this.playerPokemonRef()?.name;
            } else {
              // Player1 is opponent
              targetNameForStatus = this.opponentPokemonRef?.()?.name;
            }
          } else if (targetForStatus.entity_type === 'player2') {
            if (!isPlayer1) {
              // Player2 is local player
              targetNameForStatus = this.playerPokemonRef()?.name;
            } else {
              // Player2 is opponent
              targetNameForStatus = this.opponentPokemonRef?.()?.name;
            }
          }
        } else {
          // Original non-PvP handling
          if (targetForStatus.entity_type === 'player') {
            targetNameForStatus = this.playerTeamRef().find(p => p.team_index === targetForStatus.team_index)?.name;
          } else if (targetForStatus.entity_type === 'wild') {
            targetNameForStatus = this.wildPokemonRef()?.name;
          } else if ((targetForStatus.entity_type === 'player1' || targetForStatus.entity_type === 'player2') && this.opponentPokemonRef) {
            targetNameForStatus = this.opponentPokemonRef()?.name;
          }
        }

        if (targetNameForStatus) {
          targetNameForStatus = targetNameForStatus.charAt(0).toUpperCase() + targetNameForStatus.slice(1);
          messageDisplay.textContent = `${targetNameForStatus} was ${status}!`;
        }
        break;

      case 'pokemon_fainted':
        // Handle Pokemon fainted event
        const faintedTarget = event.details.target;
        
        let faintedName;
        
        // Determine the name of the fainted target based on entity type and PvP status
        if (this.isInPvPBattle()) {
          const isPlayer1 = this.battleManager?.isPlayer1() || false;
          
          if (faintedTarget.entity_type === 'player1') {
            if (isPlayer1) {
              // Player1 is local player
              faintedName = this.playerPokemonRef()?.name;
            } else {
              // Player1 is opponent
              faintedName = this.opponentPokemonRef?.()?.name;
            }
          } else if (faintedTarget.entity_type === 'player2') {
            if (!isPlayer1) {
              // Player2 is local player
              faintedName = this.playerPokemonRef()?.name;
            } else {
              // Player2 is opponent
              faintedName = this.opponentPokemonRef?.()?.name;
            }
          }
        } else {
          // Original non-PvP handling
          if (faintedTarget.entity_type === 'player') {
            faintedName = this.playerTeamRef().find(p => p.team_index === faintedTarget.team_index)?.name;
          } else if (faintedTarget.entity_type === 'wild') {
            faintedName = this.wildPokemonRef()?.name;
          } else if ((faintedTarget.entity_type === 'player1' || faintedTarget.entity_type === 'player2') && this.opponentPokemonRef) {
            faintedName = this.opponentPokemonRef()?.name;
          }
        }

        if (faintedName) {
          faintedName = faintedName.charAt(0).toUpperCase() + faintedName.slice(1);
          messageDisplay.textContent = `${faintedName} fainted!`;
        }
        break;

      case 'switch_in':
        // Handle Pokemon switch_in event - updates the active Pokemon data and UI
        const switchInDetails = event.details;
        const pokemonData = switchInDetails.pokemon_view;
        const teamIndex = switchInDetails.team_index;
        
        console.log(`Processing switch_in event for ${pokemonData.name} (template_id: ${pokemonData.template_id})`, switchInDetails);
        
        // Determine if this is the player's Pokemon or opponent's Pokemon
        let isPlayerPokemon = false;
        
        // For PvP battles, use battle manager to determine player vs opponent
        if (this.isInPvPBattle() && this.battleManager) {
          // Assume player Pokemon for now, but will need to check entity_type
          // in a more complete implementation of switch_in for PvP
          isPlayerPokemon = true;
        } else {
          // For non-PvP, if it's not wild, it's the player's
          isPlayerPokemon = !pokemonData.is_wild;
        }
        
        // Update UI elements based on whose Pokemon is being switched in
        if (isPlayerPokemon) {
          // Update player Pokemon sprite
          const playerSprite = this.battleUIManager.getPlayerPokemonSprite();
          if (playerSprite) {
            playerSprite.src = `/assets/Sprites/FullMonsters/back/${pokemonData.template_id}.png`;
            
            // Handle image loading error
            playerSprite.onerror = () => {
              playerSprite.src = '/assets/Sprites/Icons/0.png'; // Default icon
            };
          }
          
          // Update player Pokemon name and level display
          const pokemonNameElement = this.battleUIManager.getPlayerPokemonNameElement();
          if (pokemonNameElement) {
            const formattedName = pokemonData.name.charAt(0).toUpperCase() + pokemonData.name.slice(1);
            pokemonNameElement.textContent = formattedName;
          }
          
          // Update level in the separate level element
          const playerLevelElement = this.battleUIManager.getPlayerLevelElement();
          if (playerLevelElement) {
            playerLevelElement.textContent = `Lv.${pokemonData.level}`;
          }
          
          // Update player HP display
          const playerHpBar = this.battleUIManager.getPlayerHpBar();
          const playerHpText = this.battleUIManager.getPlayerHpText();
          
          if (playerHpBar) {
            // Set HP bar width based on current HP percentage
            playerHpBar.style.width = `${pokemonData.current_hp_percent * 100}%`;
            
            // Set HP bar color based on HP percentage
            if (pokemonData.current_hp_percent > 0.5) {
              playerHpBar.style.backgroundColor = '#78C850'; // Green
            } else if (pokemonData.current_hp_percent > 0.2) {
              playerHpBar.style.backgroundColor = '#F8D030'; // Yellow
            } else {
              playerHpBar.style.backgroundColor = '#F08030'; // Red
            }
          }
          
          if (playerHpText) {
            // Calculate the current HP from percentage and max HP if not directly available
            // This is different from what we did before - we're making sure to use the actual value
            // when available
            let currentHp;
            if ('current_hp' in pokemonData) {
              currentHp = pokemonData.current_hp; // Use direct value if available
            } else {
              // Otherwise calculate from percentage
              currentHp = Math.round(pokemonData.current_hp_percent * pokemonData.max_hp);
            }
            playerHpText.textContent = `${currentHp}/${pokemonData.max_hp}`;
          }
          
          // Update player Pokemon status display if applicable
          const playerStatusElement = this.battleUIManager.getPlayerStatusElement();
          if (playerStatusElement) {
            if (pokemonData.status) {
              playerStatusElement.textContent = pokemonData.status.toUpperCase();
              playerStatusElement.style.display = 'block';
              
              // Set background color based on status
              switch (pokemonData.status.toLowerCase()) {
                case 'paralyzed':
                  playerStatusElement.style.backgroundColor = '#F8D030'; // Yellow
                  break;
                case 'poisoned':
                  playerStatusElement.style.backgroundColor = '#A040A0'; // Purple
                  break;
                case 'badly_poisoned':
                  playerStatusElement.style.backgroundColor = '#A040A0'; // Purple
                  break;
                case 'burned':
                  playerStatusElement.style.backgroundColor = '#F08030'; // Red
                  break;
                case 'frozen':
                  playerStatusElement.style.backgroundColor = '#98D8D8'; // Light blue
                  break;
                case 'asleep':
                  playerStatusElement.style.backgroundColor = '#A8A878'; // Gray
                  break;
                default:
                  playerStatusElement.style.backgroundColor = '#68A090'; // Default teal
              }
            } else {
              playerStatusElement.style.display = 'none';
            }
          }
        } else {
          // Update opponent/wild Pokemon sprite
          const opponentSprite = this.battleUIManager.getWildPokemonSprite();
          if (opponentSprite) {
            opponentSprite.src = `/assets/Sprites/FullMonsters/front/${pokemonData.template_id}.png`;
            
            // Handle image loading error
            opponentSprite.onerror = () => {
              opponentSprite.src = '/assets/Sprites/Icons/0.png'; // Default icon
            };
          }
          
          // Update opponent/wild Pokemon name and level display
          const pokemonNameElement = this.battleUIManager.getWildPokemonNameElement();
          if (pokemonNameElement) {
            const formattedName = pokemonData.name.charAt(0).toUpperCase() + pokemonData.name.slice(1);
            pokemonNameElement.textContent = formattedName;
          }
          
          // Update level in the separate level element
          const opponentLevelElement = this.battleUIManager.getWildLevelElement();
          if (opponentLevelElement) {
            opponentLevelElement.textContent = `Lv.${pokemonData.level}`;
          }
          
          // Update opponent/wild HP display
          const opponentHpBar = this.battleUIManager.getWildHpBar();
          const opponentHpText = this.battleUIManager.getWildHpText();
          
          if (opponentHpBar) {
            // Set HP bar width based on current HP percentage
            opponentHpBar.style.width = `${pokemonData.current_hp_percent * 100}%`;
            
            // Set HP bar color based on HP percentage
            if (pokemonData.current_hp_percent > 0.5) {
              opponentHpBar.style.backgroundColor = '#78C850'; // Green
            } else if (pokemonData.current_hp_percent > 0.2) {
              opponentHpBar.style.backgroundColor = '#F8D030'; // Yellow
            } else {
              opponentHpBar.style.backgroundColor = '#F08030'; // Red
            }
          }
          
          if (opponentHpText) {
            // Calculate the current HP from percentage and max HP if not directly available
            let currentHp;
            if ('current_hp' in pokemonData) {
              currentHp = pokemonData.current_hp; // Use direct value if available
            } else {
              // Otherwise calculate from percentage
              currentHp = Math.round(pokemonData.current_hp_percent * pokemonData.max_hp);
            }
            opponentHpText.textContent = `${currentHp}/${pokemonData.max_hp}`;
          }
          
          // Update opponent/wild Pokemon status display if applicable
          const opponentStatusElement = this.battleUIManager.getWildStatusElement();
          if (opponentStatusElement) {
            if (pokemonData.status) {
              opponentStatusElement.textContent = pokemonData.status.toUpperCase();
              opponentStatusElement.style.display = 'block';
              
              // Set background color based on status
              switch (pokemonData.status.toLowerCase()) {
                case 'paralyzed':
                  opponentStatusElement.style.backgroundColor = '#F8D030'; // Yellow
                  break;
                case 'poisoned':
                  opponentStatusElement.style.backgroundColor = '#A040A0'; // Purple
                  break;
                case 'badly_poisoned':
                  opponentStatusElement.style.backgroundColor = '#A040A0'; // Purple
                  break;
                case 'burned':
                  opponentStatusElement.style.backgroundColor = '#F08030'; // Red
                  break;
                case 'frozen':
                  opponentStatusElement.style.backgroundColor = '#98D8D8'; // Light blue
                  break;
                case 'asleep':
                  opponentStatusElement.style.backgroundColor = '#A8A878'; // Gray
                  break;
                default:
                  opponentStatusElement.style.backgroundColor = '#68A090'; // Default teal
              }
            } else {
              opponentStatusElement.style.display = 'none';
            }
          }
        }
        
        break;

      case 'pokemon_switched':
        // Handle Pokemon switch event (important for PvP battles)
        const switchDetails = event.details;
        
        // Get the username of the player who switched
        let switcherName = switchDetails.is_opponent ? 
          (this.isPvPBattle?.() ? 'Opponent' : 'Wild') : 
          'You';
        
        if (switchDetails.is_opponent && this.isPvPBattle?.()) {
          messageDisplay.textContent = `${switcherName} sent out ${switchDetails.new_pokemon_name}!`;
          
          // Update opponent Pokemon sprite if it's an opponent switch
          const opponentSprite = this.battleUIManager.getWildPokemonSprite();
          if (opponentSprite) {
            opponentSprite.src = `/assets/Sprites/FullMonsters/front/${switchDetails.new_pokemon_template_id}.png`;
          }
        } else {
          messageDisplay.textContent = `Go! ${switchDetails.new_pokemon_name}!`;
          
          // Update player Pokemon sprite
          const playerSprite = this.battleUIManager.getPlayerPokemonSprite();
          if (playerSprite) {
            playerSprite.src = `/assets/Sprites/FullMonsters/back/${switchDetails.new_pokemon_template_id}.png`;
          }
        }
        break;
    }

    // Update Pokemon info after each event for any other UI elements
    // Skip update for damage_dealt as that's handled in the setTimeout
    if (event.event_type !== 'damage_dealt') {
      this.battleUIManager.updatePokemonInfo();
    }
  }
  
  /**
   * Update local player Pokemon HP
   */
  private updateLocalPlayerHp(damageDetails: any): void {
    const playerPokemon = this.playerPokemonRef();
    const playerHpBar = this.battleUIManager.getPlayerHpBar();
    
    if (playerPokemon && playerHpBar) {
      const newHpPercent = damageDetails.newHp / damageDetails.maxHp;
      playerPokemon.current_hp_percent = newHpPercent;
      playerPokemon.current_hp = damageDetails.newHp;
      playerPokemon.max_hp = damageDetails.maxHp;
      
      // Animate HP bar
      BattleAnimationManager.animateHpBar(playerHpBar, newHpPercent);
    }
  }
  
  /**
   * Update wild Pokemon HP
   */
  private updateWildPokemonHp(damageDetails: any): void {
    const wildPokemon = this.wildPokemonRef();
    const wildHpBar = this.battleUIManager.getWildHpBar();
    
    if (wildPokemon && wildHpBar) {
      const newHpPercent = damageDetails.newHp / damageDetails.maxHp;
      wildPokemon.current_hp_percent = newHpPercent;
      wildPokemon.current_hp = damageDetails.newHp;
      wildPokemon.max_hp = damageDetails.maxHp;
      
      // Animate HP bar
      BattleAnimationManager.animateHpBar(wildHpBar, newHpPercent);
    }
  }
  
  /**
   * Update opponent Pokemon HP in PvP battles
   */
  private updateOpponentHp(damageDetails: any): void {
    if (!this.opponentPokemonRef) return;
    
    const opponentPokemon = this.opponentPokemonRef();
    const opponentHpBar = this.battleUIManager.getWildHpBar(); // Reusing wild HP bar for opponent
    
    if (opponentPokemon && opponentHpBar) {
      console.log(`Updating opponent HP from ${opponentPokemon.current_hp} to ${damageDetails.newHp}`);
      const newHpPercent = damageDetails.newHp / damageDetails.maxHp;
      opponentPokemon.current_hp_percent = newHpPercent;
      opponentPokemon.current_hp = damageDetails.newHp;
      opponentPokemon.max_hp = damageDetails.maxHp;
      
      // Animate HP bar
      BattleAnimationManager.animateHpBar(opponentHpBar, newHpPercent);
    } else {
      console.error('Failed to update opponent HP - missing opponentPokemon or HP bar', {
        opponentPokemon: !!opponentPokemon,
        opponentHpBar: !!opponentHpBar
      });
    }
  }
  
  /**
   * Update player Pokemon HP during a heal event
   */
  private updatePlayerHeal(details: any): void {
    const playerPokemon = this.playerPokemonRef();
    const playerHpBar = this.battleUIManager.getPlayerHpBar();
    
    if (playerPokemon && playerHpBar) {
      const newHpPercent = details.new_hp / details.max_hp;
      playerPokemon.current_hp_percent = newHpPercent;
      playerPokemon.current_hp = details.new_hp;
      playerPokemon.max_hp = details.max_hp;
      
      // Animate HP bar
      BattleAnimationManager.animateHpBar(playerHpBar, newHpPercent);
    }
  }
  
  /**
   * Update wild Pokemon HP during a heal event
   */
  private updateWildPokemonHeal(details: any): void {
    const wildPokemon = this.wildPokemonRef();
    const wildHpBar = this.battleUIManager.getWildHpBar();
    
    if (wildPokemon && wildHpBar) {
      const newHpPercent = details.new_hp / details.max_hp;
      wildPokemon.current_hp_percent = newHpPercent;
      wildPokemon.current_hp = details.new_hp;
      wildPokemon.max_hp = details.max_hp;
      
      // Animate HP bar
      BattleAnimationManager.animateHpBar(wildHpBar, newHpPercent);
    }
  }
  
  /**
   * Update opponent Pokemon HP during a heal event
   */
  private updateOpponentHeal(details: any): void {
    if (!this.opponentPokemonRef) return;
    
    const opponentPokemon = this.opponentPokemonRef();
    const opponentHpBar = this.battleUIManager.getWildHpBar(); // Reuse wild bar for opponent
    
    if (opponentPokemon && opponentHpBar) {
      const newHpPercent = details.new_hp / details.max_hp;
      opponentPokemon.current_hp_percent = newHpPercent;
      opponentPokemon.current_hp = details.new_hp;
      opponentPokemon.max_hp = details.max_hp;
      
      // Animate HP bar
      BattleAnimationManager.animateHpBar(opponentHpBar, newHpPercent);
    }
  }
  
  /**
   * Helper to safely check if we're in a PvP battle
   */
  private isInPvPBattle(): boolean {
    return !!(this.isPvPBattle && this.isPvPBattle() && this.battleManager);
  }
  
  /**
   * Check if events are being processed
   */
  public get isProcessingEvents(): boolean {
    return this.processingEvents;
  }
} 