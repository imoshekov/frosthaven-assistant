export enum CreatureConditions {
  poison = "poison",
  wound = "wound",
  brittle = "brittle",
  ward = "ward",
  immobilize = "immobilize",
  bane = "bane",
  muddle = "muddle",
  stun = "stun",
  impair = "impair",
  disarm = "disarm"
}

export interface Creature {
  id?: string;
  name?: string;
  standee?: number | string,
  type?: string;
  aggressive?: boolean;
  isElite?: boolean; 
  level?: number; 
  hp?: number;
  attack?: number;
  movement?: number | null;
  initiative?: number;
  armor?: number;
  retaliate?: number;
  conditions?: CreatureConditions[];
  roundArmor?: number,
  roundRetaliate?: number,
  log?: any[];
  traits?: string[];
}

export interface Element {
  type: string;
  state: 'full' | 'half' | 'none';
}