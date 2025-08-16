import { Scene } from 'phaser';
import { getMonsterSpriteType, getPaddedMonsterNumber } from '../utils/common';

export class Preloader extends Scene
{
    // Known monster templates to preload - can be expanded as more monsters are added
    private monsterCount = 50;
    
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        // Create a simple loading bar
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 4, height / 2 - 30, width / 2, 50);
        
        const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
            font: '20px monospace',
            color: '#ffffff'
        });
        loadingText.setOrigin(0.5, 0.5);
        
        this.load.on('progress', (value: number) => {
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(width / 4 + 10, height / 2 - 20, (width / 2 - 20) * value, 30);
        });
        
        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            console.log('All assets loaded');
        });
        
        // Handle loading errors
        this.load.on('loaderror', (file: any) => {
            console.error('Error loading asset:', file.src);
            
            // Continue loading other assets
            this.load.on('filecomplete', () => {
                console.log('File loaded successfully');
            });
        });
        
        // Make sure we move to the next scene even if errors occur
        setTimeout(() => {
            this.startGameScene();
        }, 3000); // Force progression after 3 seconds regardless of load state
    }

    preload ()
    {
        // Load the tilemap and tileset images
        this.load.setPath('assets');
        
        try {
            // Load all tilemap JSON files
            this.load.tilemapTiledJSON('map', 'map1.json');
            // Load the tileset image
            this.load.image('grass', 'Texture/TX\ Tileset\ Grass.png');
            this.load.image('wall', 'Texture/TX\ Tileset\ Wall.png');
            this.load.image('plants', 'Texture/TX\ Plant.png');
            
            // Load character sprite sheet
            this.load.spritesheet('player', 'Sprites/Male/Male 01-1.png', {
                frameWidth: 32,
                frameHeight: 32,
            });
            
            // Load monster sprite sheets - one for each monster type
            // Load monster sprites from 001.png to 050.png
            for (let i = 1; i <= this.monsterCount; i++) {
                const paddedNumber = getPaddedMonsterNumber(i);
                const monsterType = getMonsterSpriteType(i);
                this.load.spritesheet(monsterType, `Sprites/Monsters/${paddedNumber}.png`, {
                    frameWidth: 32,
                    frameHeight: 32,
                });
            }
            
            // Load background music files
            console.log("Loading audio files...");
            this.load.audio('route-101', '../assets/sound/bg/route-101.mp3');
            this.load.audio('wild-battle', '../assets/sound/bg/wild.mp3');
                        
            // Add audio load success callback
            this.load.on('filecomplete-audio-route-101', () => {
                console.log('Successfully loaded route-101 music');
            });

            this.load.on('filecomplete-audio-wild-battle', () => {
                console.log('Successfully loaded wild-battle music');
            });
            
        } catch (e) {
            console.error('Error in preload:', e);
        }
    }
    create ()
    {
        console.log('Preloader complete, starting Game scene');
        this.startGameScene();
    }
    
    startGameScene() {
        // Check if we've already started the game scene
        if (this.scene.isActive('Game')) {
            return;
        }
        
        this.scene.start('Game');
    }
}
