// Monster interfaces based on server messages

export interface Position {
  x: number;
  y: number;
}

export interface Monster {
  instance_id: string;
  template_id: number;
  level: number;
  position: Position;
  direction: string;
  in_combat: boolean;
  max_hp: number;
  current_hp: number;
  name: string;
  types: string[];
}

// Server message interfaces for monsters
export interface ServerMonstersMessage {
  type: "monsters";
  monsters: Monster[];
}

export interface ServerMonsterSpawnedMessage {
  type: "monster_spawned";
  monster: Monster;
}

export interface ServerMonsterMovedMessage {
  type: "monster_moved";
  monster: Monster;
}

export interface ServerMonsterDespawnedMessage {
  type: "monster_despawned";
  instance_id: string;
}

export type MonsterServerMessage = 
  | ServerMonstersMessage
  | ServerMonsterSpawnedMessage
  | ServerMonsterMovedMessage
  | ServerMonsterDespawnedMessage;