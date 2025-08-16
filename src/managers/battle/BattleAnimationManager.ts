import { BattleUtils } from '../../utils/battle/BattleUtils';

/**
 * Manages animations for the battle system
 */
export class BattleAnimationManager {
  /**
   * Play the battle start animation
   */
  public static playBattleStartAnimation(wildPokemonSprite: HTMLImageElement | null): void {
    // Simple animation for now - can be enhanced later
    if (wildPokemonSprite) {
      wildPokemonSprite.style.transition = 'transform 0.5s ease-in-out';
      wildPokemonSprite.style.transform = 'scale(1.2)';
      
      setTimeout(() => {
        if (wildPokemonSprite) {
          wildPokemonSprite.style.transform = 'scale(1)';
        }
      }, 500);
    }
  }
  
  /**
   * Animate HP bar change smoothly
   */
  public static animateHpBar(hpBar: HTMLElement, newHpPercentage: number): void {
    // Get current width to animate from
    const currentWidth = parseFloat(hpBar.style.width) || 100;
    const targetWidth = newHpPercentage * 100;
    
    // Start animation
    const startTime = performance.now();
    const duration = 500; // Animation duration in ms
    
    const animateStep = (timestamp: number) => {
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Calculate new width using easing function
      const newWidth = currentWidth + (targetWidth - currentWidth) * progress;
      
      // Update HP bar width and color
      hpBar.style.width = `${newWidth}%`;
      hpBar.style.backgroundColor = BattleUtils.getHpColor(newHpPercentage);
      
      // Continue animation if not complete
      if (progress < 1) {
        requestAnimationFrame(animateStep);
      }
    };
    
    requestAnimationFrame(animateStep);
  }
} 