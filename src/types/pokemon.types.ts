// Pokemon interfaces based on server messages

export interface StatModifiers {
  attack: number;
  defense: number;
  special_attack: number;
  special_defense: number;
  speed: number;
}

export interface CalculatedStats {
  hp: number;
  attack: number;
  defense: number;
  special_attack: number;
  special_defense: number;
  speed: number;
}

export interface MonsterMove {
  move_id: number;
  name: string;
  power: number | null;
  accuracy: number;
  current_pp: number;
  max_pp: number;
  move_type: string;
  category: string;  // "Physical", "Special", or "Status"
  description: string;
}

export interface Pokemon {
  id: string;
  template_id: number;
  name: string;
  level: number;
  exp: number;
  max_exp: number;
  max_hp: number;
  current_hp: number;
  calculated_stats: CalculatedStats;
  nature: string;
  capture_date: number;
  moves: MonsterMove[];
  types: string[];
  ability: string;
  status_condition: string | null;
}

// Server message types
export interface ActivePokemonsMessage {
  type: 'pokemon_collection';
  pokemons: Pokemon[];
}

// For a new pokemon message
export interface NewPokemonMessage {
  type: 'new_pokemon';
  pokemon: Pokemon;
  active_index: number | null;
}

// For selecting a starter Pokemon
export interface ChooseStarterMessage {
  type: 'choose_starter';
  starter_id: number;
}

// Add this to the ServerMessage union type in player.types.ts or create a combined union type
export type PokemonServerMessage = 
  | ActivePokemonsMessage
  | NewPokemonMessage; 

// Client-to-server message types
export type PokemonClientMessage =
  | ChooseStarterMessage; 