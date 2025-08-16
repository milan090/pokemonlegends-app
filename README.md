# 🎮 Guardian Mon - Pokemon-Style Battle Game

A modern web-based Pokemon-inspired battle game built with TypeScript, Phaser 3, and WebSocket technology. Experience turn-based battles, Pokemon switching, and real-time multiplayer combat in your browser!

## 🎥 Game Preview

<video controls width="600" poster="public/preview-thumbnail.png">
  <source src="public/pokemon-legends.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

*Experience epic Pokemon battles with smooth animations and responsive UI*

## ✨ Features

### 🔥 Battle System
- **Turn-based Combat**: Strategic Pokemon battles with move selection
- **Real-time Multiplayer**: Challenge other players in PvP battles
- **Wild Pokemon Encounters**: Battle wild Pokemon in single-player mode
- **Dynamic Pokemon Switching**: Switch between team members during battle
- **Status Effects**: Paralysis, poison, burn, freeze, and sleep mechanics
- **Type Effectiveness**: Super effective, not very effective, and immunity systems
- **Critical Hits**: Random critical hit mechanics for extra damage

### 🎨 User Interface
- **Responsive Battle UI**: Clean, Pokemon-inspired interface
- **HP Bars with Animations**: Smooth health animations with color indicators
- **Pokemon Information Display**: Name, level, HP, and status clearly shown
- **Move Selection**: Interactive move buttons with descriptions
- **Item Usage**: Bag system for using healing items and Pokeballs
- **Battle Messages**: Real-time event messages and battle commentary

### 🌐 Multiplayer Features
- **WebSocket Communication**: Real-time battle synchronization
- **PvP Battle System**: Challenge friends in online battles
- **Event Processing**: Comprehensive battle event handling
- **Turn Management**: Synchronized turn-based gameplay

### 🎵 Audio & Visuals
- **Dynamic Music**: Different tracks for wild battles and PvP battles
- **Pokemon Sprites**: Full collection of Pokemon front and back sprites
- **Battle Animations**: Smooth sprite animations and effects
- **Battle Backgrounds**: Immersive battle environments

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager
- Modern web browser with WebSocket support

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd guardianmon
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000` to start playing!

## 🎮 How to Play

### Wild Pokemon Battles
1. Encounter a wild Pokemon in the game world
2. Choose from four actions: **Fight**, **Bag**, **Pokemon**, or **Run**
3. Select moves to attack or use items from your bag
4. Switch Pokemon when needed or try to capture wild Pokemon
5. Win by defeating the wild Pokemon or run away to escape

### PvP Battles
1. Challenge another player to a battle
2. Take turns selecting moves for your Pokemon
3. Use strategy to switch Pokemon and counter opponent moves
4. First player to defeat all opponent Pokemon wins!

### Controls
- **Mouse/Touch**: Click buttons to select actions and moves
- **Hover**: Hover over moves to see descriptions and stats
- **Keyboard**: Some shortcuts available for quick actions

## 🛠️ Technical Architecture

### Core Technologies
- **TypeScript**: Type-safe JavaScript for robust development
- **Phaser 3**: Powerful 2D game framework for rendering and physics
- **WebSocket**: Real-time communication for multiplayer features
- **CSS3**: Modern styling with animations and responsive design

### Project Structure
```
src/
├── managers/
│   ├── battle/           # Battle system management
│   │   ├── BattleManager.ts
│   │   ├── BattleUIManager.ts
│   │   ├── BattleEventProcessor.ts
│   │   └── BattleAnimationManager.ts
│   └── ...
├── scenes/               # Phaser game scenes
├── services/             # WebSocket and API services
├── types/                # TypeScript type definitions
├── utils/                # Utility functions and helpers
└── assets/               # Game assets (sprites, audio, etc.)
```

### Key Components

#### Battle Manager
- Orchestrates the entire battle flow
- Manages turn-based combat logic
- Handles both PvP and wild Pokemon battles
- Coordinates UI updates and animations

#### Battle Event Processor
- Processes real-time battle events from the server
- Handles move animations, damage calculation, and status effects
- Manages Pokemon switching and battle state changes
- Synchronizes multiplayer battle events

#### Battle UI Manager
- Creates and manages battle interface elements
- Handles user interactions and button states
- Updates Pokemon information displays
- Manages responsive design and animations

## 🎯 Battle Events System

The game uses a comprehensive event system to handle battle mechanics:

- **`move_used`**: When a Pokemon uses a move
- **`damage_dealt`**: Health reduction with effectiveness calculation
- **`heal`**: HP restoration events
- **`status_applied`**: Status effect application (poison, paralysis, etc.)
- **`pokemon_fainted`**: When a Pokemon's HP reaches zero
- **`switch_in`**: Pokemon switching with full stat updates
- **`pokemon_switched`**: Confirmation of successful switches
- **`turn_start`**: Beginning of each battle turn
- **`generic_message`**: Battle commentary and messages

## 🔧 Configuration

### Battle Settings
- **Event Processing Delay**: 1500ms between battle events
- **HP Animation Speed**: Smooth health bar transitions
- **Auto-save**: Battle state automatically saved
- **Music Transitions**: Seamless audio switching

### UI Customization
- Responsive design works on desktop and mobile
- Pokemon sprite fallbacks for missing assets
- Color-coded HP bars (green → yellow → red)
- Status effect color indicators

## 🎨 Assets

### Pokemon Sprites
- **Front Sprites**: Used for opponent/wild Pokemon
- **Back Sprites**: Used for player Pokemon
- **Icon Sprites**: Fallback images and team displays
- **Format**: PNG images with transparent backgrounds

### Audio Files
- **Wild Battle Music**: Intense battle themes
- **PvP Battle Music**: Competitive multiplayer tracks
- **Normal Music**: Overworld and menu themes
- **Sound Effects**: Move sounds, button clicks, etc.

## 🐛 Troubleshooting

### Common Issues

**Battle UI not responding**
- Check WebSocket connection status
- Ensure all battle events are processed
- Verify Pokemon data is loaded correctly

**Sprites not loading**
- Check asset paths in `/public/assets/Sprites/`
- Verify image file formats (PNG recommended)
- Check browser console for 404 errors

**Multiplayer sync issues**
- Confirm WebSocket server is running
- Check network connectivity
- Verify player IDs are correctly assigned

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines
- Follow TypeScript best practices
- Write tests for new battle mechanics
- Update documentation for API changes
- Ensure cross-browser compatibility

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Pokemon Company**: Inspiration for game mechanics and design
- **Phaser Community**: Amazing game development framework
- **TypeScript Team**: Excellent typing system for large projects
- **Contributors**: All developers who helped build this game

## 📞 Support

- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Join community discussions
- **Documentation**: Check the wiki for detailed guides
- **Discord**: Join our community server for real-time help

---

**Ready to become a Pokemon Master? Start your journey now!** 🌟
