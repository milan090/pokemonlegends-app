import { Boot } from './scenes/Boot';
import { Game as MainGame } from './scenes/Game';
import { Preloader } from './scenes/Preloader';

import { Game, Types } from "phaser";

// Only initialize the game if we're on a game page (not the lobby selection page)
const gameContainer = document.getElementById('game-container');

if (gameContainer) {
  //  Find out more information about the Game Config at:
  //  https://newdocs.phaser.io/docs/3.70.0/Phaser.Types.Core.GameConfig
  const config: Types.Core.GameConfig = {
      type: Phaser.WEBGL,
      width: 1024,
      height: 768,
      parent: 'game-container',
      backgroundColor: '#121212',
      physics: {
          default: 'arcade',
          arcade: {
              debug: false
          }
      },
      input: {
          keyboard: true,
      },
      scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH
      },
      render: {
          pixelArt: true,
          antialias: false,
          roundPixels: true
      },
      scene: [
          Boot,
          Preloader,
          MainGame
      ]
  };

  // Initialize the game
  const game = new Game(config);

  // Handle high-DPI displays
  if (window.devicePixelRatio > 1) {
      document.querySelector('canvas')?.style.setProperty('image-rendering', 'pixelated');
  }

  // Apply additional centering styles to the canvas after Phaser creates it
  const centerCanvas = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.style.margin = '0 auto';
      canvas.style.maxWidth = '100%';
      canvas.style.maxHeight = '100%';
      
      // Ensure the game fits properly within the container
      const game = (window as any).game;
      if (game && game.scale) {
        game.scale.refresh();
      }
    }
  };

  // Run centering after a short delay to ensure canvas is created
  setTimeout(centerCanvas, 100);

  // Also recenter on window resize
  window.addEventListener('resize', centerCanvas);
}
