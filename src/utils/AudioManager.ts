import { Scene } from 'phaser';

/**
 * Represents a Phaser sound type that can be either HTML5 Audio or Web Audio based
 */
type PhaserSound = Phaser.Sound.HTML5AudioSound | Phaser.Sound.WebAudioSound | Phaser.Sound.NoAudioSound;

/**
 * Manages background music with smooth transitions between songs
 */
export class AudioManager {
  private static instance: AudioManager;
  private scene: Scene;
  private currentBgm: PhaserSound | null = null;
  private nextBgm: PhaserSound | null = null;
  private fadeInTween: Phaser.Tweens.Tween | null = null;
  private fadeOutTween: Phaser.Tweens.Tween | null = null;
  private isMuted: boolean = false;
  private muteButton: Phaser.GameObjects.Text | null = null;
  
  // Music tracks
  public static readonly TRACK_NORMAL = 'route-101';
  public static readonly TRACK_BATTLE_WILD = 'wild-battle';
  public static readonly TRACK_BATTLE_PVP = 'wild-battle'; // Using same track for now
  
  // Track that is currently playing, if any
  private currentTrackKey: string | null = null;
  
  // Transition duration in milliseconds
  private transitionDuration: number = 1000;
  
  // Volume settings
  private masterVolume: number = 0.1;
  
  private constructor(scene: Scene) {
    this.scene = scene;
    
    // Load mute state from local storage if available
    this.loadMuteState();
    
    // Create DOM-based mute button in the left sidebar
    this.createMuteButton();
    
    // We need to make sure we're using the correct sound path
    console.log('Initializing AudioManager...');
  }
  
  /**
   * Get the AudioManager instance
   * @param scene The Phaser scene
   * @returns The AudioManager instance
   */
  public static getInstance(scene: Scene): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager(scene);
    } else {
      // Update scene reference if a new scene is passed
      AudioManager.instance.scene = scene;
    }
    
    return AudioManager.instance;
  }
  
  /**
   * Create the mute button UI in the left sidebar
   */
  private createMuteButton(): void {
    // Use DOM to add the button to the left sidebar instead of Phaser
    const leftPanel = document.querySelector('.left-panel');
    if (!leftPanel) {
      console.error("Left panel not found for mute button");
      return;
    }
    
    // First check if the button already exists
    let existingButton = document.getElementById('audio-mute-button');
    if (existingButton) {
      existingButton.remove();
    }
    
    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.id = 'audio-button-container';
    buttonContainer.style.marginTop = '10px';
    buttonContainer.style.width = '100%';
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'center';
    
    // Create the button
    const muteButton = document.createElement('button');
    muteButton.id = 'audio-mute-button';
    muteButton.textContent = this.isMuted ? "~Mute~" : "Mute";
    muteButton.style.padding = '8px 20px';
    muteButton.style.backgroundColor = '#333333';
    muteButton.style.color = '#ffffff';
    muteButton.style.border = 'none';
    muteButton.style.borderRadius = '4px';
    muteButton.style.cursor = 'pointer';
    muteButton.style.marginBottom = '15px';
    muteButton.style.fontFamily = 'Inter, Arial, sans-serif';
    muteButton.style.fontSize = '14px';
    muteButton.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.3)';
    
    // Add hover effect
    muteButton.addEventListener('mouseover', () => {
      muteButton.style.backgroundColor = '#555555';
    });
    
    muteButton.addEventListener('mouseout', () => {
      muteButton.style.backgroundColor = '#333333';
    });
    
    // Add click handler
    muteButton.addEventListener('click', () => {
      this.toggleMute();
    });
    
    // Add to the container
    buttonContainer.appendChild(muteButton);
    
    // Add to left panel
    leftPanel.appendChild(buttonContainer);
  }
  
  /**
   * Update the mute button appearance based on mute state
   */
  private updateMuteButtonState(): void {
    const muteButton = document.getElementById('audio-mute-button');
    if (muteButton) {
      muteButton.textContent = this.isMuted ? "~Mute~" : "Mute";
    }
  }
  
  /**
   * Toggle mute state
   */
  public toggleMute(): void {
    this.isMuted = !this.isMuted;
    
    // Update mute button state
    this.updateMuteButtonState();
    
    // Save mute state to local storage
    localStorage.setItem('guardianmon-muted', this.isMuted ? 'true' : 'false');
    
    // Apply mute state to sounds
    this.scene.sound.setMute(this.isMuted);
    
    console.log(`Audio is now ${this.isMuted ? 'muted' : 'unmuted'}`);
  }
  
  /**
   * Load mute state from local storage
   */
  private loadMuteState(): void {
    const savedMuteState = localStorage.getItem('guardianmon-muted');
    if (savedMuteState) {
      this.isMuted = savedMuteState === 'true';
      console.log(`Loaded mute state: ${this.isMuted}`);
      
      // Apply initial mute state
      this.scene.sound.setMute(this.isMuted);
    }
  }
  
  /**
   * Play background music with a smooth transition
   * @param key Key of the music track to play
   */
  public playBgm(key: string): void {
    // Skip if this track is already playing
    if (this.currentTrackKey === key) {
      return;
    }
    
    console.log(`Transitioning music to: ${key}`);
    this.currentTrackKey = key;
    
    try {
      // Get the sound
      const nextMusic = this.scene.sound.get(key) as PhaserSound;
      
      // If the sound doesn't exist yet, add it
      if (!nextMusic) {
        console.log(`Adding new sound track: ${key}`);
        try {
          this.nextBgm = this.scene.sound.add(key, {
            loop: true,
            volume: 0,
          }) as PhaserSound;
          
          console.log(`Successfully added sound: ${key}`);
        } catch (error) {
          console.error(`Error adding sound ${key}:`, error);
          return;
        }
      } else {
        this.nextBgm = nextMusic;
        console.log(`Using existing sound: ${key}`);
      }
      
      // Start playing the new track at volume 0
      try {
        this.nextBgm.play({ volume: 0 });
        console.log(`Started playing: ${key}`);
      } catch (error) {
        console.error(`Error playing sound ${key}:`, error);
        return;
      }
      
      // If there's already music playing, fade it out
      if (this.currentBgm && this.currentBgm.isPlaying) {
        // Stop any existing fade-out tween
        if (this.fadeOutTween) {
          this.fadeOutTween.stop();
        }
        
        // Create a new fade-out tween
        this.fadeOutTween = this.scene.tweens.add({
          targets: this.currentBgm,
          volume: 0,
          duration: this.transitionDuration,
          onComplete: () => {
            // Stop the old music when it's fully faded out
            if (this.currentBgm) {
              this.currentBgm.stop();
            }
            this.fadeOutTween = null;
          }
        });
      }
      
      // Stop any existing fade-in tween
      if (this.fadeInTween) {
        this.fadeInTween.stop();
      }
      
      // Create a new fade-in tween
      const targetVolume = this.isMuted ? 0 : this.masterVolume;
      this.fadeInTween = this.scene.tweens.add({
        targets: this.nextBgm,
        volume: targetVolume,
        duration: this.transitionDuration,
        onComplete: () => {
          // Update current music reference
          this.currentBgm = this.nextBgm;
          this.nextBgm = null;
          this.fadeInTween = null;
          console.log(`Completed fade-in for: ${key}`);
        }
      });
    } catch (error) {
      console.error(`Error in playBgm for ${key}:`, error);
    }
  }
  
  /**
   * Play music for normal gameplay (overworld)
   */
  public playNormalMusic(): void {
    this.playBgm(AudioManager.TRACK_NORMAL);
  }
  
  /**
   * Play music for wild Pokemon battles
   */
  public playWildBattleMusic(): void {
    this.playBgm(AudioManager.TRACK_BATTLE_WILD);
  }
  
  /**
   * Play music for PvP battles
   */
  public playPvPBattleMusic(): void {
    this.playBgm(AudioManager.TRACK_BATTLE_PVP);
  }
  
  /**
   * Stop all music with a fade out
   * @param fadeOutDuration Duration of fade out in ms (default: 1000)
   */
  public stopMusic(fadeOutDuration: number = 1000): void {
    if (this.currentBgm && this.currentBgm.isPlaying) {
      this.scene.tweens.add({
        targets: this.currentBgm,
        volume: 0,
        duration: fadeOutDuration,
        onComplete: () => {
          if (this.currentBgm) {
            this.currentBgm.stop();
          }
          this.currentBgm = null;
          this.currentTrackKey = null;
        }
      });
    }
    
    if (this.nextBgm && this.nextBgm.isPlaying) {
      this.scene.tweens.add({
        targets: this.nextBgm,
        volume: 0,
        duration: fadeOutDuration,
        onComplete: () => {
          if (this.nextBgm) {
            this.nextBgm.stop();
          }
          this.nextBgm = null;
        }
      });
    }
  }
  
  /**
   * Set the master volume
   * @param volume Volume value between 0 and 1
   */
  public setVolume(volume: number): void {
    this.masterVolume = Math.min(1, Math.max(0, volume));
    
    // Set volume on the current BGM if it exists
    if (this.currentBgm && !this.isMuted) {
      // @ts-ignore - This is actually valid even if TypeScript complains
      this.currentBgm.volume = this.masterVolume;
    }
  }
  
  /**
   * Clean up resources
   */
  public cleanUp(): void {
    this.stopMusic(300);
    
    // Remove mute button if it exists
    const muteButton = document.getElementById('audio-mute-button');
    if (muteButton) {
      const container = document.getElementById('audio-button-container');
      if (container) {
        container.remove();
      }
    }
    
    // Clear tweens
    if (this.fadeInTween) {
      this.fadeInTween.stop();
      this.fadeInTween = null;
    }
    
    if (this.fadeOutTween) {
      this.fadeOutTween.stop();
      this.fadeOutTween = null;
    }
  }
  
  /**
   * Mute all game audio
   */
  public muteAll(): void {
    if (!this.isMuted) {
      this.isMuted = true;
      this.scene.sound.setMute(true);
      this.updateMuteButtonState();
      localStorage.setItem('guardianmon-muted', 'true');
      console.log('All audio muted');
    }
  }
  
  /**
   * Unmute all game audio
   */
  public unmuteAll(): void {
    if (this.isMuted) {
      this.isMuted = false;
      this.scene.sound.setMute(false);
      this.updateMuteButtonState();
      localStorage.setItem('guardianmon-muted', 'false');
      console.log('All audio unmuted');
    }
  }
} 