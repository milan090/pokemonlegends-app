// Player interfaces
export interface OtherPlayer {
  id: string;
  sprite: Phaser.GameObjects.Sprite;
  nameText?: Phaser.GameObjects.Text;
  lastUpdated: number;
  targetX: number;
  targetY: number;
  tileX: number;
  tileY: number;
  direction: string;
  isMoving: boolean;
  moveStartTime: number;
  moveDuration: number;
  lastAnimation: string;
  serverTimestamp: number;
  latency: number;
  in_combat?: boolean;
  combatEffect?: Phaser.GameObjects.Particles.ParticleEmitter;
  username?: string;
}

export interface PlayerState {
  id: string;
  x: number;
  y: number;
  tile_x?: number;
  tile_y?: number;
  direction: string;
  timestamp: number;
  in_combat?: boolean;
  username: string;
}

export interface ServerWelcomeMessage {
  type: "welcome";
  id: string;
  x: number;
  y: number;
  username: string;
}

export interface ServerPlayersMessage {
  type: "players";
  players: PlayerState[];
}

export interface ServerPlayerJoinedMessage {
  type: "player_joined";
  player: PlayerState;
}

export interface ServerPlayerSMovedMessage {
  type: "players_moved";
  players: PlayerState[];
}

export interface ServerPlayerLeftMessage {
  type: "player_left";
  id: string;
}

interface ServerPongMessage {
  type: "pong";
}

// Import monster messages
import { 
  ServerMonstersMessage, 
  ServerMonsterSpawnedMessage, 
  ServerMonsterMovedMessage,
  ServerMonsterDespawnedMessage,
  Monster
} from './monster.types';

// Import pokemon messages
import {
  ActivePokemonsMessage,
  NewPokemonMessage
} from './pokemon.types';

// Import battle messages
import {
  WildBattleStartMessage,
  RequestActionMessage,
  BattleResultMessage,
  BattleActionResponse
} from './battle.types';

// Import duel messages
import {
  DuelRequestMessage,
  DuelResponseMessage,
  ClientDuelRequestMessage,
  ClientDuelResponseMessage
} from './challenge';

export type ServerMessage =
  | ServerWelcomeMessage
  | ServerPlayersMessage
  | ServerPlayerJoinedMessage
  | ServerPlayerSMovedMessage
  | ServerPlayerLeftMessage
  | ServerPongMessage
  | ServerMonstersMessage
  | ServerMonsterSpawnedMessage
  | ServerMonsterMovedMessage
  | ServerMonsterDespawnedMessage
  | { type: "combat_started"; monster_id: string }
  | { type: "combat_ended"; monster: Monster, combat_id: string }
  | ActivePokemonsMessage
  | NewPokemonMessage
  | WildBattleStartMessage
  | RequestActionMessage
  | BattleResultMessage
  | DuelRequestMessage
  | DuelResponseMessage;

// Client message interfaces
export interface ClientJoinMessage {
  type: "join";
  session_token: string | null;
  lobby_id: string | null;
}

export interface ClientMoveMessage {
  type: "move";
  x: number;
  y: number;
  direction: string;
}

export interface ClientPingMessage {
  type: "ping";
}

export interface ClientInteractMessage {
  type: "interact";
  monster_id: string;
}

export type ClientMessage = 
  | ClientJoinMessage
  | ClientMoveMessage
  | ClientPingMessage
  | ClientInteractMessage
  | BattleActionResponse
  | ClientDuelRequestMessage
  | ClientDuelResponseMessage;


  