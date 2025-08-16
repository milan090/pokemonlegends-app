import { Scene } from 'phaser';

export class Boot extends Scene
{
    constructor ()
    {
        super('Boot');
    }

    preload ()
    {
        // No need to load any assets in the Boot scene
        // The Preloader will handle all asset loading
    }

    create ()
    {
        this.scene.start('Preloader');
    }
}
