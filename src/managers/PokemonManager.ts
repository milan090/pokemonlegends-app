import { Scene } from 'phaser';
import { Pokemon } from '../types/pokemon.types';
import { MultiplayerManager } from '../scenes/MultiplayerManager';

/**
 * Manages the player's Pokemon collection and provides methods for displaying them in the UI
 */
export class PokemonManager {
  private scene: Scene;
  private activePokemons: Pokemon[] = [];
  private pokemonSprites: { [id: string]: Phaser.GameObjects.Sprite } = {};
  private pokemonLabels: { [id: string]: Phaser.GameObjects.Text } = {};
  private rightPanel: HTMLElement | null = null;
  private wsService: any; // WebSocketService reference
  private loadingModal: HTMLDivElement | null = null;
  private multiplayerManager: MultiplayerManager | null = null;
  
  constructor(scene: Scene) {
    this.scene = scene;
    this.rightPanel = document.querySelector('.right-panel');
    
    // If the right panel exists, update its title
    if (this.rightPanel) {
      const panelTitle = this.rightPanel.querySelector('.panel-title');
      if (panelTitle) {
        panelTitle.textContent = 'Your Pokemon';
      }
    }
  }
  
  /**
   * Set the WebSocket service for sending messages to the server
   */
  public setWebSocketService(wsService: any): void {
    this.wsService = wsService;
  }
  
  /**
   * Set the MultiplayerManager reference
   */
  public setMultiplayerManager(manager: MultiplayerManager): void {
    this.multiplayerManager = manager;
  }
  
  /**
   * Updates the Pokémon collection with new data from the server
   * @param pokemons The collection of Pokémon from the server
   */
  public updatePokemonCollection(pokemons: Pokemon[]): void {
    // Store the pokemon collection
    this.activePokemons = pokemons;
    
    // Clear any existing UI elements
    this.clearPokemonUI();
    
    // Check if the player has no Pokémon, show starter selection
    if (pokemons.length === 0) {
      this.showStarterSelection();
      return;
    }
    
    // Update the UI with the new collection
    this.renderPokemonCollection();
    
    console.log(`Pokemon collection updated with ${pokemons.length} Pokemon`);
  }
  
  /**
   * Shows the starter Pokémon selection UI as a modal
   */
  private showStarterSelection(): void {
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'starter-modal-overlay';
    modalOverlay.style.position = 'fixed';
    modalOverlay.style.top = '0';
    modalOverlay.style.left = '0';
    modalOverlay.style.width = '100%';
    modalOverlay.style.height = '100%';
    modalOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    modalOverlay.style.display = 'flex';
    modalOverlay.style.justifyContent = 'center';
    modalOverlay.style.alignItems = 'center';
    modalOverlay.style.zIndex = '1000';
    modalOverlay.style.backdropFilter = 'blur(5px)';
    
    // Create modal container
    const modalContainer = document.createElement('div');
    modalContainer.className = 'starter-modal';
    modalContainer.style.backgroundColor = 'rgba(16, 24, 48, 0.95)';
    modalContainer.style.borderRadius = '15px';
    modalContainer.style.padding = '30px';
    modalContainer.style.maxWidth = '900px';
    modalContainer.style.width = '90%';
    modalContainer.style.boxShadow = '0 0 30px rgba(0, 150, 255, 0.3)';
    modalContainer.style.border = '1px solid rgba(50, 150, 255, 0.2)';
    modalContainer.style.animation = 'fadeIn 0.3s ease-out';
    modalContainer.style.display = 'flex';
    modalContainer.style.flexDirection = 'column';
    modalContainer.style.alignItems = 'center';
    
    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      @keyframes glow {
        0% { box-shadow: 0 0 15px rgba(0, 150, 255, 0.3); }
        50% { box-shadow: 0 0 25px rgba(0, 200, 255, 0.5); }
        100% { box-shadow: 0 0 15px rgba(0, 150, 255, 0.3); }
      }
    `;
    document.head.appendChild(style);
    
    // Modal title
    const modalTitle = document.createElement('h2');
    modalTitle.textContent = 'Choose Your First Pokémon';
    modalTitle.style.color = '#ffffff';
    modalTitle.style.textAlign = 'center';
    modalTitle.style.margin = '0 0 20px 0';
    modalTitle.style.fontFamily = 'Inter, sans-serif';
    modalTitle.style.fontSize = '28px';
    modalTitle.style.fontWeight = 'bold';
    modalTitle.style.textShadow = '0 2px 10px rgba(0, 150, 255, 0.5)';
    
    // Modal description
    const modalDesc = document.createElement('p');
    modalDesc.textContent = 'Welcome to the world of Pokémon! Your journey begins with choosing your first partner.';
    modalDesc.style.color = '#cceeff';
    modalDesc.style.textAlign = 'center';
    modalDesc.style.margin = '0 0 30px 0';
    modalDesc.style.fontFamily = 'Inter, sans-serif';
    modalDesc.style.fontSize = '16px';
    modalDesc.style.maxWidth = '600px';
    
    // Create a container for the starter choices (horizontal)
    const starterContainer = document.createElement('div');
    starterContainer.className = 'starter-container';
    starterContainer.style.display = 'flex';
    starterContainer.style.flexDirection = 'row';
    starterContainer.style.justifyContent = 'center';
    starterContainer.style.alignItems = 'stretch'; // Ensure cards stretch to match the tallest
    starterContainer.style.gap = '30px';
    starterContainer.style.flexWrap = 'wrap';
    starterContainer.style.maxWidth = '850px';
    starterContainer.style.margin = '0 auto';
    
    // Starter data with more detailed descriptions and stats
    const starters = [
      { 
        id: 1, 
        name: 'Bulbasaur', 
        type: 'Grass/Poison', 
        description: 'A dual Grass/Poison type that is easy to raise. It has balanced stats with a focus on Special Attack and Special Defense.',
        stats: {
          hp: 45,
          attack: 49,
          defense: 49,
          specialAttack: 65,
          specialDefense: 65,
          speed: 45
        },
        moves: ['Tackle', 'Growl', 'Vine Whip', 'Growth']
      },
      { 
        id: 4, 
        name: 'Charmander', 
        type: 'Fire', 
        description: 'A Fire type with high Speed and Special Attack. Good for trainers who prefer offensive strategies.',
        stats: {
          hp: 39,
          attack: 52,
          defense: 43,
          specialAttack: 60,
          specialDefense: 50,
          speed: 65
        },
        moves: ['Scratch', 'Growl', 'Ember', 'Smokescreen']
      },
      { 
        id: 7, 
        name: 'Squirtle', 
        type: 'Water', 
        description: 'A Water type with excellent Defense and good Special Attack. Perfect for trainers who prefer defensive play.',
        stats: {
          hp: 44,
          attack: 48,
          defense: 65,
          specialAttack: 50,
          specialDefense: 64,
          speed: 43
        },
        moves: ['Tackle', 'Tail Whip', 'Water Gun', 'Withdraw']
      }
    ];
    
    // Create a card for each starter
    starters.forEach(starter => {
      const starterCard = this.createStarterCard(starter, modalOverlay);
      starterContainer.appendChild(starterCard);
    });
    
    // Assemble the modal
    modalContainer.appendChild(modalTitle);
    modalContainer.appendChild(modalDesc);
    modalContainer.appendChild(starterContainer);
    modalOverlay.appendChild(modalContainer);
    
    // Add to document body
    document.body.appendChild(modalOverlay);
  }
  
  /**
   * Creates a card for a starter Pokémon
   */
  private createStarterCard(starter: {
    id: number, 
    name: string, 
    type: string, 
    description: string,
    stats: {
      hp: number,
      attack: number,
      defense: number,
      specialAttack: number,
      specialDefense: number,
      speed: number
    },
    moves: string[]
  }, modalOverlay: HTMLDivElement): HTMLElement {
    const card = document.createElement('div');
    card.className = 'starter-card';
    card.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
    card.style.borderRadius = '15px';
    card.style.padding = '25px';
    card.style.width = '250px';
    card.style.height = '450px'; // Increased height for more content
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.alignItems = 'center';
    card.style.justifyContent = 'space-between'; // Even spacing between elements
    card.style.cursor = 'pointer';
    card.style.border = '1px solid rgba(255, 255, 255, 0.1)';
    card.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.3)';
    card.style.transition = 'all 0.3s ease';
    card.style.position = 'relative'; // For positioning the elements precisely
    
    // Store the type color for hover state
    const typeColor = this.getTypeColor(starter.type.split('/')[0]);
    
    // Top section with Pokemon image
    const topSection = document.createElement('div');
    topSection.style.display = 'flex';
    topSection.style.flexDirection = 'column';
    topSection.style.alignItems = 'center';
    topSection.style.width = '100%';
    
    // Pokemon image container
    const imageContainer = document.createElement('div');
    imageContainer.style.width = '150px';
    imageContainer.style.height = '150px';
    imageContainer.style.marginBottom = '20px';
    imageContainer.style.position = 'relative';
    imageContainer.style.borderRadius = '50%';
    imageContainer.style.overflow = 'hidden';
    imageContainer.style.background = 'radial-gradient(circle, #1a3040, #0a1520)';
    imageContainer.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.5)';
    imageContainer.style.border = '3px solid rgba(255, 255, 255, 0.15)';
    
    const img = document.createElement('img');
    img.src = `/assets/Sprites/FullMonsters/front/${starter.id}.png`;
    img.alt = starter.name;
    img.style.width = '180%';
    img.style.height = '180%';
    img.style.objectFit = 'contain';
    img.style.position = 'absolute';
    img.style.left = '50%';
    img.style.top = '50%';
    img.style.transform = 'translate(-50%, -50%)';
    img.style.filter = 'drop-shadow(0 5px 8px rgba(0, 0, 0, 0.5))';
    
    imageContainer.appendChild(img);
    topSection.appendChild(imageContainer);
    
    // Middle section with text info
    const middleSection = document.createElement('div');
    middleSection.style.display = 'flex';
    middleSection.style.flexDirection = 'column';
    middleSection.style.alignItems = 'center';
    middleSection.style.justifyContent = 'center';
    middleSection.style.width = '100%';
    middleSection.style.height = '160px'; // Increased height for more content
    middleSection.style.marginBottom = '20px';
    
    // Pokemon name
    const nameElement = document.createElement('div');
    nameElement.textContent = starter.name;
    nameElement.style.fontWeight = 'bold';
    nameElement.style.fontSize = '24px';
    nameElement.style.color = '#ffffff';
    nameElement.style.textShadow = '0 2px 4px rgba(0, 0, 0, 0.5)';
    nameElement.style.marginBottom = '10px';
    nameElement.style.fontFamily = 'Inter, sans-serif';
    nameElement.style.textAlign = 'center';
    
    // Type
    const typeElement = document.createElement('div');
    typeElement.textContent = `Type: ${starter.type}`;
    typeElement.style.fontSize = '16px';
    typeElement.style.color = '#88ccff';
    typeElement.style.marginBottom = '10px';
    typeElement.style.fontFamily = 'Inter, sans-serif';
    typeElement.style.textAlign = 'center';
    
    // Description
    const descElement = document.createElement('div');
    descElement.textContent = starter.description;
    descElement.style.fontSize = '14px';
    descElement.style.color = '#cccccc';
    descElement.style.lineHeight = '1.4';
    descElement.style.textAlign = 'center';
    descElement.style.padding = '0 5px';
    descElement.style.fontFamily = 'Inter, sans-serif';
    
    // Stats section
    const statsElement = document.createElement('div');
    statsElement.style.width = '100%';
    statsElement.style.marginTop = '15px';
    statsElement.style.padding = '0 5px';
    statsElement.style.fontSize = '12px';
    statsElement.style.color = '#aaaaaa';
    statsElement.style.fontFamily = 'Inter, sans-serif';
    statsElement.style.textAlign = 'center';
    
    const statHighlights = document.createElement('div');
    
    // Determine which stats to highlight based on the highest values
    const stats = starter.stats;
    let highestStat = 'hp';
    let highestValue = stats.hp;
    
    if (stats.attack > highestValue) {
      highestStat = 'Attack';
      highestValue = stats.attack;
    }
    if (stats.defense > highestValue) {
      highestStat = 'Defense';
      highestValue = stats.defense;
    }
    if (stats.specialAttack > highestValue) {
      highestStat = 'Special Attack';
      highestValue = stats.specialAttack;
    }
    if (stats.specialDefense > highestValue) {
      highestStat = 'Special Defense';
      highestValue = stats.specialDefense;
    }
    if (stats.speed > highestValue) {
      highestStat = 'Speed';
      highestValue = stats.speed;
    }
    
    statHighlights.textContent = `Best Stat: ${highestStat}`;
    statHighlights.style.fontWeight = 'bold';
    statHighlights.style.color = '#ffffff';
    
    // Add common moves
    const movesElement = document.createElement('div');
    movesElement.style.marginTop = '5px';
    movesElement.style.fontSize = '12px';
    movesElement.style.color = '#aaaaaa';
    movesElement.textContent = `Starting Moves: ${starter.moves.join(', ')}`;
    
    statsElement.appendChild(statHighlights);
    statsElement.appendChild(movesElement);
    
    middleSection.appendChild(nameElement);
    middleSection.appendChild(typeElement);
    middleSection.appendChild(descElement);
    middleSection.appendChild(statsElement);
    
    // Bottom section with button
    const bottomSection = document.createElement('div');
    bottomSection.style.width = '100%';
    bottomSection.style.display = 'flex';
    bottomSection.style.justifyContent = 'center';
    bottomSection.style.padding = '0 10px';
    
    // Choose button
    const chooseButton = document.createElement('button');
    chooseButton.textContent = 'I Choose You!';
    
    // Neutral gray color by default
    chooseButton.style.backgroundColor = '#5a6374';
    chooseButton.style.color = 'white';
    chooseButton.style.border = 'none';
    chooseButton.style.padding = '12px 0'; // Vertical padding only
    chooseButton.style.borderRadius = '30px';
    chooseButton.style.cursor = 'pointer';
    chooseButton.style.fontFamily = 'Inter, sans-serif';
    chooseButton.style.fontSize = '16px';
    chooseButton.style.fontWeight = 'bold';
    chooseButton.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.3)';
    chooseButton.style.transition = 'all 0.2s ease';
    chooseButton.style.width = '100%'; // Full width
    chooseButton.style.textTransform = 'uppercase';
    chooseButton.style.letterSpacing = '1px';
    
    bottomSection.appendChild(chooseButton);
    
    // Add elements to card in proper sections
    card.appendChild(topSection);
    card.appendChild(middleSection);
    card.appendChild(bottomSection);
    
    // Function to handle card selection
    const selectCard = () => {
      this.selectStarter(starter.id);
      document.body.removeChild(modalOverlay);
    };
    
    // Group hover effect - Card hover affects button
    card.addEventListener('mouseenter', () => {
      card.style.backgroundColor = 'rgba(0, 50, 100, 0.5)';
      card.style.border = '1px solid rgba(0, 150, 255, 0.3)';
      card.style.transform = 'translateY(-5px)';
      card.style.boxShadow = '0 8px 25px rgba(0, 100, 255, 0.4)';
      card.style.animation = 'glow 2s infinite';
      
      // Change button color on card hover
      chooseButton.style.backgroundColor = typeColor;
      chooseButton.style.transform = 'scale(1.05)';
      chooseButton.style.boxShadow = '0 6px 15px rgba(0, 0, 0, 0.4)';
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
      card.style.border = '1px solid rgba(255, 255, 255, 0.1)';
      card.style.transform = 'translateY(0)';
      card.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.3)';
      card.style.animation = 'none';
      
      // Revert button color on card mouse leave
      chooseButton.style.backgroundColor = '#5a6374';
      chooseButton.style.transform = 'scale(1)';
      chooseButton.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.3)';
    });
    
    // Button hover effect (already affected by card hover)
    chooseButton.addEventListener('mouseenter', (e) => {
      // Prevent propagation to avoid duplicate events
      e.stopPropagation();
      
      // Same styling as applied by card hover
      chooseButton.style.backgroundColor = typeColor;
      chooseButton.style.transform = 'scale(1.05)';
      chooseButton.style.boxShadow = '0 6px 15px rgba(0, 0, 0, 0.4)';
    });
    
    chooseButton.addEventListener('mouseleave', (e) => {
      // Prevent propagation to avoid duplicate events
      e.stopPropagation();
      
      // Only change button back if the card isn't being hovered
      if (!card.matches(':hover')) {
        chooseButton.style.backgroundColor = '#5a6374';
        chooseButton.style.transform = 'scale(1)';
        chooseButton.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.3)';
      }
    });
    
    // Click events for both card and button
    card.addEventListener('click', (e) => {
      // Prevent click from triggering twice if button is clicked
      if (e.target !== chooseButton) {
        selectCard();
      }
    });
    
    chooseButton.addEventListener('click', (e) => {
      e.stopPropagation();
      selectCard();
    });
    
    return card;
  }
  
  /**
   * Returns a color based on Pokémon type
   */
  private getTypeColor(type: string): string {
    const typeColors: {[key: string]: string} = {
      'Grass': '#38b000',
      'Fire': '#e63946',
      'Water': '#0077b6',
      'Electric': '#ffb703',
      'Normal': '#6c757d',
      'Fighting': '#a84448',
      'Flying': '#90e0ef',
      'Poison': '#7209b7',
      'Ground': '#a6761d',
      'Rock': '#b08968',
      'Bug': '#70e000',
      'Ghost': '#7400b8',
      'Steel': '#6c757d',
      'Psychic': '#ff69eb',
      'Ice': '#00b4d8',
      'Dragon': '#5f0f40',
      'Dark': '#25283d',
      'Fairy': '#ff87ab'
    };
    
    return typeColors[type] || '#4CAF50';
  }
  
  /**
   * Sends the starter selection to the server
   */
  private selectStarter(starterId: number): void {
    // Check if we have the MultiplayerManager reference
    if (this.multiplayerManager) {
      console.log(`Selected starter: ${starterId}`);
      
      // Send the choose_starter message through the MultiplayerManager
      this.multiplayerManager.sendChooseStarter(starterId);
      
      // Create a loading modal
      this.showLoadingModal();
    } else if (this.wsService) {
      // Fallback to using the WebSocketService directly
      console.log(`Selected starter: ${starterId} (fallback method)`);
      
      // Send a message to the server with the selected starter
      this.wsService.sendMessage({
        type: "choose_starter",
        starter_id: starterId
      });
      
      // Create a loading modal
      this.showLoadingModal();
    } else {
      console.error("Neither MultiplayerManager nor WebSocketService available");
    }
  }
  
  /**
   * Shows a loading modal while waiting for server response
   */
  private showLoadingModal(): void {
    // Create loading modal overlay
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-modal-overlay';
    loadingOverlay.style.position = 'fixed';
    loadingOverlay.style.top = '0';
    loadingOverlay.style.left = '0';
    loadingOverlay.style.width = '100%';
    loadingOverlay.style.height = '100%';
    loadingOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    loadingOverlay.style.display = 'flex';
    loadingOverlay.style.justifyContent = 'center';
    loadingOverlay.style.alignItems = 'center';
    loadingOverlay.style.zIndex = '1000';
    loadingOverlay.style.backdropFilter = 'blur(5px)';
    
    // Create loading container
    const loadingContainer = document.createElement('div');
    loadingContainer.className = 'loading-modal';
    loadingContainer.style.backgroundColor = 'rgba(16, 24, 48, 0.95)';
    loadingContainer.style.borderRadius = '15px';
    loadingContainer.style.padding = '30px';
    loadingContainer.style.width = '300px';
    loadingContainer.style.textAlign = 'center';
    loadingContainer.style.boxShadow = '0 0 30px rgba(0, 150, 255, 0.3)';
    loadingContainer.style.border = '1px solid rgba(50, 150, 255, 0.2)';
    
    // Loading message
    const loadingMessage = document.createElement('h3');
    loadingMessage.textContent = 'Receiving Your First Pokémon...';
    loadingMessage.style.color = '#ffffff';
    loadingMessage.style.margin = '0 0 20px 0';
    loadingMessage.style.fontFamily = 'Inter, sans-serif';
    
    // Loading spinner
    const loadingSpinner = document.createElement('div');
    loadingSpinner.style.border = '5px solid rgba(0, 0, 0, 0.1)';
    loadingSpinner.style.borderTop = '5px solid #3498db';
    loadingSpinner.style.borderRadius = '50%';
    loadingSpinner.style.width = '50px';
    loadingSpinner.style.height = '50px';
    loadingSpinner.style.animation = 'spin 1s linear infinite';
    loadingSpinner.style.margin = '20px auto';
    
    // Add the keyframes for the spinner if not already added
    if (!document.getElementById('spinner-style')) {
      const spinnerStyle = document.createElement('style');
      spinnerStyle.id = 'spinner-style';
      spinnerStyle.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(spinnerStyle);
    }
    
    // Assemble the loading modal
    loadingContainer.appendChild(loadingMessage);
    loadingContainer.appendChild(loadingSpinner);
    loadingOverlay.appendChild(loadingContainer);
    
    // Add to document body
    document.body.appendChild(loadingOverlay);
    
    // Store a reference to the loading modal as a property to remove it later
    // when we get a response from the server in the addNewPokemon method
    this.loadingModal = loadingOverlay;
  }
  
  /**
   * Adds a new Pokémon to the collection
   * @param pokemon The new Pokémon to add
   * @param activeIndex The index at which to insert this Pokémon (or null if it should be added to the end)
   */
  public addNewPokemon(pokemon: Pokemon, activeIndex: number | null): void {
    // Remove loading modal if it exists
    if (this.loadingModal && document.body.contains(this.loadingModal)) {
      document.body.removeChild(this.loadingModal);
      this.loadingModal = null;
    }
    
    console.log(`New Pokemon received: ${pokemon.name} (ID: ${pokemon.id}), active index: ${activeIndex}`);
    
    // For starter Pokemon, typically the active_index will be 0
    if (activeIndex !== null && activeIndex >= 0 && activeIndex < this.activePokemons.length) {
      // Insert at specific position
      this.activePokemons.splice(activeIndex, 0, pokemon);
      console.log(`Added ${pokemon.name} at position ${activeIndex}`);
    } else {
      // Add to the end of the collection
      this.activePokemons.push(pokemon);
      console.log(`Added ${pokemon.name} at the end of collection`);
    }
    
    // Refresh the UI
    this.clearPokemonUI();
    this.renderPokemonCollection();
    
    console.log(`New Pokemon added: ${pokemon.name} (${pokemon.id})`);
    
    // Show a toast notification of the new Pokémon
    this.showNewPokemonToast(pokemon);
  }
  
  /**
   * Shows a toast notification when a new Pokémon is received
   */
  private showNewPokemonToast(pokemon: Pokemon): void {
    // Create toast container
    const toast = document.createElement('div');
    toast.className = 'new-pokemon-toast';
    toast.style.position = 'fixed';
    toast.style.bottom = '30px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.backgroundColor = 'rgba(16, 24, 48, 0.9)';
    toast.style.borderRadius = '10px';
    toast.style.padding = '15px 20px';
    toast.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.3)';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.zIndex = '1000';
    toast.style.border = '1px solid rgba(50, 150, 255, 0.3)';
    toast.style.backdropFilter = 'blur(5px)';
    toast.style.animation = 'fadeInUp 0.5s ease-out';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.5s ease';
    
    // Add animation keyframes if not already added
    if (!document.getElementById('toast-style')) {
      const toastStyle = document.createElement('style');
      toastStyle.id = 'toast-style';
      toastStyle.textContent = `
        @keyframes fadeInUp {
          from { transform: translate(-50%, 20px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `;
      document.head.appendChild(toastStyle);
    }
    
    // Pokemon image
    const img = document.createElement('img');
    img.src = `/assets/Sprites/FullMonsters/front/${pokemon.template_id}.png`;
    img.alt = pokemon.name;
    img.style.width = '60px';
    img.style.height = '60px';
    img.style.marginRight = '15px';
    img.style.objectFit = 'contain';
    img.style.filter = 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5))';
    
    // Text content
    const textContainer = document.createElement('div');
    
    // Capitalize first letter of name and nature
    const displayName = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
    const displayNature = pokemon.nature.charAt(0).toUpperCase() + pokemon.nature.slice(1);
    
    const title = document.createElement('div');
    title.textContent = 'New Pokémon!';
    title.style.color = '#ffffff';
    title.style.fontWeight = 'bold';
    title.style.fontFamily = 'Inter, sans-serif';
    title.style.fontSize = '16px';
    title.style.marginBottom = '5px';
    
    const message = document.createElement('div');
    message.textContent = `${displayName} (Lv.${pokemon.level}) has joined your team!`;
    message.style.color = '#cceeff';
    message.style.fontFamily = 'Inter, sans-serif';
    message.style.fontSize = '14px';
    message.style.marginBottom = '3px';
    
    // Add nature and types info
    const typeNames = pokemon.types.map(type => type.charAt(0).toUpperCase() + type.slice(1)).join('/');
    const additionalInfo = document.createElement('div');
    additionalInfo.textContent = `${displayNature} nature • ${typeNames} type`;
    additionalInfo.style.color = '#aaaaaa';
    additionalInfo.style.fontFamily = 'Inter, sans-serif';
    additionalInfo.style.fontSize = '12px';
    
    textContainer.appendChild(title);
    textContainer.appendChild(message);
    textContainer.appendChild(additionalInfo);
    
    // Add elements to toast
    toast.appendChild(img);
    toast.appendChild(textContainer);
    
    // Add to document body
    document.body.appendChild(toast);
    
    // Show the toast
    setTimeout(() => {
      toast.style.opacity = '1';
    }, 100);
    
    // Remove the toast after 4 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 500);
    }, 4000);
  }
  
  /**
   * Renders the Pokémon collection in the UI
   */
  private renderPokemonCollection(): void {
    // Update the side panel UI with Pokemon cards
    this.renderPokemonSidePanel();
  }
  
  /**
   * Renders the collection in the side panel
   */
  private renderPokemonSidePanel(): void {
    if (!this.rightPanel) return;
    
    // Clear existing content except the title
    const title = this.rightPanel.querySelector('.panel-title');
    this.rightPanel.innerHTML = '';
    if (title) {
      this.rightPanel.appendChild(title);
      title.textContent = 'Your Pokemon';
    }
    
    // If there are no Pokemon, show a message
    if (this.activePokemons.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'panel-info';
      emptyMessage.textContent = 'You have no Pokémon yet. Catch some by interacting with monsters!';
      this.rightPanel.appendChild(emptyMessage);
      return;
    }
    
    // Create a container for the Pokemon list
    const pokemonList = document.createElement('div');
    pokemonList.className = 'pokemon-list';
    
    // Add each Pokemon to the list
    this.activePokemons.forEach((pokemon, index) => {
      const pokemonCard = this.createPokemonCard(pokemon, index);
      pokemonList.appendChild(pokemonCard);
    });
    
    this.rightPanel.appendChild(pokemonList);
  }
  
  /**
   * Creates a card-like element for a single Pokemon
   */
  private createPokemonCard(pokemon: Pokemon, index: number): HTMLElement {
    const card = document.createElement('div');
    card.className = 'pokemon-card';
    card.style.margin = '8px 0';
    card.style.padding = '12px';
    card.style.borderRadius = '12px';
    card.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
    card.style.display = 'flex';
    card.style.flexDirection = 'row';
    card.style.alignItems = 'center';
    card.style.cursor = 'pointer';
    card.style.border = '1px solid rgba(255, 255, 255, 0.05)';
    card.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
    card.style.transition = 'all 0.2s ease';
    
    // Add hover effect
    card.addEventListener('mouseenter', () => {
      card.style.backgroundColor = 'rgba(0, 50, 100, 0.4)';
      card.style.border = '1px solid rgba(255, 255, 255, 0.1)';
      card.style.boxShadow = '0 4px 12px rgba(42, 117, 187, 0.5)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
      card.style.border = '1px solid rgba(255, 255, 255, 0.05)';
      card.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
    });
    
    // Pokemon image
    const imageContainer = document.createElement('div');
    imageContainer.style.width = '60px';
    imageContainer.style.height = '60px';
    imageContainer.style.marginRight = '10px';
    imageContainer.style.position = 'relative';
    imageContainer.style.borderRadius = '50%';
    imageContainer.style.overflow = 'hidden';
    imageContainer.style.background = 'linear-gradient(135deg, #1a1a1a, #2c2c2c, #1a1a1a)';
    imageContainer.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
    imageContainer.style.border = '2px solid rgba(255, 255, 255, 0.1)';
    
    const img = document.createElement('img');
    img.src = `/assets/Sprites/FullMonsters/front/${pokemon.template_id}.png`;
    img.alt = pokemon.name;
    img.style.width = '150%';
    img.style.height = '150%';
    img.style.objectFit = 'contain';
    img.style.position = 'absolute';
    img.style.left = '50%';
    img.style.top = '50%';
    img.style.transform = 'translate(-50%, -50%)';
    img.style.filter = 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))';
    
    // Handle broken images
    img.onerror = () => {
      img.src = '/assets/Sprites/FullMonsters/front/1.png'; // Default to first Pokemon if image not found
    };
    
    imageContainer.appendChild(img);
    
    // Pokemon info
    const infoContainer = document.createElement('div');
    infoContainer.style.flex = '1';
    
    // Capitalize first letter of name
    const displayName = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
    
    const nameElement = document.createElement('div');
    nameElement.textContent = `${displayName} Lv.${pokemon.level}`;
    nameElement.style.fontWeight = 'bold';
    nameElement.style.fontSize = '15px';
    nameElement.style.color = '#ffffff';
    nameElement.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.5)';
    nameElement.style.letterSpacing = '0.2px';
    
    const hpElement = document.createElement('div');
    const hpPercentage = (pokemon.current_hp / pokemon.max_hp) * 100;
    
    // HP bar container
    const hpBarContainer = document.createElement('div');
    hpBarContainer.style.width = '100%';
    hpBarContainer.style.height = '8px';
    hpBarContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    hpBarContainer.style.borderRadius = '4px';
    hpBarContainer.style.marginTop = '6px';
    hpBarContainer.style.overflow = 'hidden';
    hpBarContainer.style.border = '1px solid rgba(0, 0, 0, 0.3)';
    
    // HP bar fill
    const hpBar = document.createElement('div');
    hpBar.style.width = `${hpPercentage}%`;
    hpBar.style.height = '100%';
    hpBar.style.backgroundColor = hpPercentage > 50 ? '#38b000' : hpPercentage > 25 ? '#ffaa00' : '#ff0000';
    hpBar.style.borderRadius = '3px';
    hpBar.style.transition = 'width 0.3s ease';
    hpBar.style.boxShadow = 'inset 0 0 5px rgba(255, 255, 255, 0.3)';
    
    hpBarContainer.appendChild(hpBar);
    
    const hpText = document.createElement('div');
    hpText.textContent = `HP: ${pokemon.current_hp}/${pokemon.max_hp}`;
    hpText.style.fontSize = '12px';
    hpText.style.color = '#cccccc';
    hpText.style.marginTop = '3px';
    hpText.style.textShadow = '0 1px 1px rgba(0, 0, 0, 0.3)';
    
    infoContainer.appendChild(nameElement);
    infoContainer.appendChild(hpBarContainer);
    infoContainer.appendChild(hpText);
    
    // Add elements to card
    card.appendChild(imageContainer);
    card.appendChild(infoContainer);
    
    // Add click handler to show more details
    card.addEventListener('click', () => {
      this.showPokemonDetails(pokemon);
    });
    
    return card;
  }
  
  /**
   * Displays detailed information about a Pokemon
   */
  private showPokemonDetails(pokemon: Pokemon): void {
    console.log('Show Pokemon details:', pokemon);
    
    // Capitalize first letter of name and nature
    const displayName = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
    const displayNature = pokemon.nature.charAt(0).toUpperCase() + pokemon.nature.slice(1);
    
    // Format the types with first letter capitalized
    const formattedTypes = pokemon.types.map(type => 
      type.charAt(0).toUpperCase() + type.slice(1)
    ).join(', ');
    
    // Format the ability with first letter capitalized
    const formattedAbility = pokemon.ability.charAt(0).toUpperCase() + pokemon.ability.slice(1);
    
    // Format the move list
    const movesList = pokemon.moves.map(move => {
      const moveName = move.name.charAt(0).toUpperCase() + move.name.slice(1);
      const moveType = move.move_type.charAt(0).toUpperCase() + move.move_type.slice(1);
      const powerText = move.power ? `Power: ${move.power}` : 'Status Move';
      return `${moveName} (${moveType}) - ${powerText} - PP: ${move.current_pp}/${move.max_pp}`;
    }).join('\n');
    
    // Create a detailed alert with all Pokemon information
    alert(`
      ${displayName} (Level ${pokemon.level})
      Nature: ${displayNature}
      HP: ${pokemon.current_hp}/${pokemon.max_hp}
      Experience: ${pokemon.exp}/${pokemon.max_exp}
      
      Stats:
      - HP: ${pokemon.calculated_stats.hp}
      - Attack: ${pokemon.calculated_stats.attack}
      - Defense: ${pokemon.calculated_stats.defense}
      - Special Attack: ${pokemon.calculated_stats.special_attack}
      - Special Defense: ${pokemon.calculated_stats.special_defense}
      - Speed: ${pokemon.calculated_stats.speed}
      
      Types: ${formattedTypes}
      Ability: ${formattedAbility}
      
      Moves:
      ${movesList}
    `);
  }
  
  /**
   * Clears all Pokemon UI elements
   */
  private clearPokemonUI(): void {
    // Clear sprite and text objects
    Object.values(this.pokemonSprites).forEach(sprite => sprite.destroy());
    Object.values(this.pokemonLabels).forEach(text => text.destroy());
    
    this.pokemonSprites = {};
    this.pokemonLabels = {};
  }
  
  /**
   * Cleanup resources when the manager is no longer needed
   */
  public cleanUp(): void {
    this.clearPokemonUI();
    this.activePokemons = [];
  }
  
  /**
   * Gets the list of active Pokemon
   */
  public getActivePokemons(): Pokemon[] {
    return this.activePokemons;
  }
} 