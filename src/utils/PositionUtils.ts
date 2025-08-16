/**
 * Utility class for converting between tile coordinates and pixel coordinates
 */
export class PositionUtils {
  private tileSize: number;

  constructor(tileSize: number) {
    this.tileSize = tileSize;
  }

  /**
   * Convert tile X coordinate to pixel X coordinate (center of tile)
   */
  public tileToPixelX(tileX: number): number {
    return tileX * this.tileSize + (this.tileSize / 2);
  }
  
  /**
   * Convert tile Y coordinate to pixel Y coordinate (center of tile)
   */
  public tileToPixelY(tileY: number): number {
    return tileY * this.tileSize + (this.tileSize / 2);
  }
  
  /**
   * Convert pixel X coordinate to tile X coordinate
   */
  public pixelToTileX(pixelX: number): number {
    return Math.floor(pixelX / this.tileSize);
  }
  
  /**
   * Convert pixel Y coordinate to tile Y coordinate
   */
  public pixelToTileY(pixelY: number): number {
    return Math.floor(pixelY / this.tileSize);
  }

  /**
   * Get an easing function for smoother movement
   */
  public static easeInOutCubic(t: number): number {
    return t < 0.5 
      ? 4 * t * t * t 
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
} 