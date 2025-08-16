// Battle-related types for Pokemon battles

// Common Pokemon stats modifiers in battle
export interface BattleStatModifiers {
  battle_stats: {
    hp: number;
    attack: number;
    defense: number;
    special_attack: number;
    special_defense: number;
    speed: number;
  };
  accuracy: number;
  evasion: number;
}

// Battle move information
export interface BattleMove {
  move_id: number;
  name: string;
  move_type: string;
  category: string;
  current_pp: number;
  max_pp: number;
  power: number | null;
  accuracy: number;
  description: string;
}

// Pokemon state during battle
export interface BattlePokemonState {
  template_id: number;
  name: string;
  level: number;
  current_hp: number;
  current_hp_percent: number;
  max_hp: number;
  types: string[];
  ability?: string;
  status: string | null;
  volatile_statuses?: string[];
  stat_modifiers: BattleStatModifiers;
  moves?: BattleMove[];
  is_fainted: boolean;
  team_index: number;
  is_wild?: boolean;
}

// Team overview for the player's party
export interface TeamPokemonState {
  template_id: number;
  name: string;
  level: number;
  current_hp_percent: number;
  current_hp: number;
  max_hp: number;
  status: string | null;
  is_fainted: boolean;
  team_index: number;
}

// Field state during battle
export interface FieldState {
  weather: string | null;
  trick_room_turns: number;
}

// Wild Battle Start message
export interface WildBattleStartMessage {
  type: "wild_battle_start";
  battle_id: string;
  player_team: TeamPokemonState[];
  initial_pokemon: BattlePokemonState;
  wild_pokemon: BattlePokemonState;
  initial_field_state: FieldState;
}

// PvP Battle Start message
export interface PvPBattleStartMessage {
  type: "pvp_battle_start";
  battle_id: string;
  player_team: TeamPokemonState[];
  initial_pokemon: BattlePokemonState;
  opponent_initial_pokemon: BattlePokemonState;
  opponent_team: TeamPokemonState[];
  initial_field_state: FieldState;
  opponent_username: string;
  opponent_id: string;
  turn_number?: number;
  goes_first?: boolean;
  player1_id: string;
  player2_id: string;
}

// Request Action message
export interface RequestActionMessage {
  type: "request_action";
  battle_id: string;
  turn_number: number;
  active_pokemon_state: BattlePokemonState;
  other_pokemon_state: BattlePokemonState;
  team_overview: TeamPokemonState[];
  field_state: FieldState;
  can_switch: boolean;
  must_switch: boolean;
}

// Action response to send back to server
export interface BattleActionResponse {
  type: "combat_action";
  battle_id: string; // UUID as string
  action: PlayerAction;
}

// Base interface for all player actions
export interface PlayerActionBase {
  action_type: string;
}

// Use a move action
export interface UseMove extends PlayerActionBase {
  action_type: "use_move";
  move_index: number;
}

// Switch Pokemon action
export interface SwitchPokemon extends PlayerActionBase {
  action_type: "switch_pokemon";
  team_index: number;
}

// Use item action
export interface UseItem extends PlayerActionBase {
  action_type: "use_item";
  item_id: string;
  is_capture_item: boolean;
}

// Run action
export interface Run extends PlayerActionBase {
  action_type: "run";
}

// Union type of all possible player actions
export type PlayerAction = UseMove | SwitchPokemon | UseItem | Run;

// Battle result message
export interface BattleResultMessage {
  type: "battle_result";
  battle_id: string;
  result: "win" | "loss" | "run" | "capture";
  exp_gained?: number;
  pokemon_caught?: any;
}

// Field effect types
export enum FieldEffectType {
  Reflect = "reflect",
  LightScreen = "light_screen",
  Tailwind = "tailwind",
  StealthRock = "stealth_rock",
  Spikes = "spikes",
  ToxicSpikes = "toxic_spikes",
  StickyWeb = "sticky_web",
  TrickRoom = "trick_room"
}

// Target side for field effects
export enum EffectTargetSide {
  Player = "player",
  Opponent = "opponent",
  Both = "both"
}

// Weather types
export enum WeatherType {
  Rain = "rain",
  HarshSunlight = "harsh_sunlight",
  Sandstorm = "sandstorm",
  Hail = "hail"
}

// Status conditions
export enum StatusCondition {
  Burn = "burn",
  Freeze = "freeze",
  Paralysis = "paralysis",
  Poison = "poison",
  Sleep = "sleep",
  Toxic = "toxic"
}

// Volatile status types
export enum VolatileStatusType {
  Confusion = "confusion",
  Flinch = "flinch",
  Taunt = "taunt",
  LeechSeed = "leech_seed",
  Substitute = "substitute",
  Bound = "bound"
}

// Stat names for stat changes
export enum StatName {
  Attack = "attack",
  Defense = "defense",
  SpecialAttack = "special_attack",
  SpecialDefense = "special_defense",
  Speed = "speed",
  Accuracy = "accuracy",
  Evasion = "evasion"
}

// Pokemon types
export enum PokemonType {
  Normal = "normal",
  Fire = "fire",
  Water = "water",
  Grass = "grass",
  Electric = "electric",
  Ice = "ice",
  Fighting = "fighting",
  Poison = "poison",
  Ground = "ground",
  Flying = "flying",
  Psychic = "psychic",
  Bug = "bug",
  Rock = "rock",
  Ghost = "ghost",
  Dark = "dark",
  Dragon = "dragon",
  Steel = "steel",
  Fairy = "fairy"
}

// Ball types for capture attempts
export enum BallType {
  PokeBall = "poke_ball",
  GreatBall = "great_ball",
  UltraBall = "ultra_ball"
}

// Battle event types
export type BattleEventType =
  | 'turn_start'
  | 'move_used'
  | 'damage_dealt'
  | 'heal'
  | 'status_applied'
  | 'status_removed'
  | 'status_damage'
  | 'volatile_status_applied'
  | 'volatile_status_removed'
  | 'stat_change'
  | 'weather_start'
  | 'weather_end'
  | 'weather_damage'
  | 'field_effect_start'
  | 'field_effect_end'
  | 'pokemon_fainted'
  | 'exp_gained'
  | 'level_up'
  | 'capture_attempt'
  | 'generic_message'
  | 'pokemon_switched'; // Added for PvP

// Entity references
export interface PlayerEntityRef {
  entity_type: 'player';
  team_index: number;
}

export interface WildEntityRef {
  entity_type: 'wild';
}

export interface Player1EntityRef {
  entity_type: 'player1';
  team_index: number;
}

export interface Player2EntityRef {
  entity_type: 'player2';
  team_index: number;
}

export type BattleEntityRef = PlayerEntityRef | WildEntityRef | Player1EntityRef | Player2EntityRef;

// Base interface for all battle events
export interface BattleEventBase {
  event_type: string;
}

// Move used event
export interface MoveUsedEvent extends BattleEventBase {
  event_type: "move_used";
  details: {
    source: BattleEntityRef;
    move_id: number;
    move_name: string;
    target: BattleEntityRef;
  };
}

// Damage dealt event
export interface DamageDealtEvent extends BattleEventBase {
  event_type: "damage_dealt";
  details: {
    target: BattleEntityRef;
    damage: number;
    new_hp: number;
    max_hp: number;
    effectiveness: number;
    is_critical: boolean;
  };
}

// Heal event
export interface HealEvent extends BattleEventBase {
  event_type: "heal";
  details: {
    target: BattleEntityRef;
    amount: number;
    new_hp: number;
    max_hp: number;
  };
}

// Status applied event
export interface StatusAppliedEvent extends BattleEventBase {
  event_type: "status_applied";
  details: {
    target: BattleEntityRef;
    status: StatusCondition;
  };
}

// Status removed event
export interface StatusRemovedEvent extends BattleEventBase {
  event_type: "status_removed";
  details: {
    target: BattleEntityRef;
    status: StatusCondition;
  };
}

// Status damage event
export interface StatusDamageEvent extends BattleEventBase {
  event_type: "status_damage";
  details: {
    target: BattleEntityRef;
    status: StatusCondition;
    damage: number;
    new_hp: number;
    max_hp: number;
  };
}

// Volatile status applied event
export interface VolatileStatusAppliedEvent extends BattleEventBase {
  event_type: "volatile_status_applied";
  details: {
    target: BattleEntityRef;
    volatile_status: VolatileStatusType;
  };
}

// Volatile status removed event
export interface VolatileStatusRemovedEvent extends BattleEventBase {
  event_type: "volatile_status_removed";
  details: {
    target: BattleEntityRef;
    volatile_status: VolatileStatusType;
  };
}

// Stat change event
export interface StatChangeEvent extends BattleEventBase {
  event_type: "stat_change";
  details: {
    target: BattleEntityRef;
    stat: StatName;
    stages: number;
    new_stage: number;
    success: boolean;
  };
}

// Pokemon fainted event
export interface PokemonFaintedEvent extends BattleEventBase {
  event_type: "pokemon_fainted";
  details: {
    target: BattleEntityRef;
  };
}

// Public view of a Pokémon for the UI
export interface BattlePokemonPublicView {
  template_id: number;
  name: string;
  level: number;
  current_hp_percent: number;
  max_hp: number;
  types: PokemonType[];
  status: StatusCondition | null;
  stat_modifiers: Record<StatName, number>;
  is_fainted: boolean;
  is_wild: boolean;
}

// Switch in event
export interface SwitchInEvent extends BattleEventBase {
  event_type: "switch_in";
  details: {
    pokemon_view: BattlePokemonPublicView;
    team_index: number;
  };
}

// Field effect applied event
export interface FieldEffectAppliedEvent extends BattleEventBase {
  event_type: "field_effect_applied";
  details: {
    effect_type: FieldEffectType;
    target_side: EffectTargetSide;
  };
}

// Field effect ended event
export interface FieldEffectEndedEvent extends BattleEventBase {
  event_type: "field_effect_ended";
  details: {
    effect_type: FieldEffectType;
    target_side: EffectTargetSide;
  };
}

// Weather started event
export interface WeatherStartedEvent extends BattleEventBase {
  event_type: "weather_started";
  details: {
    weather_type: WeatherType;
  };
}

// Weather ended event
export interface WeatherEndedEvent extends BattleEventBase {
  event_type: "weather_ended";
  details: {};
}

// Move failed event
export interface MoveFailedEvent extends BattleEventBase {
  event_type: "move_failed";
  details: {
    source: BattleEntityRef;
    reason: string;
  };
}

// Item used event
export interface ItemUsedEvent extends BattleEventBase {
  event_type: "item_used";
  details: {
    item_id: string;
    item_name: string;
    target: BattleEntityRef | null;
  };
}

// Capture attempt event
export interface CaptureAttemptEvent extends BattleEventBase {
  event_type: "capture_attempt";
  details: {
    ball_type: BallType;
    shake_count: number;
    success: boolean;
  };
}

// Wild pokemon fled event
export interface WildPokemonFledEvent extends BattleEventBase {
  event_type: "wild_pokemon_fled";
  details: {};
}

// Player ran away event
export interface PlayerRanAwayEvent extends BattleEventBase {
  event_type: "player_ran_away";
  details: {
    success: boolean;
  };
}

// Generic message event
export interface GenericMessageEvent extends BattleEventBase {
  event_type: "generic_message";
  details: {
    message: string;
  };
}

// Turn start event
export interface TurnStartEvent extends BattleEventBase {
  event_type: "turn_start";
  details: {
    turn_number: number;
  };
}

// Pokemon switched event
export interface PokemonSwitchedEvent {
  event_type: 'pokemon_switched';
  details: {
    is_opponent: boolean;
    new_pokemon_name: string;
    new_pokemon_template_id: number;
    new_pokemon_level: number;
  };
}

// Update the BattleEvent type to include the new event type
export type BattleEvent =
  | TurnStartEvent
  | MoveUsedEvent
  | DamageDealtEvent
  | HealEvent
  | StatusAppliedEvent
  | StatusRemovedEvent
  | StatusDamageEvent
  | VolatileStatusAppliedEvent
  | VolatileStatusRemovedEvent
  | StatChangeEvent
  | WeatherStartedEvent
  | WeatherEndedEvent
  | FieldEffectAppliedEvent
  | FieldEffectEndedEvent
  | PokemonFaintedEvent
  | SwitchInEvent
  | ItemUsedEvent
  | CaptureAttemptEvent
  | WildPokemonFledEvent
  | PlayerRanAwayEvent
  | MoveFailedEvent
  | GenericMessageEvent
  | PokemonSwitchedEvent;

// Turn update message
export interface TurnUpdateMessage {
  type: "turn_update";
  battle_id: string;
  turn_number: number;
  events: BattleEvent[];
  opponent_pokemon_state?: BattlePokemonState;
}

// Battle end message
export interface BattleEndMessage {
  type: "battle_end";
  outcome: "victory" | "defeat" | "escape" | "capture";
  reason: string;
  exp_gained: number;
  pokemon_captured: any | null;
}

// Combined type for all battle-related messages
export type BattleMessage = 
  | WildBattleStartMessage 
  | RequestActionMessage
  | BattleResultMessage
  | TurnUpdateMessage
  | BattleEndMessage
  | PvPBattleStartMessage; 