/**
 * Utility functions for the battle system
 */
export class BattleUtils {
  /**
   * Get color based on HP percentage
   */
  static getHpColor(hpPercent: number): string {
    if (hpPercent > 0.5) {
      return '#38b000'; // Green
    } else if (hpPercent > 0.25) {
      return '#ffaa00'; // Orange
    } else {
      return '#ff0000'; // Red
    }
  }
  
  /**
   * Get color based on status condition
   */
  static getStatusColor(status: string): string {
    switch(status.toLowerCase()) {
      case 'burn': return '#ff7b00';
      case 'freeze': return '#00c3ff';
      case 'paralysis': return '#ffe100';
      case 'poison': return '#a85cd6';
      case 'sleep': return '#a0a0a0';
      default: return '#666666';
    }
  }
  
  /**
   * Get color based on move type
   */
  static getMoveTypeColor(type: string): string {
    const typeColors: {[key: string]: string} = {
      'normal': '#A8A878',
      'fire': '#F08030',
      'water': '#6890F0',
      'grass': '#78C850',
      'electric': '#F8D030',
      'ice': '#98D8D8',
      'fighting': '#C03028',
      'poison': '#A040A0',
      'ground': '#E0C068',
      'flying': '#A890F0',
      'psychic': '#F85888',
      'bug': '#A8B820',
      'rock': '#B8A038',
      'ghost': '#705898',
      'dark': '#705848',
      'dragon': '#7038F8',
      'steel': '#B8B8D0',
      'fairy': '#F0B6BC'
    };
    
    return typeColors[type.toLowerCase()] || '#777777';
  }
  
  /**
   * Format a nice move name from a move ID based on a predefined list
   */
  static formatMoveName(moveId: number): string {
    // Common moves in Pokemon
    const moveNames: { [key: number]: string } = {
      10: 'Scratch',
      45: 'Growl',
      52: 'Ember',
      108: 'Smokescreen',
      33: 'Tackle',
      39: 'Tail Whip',
      55: 'Water Gun',
      110: 'Withdraw',
      22: 'Vine Whip',
      74: 'Growth',
      // Add more move name mappings as needed
    };
    
    return moveNames[moveId] || `Move ${moveId}`;
  }
  
  /**
   * Format a nice item name from an item ID
   */
  static formatItemName(itemId: string): string {
    // Convert snake_case to Title Case with spaces
    return itemId
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
} 